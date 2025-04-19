// XRPL Connection and NFT Feature Verification Tool
// No mocks - only real XRPL functionality

const WebSocket = require('ws');

// Configuration
const config = {
  urls: [
    'ws://localhost:6006', // Public WebSocket (mapped from container port 5005)
    'ws://localhost:5005', // Admin WebSocket (mapped from container port 6006)
  ],
  timeout: 10000 // Increased timeout
};

// Connect to XRPL WebSocket with timeout
async function connectToXrpl(url) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to ${url}...`);
    
    const ws = new WebSocket(url);
    let resolved = false;
    
    // Set connection timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error(`Connection timeout for ${url}`));
      }
    }, config.timeout);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`Connected successfully to ${url}`);
      resolved = true;
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Connection error for ${url}: ${error.message}`));
      }
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Connection closed for ${url}`));
      }
    });
  });
}

// Send request to XRPL with timeout
async function sendRequest(ws, command, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const request = {
      id,
      command,
      ...params
    };
    
    let resolved = false;
    
    // Set request timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Request timeout for command: ${command}`));
      }
    }, config.timeout);
    
    // Handle message
    const messageHandler = (message) => {
      try {
        const response = JSON.parse(message);
        if (response.id === id) {
          clearTimeout(timeout);
          ws.removeListener('message', messageHandler);
          resolved = true;
          resolve(response);
        }
      } catch (error) {
        console.warn('Failed to parse message:', error);
      }
    };
    
    ws.on('message', messageHandler);
    
    // Send the request
    ws.send(JSON.stringify(request));
  });
}

// Check server info and NFT features
async function checkServerInfo(ws) {
  console.log('\nChecking server info...');
  const response = await sendRequest(ws, 'server_info');
  
  // Display server info
  if (response.result && response.result.info) {
    const info = response.result.info;
    console.log(`Server state: ${info.server_state}`);
    console.log(`Validated ledger: ${info.validated_ledger?.seq || 'N/A'}`);
    console.log(`Complete ledgers: ${info.complete_ledgers}`);
    console.log(`Build version: ${info.build_version}`);
    
    // Check amendments
    const amendments = info.amendments || [];
    console.log(`\nTotal amendments enabled: ${amendments.length}`);
    
    // Look for NFT-related amendments
    const nftAmendments = amendments.filter(a => 
      a.includes('NFToken') || a.includes('NonFungibleTokens')
    );
    
    if (nftAmendments.length > 0) {
      console.log(`\n✅ Found ${nftAmendments.length} NFT-related amendments:`);
      nftAmendments.forEach(a => console.log(`  - ${a}`));
      return true;
    } else {
      console.log('\n❌ No NFT-related amendments found!');
      console.log('NFT features are NOT enabled on this XRPL node.');
      return false;
    }
  } else {
    console.log('Failed to get server info:', response);
    return false;
  }
}

// Check master account info
async function checkMasterAccount(ws) {
  console.log('\nChecking master account...');
  const masterAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  
  try {
    const response = await sendRequest(ws, 'account_info', {
      account: masterAddress
    });
    
    if (response.result && response.result.account_data) {
      const accountData = response.result.account_data;
      const balance = parseInt(accountData.Balance) / 1000000; // Convert drops to XRP
      
      console.log(`✅ Master account verified:`);
      console.log(`  Address: ${accountData.Account}`);
      console.log(`  Balance: ${balance} XRP`);
      console.log(`  Sequence: ${accountData.Sequence}`);
      
      return true;
    } else {
      console.log('❌ Failed to get master account info:', response);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking master account: ${error.message}`);
    return false;
  }
}

// Main verification function
async function verifyXrpl() {
  console.log('=================================');
  console.log('  XRPL Verification Tool (Real)  ');
  console.log('=================================');
  
  let ws = null;
  
  try {
    // Try to connect to each URL
    for (const url of config.urls) {
      try {
        ws = await connectToXrpl(url);
        break; // Stop if we successfully connect
      } catch (error) {
        console.log(`Failed to connect to ${url}: ${error.message}`);
      }
    }
    
    if (!ws) {
      console.log('\n❌ Failed to connect to any XRPL node');
      console.log('\nTroubleshooting steps:');
      console.log('1. Make sure your XRPL node is running: docker-compose ps');
      console.log('2. Check XRPL node logs: docker-compose logs xrpl-node');
      console.log('3. Try restarting the node: docker-compose restart xrpl-node');
      return false;
    }
    
    // Check server info and NFT features
    const nftEnabled = await checkServerInfo(ws);
    
    // Check master account
    const masterAccountOk = await checkMasterAccount(ws);
    
    // Check overall readiness
    console.log('\n---------------------------------');
    if (nftEnabled && masterAccountOk) {
      console.log('✅ XRPL node is ready for NFT operations!');
    } else {
      console.log('❌ XRPL node is NOT ready for NFT operations!');
      
      if (!nftEnabled) {
        console.log('\nTo enable NFT features:');
        console.log('1. Run the enable-nft.sh script in the project root');
        console.log('2. Or manually update xrpl-config/rippled.cfg as described in ENABLE_NFT.md');
      }
    }
    
    // Close WebSocket
    ws.close();
    return nftEnabled && masterAccountOk;
  } catch (error) {
    console.log(`\n❌ Error during verification: ${error.message}`);
    
    if (ws) {
      ws.close();
    }
    
    return false;
  }
}

// Run verification
verifyXrpl().then(success => {
  process.exit(success ? 0 : 1);
});