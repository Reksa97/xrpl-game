// Test script to generate XRPL wallets locally using xrpl.js
const xrpl = require('xrpl');

// Function to generate a new wallet
async function generateNewWallet() {
  // Generate a new random wallet using xrpl.js
  const wallet = xrpl.Wallet.generate();
  
  // Print out the wallet details
  console.log('\n===== New XRPL Wallet =====');
  console.log(`Address: ${wallet.address}`);
  console.log(`Seed (Private Key): ${wallet.seed}`);
  console.log(`Public Key: ${wallet.publicKey}`);
  console.log('===========================\n');
  
  return wallet;
}

// Function that can derive a wallet from an existing seed
function deriveWalletFromSeed(seed) {
  try {
    // Derive wallet from seed
    const wallet = xrpl.Wallet.fromSeed(seed);
    
    // Print out the derived wallet details
    console.log('\n===== Derived XRPL Wallet =====');
    console.log(`Address: ${wallet.address}`);
    console.log(`Seed (Private Key): ${wallet.seed}`);
    console.log(`Public Key: ${wallet.publicKey}`);
    console.log('===============================\n');
    
    return wallet;
  } catch (error) {
    console.error('Error deriving wallet from seed:', error.message);
    return null;
  }
}

// Generate a new wallet
console.log('Generating a new XRPL wallet...');
generateNewWallet()
  .then(newWallet => {
    // Test deriving from the seed of the wallet we just created
    console.log('Deriving a wallet from the seed we just generated...');
    const derivedWallet = deriveWalletFromSeed(newWallet.seed);
    
    // Verify addresses match
    if (derivedWallet && derivedWallet.address === newWallet.address) {
      console.log('✅ Success! The derived wallet matches the original.');
    } else {
      console.log('❌ Error: The derived wallet does not match the original.');
    }
    
    // Now derive a wallet from the master test account seed
    console.log('\nDeriving the master test wallet...');
    const masterWallet = deriveWalletFromSeed('snoPBrXtMeMyMHUVTgbuqAfg1SUTb');
    
    if (masterWallet && masterWallet.address === 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh') {
      console.log('✅ Success! The master wallet address matches the expected value.');
    } else {
      console.log('❌ Error: Could not derive the correct master wallet.');
    }
  })
  .catch(error => {
    console.error('Error generating wallet:', error);
  });