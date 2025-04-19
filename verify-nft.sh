#!/bin/bash

echo "=============================================="
echo " XRPL NFT Verification Script"
echo "=============================================="

# Check if the XRPL node is running
echo "Checking if XRPL node is running..."
if docker ps | grep -q xrpl-node; then
  echo "✅ XRPL node is running"
else
  echo "❌ XRPL node is not running"
  echo "Please start the containers first:"
  echo "docker-compose up -d"
  exit 1
fi

# Check container status
echo "Checking container status..."
docker-compose ps

# Check if the XRPL node is fully initialized
echo "Checking XRPL node status..."
docker exec xrpl-node rippled server_info 2>/dev/null | grep server_state || echo "❌ Could not get server state"

# Check if NFT feature is present in config
echo "Checking NFT feature configuration..."
docker exec xrpl-node rippled feature NonFungibleTokensV1_1 2>/dev/null | grep -o '"name" : "NonFungibleTokensV1_1"' && echo "✅ NFT feature is configured"

# Try to mint an NFT
echo "Trying to mint an NFT..."
MINT_RESULT=$(docker exec xrpl-node rippled submit 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb' '{
  "TransactionType":"NFTokenMint",
  "Account":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "URI":"68747470733A2F2F6578616D706C652E636F6D2F766572696679696E672D6E66742E6A736F6E",
  "NFTokenTaxon":0,
  "Flags":8,
  "Fee":"10"
}' 2>/dev/null)

echo "$MINT_RESULT" | grep -q "tesSUCCESS" && echo "✅ NFT minting successful!" || echo "❌ NFT minting failed"

# Wait a moment for the ledger to close
echo "Waiting 5 seconds for ledger to close..."
sleep 5

# Check for NFTs in the account
echo "Checking for NFTs in the account..."
NFT_RESULT=$(docker exec xrpl-node rippled account_nfts rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh 2>/dev/null)

echo "$NFT_RESULT" | grep -q "NFTokenID" && echo "✅ NFTs found in account!" || echo "❌ No NFTs found in account"

# Show count of NFTs
echo "NFT count:" 
echo "$NFT_RESULT" | grep -o "NFTokenID" | wc -l

echo "=============================================="
echo "Verification complete!"
echo "=============================================="