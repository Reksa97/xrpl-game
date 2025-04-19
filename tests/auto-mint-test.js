// Automated NFT Minting Test
// This script automatically tests the NFT minting functionality

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configure test
const config = {
  appUrl: 'http://localhost:3000',
  headless: false,  // Set to true for CI environments
  timeout: 30000,
  screenshotDir: path.join(__dirname, 'screenshots'),
  verbose: true
};

// Create screenshot directory if it doesn't exist
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}

// Log with timestamp
function log(message) {
  if (config.verbose) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

// Main test function
async function runMintTest() {
  log('Starting automated NFT minting test');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: config.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(config.timeout);
  
  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning' || 
        msg.text().includes('NFT') || 
        msg.text().includes('XRPL')) {
      log(`Browser ${type}: ${msg.text()}`);
    }
  });
  
  // Handle dialogs
  page.on('dialog', async dialog => {
    log(`Dialog appeared: ${dialog.message()}`);
    await dialog.accept();
  });
  
  try {
    // Step 1: Navigate to the app
    log('Navigating to application');
    await page.goto(config.appUrl);
    await page.screenshot({ path: path.join(config.screenshotDir, '01-app-loaded.png') });
    
    // Step 2: Find and navigate to Pet/NFT page
    log('Finding Pet/NFT page');
    
    const links = await page.$$('a');
    for (const link of links) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text && (text.includes('Pet') || text.includes('NFT') || text.includes('Egg'))) {
        log(`Found link: ${text}`);
        await link.click();
        break;
      }
    }
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(config.screenshotDir, '02-pet-page.png') });
    
    // Step 3: Get initial NFT count
    log('Checking initial NFT count');
    
    const initialNFTs = await page.evaluate(() => {
      const items = document.querySelectorAll('[key]');
      return items.length;
    });
    
    log(`Initial NFT count: ${initialNFTs}`);
    
    // Step 4: Find and click mint button
    log('Looking for mint button');
    
    const mintButtonExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const mintButton = buttons.find(btn => 
        btn.textContent && 
        btn.textContent.includes('Mint') && 
        !btn.disabled
      );
      return !!mintButton;
    });
    
    if (!mintButtonExists) {
      log('No mint button found or it is disabled');
      await page.screenshot({ path: path.join(config.screenshotDir, '03-no-mint-button.png') });
      return false;
    }
    
    log('Found mint button, clicking it');
    await page.screenshot({ path: path.join(config.screenshotDir, '03-before-mint.png') });
    
    // Click the mint button
    await page.click('button:not([disabled]):has-text("Mint")');
    
    // Step 5: Wait for minting to complete
    log('Waiting for minting process to complete');
    
    // Wait for initial status update (minting started)
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(config.screenshotDir, '04-minting-in-progress.png') });
    
    // Wait longer for minting to complete
    await page.waitForTimeout(8000);
    await page.screenshot({ path: path.join(config.screenshotDir, '05-minting-completed.png') });
    
    // Step 6: Verify result
    log('Verifying minting result');
    
    // Check for error messages
    const hasError = await page.evaluate(() => {
      return document.body.textContent.includes('Error') || 
             document.body.textContent.includes('failed');
    });
    
    if (hasError) {
      log('Found error message in page content');
      const errorText = await page.evaluate(() => {
        const errorElements = Array.from(document.querySelectorAll('div, p'))
          .filter(el => 
            el.textContent && (
              el.textContent.includes('Error') || 
              el.textContent.includes('failed')
            )
          );
        return errorElements.map(el => el.textContent.trim()).join('\n');
      });
      
      log(`Error message: ${errorText}`);
      return false;
    }
    
    // Check NFT count after minting
    const finalNFTs = await page.evaluate(() => {
      const items = document.querySelectorAll('[key]');
      return items.length;
    });
    
    log(`Final NFT count: ${finalNFTs}`);
    
    // Verify success
    const success = finalNFTs > initialNFTs;
    
    if (success) {
      log('✅ Test PASSED: NFT count increased after minting');
    } else {
      log('❌ Test FAILED: NFT count did not increase after minting');
    }
    
    // Step 7: Take final screenshot
    await page.screenshot({ path: path.join(config.screenshotDir, '06-final-state.png') });
    
    return success;
  } catch (error) {
    log(`Error during test: ${error.message}`);
    await page.screenshot({ path: path.join(config.screenshotDir, 'error.png') });
    return false;
  } finally {
    await browser.close();
  }
}

// Create a function to run the test repeatedly
async function runPeriodicTests(interval = 60, count = 3) {
  log(`Starting periodic tests - will run ${count} times at ${interval} second intervals`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 1; i <= count; i++) {
    log(`\n======= Test Run ${i}/${count} =======`);
    
    try {
      const success = await runMintTest();
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      log(`Test run ${i} failed with error: ${error.message}`);
      failureCount++;
    }
    
    // Wait before next test, but not after the last one
    if (i < count) {
      log(`Waiting ${interval} seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  }
  
  log('\n======= Test Summary =======');
  log(`Total test runs: ${count}`);
  log(`Successful: ${successCount}`);
  log(`Failed: ${failureCount}`);
  
  return successCount > 0;
}

// Run the tests
runPeriodicTests().then(success => {
  log(`Testing completed with ${success ? 'some successes' : 'all failures'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`Testing failed with error: ${error.message}`);
  process.exit(1);
});