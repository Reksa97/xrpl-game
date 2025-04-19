/**
 * Test that the frontend can successfully connect to the XRPL node
 */
const http = require('http');

// Test the proxy server
function testProxyServer() {
  return new Promise((resolve, reject) => {
    console.log('Testing proxy server connection...');
    
    // Create a server_info request
    const data = JSON.stringify({
      method: 'submit',
      params: [{
        tx_json: {
          TransactionType: 'AccountSet',
          Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh' // Master account
        },
        secret: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb' // Master secret
      }]
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/xrpl-proxy',
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
      });
      
      res.on('end', () => {
        try {
          console.log('Raw response:', responseData);
          
          if (responseData) {
            const parsedData = JSON.parse(responseData);
            console.log('Parsed response:', JSON.stringify(parsedData, null, 2));
            
            // Check if it's a valid XRPL response
            if (parsedData.result) {
              console.log('\nTransaction Information:');
              console.log(`- Engine Result: ${parsedData.result.engine_result}`);
              console.log(`- Engine Result Message: ${parsedData.result.engine_result_message}`);
              
              // Check for success
              const isSuccess = parsedData.result.engine_result === 'tesSUCCESS' || 
                                parsedData.result.engine_result.startsWith('tes');
              
              resolve({
                success: isSuccess,
                data: parsedData
              });
            } else {
              resolve({
                success: false,
                error: 'Invalid XRPL response',
                data: parsedData
              });
            }
          } else {
            console.log('Empty response');
            resolve({
              success: false,
              error: 'Empty response'
            });
          }
        } catch (error) {
          console.error('Error processing response:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Test the frontend HTTP connection directly
function testDirectConnection() {
  return new Promise((resolve, reject) => {
    console.log('\nTesting direct connection to XRPL node...');
    
    // Create a server_info request
    const data = JSON.stringify({
      method: 'server_info',
      params: [{}]
    });
    
    const options = {
      hostname: '34.88.230.243',
      port: 51234,
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
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (responseData) {
            const parsedData = JSON.parse(responseData);
            console.log('Parsed response:', JSON.stringify(parsedData, null, 2).substring(0, 200) + '...');
            
            // Check if it's a valid XRPL response
            if (parsedData.result && parsedData.result.info) {
              console.log('\nServer Information:');
              console.log(`- Server State: ${parsedData.result.info.server_state}`);
              console.log(`- Complete Ledgers: ${parsedData.result.info.complete_ledgers}`);
              
              resolve({
                success: true,
                data: parsedData
              });
            } else {
              resolve({
                success: false,
                error: 'Invalid XRPL response',
                data: parsedData
              });
            }
          } else {
            console.log('Empty response');
            resolve({
              success: false,
              error: 'Empty response'
            });
          }
        } catch (error) {
          console.error('Error processing response:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Main function
async function main() {
  console.log('==================================================');
  console.log(' Frontend XRPL Connection Test');
  console.log('==================================================');
  
  try {
    // First test direct connection
    const directResult = await testDirectConnection();
    
    // Then test proxy server
    const proxyResult = await testProxyServer();
    
    const success = directResult.success && proxyResult.success;
    
    if (success) {
      console.log('\n✅ All connections successful!');
    } else {
      console.log('\n❌ Some connections failed!');
      
      if (!directResult.success) {
        console.log('  - Direct connection failed');
      }
      
      if (!proxyResult.success) {
        console.log('  - Proxy server connection failed');
      }
    }
    
    return success;
  } catch (error) {
    console.error(`\n❌ Test failed with error: ${error.message}`);
    return false;
  }
}

// Run the test
main()
  .then(success => {
    console.log(`\nTest ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });