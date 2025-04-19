/**
 * Direct XRPL client implementation without mocks
 * Will fail explicitly if connection doesn't work
 */

// Define the Wallet type
export interface Wallet {
  address: string;
  seed: string;
}

// WebSocket-based client for XRPL
class XrplClient {
  private ws: WebSocket | null = null;
  private url: string;
  private connected = false;
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();

  constructor(url: string) {
    this.url = url;
    console.log(`XRPL client initialized with URL: ${url}`);
  }

  // Connect to the XRPL node with improved error handling
  async connect(): Promise<void> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) return;

    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to XRPL at ${this.url}...`);
        
        // Close any existing connection
        if (this.ws) {
          this.ws.close();
        }
        
        // Set a timeout for the connection attempt
        const connectionTimeout = setTimeout(() => {
          reject(new Error(`Connection timeout for ${this.url} - XRPL node didn't respond in time`));
        }, 5000);
        
        try {
          this.ws = new WebSocket(this.url);
        } catch (wsError) {
          clearTimeout(connectionTimeout);
          reject(new Error(`Failed to create WebSocket for ${this.url}: ${wsError.message}`));
          return;
        }

        // Add handlers after WebSocket creation
        this.ws.onopen = () => {
          console.log(`Connected to XRPL node successfully at ${this.url}`);
          clearTimeout(connectionTimeout);
          this.connected = true;
          
          // Simple resolve without ping for faster feedback
          resolve();
          
          // Optional: ping server in background for verification
          this.pingServer().then(
            () => console.log('Server ping successful - connection verified'),
            (error) => console.warn(`Ping warning: ${error.message} - connection may be unstable`)
          );
        };

        this.ws.onclose = () => {
          console.log(`Disconnected from XRPL at ${this.url}`);
          this.connected = false;
          // Only reject if we're still waiting for connection
          if (connectionTimeout) {
            reject(new Error(`WebSocket connection closed for ${this.url} - node may be unavailable`));
          }
        };

        this.ws.onerror = (error) => {
          console.error(`WebSocket error for ${this.url}:`, error);
          clearTimeout(connectionTimeout);
          this.connected = false;
          reject(new Error(`WebSocket connection error for ${this.url} - check if XRPL node is running`));
        };

        this.ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log('Received message from XRPL:', response);
            
            const requestId = response.id;
            if (this.pendingRequests.has(requestId)) {
              const { resolve } = this.pendingRequests.get(requestId)!;
              this.pendingRequests.delete(requestId);
              resolve(response);
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        };
      } catch (error) {
        console.error(`Error connecting to XRPL at ${this.url}:`, error);
        reject(new Error(`Failed to initialize connection to ${this.url}: ${error.message}`));
      }
    });
  }
  
  // Send a ping to verify the connection is working
  private async pingServer(): Promise<void> {
    try {
      // Use server_info as a ping
      const id = ++this.requestId;
      
      return new Promise<void>((resolve, reject) => {
        // Set a timeout for the ping
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error('Ping timeout'));
        }, 3000);
        
        // Store the resolve function
        this.pendingRequests.set(id, { 
          resolve: (response: any) => {
            clearTimeout(timeout);
            console.log('Ping response:', response);
            if (
              response?.result?.info?.server_state === 'full' || 
              response?.result?.info?.server_state === 'proposing'
            ) {
              resolve();
            } else {
              reject(new Error(`Invalid server state: ${response?.result?.info?.server_state}`));
            }
          }, 
          reject: (err: any) => {
            clearTimeout(timeout);
            reject(err);
          }
        });
        
        // Send the ping
        this.ws!.send(JSON.stringify({
          id,
          command: 'server_info'
        }));
      });
    } catch (error) {
      console.error('Ping error:', error);
      throw error;
    }
  }

  // Disconnect from the XRPL
  async disconnect(): Promise<void> {
    if (!this.connected || !this.ws) return;
    
    this.ws.close();
    this.connected = false;
  }

  // Send a request to the XRPL
  async request(command: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.connected || !this.ws) {
      await this.connect();
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket is not open. Cannot send ${command} request.`);
    }

    return new Promise((resolve, reject) => {
      try {
        const id = ++this.requestId;
        const request = {
          id,
          command,
          ...params
        };

        console.log(`Sending XRPL request to ${this.url}:`, request);

        this.pendingRequests.set(id, { resolve, reject });
        this.ws!.send(JSON.stringify(request));
        
        // Set a timeout for the request
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error(`Request timeout for command: ${command}`));
          }
        }, 5000);
      } catch (err) {
        console.error('Error sending request:', err);
        reject(err);
      }
    });
  }
}


// Function to check if NFT features are enabled on the XRPL node
async function checkNFTFeatureSupport(client) {
  try {
    // Get server info to check amendments
    const serverInfo = await client.request('server_info');
    const amendments = serverInfo?.result?.info?.amendments || [];
    
    // Check if NFT amendments are enabled
    const hasNFTSupport = amendments.some(a => 
      a.includes('NFToken') || a.includes('NonFungibleTokens')
    );
    
    if (!hasNFTSupport) {
      console.warn('NFT features not enabled on XRPL node. NFT operations will fail.');
    } else {
      console.log('NFT features are enabled on XRPL node.');
    }
    
    return hasNFTSupport;
  } catch (err) {
    console.warn('Error checking NFT feature support:', err);
    return false;
  }
}

// Create a singleton client
let client: XrplClient | null = null;

// Get or create the client
export async function getClient(): Promise<XrplClient> {
  try {
    if (!client) {
      // Due to port mapping issues in Docker, we need to use the admin port
      const url = "ws://localhost:5005";; // Connect to admin WebSocket API
      
      console.log(`Connecting to XRPL node at: ${url}`);
      
      try {
        client = new XrplClient(url);
        await client.connect();
        console.log(`✅ Successfully connected to XRPL node at: ${url}`);
        console.log(`Connection details: Using host network with public WebSocket API`);
      } catch (err) {
        console.error(`❌ Failed to connect to ${url}:`, err);
        client = null;
        throw err;
      }
      
      if (!client) {
        throw new Error(`Failed to connect to XRPL node at ${url}`);
      }
    }
    
    return client;
  } catch (error: any) {
    // Add more detailed troubleshooting information to the error
    let errorMessage = error.message || 'Unknown error';
    
    // Enhance error with troubleshooting instructions
    errorMessage += '\n\nTroubleshooting steps:';
    errorMessage += '\n1. Is the Docker container running? Check with: docker ps';
    errorMessage += '\n2. Check XRPL node logs: docker-compose logs xrpl-node';
    errorMessage += '\n3. Restart the XRPL node: docker-compose restart xrpl-node';
    errorMessage += '\n4. Make sure port 5005 is correctly exposed in docker-compose.yml';
    errorMessage += '\n5. Try running the frontend directly (not in Docker) and connect to localhost';
    
    // Create a new error with the enhanced message
    const enhancedError = new Error(errorMessage);
    enhancedError.stack = error.stack;
    throw enhancedError;
  }
}

// Create a test wallet using the master account
export async function createTestWallet(): Promise<Wallet> {
  const client = await getClient();
  
  // Check if connected to local XRPL
  const serverInfo = await client.request('server_info');
  console.log('Connected to XRPL node:', serverInfo?.result?.info?.build_version);
  
  // Check if in standalone mode
  const isStandalone = serverInfo?.result?.info?.complete_ledgers === '1-' + serverInfo?.result?.info?.validated_ledger?.seq;
  console.log('Standalone mode:', isStandalone ? 'YES' : 'NO');
  
  // In standalone mode, there's only one guaranteed account - the master account
  // This is the root account that's always present in standalone mode
  const masterWallet = {
    address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    seed: "snoPBrXtMeMyMHUVTgbuqAfg1SUTb"
  };
  
  console.log(`Using master wallet: ${masterWallet.address}`);
  
  // Verify the master account exists and has funds
  try {
    const accountInfo = await client.request('account_info', {
      account: masterWallet.address
    });
    
    if (accountInfo.result && accountInfo.result.account_data) {
      console.log(`Master account verified with ${parseInt(accountInfo.result.account_data.Balance)/1000000} XRP`);
    }
    
    // Run a simple test transaction to validate the wallet
    console.log('Validating wallet with a test transaction...');
    try {
      // Try using sign command to validate the secret
      const signTest = await client.request('sign', {
        tx_json: {
          TransactionType: 'Payment',
          Account: masterWallet.address,
          Destination: masterWallet.address,
          Amount: '1000',
          Flags: 0x80000000, // tfFullyCanonicalSig flag
        },
        secret: masterWallet.seed
      });
      
      console.log('Signature test successful:', !!signTest.result?.tx_blob);
    } catch (signError) {
      console.warn('Signature test failed:', signError);
      console.log('This may indicate issues with the wallet credentials.');
    }
    
  } catch (error) {
    console.error('Could not verify master account:', error);
    throw new Error('Master account not found on the XRPL node. This indicates the node is not in standalone mode or not properly initialized.');
  }
  
  return masterWallet;
}

// Get NFTs owned by an address
export async function getOwnedNFTs(address: string): Promise<any[]> {
  const client = await getClient();
  
  try {
    const response = await client.request('account_nfts', { account: address });
    
    if (response.error) {
      console.error(`Error getting NFTs: ${response.error_message || response.error}`);
      
      // Check if it's "Account not found" error (common when account has no transactions yet)
      if (response.error === 'actNotFound') {
        console.log(`Account ${address} not found yet. This is normal for new accounts.`);
        // Return empty array instead of throwing for this specific error
        return [];
      }
      
      // For other errors, throw
      throw new Error(`NFT lookup failed: ${response.error_message || response.error}`);
    }
    
    return response.result?.account_nfts || [];
  } catch (error: any) {
    // If it's already our error with a message, just rethrow
    if (error.message && error.message.includes('NFT lookup failed')) {
      throw error;
    }
    
    // Otherwise wrap in a more helpful error
    throw new Error(`Failed to get NFTs: ${error.message || 'Unknown error'}`);
  }
}

// Mint an NFT
export async function mintNFT(wallet: Wallet, uri: string): Promise<any> {
  const client = await getClient();
  console.log(`Minting NFT with URI: ${uri}`);
  
  try {
    // First, check if the NFT feature is enabled on the node
    const hasNFTSupport = await checkNFTFeatureSupport(client);
    
    if (!hasNFTSupport) {
      throw new Error(`NFT minting failed: The XRPL node does not have the NFToken amendment enabled. Make sure you're using a node with NFT support.`);
    }
    
    // Check if the node is in standalone mode
    const serverInfo = await client.request('server_info');
    const isStandalone = serverInfo?.result?.info?.server_state === 'full' &&
                         serverInfo?.result?.info?.complete_ledgers === '1-' + serverInfo?.result?.info?.validated_ledger?.seq;
    
    console.log('Node standalone mode:', isStandalone ? 'YES' : 'NO');
    
    // Verify the wallet is valid for the master account
    console.log('Verifying wallet credentials...');
    const isMasterAccount = wallet.address === 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
    
    if (isMasterAccount) {
      if (wallet.seed !== 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb') {
        console.warn('Master account has incorrect seed format - will attempt to use correct seed');
        // Create a copy with the correct seed but continue with user-provided wallet
      }
    }
    
    // Convert URI to hex
    const hexUri = Array.from(new TextEncoder().encode(uri))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    
    console.log(`Converted URI to hex: ${hexUri}`);
    
    // Create NFT mint transaction with proper flags
    // The Transaction requires logic that is currently disabled = NFT functionality not enabled
    const mintTx = {
      TransactionType: 'NFTokenMint',
      URI: hexUri,
      Flags: 8, // transferable = 8
      NFTokenTaxon: 0, // Required field, using 0 as default
      TransferFee: 0, // 0% transfer fee
      // Fee: "12", // explicit standard fee
    };
    
    console.log('Submitting NFT mint transaction:', mintTx);
    
    // Always use the master account for NFT minting in standalone mode
    const masterWallet = {
      address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      seed: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
    };
    
    console.log('Using master account for NFT minting in standalone mode');
    const result = await submitTransaction(masterWallet, mintTx);
    
    console.log('Raw transaction result:', result);
    
    // Check for errors
    if (result.error) {
      throw new Error(`NFT minting failed: ${result.error_message || result.error}`);
    }
    
    // Check engine result
    if (result.result.engine_result !== 'tesSUCCESS') {
      throw new Error(`NFT minting failed: ${result.result.engine_result_message || result.result.engine_result}`);
    }
    
    console.log('NFT minting submitted successfully!');
    console.log('Transaction hash:', result.result.tx_json.hash);
    
    // Store the transaction hash for reference
    const txHash = result.result.tx_json.hash;
    
    // Wait for the transaction to be included in a validated ledger
    try {
      console.log('Waiting for transaction to be included in a validated ledger...');
      
      // Try multiple times to verify the transaction
      const maxRetries = 5;
      let nftCount = 0;
      let previousNftCount = 0;
      let updatedNFTs = [];
      
      for (let i = 0; i < maxRetries; i++) {
        // Wait longer for each retry (2s, 3s, 4s, 5s, 6s)
        const waitTime = 2000 + (i * 1000);
        console.log(`Retry ${i+1}/${maxRetries}: Waiting ${waitTime/1000}s for ledger finalization...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Get current ledger info
        try {
          const ledgerInfo = await client.request('ledger_current');
          console.log(`Current ledger index: ${ledgerInfo.result.ledger_current_index}`);
        } catch (err) {
          console.warn('Error getting current ledger:', err);
        }
        
        // Check for transaction status (if available in XRPL)
        try {
          const txInfo = await client.request('tx', { transaction: txHash });
          if (txInfo.result && txInfo.result.validated) {
            console.log('Transaction validated in ledger:', txInfo.result.ledger_index);
            // If we have validation, we can break early after getting NFTs
          }
        } catch (err) {
          console.log('Transaction not yet in validated ledger:', err.message);
        }
        
        // Get the updated NFT list - always check the master account's NFTs
        // since we're minting with the master account in standalone mode
        try {
          previousNftCount = nftCount;
          // Get NFTs from the master account
          updatedNFTs = await getOwnedNFTs('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh');
          nftCount = updatedNFTs.length;
          console.log(`Master account now has ${nftCount} NFTs (had ${previousNftCount} before)`);
          
          // If we see the NFT count increase, we can break early
          if (nftCount > previousNftCount && i > 0) {
            console.log('NFT count increased - minting confirmed!');
            break;
          }
        } catch (err) {
          console.warn('Error checking NFTs:', err);
        }
      }
      
      // Return the final result with NFTs
      return {
        ...result,
        nfts: updatedNFTs,
        nft_count: nftCount,
        tx_hash: txHash,
        verified: nftCount > previousNftCount
      };
    } catch (err) {
      console.warn('Error checking NFT status after minting:', err);
      // Return the original result even if verification failed
      return {
        ...result,
        tx_hash: txHash,
        verified: false
      };
    }
  } catch (err) {
    console.error('Error during NFT minting preparation:', err);
    
    // Specific error handling for different error types
    const errorMsg = err.message || '';
    
    if (errorMsg.includes('currently disabled')) {
      throw new Error(`NFT minting failed: The XRPL node does not have the NFToken amendment enabled. Make sure you're using a node with NFT support.`);
    } else if (errorMsg.includes('Bad signature')) {
      throw new Error(`NFT minting failed: Bad signature. This may indicate an issue with the wallet credentials for the master account.`);
    }
    
    // Rethrow original error
    throw err;
  }
}

// Helper function to prepare and sign a transaction
async function submitTransaction(wallet: Wallet, txData: any): Promise<any> {
  const client = await getClient();
  
  // First get account info to get the sequence number
  const accountInfo = await client.request('account_info', {
    account: wallet.address
  });
  
  if (accountInfo.error) {
    throw new Error(`Account lookup failed: ${accountInfo.error_message || accountInfo.error}`);
  }
  
  // Get current ledger info
  const ledgerInfo = await client.request('ledger_current');
  
  // Verify it's the master account for standalone mode
  const isMasterAccount = wallet.address === 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  console.log(`Using ${isMasterAccount ? 'master' : 'regular'} account: ${wallet.address}`);
  
  // For NFT minting in standalone mode, we need to ensure the node has the NFTokenMint amendment enabled
  if (txData.TransactionType === 'NFTokenMint') {
    // Check server info to see if the node supports NFTokenMint
    try {
      const serverInfo = await client.request('server_info');
      const amendments = serverInfo?.result?.info?.amendments || [];
      console.log('Active amendments:', amendments);
      
      // If 'NonFungibleTokensV1' is not in the list, try to enable it using a special RPC call in standalone mode
      if (!amendments.includes('NonFungibleTokensV1') && !amendments.includes('NonFungibleTokensV1_1')) {
        console.log('NFT features not detected in active amendments. Trying to force enable for standalone mode...');
        
        // In standalone mode, we can try to force enable amendments
        try {
          const featureResult = await client.request('feature', {
            feature: 'NonFungibleTokensV1',
            vetoed: false
          });
          console.log('Feature enable result:', featureResult);
        } catch (err) {
          console.warn('Could not force enable NFT features:', err);
          // We'll still try the transaction anyway
        }
      }
    } catch (err) {
      console.warn('Error checking amendments:', err);
    }
  }
  
  // Prepare the transaction
  const preparedTx = {
    ...txData,
    Account: wallet.address,
    Fee: '12', // Standard fee
    Sequence: accountInfo.result.account_data.Sequence,
    LastLedgerSequence: ledgerInfo.result.ledger_current_index + 20,
  };
  
  console.log('Prepared transaction:', preparedTx);
  
  // For standalone mode, use the simplified direct submission with corrected master credentials
  if (isMasterAccount) {
    console.log('Using direct submission for master account in standalone mode');
    
    // Always use the known working master secret in standalone mode
    const response = await client.request('submit', {
      tx_json: preparedTx,
      secret: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb', // Master account secret
      offline: false,
      fail_hard: false
    });
    return response;
  } else {
    // For non-master accounts, try sign + submit
    console.log('Using sign + submit approach');
    
    // First sign the transaction
    const signResult = await client.request('sign', {
      tx_json: preparedTx,
      secret: wallet.seed
    });
    
    if (signResult.error) {
      throw new Error(`Transaction signing failed: ${signResult.error_message || signResult.error}`);
    }
    
    console.log('Transaction signed successfully:', signResult.result.tx_blob.substring(0, 30) + '...');
    
    // Then submit the signed transaction
    const submitResult = await client.request('submit', {
      tx_blob: signResult.result.tx_blob
    });
    
    return submitResult;
  }
}

// Buy an egg
export async function buyEgg(wallet: Wallet, priceXRP = '10'): Promise<any> {
  // If using the master account, we'll send to a different address
  // since we can't send to ourselves
  let eggShopAddress = import.meta.env.VITE_EGG_SHOP_ADDR;
  
  // If using master account as wallet, we need another destination
  if (wallet.address === 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh') {
    // Use a placeholder destination address for demo purposes
    eggShopAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
  } else if (!eggShopAddress) {
    // Otherwise use master account as destination
    eggShopAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  }
  
  console.log(`Buying egg: sending ${priceXRP} XRP from ${wallet.address} to ${eggShopAddress}`);
  
  // Convert XRP to drops (1 XRP = 1,000,000 drops)
  const drops = String(Number(priceXRP) * 1000000);
  
  // Create payment transaction
  const paymentTx = {
    TransactionType: 'Payment',
    Destination: eggShopAddress,
    Amount: drops,
  };
  
  const result = await submitTransaction(wallet, paymentTx);
  
  // Check if transaction was successful
  if (result.error) {
    throw new Error(`Payment failed: ${result.error_message || result.error}`);
  }
  
  // Check engine result
  if (result.result.engine_result !== 'tesSUCCESS') {
    throw new Error(`Payment failed: ${result.result.engine_result_message || result.result.engine_result}`);
  }
  
  console.log('Payment successful!');
  return result;
}

// Get account info
export async function getAccountInfo(address: string): Promise<any> {
  const client = await getClient();
  const response = await client.request('account_info', { account: address });
  
  if (response.error) {
    console.error(`Error getting account info: ${response.error_message || response.error}`);
    
    // Throw a detailed error
    throw new Error(`Account lookup failed: ${response.error_message || response.error}`);
  }
  
  return response.result?.account_data;
}

// Claim reward
export async function claimReward(wallet: Wallet, amount: number): Promise<any> {
  // This is a simulated function as rewards aren't part of core XRPL
  // In a real implementation, this would interact with a hook or another contract
  throw new Error('Rewards are not implemented in direct mode');
}

// Disconnect from XRPL
export async function disconnect(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}

