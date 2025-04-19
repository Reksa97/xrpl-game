/**
 * Test WebSocket connectivity to XRPL at port 51234
 */
const WebSocket = require('ws');

// URL to test
const WS_URL = 'ws://34.88.230.243:51234';

function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to WebSocket at ${WS_URL}...`);
    
    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch (err) {
      console.error(`Error creating WebSocket: ${err.message}`);
      return reject(err);
    }
    
    const timeout = setTimeout(() => {
      console.log('Connection timed out');
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      reject(new Error('Connection timeout'));
    }, 10000);
    
    ws.on('open', () => {
      console.log('WebSocket connection opened successfully');
      
      // Send a server_info request to test the API
      const request = {
        id: Date.now(),
        command: 'server_info'
      };
      
      console.log('Sending server_info request...');
      ws.send(JSON.stringify(request));
    });
    
    ws.on('message', (data) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(data.toString());
        console.log('Received response:');
        console.log(JSON.stringify(response, null, 2));
        
        // Check if it's a valid XRPL response
        if (response.result && response.result.info) {
          console.log('\nServer Information:');
          console.log(`- Server State: ${response.result.info.server_state}`);
          console.log(`- Complete Ledgers: ${response.result.info.complete_ledgers}`);
          
          // Check for NFT support
          const amendments = response.result.info.amendments || [];
          const hasNFTSupport = amendments.some(a => 
            a.includes('NFToken') || a.includes('NonFungibleToken')
          );
          console.log(`- NFT Support: ${hasNFTSupport ? 'YES' : 'NO'}`);
        }
        
        ws.close();
        resolve(response);
      } catch (error) {
        console.error(`Error parsing response: ${error.message}`);
        ws.close();
        reject(error);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`WebSocket error: ${error.message}`);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      if (code !== 1000) {
        console.log(`WebSocket closed with code ${code}: ${reason}`);
      }
    });
  });
}

// Main function
async function main() {
  console.log('==================================================');
  console.log(' XRPL WebSocket Test at port 51234');
  console.log('==================================================');
  
  try {
    const response = await testWebSocketConnection();
    console.log('\n✅ Successfully connected to XRPL WebSocket API');
    return true;
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