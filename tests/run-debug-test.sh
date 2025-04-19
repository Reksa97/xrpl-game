#!/bin/bash

echo "Running NFT minting debug test..."

# Ensure we have necessary packages installed
cd "$(dirname "$0")"
echo "Installing puppeteer..."
npm install --no-save puppeteer

# Check if application is running
echo "Checking if application is running at http://localhost:3000..."
if curl -s http://localhost:3000 > /dev/null; then
  echo "✅ Application is running"
else
  echo "❌ Application is not running at http://localhost:3000"
  echo "Please start the application with ./start-dev.sh before running tests"
  exit 1
fi

# Run the debug script
echo "Starting debug test..."
node debug-nft-minting.js

echo "Debug test completed! Check the screenshots and logs in the current directory."