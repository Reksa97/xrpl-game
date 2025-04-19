/**
 * Test JSON-RPC connectivity to XRPL at port 51234
 * This tests HTTP JSON-RPC instead of WebSocket
 */
const http = require('http');

// URL to test
const HOST = '34.88.230.243';
const PORT = 51234;

function testJsonRpcConnection() {
  return new Promise((resolve, reject) => {
    console.log(`Testing HTTP JSON-RPC at ${HOST}:${PORT}...`);
    
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
      },
      timeout: 10000
    };
    
    console.log('Request options:', options);
    
    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
        console.log(`Received ${chunk.length} bytes`);
      });
      
      res.on('end', () => {
        console.log('Response complete');
        
        try {
          if (responseData) {
            console.log('Raw response:', responseData);
            
            try {
              const parsedData = JSON.parse(responseData);
              console.log('Parsed response:', JSON.stringify(parsedData, null, 2));
              
              // Check if it's a valid XRPL response
              if (parsedData.result && parsedData.result.info) {
                console.log('\nServer Information:');
                console.log(`- Server State: ${parsedData.result.info.server_state}`);
                console.log(`- Complete Ledgers: ${parsedData.result.info.complete_ledgers}`);
                
                // Check for NFT support
                const amendments = parsedData.result.info.amendments || [];
                const hasNFTSupport = amendments.some(a => 
                  a.includes('NFToken') || a.includes('NonFungibleToken')
                );
                console.log(`- NFT Support: ${hasNFTSupport ? 'YES' : 'NO'}`);
              }
              
              resolve({
                success: true,
                status: res.statusCode,
                data: parsedData
              });
            } catch (error) {
              console.error('Error parsing JSON:', error.message);
              resolve({
                success: false,
                status: res.statusCode,
                error: 'Invalid JSON response',
                raw: responseData
              });
            }
          } else {
            console.log('Empty response');
            resolve({
              success: false,
              status: res.statusCode,
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
    
    req.on('timeout', () => {
      console.log('Request timed out');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    console.log('Sending data:', data);
    req.write(data);
    req.end();
    console.log('Request sent');
  });
}

// Main function
async function main() {
  console.log('==================================================');
  console.log(' XRPL JSON-RPC HTTP Test at port 51234');
  console.log('==================================================');
  
  try {
    const result = await testJsonRpcConnection();
    
    if (result.success) {
      console.log('\n✅ Successfully connected to XRPL JSON-RPC API');
      return true;
    } else {
      console.log(`\n❌ Response indicates failure: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Failed to connect: ${error.message}`);
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