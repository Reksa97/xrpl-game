/**
 * XRPL client implementation using proxy server to avoid CORS issues
 */

// Define the Wallet type
export interface Wallet {
  address: string;
  seed: string;
}

// Client for XRPL - uses proxy server to avoid CORS issues
class XrplClient {
  private url: string;
  private connected = false;

  constructor(url: string) {
    this.url = url;
    console.log(`XRPL client initialized with URL: ${url}`);
  }

  // Connect to the XRPL node via proxy
  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      console.log(`Testing connection to ${this.url}...`);
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'server_info',
          params: [{}]
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(`XRPL error: ${data.error}`);
      }
      
      console.log('Connection successful:', data);
      
      // Check server state
      const serverState = data?.result?.info?.server_state;
      if (serverState !== 'full' && serverState !== 'proposing') {
        console.warn(`Server not fully synced, state: ${serverState}`);
      }
      
      this.connected = true;
    } catch (error) {
      console.error(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      this.connected = false;
      throw error;
    }
  }

  // Disconnect (for HTTP this is a no-op)
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  // Send a request to the XRPL
  async request(command: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: command,
          params: [params]
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(`XRPL error: ${data.error}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Request failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// Singleton client instance
let client: XrplClient | null = null;

// Get or create the client
export async function getClient(): Promise<XrplClient> {
  try {
    if (!client) {
      // Only use the proxy server to avoid CORS issues
      const proxyUrl = "/api/xrpl-proxy";
      
      try {
        console.log(`Connecting to XRPL node via proxy: ${proxyUrl}`);
        client = new XrplClient(proxyUrl);
        await client.connect();
        console.log(`✅ Successfully connected to XRPL node via proxy`);
      } catch (err) {
        console.error(`❌ Failed to connect via proxy:`, err);
        client = null;
        throw new Error(`Failed to connect to XRPL node via proxy: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    return client;
  } catch (error: any) {
    // Provide helpful troubleshooting information
    const helpMessage = `
Troubleshooting steps:
1. Is the proxy server running? Start with: node server.js
2. Is the XRPL node accessible at 34.88.230.243:51234?
3. Check server.js logs for any errors
`;
    
    if (error.message) {
      error.message += '\n\n' + helpMessage;
    }
    
    throw error;
  }
}

// Create a test wallet for the user
export async function createTestWallet(): Promise<Wallet> {
  try {
    // Get the client
    const client = await getClient();
    
    try {
      // Try to generate a random wallet for testing
      const walletResponse = await client.request('wallet_generate');
      
      console.log('Wallet generation response:', JSON.stringify(walletResponse));
      
      if (walletResponse.result && walletResponse.result.account_id && walletResponse.result.master_seed) {
        const wallet: Wallet = {
          address: walletResponse.result.account_id,
          seed: walletResponse.result.master_seed
        };
        
        console.log(`Created test wallet: ${wallet.address}`);
        return wallet;
      } else {
        console.warn('Invalid wallet generation response format:', walletResponse);
        throw new Error('Invalid wallet generation response');
      }
    } catch (walletError) {
      console.warn('Wallet generation via API failed, using master wallet:', walletError);
    }
    
    // If wallet generation fails, fall back to using the master wallet
    console.log('Using master account as wallet');
    return getMasterWallet();
  } catch (error) {
    console.error('Failed to create test wallet:', error);
    throw error;
  }
}

// For simplified testing, just use the master account
export async function getMasterWallet(): Promise<Wallet> {
  // Master wallet for XRPL standalone mode
  return {
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    seed: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
  };
}

// Get account info
export async function getAccountInfo(wallet: Wallet): Promise<any> {
  try {
    const client = await getClient();
    
    const accountResponse = await client.request('account_info', {
      account: wallet.address,
      strict: true,
      ledger_index: 'current'
    });
    
    if (accountResponse.result && accountResponse.result.account_data) {
      return accountResponse.result.account_data;
    } else {
      throw new Error('Invalid account info response');
    }
  } catch (error) {
    console.error(`Error fetching account info for ${wallet.address}:`, error);
    throw error;
  }
}

