// Direct test of the mintNFT function in xrpl-direct.ts using the proxy approach
const http = require('http');
const WebSocket = require("ws");

async function runTest() {
  try {
    console.log("Starting NFT minting test with proxy approach");
    
    // Master wallet for XRPL standalone mode
    const wallet = {
      address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      seed: "snoPBrXtMeMyMHUVTgbuqAfg1SUTb"
    };
    
    // Test URI
    const uri = "https://example.com/test-frontend-mint.json";
    
    // Convert URI to hex
    const hexUri = Buffer.from(uri).toString("hex").toUpperCase();
    console.log(`Converting URI to hex: ${hexUri}`);
    
    // Create WebSocket connection for non-signing operations
    const ws = new WebSocket("ws://localhost:5005");
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      ws.on("open", () => {
        console.log("Connected to XRPL node via WebSocket");
        resolve();
      });
      ws.on("error", (error) => {
        console.error("WebSocket connection error:", error);
        reject(error);
      });
      // Add timeout
      setTimeout(() => reject(new Error("WebSocket connection timeout")), 5000);
    });
    
    // Get account info for sequence number
    const accountInfo = await new Promise((resolve, reject) => {
      const accountInfoReq = {
        id: 1,
        command: "account_info",
        account: wallet.address
      };
      
      ws.send(JSON.stringify(accountInfoReq));
      
      ws.once("message", (data) => {
        const response = JSON.parse(data.toString());
        console.log("Account info received");
        
        if (!response.result || !response.result.account_data) {
          reject(new Error("Failed to get account info"));
          return;
        }
        
        resolve(response);
      });
      
      // Add timeout
      setTimeout(() => reject(new Error("Account info request timeout")), 5000);
    });
    
    const sequence = accountInfo.result.account_data.Sequence;
    console.log(`Current sequence number: ${sequence}`);
    
    // Get current ledger
    const ledgerInfo = await new Promise((resolve, reject) => {
      const ledgerReq = {
        id: 2,
        command: "ledger_current"
      };
      
      ws.send(JSON.stringify(ledgerReq));
      
      ws.once("message", (data) => {
        const response = JSON.parse(data.toString());
        console.log("Ledger info received");
        
        if (!response.result) {
          reject(new Error("Failed to get ledger info"));
          return;
        }
        
        resolve(response);
      });
      
      // Add timeout
      setTimeout(() => reject(new Error("Ledger info request timeout")), 5000);
    });
    
    const ledgerIndex = ledgerInfo.result.ledger_current_index;
    console.log(`Current ledger index: ${ledgerIndex}`);
    
    // Prepare the transaction
    const preparedTx = {
      TransactionType: "NFTokenMint",
      Account: wallet.address,
      URI: hexUri,
      Flags: 8, // transferable
      NFTokenTaxon: 0,
      Fee: "10",
      Sequence: sequence,
      LastLedgerSequence: ledgerIndex + 20
    };
    
    // Create a properly formatted transaction payload for the proxy
    const requestBody = {
      method: "submit",
      params: [{
        tx_json: preparedTx,
        secret: wallet.seed
      }]
    };
    
    console.log("Sending NFT mint transaction to proxy server...");
    
    // Send to proxy server using Node.js http module
    const proxyResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/xrpl-proxy',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP error! status: ${res.statusCode}`));
            return;
          }
          
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (err) {
            reject(new Error(`Error parsing response: ${err.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      // Write data to request body
      req.write(JSON.stringify(requestBody));
      req.end();
    });
    console.log("Proxy response:", JSON.stringify(proxyResponse, null, 2));
    
    if (
      proxyResponse.result && 
      (proxyResponse.result.engine_result === "tesSUCCESS" || 
       (proxyResponse.result.tx_json && proxyResponse.result.tx_json.hash))
    ) {
      console.log("✅ NFT minting transaction submitted successfully!");
      
      // Wait for ledger to close
      console.log("Waiting for ledger to close (5 seconds)...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check for NFTs
      const nftResponse = await new Promise((resolve, reject) => {
        const nftReq = {
          id: 4,
          command: "account_nfts",
          account: wallet.address
        };
        
        ws.send(JSON.stringify(nftReq));
        
        ws.once("message", (data) => {
          const response = JSON.parse(data.toString());
          resolve(response);
        });
        
        // Add timeout
        setTimeout(() => reject(new Error("NFT request timeout")), 5000);
      });
      
      console.log("NFT response:", JSON.stringify(nftResponse, null, 2));
      
      if (nftResponse.result && nftResponse.result.account_nfts) {
        console.log(`Found ${nftResponse.result.account_nfts.length} NFTs`);
        console.log("✅ NFT minting test completed successfully!");
      } else {
        console.log("❌ No NFTs found after minting");
      }
    } else {
      console.log("❌ NFT minting failed:", 
        proxyResponse.result ? 
          proxyResponse.result.engine_result_message || proxyResponse.result.engine_result : 
          "Unknown error"
      );
    }
    
    // Close WebSocket connection
    ws.close();
    console.log("WebSocket connection closed");
    
  } catch (error) {
    console.error("Error in test:", error);
  }
}

// Run the test
runTest();
