/**
 * Simple HTTPS test for XRPL
 */
const https = require('https');

// URL to test
const url = 'https://34.88.230.243';

// Make a POST request to the XRPL node
function makeHttpsRequest() {
  return new Promise((resolve, reject) => {
    console.log(`Testing HTTPS connection to ${url}`);
    
    // Create the request data
    const data = JSON.stringify({
      method: 'server_info',
      params: [{}]
    });
    
    // Parse the URL
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      // For testing, we might need to ignore certificate validation
      rejectUnauthorized: false
    };
    
    console.log('Request options:', options);
    
    const req = https.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
        console.log(`Received chunk: ${chunk.length} bytes`);
      });
      
      res.on('end', () => {
        console.log('Response complete');
        console.log('Response data:', responseData);
        
        try {
          if (responseData) {
            const parsedData = JSON.parse(responseData);
            console.log('Parsed response:', JSON.stringify(parsedData, null, 2));
            resolve(parsedData);
          } else {
            console.log('Empty response');
            resolve({});
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    console.log('Sending data:', data);
    req.write(data);
    req.end();
    console.log('Request sent');
  });
}

// Try a simple HTTPS GET request
function makeSimpleGet() {
  return new Promise((resolve, reject) => {
    console.log(`Making simple HTTPS GET to ${url}`);
    
    const options = {
      method: 'GET',
      rejectUnauthorized: false
    };
    
    https.get(url, options, (res) => {
      console.log(`Status code: ${res.statusCode}`);
      console.log('Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response data:', data);
        resolve(data);
      });
    }).on('error', (error) => {
      console.error('GET request error:', error);
      reject(error);
    });
  });
}

async function main() {
  console.log('Starting HTTPS tests...');
  
  try {
    // First try a simple GET
    console.log('\n=== Testing simple GET ===');
    await makeSimpleGet();
    
    // Then try the POST for server_info
    console.log('\n=== Testing POST server_info ===');
    const result = await makeHttpsRequest();
    
    console.log('Test completed successfully');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

main()
  .then(success => {
    console.log(`\nOverall test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });