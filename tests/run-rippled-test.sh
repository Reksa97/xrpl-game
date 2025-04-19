#!/bin/bash

# Direct test using rippled command inside Docker container

echo "=============================================="
echo "  Testing NFT Minting with rippled command"
echo "=============================================="

# Check if rippled container is running
if ! docker ps | grep -q xrpl-node; then
  echo "❌ XRPL node container is not running"
  exit 1
fi

echo "✅ XRPL node container is running"

# Check server info
echo -e "\nChecking server info..."
SERVER_INFO=$(docker exec xrpl-node rippled server_info 2>/dev/null)
SERVER_STATE=$(echo "$SERVER_INFO" | grep -o '"server_state" : "[^"]*"' | cut -d'"' -f4)

echo "Server state: $SERVER_STATE"

if [ "$SERVER_STATE" != "full" ] && [ "$SERVER_STATE" != "proposing" ]; then
  echo "❌ Server is not in full or proposing state"
  exit 1
fi

# Check NFT feature status
echo -e "\nChecking NFT feature status..."
NFT_FEATURE=$(docker exec xrpl-node rippled feature NonFungibleTokensV1_1 2>/dev/null)
echo "$NFT_FEATURE" | grep -o '"name" : "NonFungibleTokensV1_1"'

# Check existing NFTs
echo -e "\nChecking existing NFTs..."
EXISTING_NFTS=$(docker exec xrpl-node rippled account_nfts rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh 2>/dev/null)
NFT_COUNT=$(echo "$EXISTING_NFTS" | grep -o '"NFTokenID" :' | wc -l)

echo "Found $NFT_COUNT existing NFTs"

# Generate a plain text URI for the NFT
PLAIN_URI="https://example.com/test-$(date +%s).json"
echo "Plain URI: $PLAIN_URI"

# Convert to hex (this is the correct format for the URI field)
URI=$(echo -n "$PLAIN_URI" | xxd -p | tr -d '\n' | tr '[:lower:]' '[:upper:]')
echo "Hex URI: $URI"

# Mint a new NFT using submit command with the master seed
echo -e "\nMinting new NFT..."
MINT_JSON="{
  \"TransactionType\":\"NFTokenMint\",
  \"Account\":\"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh\",
  \"URI\":\"$URI\",
  \"NFTokenTaxon\":0,
  \"Flags\":8,
  \"Fee\":\"10\"
}"

echo "Transaction JSON: $MINT_JSON"

MINT_RESULT=$(docker exec xrpl-node rippled submit 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb' "$MINT_JSON" 2>&1)

# Log full result for debugging
echo -e "\nFull result:"
echo "$MINT_RESULT"

# Check the result
echo -e "\nExtracted values:"
echo "$MINT_RESULT" | grep -o '"engine_result" : "[^"]*"' || echo "No engine_result found"
echo "$MINT_RESULT" | grep -o '"engine_result_message" : "[^"]*"' || echo "No engine_result_message found"

SUCCESS=$(echo "$MINT_RESULT" | grep -c '"engine_result" : "tesSUCCESS"')

if [ "$SUCCESS" -eq 1 ]; then
  echo "✅ NFT minting transaction submitted successfully!"
else
  echo "❌ NFT minting transaction failed"
  exit 1
fi

# Wait for ledger to close
echo -e "\nWaiting for ledger to close (5 seconds)..."
sleep 5

# Check NFTs after minting
echo -e "\nChecking NFTs after minting..."
AFTER_NFTS=$(docker exec xrpl-node rippled account_nfts rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh 2>/dev/null)
AFTER_COUNT=$(echo "$AFTER_NFTS" | grep -o '"NFTokenID" :' | wc -l)

echo "Found $AFTER_COUNT NFTs after minting"

# Compare counts
if [ "$AFTER_COUNT" -gt "$NFT_COUNT" ]; then
  echo "✅ New NFT successfully minted and verified!"
  echo -e "\nNFT count: Before=$NFT_COUNT, After=$AFTER_COUNT"
  exit 0
else
  echo "❌ NFT count did not increase after minting"
  echo -e "\nNFT count: Before=$NFT_COUNT, After=$AFTER_COUNT"
  exit 1
fi