/**
 * Test specific HTTP connectivity to ports 80 and 443
 */
const http = require('http');
const https = require('https');

// Host to test
const HOST = '34.88.230.243';

// URLs to test
const urls = [
  { protocol: 'http', port: 80, path: '/' },
  { protocol: 'http', port: 80, path: '/json_rpc' }, // Common RPC path
  { protocol: 'http', port: 80, path: '/rpc' },  // Another common RPC path
  { protocol: 'http', port: 80, path: '/ws' },   // Sometimes used for WS endpoint
  { protocol: 'https', port: 443, path: '/' },
  { protocol: 'https', port: 443, path: '/json_rpc' },
  { protocol: 'https', port: 443, path: '/rpc' },
  { protocol: 'https', port: 443, path: '/ws' }
];

// Test both GET and POST methods
const methods = ['GET', 'POST'];

// Command to test for POST
const testCommand = {
  method: 'server_info',
  params: [{}]
};

// Test HTTP/HTTPS connection
function testConnection(urlConfig, method) {
  return new Promise((resolve) => {
    const { protocol, port, path } = urlConfig;
    const url = `${protocol}://${HOST}:${port}${path}`;
    console.log(`Testing ${method} ${url}...`);
    
    const httpModule = protocol === 'https' ? https : http;
    const options = {
      hostname: HOST,
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 5000,
      ...(protocol === 'https' ? { rejectUnauthorized: false } : {})
    };
    
    const req = httpModule.request(options, (res) => {
      console.log(`- Status Code: ${res.statusCode}`);
      console.log(`- Headers:`, res.headers);
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log(`- Raw response: ${responseData.substring(0, 300)}...`);
          
          // Try to parse as JSON if possible
          if (responseData && responseData.trim().startsWith('{')) {
            try {
              const parsedData = JSON.parse(responseData);
              console.log('- Parsed JSON response:', JSON.stringify(parsedData, null, 2).substring(0, 200) + '...');
            } catch (e) {
              // Not JSON or invalid JSON
              console.log('- Not valid JSON');
            }
          }
          
          resolve({ 
            success: res.statusCode >= 200 && res.statusCode < 300, 
            url, 
            statusCode: res.statusCode,
            response: responseData,
            contentType: res.headers['content-type']
          });
        } catch (error) {
          console.log(`- Error processing response: ${error.message}`);
          resolve({ 
            success: false, 
            url, 
            statusCode: res.statusCode,
            error: `Process error: ${error.message}` 
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`- Error: ${error.message}`);
      resolve({ success: false, url, error: error.message });
    });
    
    req.on('timeout', () => {
      console.log('- Request timed out');
      req.destroy();
      resolve({ success: false, url, error: 'Timeout' });
    });
    
    // If POST, send the test command
    if (method === 'POST') {
      const data = JSON.stringify(testCommand);
      req.write(data);
    }
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('==================================================');
  console.log(' HTTP/HTTPS Test for host:', HOST);
  console.log('==================================================');
  
  const results = [];
  
  // Test each combination
  for (const urlConfig of urls) {
    for (const method of methods) {
      const result = await testConnection(urlConfig, method);
      results.push({ urlConfig, method, result });
      console.log('--------------------------------------------------');
    }
  }
  
  // Summarize results
  console.log('\n==================================================');
  console.log(' Results Summary');
  console.log('==================================================');
  
  const successful = results.filter(r => r.result.success);
  
  if (successful.length > 0) {
    console.log('\nSuccessful connections:');
    successful.forEach(({ urlConfig, method, result }) => {
      const { protocol, port, path } = urlConfig;
      console.log(`✅ ${method} ${protocol}://${HOST}:${port}${path}`);
      console.log(`   - Status Code: ${result.statusCode}`);
      console.log(`   - Content Type: ${result.contentType || 'unknown'}`);
      
      // Check if it seems to be a valid XRPL response
      const isXrplResponse = result.response && (
        result.response.includes('server_info') || 
        result.response.includes('rippled') ||
        result.response.includes('XRPL')
      );
      console.log(`   - Appears to be XRPL API: ${isXrplResponse ? 'Yes' : 'No'}`);
    });
  } else {
    console.log('\n❌ No successful connections found.');
  }
  
  // Show promising non-2xx responses that might still be useful
  const promising = results.filter(r => !r.result.success && r.result.statusCode && r.result.statusCode !== 0);
  if (promising.length > 0) {
    console.log('\nPromising connections (returned response but not 2xx):');
    promising.forEach(({ urlConfig, method, result }) => {
      const { protocol, port, path } = urlConfig;
      console.log(`⚠️ ${method} ${protocol}://${HOST}:${port}${path}`);
      console.log(`   - Status Code: ${result.statusCode}`);
    });
  }
  
  // Provide recommended configuration
  console.log('\n==================================================');
  console.log(' Recommendations');
  console.log('==================================================');
  
  if (successful.length > 0) {
    // Find the most promising successful result
    const xrplResponses = successful.filter(r => 
      r.result.response && (
        r.result.response.includes('server_info') || 
        r.result.response.includes('rippled') ||
        r.result.response.includes('XRPL')
      )
    );
    
    if (xrplResponses.length > 0) {
      const bestChoice = xrplResponses[0];
      const { protocol, port, path } = bestChoice.urlConfig;
      console.log('\nRecommended XRPL endpoint:');
      console.log(`${protocol}://${HOST}:${port}${path}`);
      console.log(`Method: ${bestChoice.method}`);
    } else {
      const bestChoice = successful[0];
      const { protocol, port, path } = bestChoice.urlConfig;
      console.log('\nRecommended HTTP endpoint (note: might not be XRPL API):');
      console.log(`${protocol}://${HOST}:${port}${path}`);
      console.log(`Method: ${bestChoice.method}`);
    }
  } else if (promising.length > 0) {
    const bestChoice = promising[0];
    const { protocol, port, path } = bestChoice.urlConfig;
    console.log('\nPossible endpoint to investigate:');
    console.log(`${protocol}://${HOST}:${port}${path}`);
    console.log(`Method: ${bestChoice.method}`);
    console.log(`Status: ${bestChoice.result.statusCode}`);
  } else {
    console.log('\nNo working connections found. Recommendations:');
    console.log('1. Check that the XRPL node is running properly');
    console.log('2. Verify firewall rules allow the following ports:');
    console.log('   - TCP 51234 (WebSocket JSON-RPC API)');
    console.log('   - TCP 80 (HTTP JSON-RPC API) with proper routing');
  }
  
  return successful.length > 0;
}

// Run tests
runTests()
  .then(success => {
    console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });