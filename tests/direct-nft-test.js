// Direct NFT Test for XRPL
// This script bypasses the UI and tests NFT minting directly with WebSocket calls

const WebSocket = require('ws');

// Master wallet for XRPL standalone mode
const MASTER_WALLET = {
  address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  seed: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
};

// Configuration - use the correct WebSocket port
const config = {
  urls: [
    'ws://localhost:5005', // Admin WebSocket API should work
  ],
  timeout: 15000 // Increased timeout for blockchain transactions
};

// Connect to WebSocket with timeout
function connectToXrpl(url) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to ${url}...`);
    
    const ws = new WebSocket(url);
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error(`Connection timeout for ${url}`));
      }
    }, config.timeout);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`Connected to ${url}`);
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
  });
}

// Send request with timeout
function sendRequest(ws, request) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout for ${request.command}`));
    }, config.timeout);
    
    ws.once('message', (data) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
      } catch (error) {
        reject(new Error(`Failed to parse response: ${error.message}`));
      }
    });
    
    ws.send(JSON.stringify(request));
  });
}

// Check server features
async function checkServerFeatures(ws) {
  console.log('\nChecking server features...');
  
  const request = {
    id: Date.now(),
    command: 'server_info'
  };
  
  const response = await sendRequest(ws, request);
  
  if (!response.result || !response.result.info) {
    console.log('❌ Failed to get server info');
    return false;
  }
  
  const info = response.result.info;
  console.log(`Server state: ${info.server_state}`);
  console.log(`Complete ledgers: ${info.complete_ledgers}`);
  
  const amendments = info.amendments || [];
  const nftAmendments = amendments.filter(a => 
    a.includes('NFToken') || a.includes('NonFungibleTokens')
  );
  
  if (nftAmendments.length === 0) {
    console.log('❌ No NFT amendments found!');
    return false;
  }
  
  console.log(`✅ Found ${nftAmendments.length} NFT amendments:`);
  nftAmendments.forEach(a => console.log(`  - ${a}`));
  return true;
}

// Get account info
async function getAccountInfo(ws, address) {
  console.log(`\nGetting account info for ${address}...`);
  
  const request = {
    id: Date.now(),
    command: 'account_info',
    account: address
  };
  
  const response = await sendRequest(ws, request);
  
  if (!response.result || !response.result.account_data) {
    console.log('❌ Failed to get account info');
    return null;
  }
  
  const accountData = response.result.account_data;
  console.log(`Account: ${accountData.Account}`);
  console.log(`Balance: ${parseInt(accountData.Balance)/1000000} XRP`);
  console.log(`Sequence: ${accountData.Sequence}`);
  
  return accountData;
}

// Get NFTs for account
async function getAccountNFTs(ws, address) {
  console.log(`\nGetting NFTs for ${address}...`);
  
  const request = {
    id: Date.now(),
    command: 'account_nfts',
    account: address
  };
  
  try {
    const response = await sendRequest(ws, request);
    
    if (!response.result) {
      console.log('❌ Failed to get account NFTs');
      return [];
    }
    
    const nfts = response.result.account_nfts || [];
    console.log(`Found ${nfts.length} NFTs for ${address}`);
    
    if (nfts.length > 0) {
      nfts.forEach((nft, i) => {
        console.log(`NFT ${i+1}:`);
        console.log(`  ID: ${nft.NFTokenID}`);
        console.log(`  URI: ${nft.URI || 'N/A'}`);
        console.log(`  Serial: ${nft.nft_serial || 'N/A'}`);
      });
    }
    
    return nfts;
  } catch (error) {
    console.log(`Error getting NFTs: ${error.message}`);
    return [];
  }
}

// Mint NFT
async function mintNFT(ws, wallet) {
  console.log('\nMinting NFT...');
  
  // Get account sequence
  const accountInfo = await getAccountInfo(ws, wallet.address);
  if (!accountInfo) {
    console.log('❌ Cannot mint NFT without account info');
    return null;
  }
  
  // Get current ledger info
  const ledgerRequest = {
    id: Date.now(),
    command: 'ledger_current'
  };
  
  const ledgerResponse = await sendRequest(ws, ledgerRequest);
  const ledgerIndex = ledgerResponse.result.ledger_current_index;
  
  // URI for the NFT
  const uri = 'https://example.com/nft/test';
  
  // Convert URI to hex
  const hexUri = Buffer.from(uri).toString('hex').toUpperCase();
  
  // Prepare NFTokenMint transaction
  const tx = {
    id: Date.now(),
    command: 'submit',
    tx_json: {
      TransactionType: 'NFTokenMint',
      Account: wallet.address,
      URI: hexUri,
      Flags: 8, // transferable
      Fee: '12',
      NFTokenTaxon: 0,
      TransferFee: 0,
      Sequence: accountInfo.Sequence,
      LastLedgerSequence: ledgerIndex + 20
    },
    secret: wallet.seed
  };
  
  console.log('Submitting NFT mint transaction...');
  
  try {
    const response = await sendRequest(ws, tx);
    
    console.log('\nTransaction response:');
    console.log('Engine result:', response.result.engine_result);
    console.log('Engine message:', response.result.engine_result_message);
    
    if (response.result.engine_result === 'tesSUCCESS') {
      console.log('✅ NFT minting transaction submitted successfully!');
      
      // Wait for ledger to close
      console.log('Waiting for transaction to be included in a ledger...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check for new NFTs
      const nfts = await getAccountNFTs(ws, wallet.address);
      return nfts.length > 0;
    } else {
      console.log('❌ NFT minting failed:', response.result.engine_result_message);
      
      // Check for specific errors
      if (response.result.engine_result === 'temDISABLED') {
        console.log('NFT feature is disabled on this XRPL node!');
        console.log('Please enable NFT amendments in your rippled.cfg file.');
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Error minting NFT:', error.message);
    return false;
  }
}

// Main test function
async function runTest() {
  console.log('=================================');
  console.log('  Direct NFT Minting Test (XRPL)');
  console.log('=================================');
  
  let ws = null;
  
  // Try to connect to each URL
  for (const url of config.urls) {
    try {
      ws = await connectToXrpl(url);
      break;
    } catch (error) {
      console.log(`Cannot connect to ${url}: ${error.message}`);
    }
  }
  
  if (!ws) {
    console.log('❌ Failed to connect to any XRPL node!');
    process.exit(1);
  }
  
  try {
    // Check server features
    const hasNFTFeatures = await checkServerFeatures(ws);
    
    if (!hasNFTFeatures) {
      console.log('\n❌ NFT features are not enabled on this XRPL node.');
      console.log('Please enable NFT amendments in your rippled.cfg file.');
      process.exit(1);
    }
    
    // Get master account info
    await getAccountInfo(ws, MASTER_WALLET.address);
    
    // Get existing NFTs
    const existingNFTs = await getAccountNFTs(ws, MASTER_WALLET.address);
    
    // Mint a new NFT
    const success = await mintNFT(ws, MASTER_WALLET);
    
    if (success) {
      console.log('\n✅ NFT minting test completed successfully!');
    } else {
      console.log('\n❌ NFT minting test failed!');
    }
  } catch (error) {
    console.log(`\n❌ Test error: ${error.message}`);
  } finally {
    ws.close();
  }
}

// Run the test
runTest().catch(console.error);