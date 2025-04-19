#!/bin/bash

echo "Enabling NFT features on XRPL node..."

# Stop containers
cd "$(dirname "$0")/.."
echo "Stopping containers..."
docker-compose down

# Update rippled.cfg
echo "Updating rippled.cfg..."

# Path to rippled.cfg
CONFIG_FILE="./xrpl-config/rippled.cfg"

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

# Define NFT features
NFT_FEATURES=(
  "NFTokenMint"
  "NFTokenBurn"
  "NonFungibleTokensV1"
  "NonFungibleTokensV1_1"
  "fixNFTokenDirV1"
  "fixNFTokenRemint"
)

# Add NFT features to config file
for FEATURE in "${NFT_FEATURES[@]}"; do
  if ! grep -q "^$FEATURE$" "$CONFIG_FILE"; then
    echo "Adding $FEATURE to features..."
    # MacOS safe sed approach
    sed -i '' -e "/\\[features\\]/a\\
$FEATURE
" "$CONFIG_FILE" || sed -i -e "/\\[features\\]/a\\
$FEATURE
" "$CONFIG_FILE"
  else
    echo "$FEATURE already exists in features section"
  fi
done

# Ensure docker-compose mounts the config
echo "Checking docker-compose.yml for volume mounts..."
if ! grep -q "./xrpl-config:/config" "docker-compose.yml"; then
  echo "WARNING: Your docker-compose.yml may not be mounting the config directory."
  echo "Please check that you have the following in your xrpl-node service:"
  echo "volumes:"
  echo "  - ./xrpl-config:/config"
  echo ""
  echo "And also ensure you're using the config with the command like:"
  echo "command: -a --conf /config/rippled.cfg"
fi

# Restart containers
echo "Restarting containers..."
docker-compose up -d

echo "Waiting for XRPL node to start..."
sleep 10

echo "Checking if NFT features are enabled..."
cd tests
node monitor-nft-features.js

echo "Done. NFT features should now be enabled."
echo "If you still see issues, run the diagnostic test:"
echo "node tests/diagnostic-test.js"