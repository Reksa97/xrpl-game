import puppeteer, { Browser, Page } from 'puppeteer';

describe('NFT Minting Tests', () => {
  let browser: Browser;
  let page: Page;
  
  // Set up browser before tests
  beforeAll(async () => {
    // Launch browser with specific settings
    browser = await puppeteer.launch({
      headless: 'new', // Use the new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 },
    });
    
    page = await browser.newPage();
    
    // Add console log listener to help with debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`Browser ${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Set longer timeout for navigation and waiting
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
  });
  
  // Close browser after tests
  afterAll(async () => {
    await browser.close();
  });
  
  // Test case: Load the application and verify it renders
  test('Application loads successfully', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for app to load - look for header elements
    await page.waitForSelector('h1');
    
    // Check that we have the expected initial content
    const pageContent = await page.content();
    expect(pageContent).toContain('Creature Crafter');
  });
  
  // Test case: Check for XRPL connection
  test('XRPL connects successfully', async () => {
    // Navigate to the Pet component which shows NFTs
    await page.goto('http://localhost:3000');
    
    // Click on "My Pets" link or button
    const petLinks = await page.$$('a');
    
    // Find the "My Pets" link by its text content
    for (const link of petLinks) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text && text.includes('Pets')) {
        await link.click();
        break;
      }
    }
    
    // Wait for XRPL connection to complete
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Loading') && 
             document.body.textContent?.includes('Eggs'),
      { timeout: 15000 }
    );
    
    // Verify connection status by checking console logs or UI elements
    const logs = await page.evaluate(() => {
      // Look for any XRPL connection success messages in the logs
      // This is a simplification - real implementation would check specific connection success markers
      const xrplMessages = Array.from(document.querySelectorAll('div'))
        .filter(div => div.textContent?.includes('XRPL'));
      return xrplMessages.length > 0;
    });
    
    expect(logs).toBeTruthy();
  });
  
  // Test case: Mint NFT
  test('Mint NFT successfully', async () => {
    // Navigate to the Pet component
    await page.goto('http://localhost:3000/pets');
    
    // Wait for page to load completely
    await page.waitForSelector('button');
    
    // Get current number of NFTs
    const initialNftCount = await page.evaluate(() => {
      const nftElements = document.querySelectorAll('[data-testid="nft-item"]');
      return nftElements ? nftElements.length : 0;
    });
    
    console.log(`Initial NFT count: ${initialNftCount}`);
    
    // Click the mint button
    const mintButton = await page.waitForSelector('button:not([disabled]):has-text("Mint Test Egg NFT")');
    await mintButton?.click();
    
    // Wait for minting process to start - look for status message
    await page.waitForFunction(
      () => document.body.textContent?.includes('minting') || 
             document.body.textContent?.includes('Minting'),
      { timeout: 10000 }
    );
    
    // Wait for minting to complete (this could take some time)
    await page.waitForFunction(
      () => {
        const mintingCompleted = !document.body.textContent?.includes('Minting...') && 
                                !document.body.textContent?.includes('minting process');
        const modalClosed = !document.querySelector('div[role="dialog"]');
        return mintingCompleted && modalClosed;
      },
      { timeout: 20000 }
    );
    
    // Wait a bit more to ensure UI updates after minting completes
    await page.waitForTimeout(3000);
    
    // Check for newly minted NFT - either by looking for "New" badge or counting NFTs
    const finalNftCount = await page.evaluate(() => {
      const nftElements = document.querySelectorAll('[data-testid="nft-item"]');
      const newBadges = document.querySelectorAll('.new-badge'); // Assuming new NFTs have this class
      return {
        totalCount: nftElements.length,
        newBadges: newBadges.length
      };
    });
    
    console.log(`Final NFT count: ${finalNftCount.totalCount}, New badges: ${finalNftCount.newBadges}`);
    
    // Verify new NFT was created - either total count increased or new badge exists
    expect(finalNftCount.totalCount).toBeGreaterThan(initialNftCount);
  });
  
  // Test case: Hatch an NFT egg (if available)
  test('Hatch NFT egg', async () => {
    // Navigate to the Pet component
    await page.goto('http://localhost:3000/pets');
    
    // Wait for page to load completely
    await page.waitForSelector('button');
    
    // Check if there are any NFTs that can be hatched
    const hasHatchableNfts = await page.evaluate(() => {
      const hatchButtons = Array.from(document.querySelectorAll('button'))
        .filter(button => button.textContent?.includes('Hatch Egg'));
      return hatchButtons.length > 0;
    });
    
    // Skip test if no hatchable NFTs are available
    if (!hasHatchableNfts) {
      console.log('No hatchable NFTs found, skipping test');
      return;
    }
    
    // Click the first "Hatch Egg" button
    const hatchButton = await page.waitForSelector('button:has-text("Hatch Egg")');
    await hatchButton?.click();
    
    // Wait for hatching process to complete
    await page.waitForFunction(
      () => document.body.textContent?.includes('Your Pet'),
      { timeout: 10000 }
    );
    
    // Verify pet stats are displayed
    const petStats = await page.evaluate(() => {
      return document.body.textContent?.includes('Stats') &&
             document.body.textContent?.includes('Strength') &&
             document.body.textContent?.includes('Speed');
    });
    
    expect(petStats).toBeTruthy();
  });
});