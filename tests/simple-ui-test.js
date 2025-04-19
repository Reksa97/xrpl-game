/**
 * Simple UI test for XRPL frontend
 */
const puppeteer = require('puppeteer');

async function main() {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    console.log('Creating new page...');
    const page = await browser.newPage();
    
    // Add console log listener
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    console.log('Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'frontend-screenshot.png' });
    console.log('Screenshot saved to frontend-screenshot.png');
    
    // Wait 5 seconds for any connection attempts
    console.log('Waiting 5 seconds for connections...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get any console logs about XRPL connections
    console.log('Checking for XRPL connection logs...');
    const connectionLogs = await page.evaluate(() => {
      return {
        html: document.body.innerHTML
      };
    });
    
    console.log('Page HTML snippet:', connectionLogs.html.substring(0, 500) + '...');
    
    console.log('Test completed successfully');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

main()
  .then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });