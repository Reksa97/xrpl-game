/**
 * Simple server_info test for XRPL
 */
const http = require('http');

// URL to test
const HOST = '34.88.230.243';
const PORT = 51234;

function testServerInfo() {
  return new Promise((resolve, reject) => {
    console.log(`Testing server_info at ${HOST}:${PORT}...`);
    
    // Create the request data
    const data = JSON.stringify({
      method: 'server_info',
      params: [{}]
    });
    
    const options = {
      hostname: HOST,
      port: PORT,
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
        console.log('Response complete');
        
        try {
          if (responseData) {
            console.log('Raw response:', responseData);
            
            const parsedData = JSON.parse(responseData);
            console.log('Parsed response:', JSON.stringify(parsedData, null, 2));
            
            // Check if it's a valid XRPL response
            if (parsedData.result && parsedData.result.info) {
              console.log('\nServer Information:');
              console.log(`- Server State: ${parsedData.result.info.server_state}`);
              console.log(`- Complete Ledgers: ${parsedData.result.info.complete_ledgers}`);
              console.log(`- Server Version: ${parsedData.result.info.build_version}`);
              console.log(`- Validated Ledger Sequence: ${parsedData.result.info.validated_ledger?.seq}`);
              
              // Check for NFT support
              const amendments = parsedData.result.info.amendments || [];
              const hasNFTSupport = amendments.some(a => 
                a.includes('NFToken') || a.includes('NonFungibleToken')
              );
              console.log(`- NFT Support: ${hasNFTSupport ? 'YES' : 'NO'}`);
              
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

// Test the proxy server
function testProxyServer() {
  return new Promise((resolve, reject) => {
    console.log('\nTesting proxy server connection...');
    
    // Create a server_info request
    const data = JSON.stringify({
      method: 'server_info',
      params: [{}]
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
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log('Raw proxy response:', responseData);
          
          if (responseData) {
            const parsedData = JSON.parse(responseData);
            console.log('Parsed proxy response:', JSON.stringify(parsedData, null, 2));
            
            resolve({
              success: res.statusCode === 200,
              data: parsedData
            });
          } else {
            console.log('Empty proxy response');
            resolve({
              success: false,
              error: 'Empty response'
            });
          }
        } catch (error) {
          console.error('Error processing proxy response:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Proxy request error:', error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Main function
async function main() {
  console.log('==================================================');
  console.log(' XRPL Connection Test');
  console.log('==================================================');
  
  try {
    // Test direct connection first
    console.log('DIRECT CONNECTION TEST:');
    const directResult = await testServerInfo();
    
    // Then test through the proxy
    console.log('\nPROXY SERVER TEST:');
    const proxyResult = await testProxyServer();
    
    // Summarize results
    console.log('\n==================================================');
    console.log(' Test Results Summary:');
    console.log('==================================================');
    console.log(`Direct Connection: ${directResult.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Proxy Connection: ${proxyResult.success ? '✅ PASS' : '❌ FAIL'}`);
    
    const success = directResult.success; // Consider success if at least direct connection works
    return success;
  } catch (error) {
    console.error(`\n❌ Test failed with error: ${error.message}`);
    return false;
  }
}

// Run the test
main()
  .then(success => {
    console.log(`\nOverall Test: ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });