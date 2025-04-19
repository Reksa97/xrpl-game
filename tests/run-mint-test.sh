#!/bin/bash

echo "Setting up NFT minting test environment..."
cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
npm install --no-save puppeteer

# Check if application is running
echo "Checking if application is running..."
if curl -s --head http://localhost:3000 | head -n 1 | grep "HTTP/1.[01] [23].." > /dev/null; then
  echo "✅ Application is running at http://localhost:3000"
else
  echo "❌ Application is not running at http://localhost:3000"
  echo "Please start the application with ./start-dev.sh before running tests"
  exit 1
fi

# Create screenshots directory
mkdir -p screenshots

# Run the NFT minting test
echo "Running NFT minting test..."
node auto-mint-test.js

# Check result
STATUS=$?
if [ $STATUS -eq 0 ]; then
  echo "✅ NFT minting test completed successfully!"
else
  echo "❌ NFT minting test failed with errors"
  echo "Check the screenshots directory for details"
  echo ""
  echo "If you're seeing 'The transaction requires logic that is currently disabled'"
  echo "You need to enable NFT features on your XRPL node."
  echo ""
  echo "Options to fix:"
  echo "1. Run the NFT fix script: node fix-nft-support.js (uses mocks)"
  echo "2. Enable NFT features in XRPL: ./enable-nft-features.sh (requires restart)"
fi

echo "Test completed. Check the screenshots in ./screenshots directory"