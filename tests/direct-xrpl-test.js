/**
 * Direct XRPL NFT Minting Test
 * 
 * This script tests NFT minting using direct API calls to the XRPL node.
 * It doesn't use the frontend, just tests that the XRPL node is properly configured
 * for NFT minting.
 */

const WebSocket = require('ws');
const http = require('http');

// Master wallet for XRPL standalone mode
const MASTER_WALLET = {
  address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  seed: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
};

// Configuration
const config = {
  wsUrl: 'ws://localhost:5005',
  httpUrl: 'http://localhost:6006',
  timeout: 15000 // 15 seconds timeout
};

// HTTP request helper
function httpRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
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
    const ws = new WebSocket(url);
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error(`WebSocket request timeout for ${command}`));
      }
    }, config.timeout);
    
    ws.on('open', () => {
      const request = {
        id: Date.now(),
        command,
        ...params
      };
      
      ws.send(JSON.stringify(request));
    });
    
    ws.on('message', (data) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        try {
          const response = JSON.parse(data.toString());
          ws.close();
          resolve(response);
        } catch (error) {
          ws.close();
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error(`WebSocket error: ${error.message}`));
      }
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(new Error('WebSocket closed unexpectedly'));
      }
    });
  });
}

// Check XRPL server info
async function checkServerInfo() {
  console.log('\nChecking XRPL server info...');
  
  try {
    // Try WebSocket first
    console.log('Trying WebSocket connection...');
    const wsResponse = await wsRequest(config.wsUrl, 'server_info')
      .catch(e => {
        console.log(`WebSocket request failed: ${e.message}`);
        return null;
      });
    
    if (wsResponse && wsResponse.result && wsResponse.result.info) {
      console.log(`Server state: ${wsResponse.result.info.server_state}`);
      console.log(`Complete ledgers: ${wsResponse.result.info.complete_ledgers}`);
      return true;
    }
    
    // Try HTTP if WebSocket fails
    console.log('Trying HTTP connection...');
    const httpResponse = await httpRequest(config.httpUrl, 'POST', {
      method: 'server_info'
    }).catch(e => {
      console.log(`HTTP request failed: ${e.message}`);
      return null;
    });
    
    if (httpResponse && httpResponse.result && httpResponse.result.info) {
      console.log(`Server state: ${httpResponse.result.info.server_state}`);
      console.log(`Complete ledgers: ${httpResponse.result.info.complete_ledgers}`);
      return true;
    }
    
    console.log('❌ Failed to get server info from both WebSocket and HTTP');
    return false;
  } catch (error) {
    console.log(`❌ Error checking server info: ${error.message}`);
    return false;
  }
}

// Check NFT feature support
async function checkNFTFeature() {
  console.log('\nChecking NFT feature support...');
  
  try {
    const response = await httpRequest(config.httpUrl, 'POST', {
      method: 'feature',
      params: [{
        feature: 'NonFungibleTokensV1_1'
      }]
    });
    
    if (response.result) {
      const featureInfo = response.result;
      const featureKeys = Object.keys(featureInfo).filter(k => k !== 'status');
      
      if (featureKeys.length > 0) {
        const featureId = featureKeys[0];
        const feature = featureInfo[featureId];
        
        console.log(`Feature name: ${feature.name}`);
        console.log(`Feature enabled: ${feature.enabled}`);
        console.log(`Feature vetoed: ${feature.vetoed}`);
        
        return feature.enabled;
      }
    }
    
    console.log('❌ Failed to get NFT feature info');
    return false;
  } catch (error) {
    console.log(`❌ Error checking NFT feature: ${error.message}`);
    return false;
  }
}

// Get existing NFTs
async function getExistingNFTs() {
  console.log('\nChecking existing NFTs...');
  
  try {
    const response = await httpRequest(config.httpUrl, 'POST', {
      method: 'account_nfts',
      params: [{
        account: MASTER_WALLET.address
      }]
    });
    
    if (response.result && response.result.account_nfts) {
      const nfts = response.result.account_nfts;
      console.log(`Found ${nfts.length} existing NFTs`);
      
      nfts.forEach((nft, index) => {
        console.log(`NFT ${index + 1}: ${nft.NFTokenID}`);
      });
      
      return nfts;
    }
    
    console.log('❌ Failed to get existing NFTs');
    return [];
  } catch (error) {
    console.log(`❌ Error getting existing NFTs: ${error.message}`);
    return [];
  }
}

