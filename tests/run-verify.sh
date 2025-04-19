#!/bin/bash

echo "Running XRPL verification (NO MOCKS - REAL XRPL ONLY)..."
cd "$(dirname "$0")"

# Install dependencies
if [ ! -d "node_modules" ] || [ ! -f "node_modules/ws/package.json" ]; then
  echo "Installing WebSocket dependency..."
  npm install --no-save ws
fi

# Run verification tool
node verify-xrpl.js

# Check result
if [ $? -eq 0 ]; then
  echo "✅ XRPL verification completed successfully!"
else
  echo "❌ XRPL verification failed."
  echo "Please run the enable-nft.sh script to properly set up your XRPL node."
  echo "See ENABLE_NFT.md for more information."
fi