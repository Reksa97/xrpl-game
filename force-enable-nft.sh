#!/bin/bash

echo "==============================================="
echo "  Forcing NFT Features on XRPL Standalone Mode "
echo "==============================================="

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Create a special standalone config file
echo "Using a special config file for NFT-enabled standalone mode..."
cp standalone-with-nft.cfg xrpl-config/rippled.cfg

# Update xrpl-direct.ts to use the correct port
echo "Updating xrpl-direct.ts to use the correct port..."
sed -i.bak 's/const url = .ws:\/\/localhost:[0-9]*./const url = "ws:\/\/localhost:5005";/' frontend/src/xrpl-direct.ts

# Stop the current containers
echo "Stopping containers..."
docker-compose down

# Remove the existing XRPL data
echo "Removing existing XRPL data to start fresh..."
docker volume rm $(docker volume ls -q | grep mica_sdk) 2>/dev/null || true

# Start with the new config
echo "Starting containers with forced NFT support..."
docker-compose up -d

echo "Waiting for XRPL node to start (30 seconds)..."
sleep 30

# Set transaction flags for NFT operations
echo "Setting account flags to allow NFT operations..."
curl -s -X POST -H "Content-Type: application/json" -d '{
    "method": "submit",
    "params": [{
        "tx_json": {
            "TransactionType": "AccountSet",
            "Account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
            "SetFlag": 10
        },
        "secret": "snoPBrXtMeMyMHUVTgbuqAfg1SUTb"
    }]
}' http://localhost:8080/

echo "Waiting for flags to be set..."
sleep 5

# Verify amendments are enabled
echo "Checking for enabled amendments..."
curl -s -X POST -H "Content-Type: application/json" -d '{
    "method": "server_info"
}' http://localhost:8080/ > /tmp/server_info.json

# Check if NFT amendments are in the list
if grep -q "NonFungibleTokensV1" /tmp/server_info.json; then
    echo "✅ NFT amendments are enabled!"
else
    echo "⚠️ NFT amendments don't appear to be enabled yet. This might take more time."
    echo "Try starting a fresh XRPL node with this script."
fi

echo ""
echo "Run the direct test script to check NFT minting:"
echo "./tests/run-direct-test.sh"
echo ""
echo "Or restart the frontend and try minting in the UI:"
echo "docker-compose restart frontend"