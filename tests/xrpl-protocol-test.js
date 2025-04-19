/**
 * XRPL Protocol Test
 * 
 * This test tries to connect to an XRPL node using different protocols
 * and port combinations to determine which work best.
 */
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

// Host to test
const HOST = '34.88.230.243';

// Combinations to test
const combinations = [
  { protocol: 'ws', port: 51234, description: 'WebSocket public JSON-RPC API' },
  { protocol: 'wss', port: 51234, description: 'Secure WebSocket public JSON-RPC API' },
  { protocol: 'http', port: 80, description: 'HTTP JSON-RPC API' },
  { protocol: 'https', port: 443, description: 'HTTPS JSON-RPC API' },
  { protocol: 'ws', port: 5005, description: 'Admin WebSocket API (less secure)' },
  { protocol: 'ws', port: 6006, description: 'Admin HTTP API (less secure)' },
];

// Command to test
const testCommand = {
  method: 'server_info',
  params: [{}]
};

// Utility function to create URL
function createUrl(combination) {
  return `${combination.protocol}://${HOST}:${combination.port}`;
}

// Test HTTP/HTTPS connection
function testHttpConnection(combination) {
  return new Promise((resolve) => {
    const url = createUrl(combination);
    console.log(`Testing ${url} (${combination.description})...`);
    
    const httpModule = combination.protocol === 'https' ? https : http;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
      ...(combination.protocol === 'https' ? { rejectUnauthorized: false } : {})
    };
    
    const data = JSON.stringify(testCommand);
    
    try {
      const req = httpModule.request(url, options, (res) => {
        console.log(`- Status Code: ${res.statusCode}`);
        
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            if (responseData) {
              const parsedData = JSON.parse(responseData);
              console.log('- Response:', JSON.stringify(parsedData, null, 2).substring(0, 200) + '...');
              resolve({ success: true, url, response: parsedData });
            } else {
              console.log('- Empty response');
              resolve({ success: false, url, error: 'Empty response' });
            }
          } catch (error) {
            console.log(`- Error parsing response: ${error.message}`);
            console.log(`- Raw response: ${responseData.substring(0, 100)}...`);
            resolve({ success: false, url, error: `Parse error: ${error.message}` });
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
      
      req.write(data);
      req.end();
    } catch (error) {
      console.log(`- Exception: ${error.message}`);
      resolve({ success: false, url, error: `Exception: ${error.message}` });
    }
  });
}

// Test WebSocket connection
function testWsConnection(combination) {
  return new Promise((resolve) => {
    const url = createUrl(combination);
    console.log(`Testing ${url} (${combination.description})...`);
    
    try {
      const ws = new WebSocket(url);
      let timeout = setTimeout(() => {
        console.log('- Connection timed out');
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        resolve({ success: false, url, error: 'Connection timeout' });
      }, 5000);
      
      ws.on('open', () => {
        console.log('- WebSocket connection opened');
        
        const id = Date.now();
        const request = {
          id,
          command: 'server_info'
        };
        
        try {
          ws.send(JSON.stringify(request));
        } catch (error) {
          clearTimeout(timeout);
          console.log(`- Error sending message: ${error.message}`);
          ws.close();
          resolve({ success: false, url, error: `Send error: ${error.message}` });
        }
      });
      
      ws.on('message', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          console.log('- Response:', JSON.stringify(response, null, 2).substring(0, 200) + '...');
          ws.close();
          resolve({ success: true, url, response });
        } catch (error) {
          console.log(`- Error parsing response: ${error.message}`);
          ws.close();
          resolve({ success: false, url, error: `Parse error: ${error.message}` });
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`- WebSocket error: ${error.message}`);
        resolve({ success: false, url, error: error.message });
      });
      
      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (code !== 1000) {
          console.log(`- WebSocket closed abnormally: ${code} ${reason}`);
          resolve({ success: false, url, error: `Closed: ${code} ${reason}` });
        }
      });
    } catch (error) {
      console.log(`- Exception: ${error.message}`);
      resolve({ success: false, url, error: `Exception: ${error.message}` });
    }
  });
}

// Main test function
async function runTests() {
  console.log('==================================================');
  console.log(' XRPL Protocol Test for host:', HOST);
  console.log('==================================================');
  
  const results = [];
  
  // First test port connectivity with tcp
  console.log('\nTesting TCP connectivity to ports:');
  for (const combination of combinations) {
    try {
      const { port } = combination;
      const command = `nc -zv -w 2 ${HOST} ${port} 2>&1`;
      const { execSync } = require('child_process');
      const output = execSync(command).toString();
      console.log(`- Port ${port}: ${output.includes('succeeded') ? 'Open' : 'Closed'}`);
    } catch (error) {
      console.log(`- Port ${combination.port}: Closed or connection refused`);
    }
  }
  
  // Test each protocol combination
  console.log('\nTesting protocol combinations:');
  for (const combination of combinations) {
    if (combination.protocol === 'ws' || combination.protocol === 'wss') {
      const result = await testWsConnection(combination);
      results.push({ combination, result });
    } else {
      const result = await testHttpConnection(combination);
      results.push({ combination, result });
    }
    console.log('--------------------------------------------------');
  }
  
  // Summarize results
  console.log('\n==================================================');
  console.log(' Results Summary');
  console.log('==================================================');
  
  const successful = results.filter(r => r.result.success);
  
  if (successful.length > 0) {
    console.log('\nSuccessful connections:');
    successful.forEach(({ combination, result }) => {
      console.log(`✅ ${createUrl(combination)} (${combination.description})`);
      
      // Check for XRPL features in the response
      const serverInfo = result.response?.result?.info;
      if (serverInfo) {
        console.log(`   - Server state: ${serverInfo.server_state}`);
        console.log(`   - Complete ledgers: ${serverInfo.complete_ledgers}`);
        
        // Check for NFT support
        const amendments = serverInfo.amendments || [];
        const hasNFTSupport = amendments.some(a => 
          a.includes('NFToken') || a.includes('NonFungibleTokens')
        );
        console.log(`   - NFT support: ${hasNFTSupport ? 'Yes' : 'No'}`);
      }
    });
  } else {
    console.log('\n❌ No successful connections found.');
  }
  
  // Show all failed connections
  const failed = results.filter(r => !r.result.success);
  if (failed.length > 0) {
    console.log('\nFailed connections:');
    failed.forEach(({ combination, result }) => {
      console.log(`❌ ${createUrl(combination)} - ${result.error}`);
    });
  }
  
  // Provide recommended configuration
  console.log('\n==================================================');
  console.log(' Recommendations');
  console.log('==================================================');
  
  if (successful.length > 0) {
    console.log('\nRecommended connection URL for frontend:');
    const bestChoice = successful[0];
    console.log(`${createUrl(bestChoice.combination)}`);
    console.log(`Protocol: ${bestChoice.combination.protocol}`);
  } else {
    console.log('\nNo working connections found. Recommendations:');
    console.log('1. Check that the XRPL node is running properly');
    console.log('2. Verify firewall rules allow the following ports:');
    console.log('   - TCP 51234 (WebSocket JSON-RPC API)');
    console.log('   - TCP 80 (HTTP JSON-RPC API)');
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