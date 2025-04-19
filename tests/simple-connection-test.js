/**
 * Simple XRPL Connection Test
 */

const http = require('http');
const WebSocket = require('ws');

// Configuration
const config = {
  wsUrl: 'ws://34.88.230.243:51234',
  httpUrl: 'http://34.88.230.243:80',
  timeout: 15000 // 15 seconds timeout
};

// HTTP request helper
function httpRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: config.timeout
    };

    console.log(`Making HTTP request to ${url}`);
    
    const req = http.request(url, options, (res) => {
      console.log(`HTTP Status: ${res.statusCode}`);
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (responseData) {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } else {
            resolve({ status: 'empty_response' });
          }
        } catch (error) {
          console.log(`Response data: ${responseData}`);
          reject(new Error(`Invalid JSON response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`HTTP request error: ${error.message}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('HTTP request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// WebSocket request helper
function wsRequest(url, command, params = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to WebSocket at ${url}`);
    
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.log(`WebSocket creation error: ${err.message}`);
      return reject(err);
    }
    
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('WebSocket request timeout');
        try { ws.close(); } catch (e) {}
        reject(new Error(`WebSocket request timeout for ${command}`));
      }
    }, config.timeout);
    
    ws.on('open', () => {
      console.log('WebSocket connection opened');
      const request = {
        id: Date.now(),
        command,
        ...params
      };
      
      ws.send(JSON.stringify(request));
    });
    
    ws.on('message', (data) => {
      console.log('WebSocket message received');
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        try {
          const response = JSON.parse(data.toString());
          ws.close();
          resolve(response);
        } catch (error) {
          console.log(`Parse error: ${error.message}`);
          ws.close();
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      }
    });
    
    ws.on('error', (error) => {
      console.log(`WebSocket error: ${error.message}`);
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch (e) {}
        reject(new Error(`WebSocket error: ${error.message}`));
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`WebSocket closed: ${code} - ${reason}`);
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(new Error(`WebSocket closed unexpectedly: ${code}`));
      }
    });
  });
}

// Test HTTP connection
async function testHttpConnection() {
  console.log('\nTesting HTTP connection...');
  try {
    const response = await httpRequest(config.httpUrl, 'POST', {
      method: 'server_info'
    });
    console.log('HTTP connection successful');
    console.log(JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.log(`HTTP connection failed: ${error.message}`);
    
    // Try a basic ping
    try {
      console.log('Trying basic HTTP GET request...');
      await httpRequest(config.httpUrl, 'GET');
      console.log('Basic HTTP GET successful');
      return true;
    } catch (e) {
      console.log(`Basic HTTP GET failed: ${e.message}`);
      return false;
    }
  }
}

// Test WebSocket connection
async function testWsConnection() {
  console.log('\nTesting WebSocket connection...');
  try {
    const response = await wsRequest(config.wsUrl, 'server_info');
    console.log('WebSocket connection successful');
    console.log(JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.log(`WebSocket connection failed: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTest() {
  console.log('=======================================');
  console.log('  Simple XRPL Connection Test');
  console.log('=======================================');
  console.log(`WebSocket URL: ${config.wsUrl}`);
  console.log(`HTTP URL: ${config.httpUrl}`);
  
  // Test HTTP first
  const httpSuccess = await testHttpConnection();
  
  // Test WebSocket
  const wsSuccess = await testWsConnection();
  
  // Summary
  console.log('\n=======================================');
  console.log('  Connection Test Results:');
  console.log(`  HTTP: ${httpSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`  WebSocket: ${wsSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log('=======================================');
  
  return httpSuccess || wsSuccess;
}

// Run the test
runTest().then(success => {
  console.log(`\nOverall test ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});