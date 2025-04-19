const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting NFT minting test...');
  
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