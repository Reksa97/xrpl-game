/**
 * Simple test to fetch XRPL status by making a direct request
 */
const http = require('http');

// Target URLs
const urls = [
  'http://34.88.230.243:80',
  'http://34.88.230.243:51234'
];

// HTTP request helper
function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Making request to ${url}`);
      
      // Parse the URL
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname || '/',
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 seconds timeout
      };
      
      const req = http.request(options, (res) => {
        console.log(`Response status: ${res.statusCode}`);
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        console.error(`Request error: ${error.message}`);
        reject(error);
      });
      
      req.on('timeout', () => {
        console.log('Request timed out');
        req.destroy();
        reject(new Error('Request timed out'));
      });
      
      if (data) {
        const payload = JSON.stringify(data);
        req.write(payload);
      }
      
      req.end();
    } catch (error) {
      console.error(`Exception: ${error.message}`);
      reject(error);
    }
  });
}

async function testUrl(url) {
  console.log(`\nTesting ${url}...`);
  
  try {
    // Try server_info command
    const response = await makeRequest(url, 'POST', {
      method: 'server_info',
      params: []
    });
    
    console.log('Response data:', response.data);
    return true;
  } catch (error) {
    console.log(`Failed to connect to ${url}: ${error.message}`);
    
    // Try a basic GET request
    try {
      console.log('Trying simple GET request...');
      const getResponse = await makeRequest(url, 'GET');
      console.log('GET response:', getResponse.data);
      return true;
    } catch (getError) {
      console.log(`GET request failed: ${getError.message}`);
      return false;
    }
  }
}

async function main() {
  console.log('=======================================');
  console.log('  XRPL Connection Test');
  console.log('=======================================');
  
  let success = false;
  
  for (const url of urls) {
    const result = await testUrl(url);
    if (result) success = true;
  }
  
  console.log('\n=======================================');
  console.log(`Overall result: ${success ? 'At least one connection succeeded' : 'All connections failed'}`);
  console.log('=======================================');
  
  return success;
}

main()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });