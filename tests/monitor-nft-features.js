// XRPL NFT Feature Monitor
// This script directly checks the XRPL node for NFT feature support without launching a browser

const WebSocket = require('ws');

// URLs to try
const WS_URLS = [
  'ws://localhost:5005',
  'ws://localhost:6006',
  'ws://xrpl-node:5005'
];

// Helper for WebSocket requests
async function makeRequest(url, command, params = {}) {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(url);
      const requestId = Date.now();
      
      // Handle connection timeout
      const connectionTimeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout for ${url}`));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        
        // Handle request timeout
        const requestTimeout = setTimeout(() => {
          ws.close();
          reject(new Error(`Request timeout for ${command}`));
        }, 10000);
        
        ws.on('message', (data) => {
          clearTimeout(requestTimeout);
          try {
            const response = JSON.parse(data.toString());
            ws.close();
            resolve(response);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err.message}`));
          }
        });
        
        // Send request
        const request = {
          id: requestId,
          command,
          ...params
        };
        
        ws.send(JSON.stringify(request));
      });
      
      ws.on('error', (err) => {
        clearTimeout(connectionTimeout);
        ws.close();
        reject(new Error(`WebSocket error for ${url}: ${err.message}`));
      });
    } catch (err) {
      reject(new Error(`Failed to create WebSocket for ${url}: ${err.message}`));
    }
  });
}

// Connect to the XRPL node and check features
async function checkXrplFeatures() {
  let lastError = null;
  
  // Try each URL
  for (const url of WS_URLS) {
    try {
      console.log(`Trying to connect to ${url}...`);
      const serverInfo = await makeRequest(url, 'server_info');
      
      console.log(`Successfully connected to ${url}`);
      
      // Check if amendments field exists
      if (!serverInfo.result?.info?.amendments) {
        console.warn('No amendments field found in server_info response');
        continue;
      }
      
      // Extract NFT-related amendments
      const amendments = serverInfo.result.info.amendments;
      const nftAmendments = amendments.filter(a => 
        a.includes('NFToken') || a.includes('NonFungibleTokens')
      );
      
      // Display server info
      console.log('\nXRPL Node Status:');
      console.log('------------------');
      console.log(`Server State: ${serverInfo.result.info.server_state}`);
      console.log(`Complete Ledgers: ${serverInfo.result.info.complete_ledgers}`);
      console.log(`Build Version: ${serverInfo.result.info.build_version}`);
      console.log(`Uptime: ${serverInfo.result.info.uptime} seconds`);
      
      // Display NFT feature status
      console.log('\nNFT Feature Status:');
      console.log('------------------');
      
      if (nftAmendments.length > 0) {
        console.log('✅ NFT features ARE enabled on this node');
        console.log('Enabled NFT amendments:');
        nftAmendments.forEach(a => console.log(`- ${a}`));
      } else {
        console.log('❌ NFT features are NOT enabled on this node');
        console.log('No NFT-related amendments found');
      }
      
      // Print all amendments for reference
      console.log('\nAll enabled amendments:');
      console.log('------------------');
      amendments.forEach(a => console.log(`- ${a}`));
      
      // Check for required features
      const requiredFeatures = [
        'NFTokenMint', 
        'NonFungibleTokensV1'
      ];
      
      const missingFeatures = requiredFeatures.filter(
        feature => !amendments.some(a => a.includes(feature))
      );
      
      if (missingFeatures.length > 0) {
        console.log('\n⚠️ Missing required NFT features:');
        missingFeatures.forEach(f => console.log(`- ${f}`));
        
        console.log('\nRecommendation:');
        console.log('------------------');
        console.log('Update your rippled.cfg file to include these features in the [features] section:');
        console.log('NFTokenMint');
        console.log('NFTokenBurn');
        console.log('NonFungibleTokensV1');
        console.log('NonFungibleTokensV1_1');
        console.log('\nThen restart your XRPL node: docker-compose restart xrpl-node');
      }
      
      // If we got a response, we're done
      return {
        connected: true,
        url,
        serverState: serverInfo.result.info.server_state,
        completeLedgers: serverInfo.result.info.complete_ledgers,
        amendments,
        nftAmendments,
        hasNftFeatures: nftAmendments.length > 0,
        missingFeatures
      };
    } catch (err) {
      console.error(`Failed to connect to ${url}: ${err.message}`);
      lastError = err;
    }
  }
  
  // If we reach here, all connection attempts failed
  throw lastError || new Error('Failed to connect to any XRPL node URL');
}

// Main function
async function main() {
  console.log('XRPL NFT Feature Monitor');
  console.log('-------------------------');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check XRPL features
    const result = await checkXrplFeatures();
    
    // Create feature check script for the frontend
    if (!result.hasNftFeatures && result.missingFeatures.length > 0) {
      console.log('\nCreating NFT feature enablement script...');
      
      // Generate script to enable NFT features
      const enableScript = `
#!/bin/bash

echo "Enabling NFT features on XRPL node..."

# Stop containers
docker-compose down

# Update rippled.cfg
echo "Updating rippled.cfg..."

# Path to rippled.cfg
CONFIG_FILE="/Users/reko/dev/xrpl/mica_sdk/xrpl-config/rippled.cfg"

# Check if file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "rippled.cfg not found at $CONFIG_FILE"
  exit 1
fi

# Check if [features] section exists
if ! grep -q "\\[features\\]" "$CONFIG_FILE"; then
  echo "No [features] section found in rippled.cfg. Adding it..."
  echo "
[features]
" >> "$CONFIG_FILE"
fi

# Add NFT features if they don't exist
for FEATURE in "NFTokenMint" "NFTokenBurn" "NonFungibleTokensV1" "NonFungibleTokensV1_1"; do
  if ! grep -q "^$FEATURE$" "$CONFIG_FILE"; then
    echo "Adding $FEATURE to features..."
    sed -i -e "/\\[features\\]/a\\
$FEATURE" "$CONFIG_FILE"
  else
    echo "$FEATURE already exists in features section"
  fi
done

# Restart containers
echo "Restarting containers..."
docker-compose up -d

echo "Waiting for XRPL node to start..."
sleep 10

echo "Done. NFT features should now be enabled."
echo "Run this script again to verify:"
echo "node tests/monitor-nft-features.js"
`;

      // Save script to file
      const fs = require('fs');
      const scriptPath = '/Users/reko/dev/xrpl/mica_sdk/tests/enable-nft-features.sh';
      
      fs.writeFileSync(scriptPath, enableScript);
      fs.chmodSync(scriptPath, '755');
      
      console.log(`Created script at: ${scriptPath}`);
      console.log('Run this script to automatically enable NFT features:');
      console.log(`bash ${scriptPath}`);
    }
    
  } catch (err) {
    console.error('Error:', err);
    console.log('\nRecommendations:');
    console.log('1. Check if the XRPL node is running: docker ps');
    console.log('2. Check the node logs: docker-compose logs xrpl-node');
    console.log('3. Restart the node: docker-compose restart xrpl-node');
  }
}

// Run the monitor
main().catch(console.error);