// Send XRP to another account
export async function sendXRP(wallet: Wallet, destinationAddress: string, amount: string): Promise<any> {
  try {
    const client = await getClient();
    
    // First get account info for sequence number
    const accountResponse = await client.request('account_info', {
      account: wallet.address,
      strict: true,
      ledger_index: 'current'
    });
    
    if (!accountResponse.result || !accountResponse.result.account_data) {
      throw new Error('Could not get account info');
    }
    
    const sequence = accountResponse.result.account_data.Sequence;
    
    // Prepare payment transaction
    const tx = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: destinationAddress,
      Amount: (parseFloat(amount) * 1000000).toString(), // Convert to drops
      Sequence: sequence,
      Fee: '10' // 10 drops
    };
    
    // Submit transaction
    const submitResponse = await client.request('submit', {
      tx_json: tx,
      secret: wallet.seed
    });
    
    console.log('Payment response:', submitResponse);
    
    if (submitResponse.result) {
      const engineResult = submitResponse.result.engine_result;
      if (engineResult.startsWith('tes')) {
        console.log('Payment successful');
        return submitResponse.result;
      } else {
        throw new Error(`Payment failed: ${submitResponse.result.engine_result_message}`);
      }
    } else {
      throw new Error('Invalid payment response');
    }
  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
}

// Buy an egg
export async function buyEgg(wallet: Wallet, priceXRP = '10'): Promise<any> {
  // If using the master account, we'll send to a different address
  // since we can't send to ourselves
  let eggShopAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'; // Default egg shop address
  
  // If using master account as wallet, we need another destination
  if (wallet.address === 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh') {
    // Use a placeholder destination address for demo purposes
    eggShopAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
  } else if (!eggShopAddress) {
    // Otherwise use master account as destination
    eggShopAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  }
  
  console.log(`Sending ${priceXRP} XRP to egg shop at ${eggShopAddress}`);
  
  // Send XRP to egg shop address
  try {
    const result = await sendXRP(wallet, eggShopAddress, priceXRP);
    
    // Simulate egg purchase response
    return {
      success: true,
      eggId: `egg_${Date.now()}`,
      txid: result.tx_json?.hash || 'unknown',
      price: priceXRP
    };
  } catch (error) {
    console.error('Error buying egg:', error);
    throw error;
  }
}

// Get owned NFTs
export async function getOwnedNFTs(wallet: Wallet): Promise<any[]> {
  try {
    const client = await getClient();
    
    const response = await client.request('account_nfts', {
      account: wallet.address
    });
    
    if (response.result && Array.isArray(response.result.account_nfts)) {
      return response.result.account_nfts;
    } else {
      console.warn('Invalid NFT response:', response);
      return [];
    }
  } catch (error) {
    console.error('Error getting NFTs:', error);
    return [];
  }
}

// Mint NFT
export async function mintNFT(wallet: Wallet, uri: string): Promise<any> {
  try {
    const client = await getClient();
    
    // First get account info for sequence number
    const accountResponse = await client.request('account_info', {
      account: wallet.address
    });
    
    if (!accountResponse.result || !accountResponse.result.account_data) {
      throw new Error('Could not get account info');
    }
    
    const sequence = accountResponse.result.account_data.Sequence;
    
    // Prepare NFT mint transaction
    const hexUri = Buffer.from(uri).toString('hex').toUpperCase();
    
    const tx = {
      TransactionType: 'NFTokenMint',
      Account: wallet.address,
      URI: hexUri,
      Flags: 8, // transferable
      NFTokenTaxon: 0,
      Sequence: sequence,
      Fee: '10'
    };
    
    // Submit transaction
    const response = await client.request('submit', {
      tx_json: tx,
      secret: wallet.seed
    });
    
    if (response.result) {
      const engineResult = response.result.engine_result;
      if (engineResult.startsWith('tes')) {
        return response.result;
      } else {
        throw new Error(`NFT minting failed: ${response.result.engine_result_message}`);
      }
    } else {
      throw new Error('Invalid NFT minting response');
    }
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
}

// Claim battle reward
export async function claimReward(wallet: Wallet, amount = '5'): Promise<any> {
  // Simulate claiming a reward by sending XRP from the master account
  const masterWallet = await getMasterWallet();
  try {
    const result = await sendXRP(masterWallet, wallet.address, amount);
    
    return {
      success: true,
      amount,
      txid: result.tx_json?.hash || 'unknown'
    };
  } catch (error) {
    console.error('Error claiming reward:', error);
    throw error;
  }
}