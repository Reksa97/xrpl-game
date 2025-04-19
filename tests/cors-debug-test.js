/**
 * CORS Debug Test
 * 
 * This test captures browser console logs to detect CORS and connection issues
 */
const puppeteer = require('puppeteer');

// URLs to test
const FRONTEND_URL = 'http://localhost:3002';

async function runTest() {
  console.log('Starting browser to debug CORS issues...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    const consoleMessages = [];
    page.on('console', message => {
      const text = message.text();
      console.log(`BROWSER: ${text}`);
      consoleMessages.push({
        type: message.type(),
        text: text
      });
    });
    
    // Capture network errors
    page.on('pageerror', error => {
      console.error(`PAGE ERROR: ${error.message}`);
    });
    
    // Capture request failures
    page.on('requestfailed', request => {
      console.error(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
    });
    
    // Go to the frontend page
    console.log(`Navigating to ${FRONTEND_URL}...`);
    await page.goto(FRONTEND_URL, { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    // Wait for potential errors (connection attempts)
    console.log('Waiting for 10 seconds to capture connection attempts...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Take a screenshot
    await page.screenshot({ path: 'cors-debug.png', fullPage: true });
    console.log('Screenshot saved to cors-debug.png');
    
    // Analyze results
    console.log('\nAnalyzing console messages:');
    
    // Count error types
    const corsErrors = consoleMessages.filter(m => 
      m.text.includes('blocked by CORS policy') || 
      m.text.includes('Access-Control-Allow-Origin')
    );
    
    const wsErrors = consoleMessages.filter(m => 
      m.text.includes('WebSocket connection') && 
      m.text.includes('failed')
    );
    
    const httpErrors = consoleMessages.filter(m => 
      m.text.includes('HTTP request failed')
    );
    
    // Display summary
    console.log(`\nError Summary:`);
    console.log(`- CORS Errors: ${corsErrors.length}`);
    console.log(`- WebSocket Errors: ${wsErrors.length}`);
    console.log(`- HTTP Request Errors: ${httpErrors.length}`);
    
    if (corsErrors.length > 0) {
      console.log(`\nCORS Error Details:`);
      corsErrors.forEach((err, i) => {
        console.log(`${i+1}. ${err.text.substring(0, 150)}...`);
      });
    }
    
    // Check if the app is trying to use the proxy
    const proxyUsage = consoleMessages.filter(m => 
      m.text.includes('/api/xrpl-proxy')
    );
    
    console.log(`\nProxy Usage: ${proxyUsage.length > 0 ? 'YES' : 'NO'}`);
    
    // Check if direct connection is attempted first
    const directConnectAttempts = consoleMessages.filter(m => 
      m.text.includes('34.88.230.243:51234') || 
      m.text.includes('Making HTTP request')
    );
    
    console.log(`Direct Connection Attempts: ${directConnectAttempts.length}`);
    
    return {
      corsErrors,
      wsErrors,
      httpErrors,
      proxyUsage,
      directConnectAttempts
    };
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Main function
async function main() {
  console.log('==================================================');
  console.log(' CORS and Connection Issues Debug Test');
  console.log('==================================================');
  
  try {
    const results = await runTest();
    
    // Provide recommendations
    console.log('\n==================================================');
    console.log(' Recommendations');
    console.log('==================================================');
    
    if (results.corsErrors.length > 0) {
      console.log('\n1. CORS Issues Detected:');
      console.log('   - The browser cannot directly connect to the XRPL node due to CORS restrictions');
      console.log('   - Make sure the proxy server is running: node server.js');
      console.log('   - Ensure the frontend uses the proxy for all XRPL API requests');
      console.log('   - Update ConnectionStatus.tsx to prioritize proxy connections');
    }
    
    if (results.directConnectAttempts.length > 0 && results.proxyUsage.length === 0) {
      console.log('\n2. Direct Connection Only:');
      console.log('   - The app is only trying direct connections, not using the proxy');
      console.log('   - Update the code to use /api/xrpl-proxy instead of direct connections');
    }
    
    if (results.proxyUsage.length > 0 && results.corsErrors.length > 0) {
      console.log('\n3. Proxy Available But Not Used Correctly:');
      console.log('   - Proxy endpoint detected, but still seeing CORS errors');
      console.log('   - Check that ALL XRPL requests go through the proxy');
    }
    
    console.log('\nSummary:');
    if (results.corsErrors.length === 0 && results.wsErrors.length === 0 && results.httpErrors.length === 0) {
      console.log('✅ No connection errors detected!');
      return true;
    } else {
      console.log('❌ Connection issues detected. See recommendations above.');
      return false;
    }
  } catch (error) {
    console.error(`Test error: ${error.message}`);
    return false;
  }
}

// Run the test
main()
  .then(success => {
    console.log(`\nTest completed ${success ? 'successfully' : 'with issues'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });