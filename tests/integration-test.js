/**
 * Integration test for XRPL frontend
 * 
 * This test verifies that the frontend application can successfully connect
 * to the XRPL node and display server information.
 */
const puppeteer = require('puppeteer');

// Configuration
const config = {
  url: 'http://localhost:3002',
  timeout: 20000,
  headless: true, // Set to false to see browser 
  slowMo: 50 // Slow down operations by 50ms so we can see what's happening
};

// Utility function to wait for text to appear
async function waitForText(page, text, timeout = 10000) {
  try {
    await page.waitForFunction(
      (text) => document.body.textContent.includes(text),
      { timeout },
      text
    );
    return true;
  } catch (error) {
    console.error(`Text "${text}" not found within ${timeout}ms`);
    return false;
  }
}

// Take a screenshot
async function takeScreenshot(page, filename) {
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`Screenshot saved to ${filename}`);
}

// Main test function
async function runTest() {
  console.log(`==================================================`);
  console.log(` XRPL Frontend Integration Test`);
  console.log(`==================================================`);
  console.log(`URL: ${config.url}`);
  console.log(`Timeout: ${config.timeout}ms`);
  console.log(`Headless mode: ${config.headless ? 'Yes' : 'No'}`);
  
  const browser = await puppeteer.launch({ 
    headless: config.headless ? 'new' : false,
    slowMo: config.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Add console log listener for debugging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    // Navigate to the application
    console.log(`Navigating to ${config.url}...`);
    await page.goto(config.url, { 
      waitUntil: 'networkidle2',
      timeout: config.timeout
    });
    
    console.log('Page loaded, waiting for connection test to run...');
    
    // Take initial screenshot
    await takeScreenshot(page, 'integration-test-initial.png');
    
    // Wait for the test to complete (should show server state)
    const success = await waitForText(page, 'Server State:', config.timeout);
    
    if (success) {
      console.log('✅ Server information displayed successfully!');
      
      // Take a screenshot of the successful connection
      await takeScreenshot(page, 'integration-test-success.png');
      
      // Extract server information
      const serverInfo = await page.evaluate(() => {
        const infoTable = document.querySelector('table');
        if (!infoTable) return null;
        
        const rows = infoTable.querySelectorAll('tr');
        const info = {};
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length === 2) {
            const key = cells[0].textContent.trim();
            const value = cells[1].textContent.trim();
            info[key] = value;
          }
        });
        
        return info;
      });
      
      if (serverInfo) {
        console.log('\nServer Information:');
        Object.entries(serverInfo).forEach(([key, value]) => {
          console.log(`- ${key}: ${value}`);
        });
      }
      
      // Click the "Continue to Application" button
      console.log('\nClicking "Continue to Application" button...');
      await page.click('button');
      
      // Wait for the Egg Shop to load
      const eggShopLoaded = await waitForText(page, 'Get Started', config.timeout);
      
      if (eggShopLoaded) {
        console.log('✅ Application loaded successfully!');
        await takeScreenshot(page, 'integration-test-app.png');
      } else {
        console.log('❌ Failed to load the main application');
      }
      
      return success && eggShopLoaded;
    } else {
      console.log('❌ Server information not displayed');
      await takeScreenshot(page, 'integration-test-failure.png');
      return false;
    }
  } catch (error) {
    console.error(`Test failed with error: ${error.message}`);
    await takeScreenshot(page, 'integration-test-error.png');
    return false;
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Run the test
runTest()
  .then(success => {
    console.log(`\nTest ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });