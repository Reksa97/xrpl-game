import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

(async () => {
  console.log('Starting NFT minting test...');
  
  // Function to check if a process is running
  const isProcessRunning = (command: string, args: string[] = []): Promise<boolean> => {
    return new Promise((resolve) => {
      const process = spawn(command, args);
      process.on('error', () => resolve(false));
      process.on('close', (code) => resolve(code === 0));
    });
  };
  
  // Function to wait for a process to start
  const waitForProcessStart = async (command: string, args: string[], timeout: number = 30000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const running = await isProcessRunning(command,args);
      if (running) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Check every second
    }
    return false;
  };

  // Function to start a process and wait for it to be accessible
  const startProcessAndWait = async (command: string, args: string[], logMessage:string,  waitCommand:string, waitArgs:string[], timeout: number = 30000): Promise<boolean> => {
    console.log(logMessage);
    
    const process = spawn(command, args);
    
    process.stdout.on('data', (data) => {
        console.log(`${logMessage} stdout: ${data}`);
    });
    
    process.stderr.on('data', (data) => {
        console.error(`${logMessage} stderr: ${data}`);
    });
    
    process.on('close', (code) => {
        console.log(`${logMessage} exited with code ${code}`);
    });

    return await waitForProcessStart(waitCommand,waitArgs,timeout)
  };

  // Check if rippled is running and start it if it is not
  const rippledRunning = await isProcessRunning('pgrep', ['-x', 'rippled']);
  if (!rippledRunning) {
    if (!await startProcessAndWait('bash',['start-firebase.sh'],'starting rippled','pgrep',['-x','rippled'], 60000)){
        console.error('❌ FAILURE: rippled did not start in time.');
        process.exit(1);
    }
  } else {
    console.log('rippled is already running.');
  }

    // Check if the backend is running and start it if it is not
    const backendRunning = await isProcessRunning('pgrep', ['-f', 'make run']);
    if (!backendRunning) {
        console.log('starting backend');
        if (!await startProcessAndWait('make',['run'], 'starting backend','pgrep', ['-f', 'make run'], 60000)) {
            console.error('❌ FAILURE: backend did not start in time.');
            process.exit(1);
        }
    } else {
        console.log('backend is already running.');
    }

  // Check if the frontend is running and start it if it is not
  const frontendRunning = await isProcessRunning('pgrep', ['-f', 'npm run dev']);
  if (!frontendRunning) {
    console.log('starting frontend');
    if (!await startProcessAndWait('cd', ['frontend && npm', 'run', 'dev'],'starting frontend','pgrep',['-f', 'npm run dev'], 60000)) {
        console.error('❌ FAILURE: frontend did not start in time.');
        process.exit(1);
    }
  } else {
    console.log('frontend is already running.');
  }

  //wait for frontend to be available
    const waitForFrontend = async (url: string, timeout: number = 30000) => {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return true;
                }
            } catch (error) {
                console.error('Error fetching:', error);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return false;
    };
    if (!await waitForFrontend('http://localhost:3000', 60000)) {
        console.error('❌ FAILURE: frontend did not start in time.');
        process.exit(1);
    }

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Forward console logs for debugging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  
  try {
    // Navigate to the app
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000');

    // Wait for app to load
    await page.waitForSelector('h1');
    
    // Navigate to Pet page (if needed)
    console.log('Looking for Pet page link...');
    const links = await page.$$('a');
    for (const link of links) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text && (text.includes('Pet') || text.includes('NFT'))) {
        console.log(`Found link: ${text}`);
        await link.click();
        break;
      }
    }
    
    // Wait for Pet page to load
    await page.waitForTimeout(2000);
    
    // Get initial NFT count
    console.log('Checking initial NFT count...');
    const initialElements = await page.$$('[key]');
    console.log(`Initial elements with 'key' attribute: ${initialElements.length}`);
    
    // Look for mint button
    console.log('Looking for mint button...');
    const buttons = await page.$$('button');
    let mintButton = null;
    
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('Mint')) {
        console.log(`Found mint button: ${text}`);
        mintButton = button;
        break;
      }
    }
    
    if (!mintButton) {
      console.error('Mint button not found!');
      return;
    }
    
    // Click mint button
    console.log('Clicking mint button...');
    await mintButton.click();
    
    // Wait for modal or status indicator
    console.log('Waiting for minting process...');
    await page.waitForTimeout(5000);
    
    // Accept alert if it appears
    page.on('dialog', async dialog => {
      console.log(`Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });
    
    // Wait for minting to complete
    console.log('Waiting for minting to complete...');
    await page.waitForTimeout(15000);
    
    // Check final NFT count
    console.log('Checking final NFT count...');
    const finalElements = await page.$$('[key]');
    console.log(`Final elements with 'key' attribute: ${finalElements.length}`);
    
    // Print success/failure message
    if (finalElements.length > initialElements.length) {
      console.log('✅ SUCCESS: NFT minting appears to have worked!');
    } else {
      console.log('❌ FAILURE: No new NFTs detected after minting');
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'nft-minting-result.png' });
    console.log('Screenshot saved as "nft-minting-result.png"');
    
    // Wait a bit before closing
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'nft-minting-error.png' });
    console.log('Error screenshot saved as "nft-minting-error.png"');
  } finally {
    // Close browser
    await browser.close();
    console.log('Test completed');
  }
})();