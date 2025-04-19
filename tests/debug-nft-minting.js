const puppeteer = require('puppeteer');

/**
 * Utility function to extract detailed console logs with timestamps
 */
function formatLogEntry(entry) {
  const timestamp = new Date().toISOString();
  const type = entry.type().padEnd(7);
  return `[${timestamp}] ${type}: ${entry.text()}`;
}

/**
 * Main testing function
 */
async function testNftMinting() {
  console.log('Starting NFT minting debug test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Enable more verbose logging for network requests
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    if (request.url().includes('ws://') || request.url().includes('xrpl')) {
      console.log(`[NETWORK] Request: ${request.method()} ${request.url()}`);
    }
    request.continue();
  });
  
  page.on('response', response => {
    if (response.url().includes('ws://') || response.url().includes('xrpl')) {
      console.log(`[NETWORK] Response: ${response.status()} ${response.url()}`);
    }
  });
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = formatLogEntry(msg);
    consoleLogs.push(logEntry);
    
    // Print important logs immediately
    if (
      msg.text().includes('NFT') || 
      msg.text().includes('mint') || 
      msg.text().includes('XRPL') ||
      msg.text().includes('error') ||
      msg.text().includes('fail')
    ) {
      console.log(logEntry);
    }
  });
  
  // Handle dialog boxes (alerts, confirms, prompts)
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });
  
  try {
    // Step 1: Navigate to application
    console.log('\n=== Step 1: Opening application ===');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Step 2: Check XRPL connection
    console.log('\n=== Step 2: Checking XRPL connection ===');
    // Wait a bit for connections to establish
    await page.waitForTimeout(3000);
    
    // Check page for connection indicators
    const connectionStatus = await page.evaluate(() => {
      // Look for any error messages in the DOM
      const errorElements = Array.from(document.querySelectorAll('*'))
        .filter(el => el.textContent?.includes('Error') || el.textContent?.includes('failed'));
      
      return {
        title: document.title,
        hasErrors: errorElements.length > 0,
        errorMessages: errorElements.map(el => el.textContent).join(', ')
      };
    });
    
    console.log('Connection status:', connectionStatus);
    
    // Step 3: Find and navigate to NFT/Pet section
    console.log('\n=== Step 3: Finding Pet/NFT section ===');
    const navigationResult = await page.evaluate(() => {
      // Look for links to NFT/Pet sections
      const links = Array.from(document.querySelectorAll('a'))
        .filter(a => a.textContent?.includes('Pet') || 
                     a.textContent?.includes('NFT') || 
                     a.textContent?.includes('Egg'));
      
      // Return data about what was found
      return {
        foundLinks: links.map(a => ({ 
          text: a.textContent, 
          href: a.href,
          isActive: a.classList.contains('active') || a.getAttribute('aria-current') === 'page'
        }))
      };
    });
    
    console.log('Navigation options:', navigationResult);
    
    // Try to navigate to Pet/NFT section if not already there
    let navigated = false;
    if (navigationResult.foundLinks.length > 0) {
      const targetLink = navigationResult.foundLinks.find(l => !l.isActive);
      if (targetLink) {
        console.log(`Navigating to: ${targetLink.text}`);
        // Use the link's href for navigation
        await page.goto(targetLink.href);
        navigated = true;
        await page.waitForTimeout(2000);
      } else {
        console.log('Already on the correct page');
      }
    }
    
    if (!navigated) {
      console.log('Could not find navigation link, continuing on current page');
    }
    
    // Take a screenshot of the current state
    await page.screenshot({ path: './nft-before-mint.png', fullPage: true });
    console.log('Screenshot saved: nft-before-mint.png');
    
    // Step 4: Find and click the mint button
    console.log('\n=== Step 4: Finding mint button ===');
    
    // Extract all buttons with their text
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .map(btn => ({
          text: btn.textContent?.trim(),
          isDisabled: btn.disabled,
          classes: btn.className
        }));
    });
    
    console.log('Available buttons:', buttons);
    
    // Look for mint button
    const mintButtonSelector = 'button:not([disabled]):not([aria-disabled="true"])'
      + ':is(:has-text("Mint"), :has-text("mint"))';
    
    console.log(`Looking for mint button with selector: ${mintButtonSelector}`);
    
    try {
      await page.waitForSelector(mintButtonSelector, { timeout: 5000 });
      
      // Take a screenshot before clicking
      await page.screenshot({ path: './nft-found-mint-button.png' });
      console.log('Found mint button, screenshot saved: nft-found-mint-button.png');
      
      // Click the mint button
      console.log('Clicking mint button...');
      await page.click(mintButtonSelector);
      
      // Wait for minting to start
      await page.waitForTimeout(3000);
      await page.screenshot({ path: './nft-minting-started.png' });
      console.log('Minting started, screenshot saved: nft-minting-started.png');
      
      // Wait for minting to complete (this could take time)
      console.log('Waiting for minting to complete...');
      await page.waitForTimeout(15000);
      
      // Final screenshot after minting
      await page.screenshot({ path: './nft-after-mint.png', fullPage: true });
      console.log('Screenshot saved: nft-after-mint.png');
      
      // Step 5: Verify result
      console.log('\n=== Step 5: Verifying result ===');
      
      // Look for success indicators or new NFTs
      const verificationResult = await page.evaluate(() => {
        // Check for new badge or any indication of success
        const newBadges = Array.from(document.querySelectorAll('*'))
          .filter(el => (el.textContent?.includes('New') && el.getBoundingClientRect().width < 100) || 
                       el.className?.includes('new'));
        
        // Look for NFT elements
        const nftElements = Array.from(document.querySelectorAll('[key]'));
        
        // Check for success messages
        const successIndicators = Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent?.includes('success') || 
                       el.textContent?.includes('Success') ||
                       el.textContent?.includes('minted'));
        
        return {
          newBadgesFound: newBadges.length,
          nftElementsCount: nftElements.length,
          successIndicatorsFound: successIndicators.length,
          pageText: document.body.textContent
        };
      });
      
      console.log('Verification result:', verificationResult);
      
      if (
        verificationResult.newBadgesFound > 0 || 
        verificationResult.successIndicatorsFound > 0
      ) {
        console.log('✅ SUCCESS: NFT appears to have been minted successfully!');
      } else {
        console.log('⚠️ UNCERTAIN: Could not definitively confirm successful minting');
      }
      
    } catch (error) {
      console.error('Error finding or clicking mint button:', error.message);
      
      // Try a more generic button selector as fallback
      console.log('Trying alternative button selection method...');
      
      // Take a screenshot of the current state
      await page.screenshot({ path: './nft-mint-button-not-found.png', fullPage: true });
      
      const allButtons = await page.$$('button');
      console.log(`Found ${allButtons.length} buttons`);
      
      for (const button of allButtons) {
        const buttonText = await page.evaluate(el => el.textContent, button);
        const isDisabled = await page.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true', button);
        
        if (buttonText && buttonText.toLowerCase().includes('mint') && !isDisabled) {
          console.log(`Found alternative mint button with text: ${buttonText}`);
          await button.click();
          console.log('Clicked alternative mint button');
          
          // Wait for minting to complete
          await page.waitForTimeout(15000);
          
          // Take a final screenshot
          await page.screenshot({ path: './nft-after-mint-alternative.png', fullPage: true });
          console.log('Screenshot saved: nft-after-mint-alternative.png');
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: './nft-minting-error.png', fullPage: true });
    console.log('Error screenshot saved: nft-minting-error.png');
  } finally {
    // Save all console logs to a file
    const fs = require('fs');
    fs.writeFileSync('./browser-console-logs.txt', consoleLogs.join('\n'));
    console.log('Browser console logs saved to browser-console-logs.txt');
    
    // Close browser
    await browser.close();
    console.log('Test completed');
  }
}

// Run the test
testNftMinting().catch(console.error);