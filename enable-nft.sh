#!/bin/bash

echo "==============================================="
echo "  Enabling NFT Features on XRPL Node (No Mocks)"
echo "==============================================="

# Ensure we're in the right directory
cd "$(dirname "$0")"

echo "Fixing port mappings in docker-compose.yml..."
# Update port mappings in docker-compose.yml if needed
if grep -q "6006:5005" docker-compose.yml || grep -q "5005:6006" docker-compose.yml; then
  echo "Fixing swapped port mappings..."
  sed -i.bak 's/"6006:5005"/"5005:5005"/g' docker-compose.yml
  sed -i.bak 's/"5005:6006"/"6006:6006"/g' docker-compose.yml
fi

# Update environment variable to use the correct port
sed -i.bak 's/VITE_XRPL_WS=ws:\/\/localhost:6006/VITE_XRPL_WS=ws:\/\/localhost:5005/' docker-compose.yml

# Update xrpl-direct.ts to use correct port
sed -i.bak 's/const url = .ws:\/\/localhost:6006.;/const url = "ws:\/\/localhost:5005";/' frontend/src/xrpl-direct.ts

echo "Stopping XRPL containers..."
docker-compose down

echo "Updating rippled.cfg with NFT features..."

# Path to config file
CONFIG_FILE="./xrpl-config/rippled.cfg"

# Check if file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: rippled.cfg not found at $CONFIG_FILE"
  exit 1
fi

# Ensure [features] section exists
if ! grep -q "\[features\]" "$CONFIG_FILE"; then
  echo "Adding [features] section to rippled.cfg..."
  echo "
[features]" >> "$CONFIG_FILE"
fi

# Add NFT features if not already present
NFT_FEATURES=(
  "NFTokenMint"
  "NFTokenBurn"
  "NonFungibleTokensV1"
  "NonFungibleTokensV1_1"
  "fixNFTokenDirV1"
  "fixNFTokenRemint"
)

for FEATURE in "${NFT_FEATURES[@]}"; do
  if ! grep -q "^$FEATURE$" "$CONFIG_FILE"; then
    echo "Adding $FEATURE to features section..."
    # Insert after [features] - macOS compatible
    sed -i '' -e "/\[features\]/a\\
$FEATURE
" "$CONFIG_FILE" 2>/dev/null || sed -i -e "/\[features\]/a\\
$FEATURE
" "$CONFIG_FILE"
  else
    echo "$FEATURE already present in config"
  fi
done

# Update docker-compose.yml if needed
DOCKER_COMPOSE="./docker-compose.yml"
if [ -f "$DOCKER_COMPOSE" ] && ! grep -q "\\./xrpl-config:/config" "$DOCKER_COMPOSE"; then
  echo "Warning: Your docker-compose.yml may not be mounting the config files."
  echo "Please ensure it contains a volumes section like:"
  echo "  volumes:"
  echo "    - ./xrpl-config:/config"
  echo ""
  echo "And a command like:"
  echo "  command: -a --conf /config/rippled.cfg --validators-file /config/validators.txt"
fi

# Start the containers
echo "Starting containers with NFT support..."
docker-compose up -d

# Wait for XRPL node to start
echo "Waiting for XRPL node to start (this may take a few seconds)..."
sleep 15

# Use the admin API to enable amendments
echo "Enabling NFT amendments via the admin API..."
curl -s -X POST -H "Content-Type: application/json" -d '{
  "method": "feature",
  "params": [{
    "feature": "NonFungibleTokensV1_1",
    "vetoed": false
  }]
}' http://localhost:8080/

curl -s -X POST -H "Content-Type: application/json" -d '{
  "method": "feature",
  "params": [{
    "feature": "NFTokenMint",
    "vetoed": false
  }]
}' http://localhost:8080/

# Wait for amendments to activate
echo "Waiting for amendments to activate..."
sleep 15

# Check if NFT features are enabled
echo "Checking if NFT features are enabled..."
curl -s -X POST -H "Content-Type: application/json" -d '{
  "method": "server_info",
  "params": [{}]
}' http://localhost:8080/ > /tmp/server_info.json

# Check if curl command succeeded
if [ $? -ne 0 ]; then
  echo "Error: Failed to connect to XRPL node. Make sure it's running and accessible."
  exit 1
fi

# Check for NFT-related amendments
if grep -q "NFToken\|NonFungibleTokens" /tmp/server_info.json; then
  echo ""
  echo "✅ NFT features are successfully enabled!"
else
  echo ""
  echo "❌ NFT features do not appear to be enabled. Check your configuration."
fi

echo ""
echo "Done! You should now be able to mint NFTs on your local XRPL node."
echo "Remember: No mocks - only real XRPL operations allowed!"