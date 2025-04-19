// XRPL NFT Feature Diagnostic Test
const puppeteer = require('puppeteer');

// Configure test options
const CONFIG = {
  appUrl: 'http://localhost:3000',
  headless: false, // Set to true for production runs
  timeout: 30000,  // General timeout
  screenshotDir: './test-screenshots',
  verbose: true,   // Set to false to reduce console output
};

// Utility function to wait a specified time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create timestamp for logs
const timestamp = () => new Date().toISOString();

// Log with timestamp
const log = (message) => {
  if (CONFIG.verbose) {
    console.log(`[${timestamp()}] ${message}`);
  }
};

// Save console logs to file
const saveLogsToFile = (logs, filename) => {
  const fs = require('fs');
  try {
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    fs.writeFileSync(`${CONFIG.screenshotDir}/${filename}`, logs.join('\n'));
    log(`Logs saved to ${CONFIG.screenshotDir}/${filename}`);
  } catch (err) {
    console.error('Error saving logs:', err);
  }
};

// Main diagnostic function
async function runDiagnosticTest() {
  log('Starting XRPL NFT Feature Diagnostic Test');
  
  // Store all browser console logs
  const browserLogs = [];
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: CONFIG.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(CONFIG.timeout);
    
    // Capture console logs
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const logEntry = `[${type}] ${text}`;
      browserLogs.push(logEntry);
      
      // Log important messages to console
      if (
        type === 'error' || 
        type === 'warning' ||
        text.includes('NFT') || 
        text.includes('XRPL') ||
        text.includes('feature') ||
        text.includes('amendment') ||
        text.includes('disabled')
      ) {
        log(logEntry);
      }
    });
    
    // Handle dialogs
    page.on('dialog', async dialog => {
      const message = dialog.message();
      browserLogs.push(`[DIALOG] ${message}`);
      log(`Dialog appeared: ${message}`);
      await dialog.accept();
    });
    
    // Step 1: Navigate to the application
    log('Step 1: Opening application');
    await page.goto(CONFIG.appUrl);
    await page.waitForSelector('h1');
    await page.screenshot({ path: `${CONFIG.screenshotDir}/01-app-loaded.png` });
    
    // Step 2: Check XRPL connection status
    log('Step 2: Checking XRPL connection');
    
    // Inject code to expose XRPL connection details
    const connectionInfo = await page.evaluate(() => {
      // Inject a function to get XRPL status from the window object
      window.checkXrplStatus = async () => {
        // Wait a bit to allow connections to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          xrplDirectExists: typeof window.xrplDirect !== 'undefined',
          consoleMessages: Array.from(
            document.querySelectorAll('div, p, span')
          ).filter(el => 
            el.textContent && (
              el.textContent.includes('XRPL') || 
              el.textContent.includes('Error') ||
              el.textContent.includes('Connected')
            )
          ).map(el => el.textContent.trim()),
          hasErrors: !!document.querySelector('[role="alert"]'),
          errorMessages: Array.from(
            document.querySelectorAll('[role="alert"]')
          ).map(el => el.textContent)
        };
      };
      
      // Execute the function
      return window.checkXrplStatus();
    });
    
    log('XRPL Connection Info:');
    console.log(connectionInfo);
    browserLogs.push(`[INFO] XRPL Connection: ${JSON.stringify(connectionInfo, null, 2)}`);
    
    // Step 3: Navigate to NFT/Pet section
    log('Step 3: Finding NFT/Pet section');
    
    // Find all navigation links
    const navLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(link => link.textContent)
        .map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          isActive: link.getAttribute('aria-current') === 'page'
        }));
    });
    
    log('Navigation links:');
    console.log(navLinks);
    
    // Try to find and click the Pet/NFT link
    let petPageFound = false;
    for (const link of navLinks) {
      if (link.text.includes('Pet') || link.text.includes('NFT') || link.text.includes('Egg')) {
        log(`Navigating to: ${link.text}`);
        await page.goto(link.href);
        petPageFound = true;
        await sleep(2000);
        break;
      }
    }
    
    if (!petPageFound) {
      log('No Pet/NFT page link found, trying to find it on the current page');
      // Check if we're already on the Pet page
      const pageContent = await page.content();
      petPageFound = pageContent.includes('Mint') && (pageContent.includes('Egg') || pageContent.includes('NFT'));
    }
    
    await page.screenshot({ path: `${CONFIG.screenshotDir}/02-pet-page.png` });
    
    // Step 4: Check NFT feature status
    log('Step 4: Checking NFT feature status on XRPL node');
    
    // Inject a script to extract XRPL feature information
    const featureStatus = await page.evaluate(async () => {
      // Create a function to get node features
      window.checkXrplFeatures = async () => {
        try {
          // Access console to add our test
          console.log('Injecting feature test');
          
          // Create a WebSocket to check features directly
          const possibleWsUrls = [
            'ws://localhost:5005',
            'ws://localhost:6006',
            'ws://xrpl-node:5005'
          ];
          
          let activeWs = null;
          let serverInfo = null;
          
          // Try each URL
          for (const url of possibleWsUrls) {
            try {
              console.log(`Trying to connect to ${url}`);
              const ws = new WebSocket(url);
              
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  ws.close();
                  reject(new Error('Connection timeout'));
                }, 3000);
                
                ws.onopen = () => {
                  clearTimeout(timeout);
                  activeWs = ws;
                  resolve();
                };
                
                ws.onerror = (err) => {
                  clearTimeout(timeout);
                  reject(err);
                };
              });
              
              if (activeWs) {
                console.log(`Connected to ${url}`);
                break;
              }
            } catch (err) {
              console.warn(`Failed to connect to ${url}:`, err);
            }
          }
          
          if (!activeWs) {
            return { 
              error: 'Failed to connect to any XRPL node',
              connected: false
            };
          }
          
          // Get server info
          const requestId = Date.now();
          
          serverInfo = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Request timeout'));
            }, 5000);
            
            activeWs.onmessage = (event) => {
              clearTimeout(timeout);
              const response = JSON.parse(event.data);
              resolve(response);
            };
            
            activeWs.send(JSON.stringify({
              id: requestId,
              command: 'server_info'
            }));
          });
          
          activeWs.close();
          
          return {
            connected: true,
            serverInfo,
            hasNftFeature: serverInfo?.result?.info?.amendments?.some(a => 
              a.includes('NFToken') || a.includes('NonFungibleTokens')
            ),
            amendments: serverInfo?.result?.info?.amendments || [],
            complete_ledgers: serverInfo?.result?.info?.complete_ledgers,
            server_state: serverInfo?.result?.info?.server_state
          };
        } catch (err) {
          console.error('Error checking XRPL features:', err);
          return { 
            error: err.message,
            connected: false
          };
        }
      };
      
      // Execute the function
      return window.checkXrplFeatures();
    });
    
    log('XRPL Feature Status:');
    console.log(featureStatus);
    browserLogs.push(`[INFO] XRPL Features: ${JSON.stringify(featureStatus, null, 2)}`);
    
    // Check if NFT feature is enabled
    const nftEnabled = featureStatus.hasNftFeature;
    log(`NFT features ${nftEnabled ? 'ARE' : 'are NOT'} enabled on the XRPL node`);
    
    // Step 5: Test NFT minting if features are enabled
    if (petPageFound) {
      log('Step 5: Testing NFT minting capability');
      
      // Find mint button
      const mintButtonExists = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const mintButton = buttons.find(b => 
          b.textContent && 
          b.textContent.includes('Mint') && 
          !b.disabled
        );
        return !!mintButton;
      });
      
      if (mintButtonExists) {
        log('Found mint button, clicking it to test NFT minting');
        await page.screenshot({ path: `${CONFIG.screenshotDir}/03-before-mint.png` });
        
        try {
          // Click the mint button
          await page.click('button:not([disabled]):has-text("Mint")');
          log('Clicked mint button');
          
          // Wait for potential error or confirmation
          await sleep(5000);
          await page.screenshot({ path: `${CONFIG.screenshotDir}/04-after-mint.png` });
          
          // Check for error messages
          const errorAfterMint = await page.evaluate(() => {
            const alerts = Array.from(document.querySelectorAll('div, p'))
              .filter(el => 
                el.textContent && (
                  el.textContent.includes('Error') || 
                  el.textContent.includes('failed') ||
                  el.textContent.includes('disabled')
                )
              );
            
            return alerts.length > 0 ? alerts.map(el => el.textContent.trim()) : null;
          });
          
          if (errorAfterMint) {
            log('Mint operation failed with errors:');
            console.log(errorAfterMint);
            browserLogs.push(`[ERROR] Mint failed: ${errorAfterMint.join('\n')}`);
          } else {
            log('No visible errors after minting attempt');
          }
          
          // Wait a bit longer to see final state
          await sleep(5000);
          await page.screenshot({ path: `${CONFIG.screenshotDir}/05-final-state.png` });
          
        } catch (err) {
          log(`Error during mint button click: ${err.message}`);
          browserLogs.push(`[ERROR] Mint click error: ${err.message}`);
        }
      } else {
        log('Mint button not found or disabled');
        browserLogs.push('[WARNING] Mint button not found or disabled');
      }
    } else {
      log('Pet/NFT page not found, skipping mint test');
    }
    
    // Step 6: Generate diagnostic summary
    log('Step 6: Generating diagnostic summary');
    
    const diagnosticSummary = {
      timestamp: new Date().toISOString(),
      appAccessible: true,
      xrplConnection: featureStatus.connected,
      petPageFound,
      nftFeatureEnabled: nftEnabled,
      serverState: featureStatus.server_state,
      amendments: featureStatus.amendments,
      issues: []
    };
    
    // Check for issues
    if (!featureStatus.connected) {
      diagnosticSummary.issues.push('Cannot connect to XRPL node');
    }
    
    if (!nftEnabled) {
      diagnosticSummary.issues.push('NFT features are not enabled on the XRPL node');
    }
    
    if (featureStatus.server_state !== 'full' && featureStatus.server_state !== 'proposing') {
      diagnosticSummary.issues.push(`Server not in full state (current: ${featureStatus.server_state})`);
    }
    
    if (!petPageFound) {
      diagnosticSummary.issues.push('Could not find the Pet/NFT page');
    }
    
    // Save diagnostic summary
    browserLogs.push(`[SUMMARY] ${JSON.stringify(diagnosticSummary, null, 2)}`);
    
    // Display summary
    log('Diagnostic Summary:');
    console.log(diagnosticSummary);
    
    // Generate recommendations
    let recommendations = '';
    
    if (!nftEnabled) {
      recommendations += `
NFT features are not enabled on your XRPL node. To fix this:

1. Stop the XRPL container: docker-compose down
2. Ensure the rippled.cfg file in xrpl-config/ includes NFTokenMint in the [features] section
3. Make sure docker-compose.yml mounts the config directory
4. Restart with: docker-compose up -d

The [features] section in rippled.cfg should include:
NFTokenMint
NFTokenBurn
NonFungibleTokensV1
NonFungibleTokensV1_1
`;
    }
    
    if (featureStatus.server_state !== 'full' && featureStatus.server_state !== 'proposing') {
      recommendations += `
Your XRPL node is not in full state. Wait for it to fully sync or restart it:
docker-compose restart xrpl-node
`;
    }
    
    if (recommendations) {
      log('Recommendations:');
      console.log(recommendations);
      browserLogs.push('[RECOMMENDATIONS]\n' + recommendations);
    } else {
      log('No specific recommendations needed.');
    }
    
    // Save all logs
    saveLogsToFile(browserLogs, 'xrpl-diagnostic.log');
    
    log('Diagnostic test completed');
    
  } catch (err) {
    console.error('Test error:', err);
    browserLogs.push(`[ERROR] Test failed: ${err.message}`);
    saveLogsToFile(browserLogs, 'xrpl-diagnostic-error.log');
  } finally {
    await browser.close();
  }
}

// Run the diagnostic test
runDiagnosticTest().catch(console.error);