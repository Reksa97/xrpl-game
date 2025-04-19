#!/bin/bash

echo "Running direct NFT minting test..."
cd "$(dirname "$0")"

# Install dependencies
if [ ! -d "node_modules" ] || [ ! -f "node_modules/ws/package.json" ]; then
  echo "Installing WebSocket dependency..."
  npm install --no-save ws
fi

# Run the test
node direct-nft-test.js

# Check result
STATUS=$?
if [ $STATUS -eq 0 ]; then
  echo "✅ Direct test completed successfully!"
else
  echo "❌ Direct test failed."
  echo ""
  echo "NFT Feature Status:"
  echo "-------------------"
  echo "1. If you see 'NFT feature is disabled on this XRPL node':"
  echo "   - Run '../enable-nft.sh' to enable NFT features"
  echo ""
  echo "2. If you see connection errors:"
  echo "   - Restart your XRPL node with: docker-compose restart xrpl-node"
  echo "   - Wait 30 seconds for the node to fully start"
  echo ""
  echo "3. For any other issues:"
  echo "   - Check XRPL node logs: docker-compose logs xrpl-node"
fi