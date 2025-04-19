// Simple test script to verify wallet generation via the proxy server
const fetch = require('node-fetch');

const PROXY_URL = 'http://localhost:3001/api/xrpl-proxy';

async function testWalletGeneration() {
  console.log('Testing wallet generation via proxy...');
  
  try {
    // Test server_info
    console.log('\n1. Testing server_info...');
    
    const serverInfoResponse = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'server_info',
        params: [{}]
      })
    });
    
    if (!serverInfoResponse.ok) {
      throw new Error(`HTTP error ${serverInfoResponse.status}`);
    }
    
    const serverInfo = await serverInfoResponse.json();
    console.log('Server info response:', JSON.stringify(serverInfo, null, 2).substring(0, 500) + '...');
    
    if (!serverInfo.result || !serverInfo.result.info) {
      throw new Error('Invalid server_info response format');
    }
    
    console.log('✅ server_info test passed');
    
    // Test wallet_generate
    console.log('\n2. Testing wallet_generate...');
    
    const walletResponse = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'wallet_generate',
        params: [{}]
      })
    });
    
    if (!walletResponse.ok) {
      throw new Error(`HTTP error ${walletResponse.status}`);
    }
    
    const wallet = await walletResponse.json();
    console.log('Wallet generation response:', JSON.stringify(wallet, null, 2));
    
    if (!wallet.result || !wallet.result.account_id || !wallet.result.master_seed) {
      throw new Error('Invalid wallet_generate response format');
    }
    
    console.log('✅ wallet_generate test passed');
    console.log(`✅ Successfully generated wallet: ${wallet.result.account_id}`);
    
    return {
      success: true,
      wallet: {
        address: wallet.result.account_id,
        seed: wallet.result.master_seed
      }
    };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testWalletGeneration().then(result => {
  if (result.success) {
    console.log('\n=======================================');
    console.log('✅ All tests passed!');
    console.log('=======================================');
    console.log('Generated wallet:');
    console.log(`Address: ${result.wallet.address}`);
    console.log(`Seed: ${result.wallet.seed}`);
    console.log('=======================================');
    process.exit(0);
  } else {
    console.log('\n=======================================');
    console.log('❌ Tests failed!');
    console.log(`Error: ${result.error}`);
    console.log('=======================================');
    console.log('Troubleshooting checklist:');
    console.log('1. Is the proxy server running? (node server.js)');
    console.log('2. Is the XRPL node accessible? (34.88.230.243:51234)');
    console.log('3. Check server.js for proper error handling');
    console.log('4. Verify xrpl-direct.ts has proper fallback to master wallet');
    console.log('=======================================');
    process.exit(1);
  }
});