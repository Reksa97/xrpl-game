/**
 * Tests the frontend connection to XRPL
 */
const puppeteer = require('puppeteer');

// Configuration
const config = {
  url: 'http://localhost:3002',
  headless: true,
  timeout: 15000
};

async function runTest() {
  console.log('=======================================');
  console.log('  XRPL Frontend Connection UI Test');
  console.log('=======================================');
  console.log(`Testing URL: ${config.url}`);
  
  // Start browser
  console.log('\nLaunching browser...');
  const browser = await puppeteer.launch({
    headless: config.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Open new page
    const page = await browser.newPage();
    console.log(`Navigating to ${config.url}...`);
    
    // Set a longer timeout for navigation
    await page.goto(config.url, { 
      waitUntil: 'networkidle2', 
      timeout: config.timeout 
    });
    
    console.log('Page loaded.');
    
    // Wait for connection status to appear
    console.log('Waiting for connection status component...');
    await page.waitForSelector('div[style*="position: fixed"][style*="bottom: 10px"]', { 
      timeout: config.timeout 
    });
    
    console.log('Connection status component found.');
    
    // Take a screenshot
    await page.screenshot({ path: 'frontend-connection-test.png' });
    console.log('Screenshot saved to frontend-connection-test.png');
    
    // Check connection status text
    const statusText = await page.evaluate(() => {
      const element = document.querySelector('div[style*="position: fixed"][style*="bottom: 10px"]');
      return element ? element.textContent : null;
    });
    
    console.log('Connection status text:', statusText);
    
    // Look for a div with error text in color #F44336
    const hasError = await page.evaluate(() => {
      const element = document.querySelector('div[style*="color: #F44336"]');
      return element ? element.textContent : null;
    });
    
    if (hasError) {
      console.log('Connection error detected:', hasError);
    }
    
    // Take snapshot of XRPL client logic
    const clientStatus = await page.evaluate(() => {
      // Return any global variables or window properties related to XRPL
      return {
        networkStatus: window.xrplStatus || 'Not available',
        wsConnection: window.wsStatus || 'Not available',
        consoleOutput: Array.from(document.querySelectorAll('pre, code'))
          .map(el => el.textContent)
          .join('\n')
      };
    });
    
    console.log('\nXRPL Client Status:', clientStatus.networkStatus);
    console.log('WebSocket Status:', clientStatus.wsConnection);
    
    return true;
  } catch (error) {
    console.error('Test error:', error);
    return false;
  } finally {
    // Close browser
    await browser.close();
    console.log('Browser closed.');
  }
}

// Run the test
runTest().then(success => {
  console.log(`\nTest ${success ? 'completed' : 'failed'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});