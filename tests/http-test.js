/**
 * Simple HTTP test for XRPL
 */
const http = require('http');

// URL to test
const url = 'http://34.88.230.243:80';

// Make a POST request to the XRPL node
function makeRequest() {
  return new Promise((resolve, reject) => {
    console.log(`Testing connection to ${url}`);
    
    // Create the request data
    const data = JSON.stringify({
      method: 'server_info',
      params: [{}]
    });
    
    // Parse the URL
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    console.log('Request options:', options);
    
    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
        console.log(`Received chunk: ${chunk.length} bytes`);
      });
      
      res.on('end', () => {
        console.log('Response complete');
        console.log('Response data:', responseData.substring(0, 200) + '...');
        
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

async function main() {
  console.log('Starting HTTP test...');
  
  try {
    const result = await makeRequest();
    console.log('Test completed successfully with result:', result);
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

main()
  .then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });