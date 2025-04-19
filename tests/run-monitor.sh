#!/bin/bash

echo "Setting up NPM dependencies..."
cd "$(dirname "$0")"
npm install --no-save ws

echo "Running NFT feature monitor..."
node monitor-nft-features.js

echo "Running diagnostic test in background..."
mkdir -p test-screenshots
node diagnostic-test.js &

echo "Monitor completed. Check the logs and screenshots in the tests directory."
echo "To enable NFT features, use the enable-nft-features.sh script if it was generated."