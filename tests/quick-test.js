// Simple NFT minting test
const puppeteer = require('puppeteer');

async function runTest() {
  console.log('Starting quick NFT minting test...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Print console logs
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning' || 
          msg.text().includes('NFT') || 
          msg.text().includes('signature')) {
        console.log(`Browser ${type}: ${msg.text()}`);
      }
    });
    
    // Handle dialogs
    page.on('dialog', async dialog => {
      console.log(`Dialog: ${dialog.message()}`);
      await dialog.accept();
    });
    
    // Navigate to app
    await page.goto('http://localhost:3000');
    console.log('Loaded application');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Find and click on Pet/NFT link if available
    const links = await page.$$('a');
    for (const link of links) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text && (text.includes('Pet') || text.includes('NFT'))) {
        console.log(`Found link: ${text}`);
        await link.click();
        break;
      }
    }
    
    // Wait for page to change
    await page.waitForTimeout(2000);
    
    // Look for 'Mint' button
    const buttons = await page.$$('button');
    let mintButtonFound = false;
    
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      const isDisabled = await page.evaluate(el => el.disabled, button);
      
      if (text && text.includes('Mint') && !isDisabled) {
        console.log(`Found mint button: ${text}`);
        await button.click();
        mintButtonFound = true;
        break;
      }
    }
    
    if (!mintButtonFound) {
      console.log('No mint button found');
      return;
    }
    
    // Wait for minting to complete
    console.log('Waiting for minting to complete...');
    await page.waitForTimeout(15000);
    
    // Take a screenshot
    await page.screenshot({ path: 'nft-minting-result.png' });
    console.log('Screenshot saved as "nft-minting-result.png"');
    
    console.log('Test completed!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(console.error);