// Mint an NFT
async function mintNFT() {
  console.log('\nMinting a new NFT...');
  
  try {
    // First get account info for sequence number
    const accountResponse = await httpRequest(config.httpUrl, 'POST', {
      method: 'account_info',
      params: [{
        account: MASTER_WALLET.address
      }]
    });
    
    if (!accountResponse.result || !accountResponse.result.account_data) {
      console.log('❌ Failed to get account info');
      return false;
    }
    
    const sequence = accountResponse.result.account_data.Sequence;
    console.log(`Account sequence: ${sequence}`);
    
    // Get current ledger index
    const ledgerResponse = await httpRequest(config.httpUrl, 'POST', {
      method: 'ledger_current'
    });
    
    if (!ledgerResponse.result) {
      console.log('❌ Failed to get current ledger');
      return false;
    }
    
    const ledgerIndex = ledgerResponse.result.ledger_current_index;
    console.log(`Current ledger index: ${ledgerIndex}`);
    
    // Prepare NFT mint transaction
    const uri = 'https://example.com/test-nft-' + Date.now() + '.json';
    const hexUri = Buffer.from(uri).toString('hex').toUpperCase();
    
    const tx = {
      TransactionType: 'NFTokenMint',
      Account: MASTER_WALLET.address,
      URI: hexUri,
      Flags: 8, // transferable
      NFTokenTaxon: 0,
      Sequence: sequence,
      LastLedgerSequence: ledgerIndex + 20,
      Fee: '10'
    };
    
    console.log('Submitting NFTokenMint transaction...');
    
    // Submit the transaction using the HTTP API
    const response = await httpRequest(config.httpUrl, 'POST', {
      method: 'submit',
      params: [{
        tx_json: tx,
        secret: MASTER_WALLET.seed
      }]
    });
    
    console.log('Submission response:', JSON.stringify(response, null, 2));
    
    if (response.result) {
      if (response.result.engine_result === 'tesSUCCESS') {
        console.log('✅ NFT minting transaction submitted successfully!');
        
        // Wait for ledger to close
        console.log('Waiting for transaction to be included in a ledger...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for new NFTs
        const nftsAfter = await getExistingNFTs();
        return nftsAfter.length > 0;
      } else {
        console.log(`❌ NFT minting failed: ${response.result.engine_result_message}`);
        
        // Check for specific error codes
        if (response.result.engine_result === 'temDISABLED') {
          console.log('NFT feature is disabled on the XRPL node!');
        }
        
        return false;
      }
    }
    
    console.log('❌ Invalid response from XRPL node');
    return false;
  } catch (error) {
    console.log(`❌ Error minting NFT: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTest() {
  console.log('=======================================');
  console.log('  Direct XRPL NFT Minting Test');
  console.log('=======================================');
  
  // Step 1: Check server info
  const serverOk = await checkServerInfo();
  if (!serverOk) {
    console.log('❌ XRPL server is not accessible');
    process.exit(1);
  }
  
  // Step 2: Check NFT feature support
  const nftEnabled = await checkNFTFeature();
  console.log(`NFT feature enabled: ${nftEnabled}`);
  
  // Step 3: Get existing NFTs
  const existingNFTs = await getExistingNFTs();
  const initialCount = existingNFTs.length;
  
  // Step 4: Mint a new NFT
  const mintResult = await mintNFT();
  
  // Step 5: Verify the results
  if (mintResult) {
    console.log('\n✅ NFT minting test completed successfully!');
  } else {
    console.log('\n❌ NFT minting test failed!');
  }
  
  // Final check to see if we have more NFTs now
  const finalNFTs = await getExistingNFTs();
  const finalCount = finalNFTs.length;
  
  console.log(`\nNFT count: Before=${initialCount}, After=${finalCount}`);
  
  if (finalCount > initialCount) {
    console.log('✅ New NFT was created!');
  } else {
    console.log('❓ No new NFTs detected');
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});