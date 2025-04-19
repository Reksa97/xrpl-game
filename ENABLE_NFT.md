# Enabling NFT Features on Your XRPL Node

This document explains how to enable NFT features on your local XRPL node to support NFT minting and trading.

## Requirements

The NFT minting feature **will not work** without enabling NFT amendments on your XRPL node.

## Known Issues

1. **Port Mapping Issue**:
   There's a port mapping issue in the current Docker setup. The ports are swapped:
   - Container port 5005 → Host port 6006
   - Container port 6006 → Host port 5005

   This means our WebSocket connection settings need to be:
   ```javascript
   // In xrpl-direct.ts
   const url = 'ws://localhost:5005'; // Connect to admin port
   ```

2. **Connection Timing**:
   The XRPL node may need time to fully start up before NFT features are enabled.
   Try restarting the containers and waiting at least 30 seconds:
   ```bash
   docker-compose restart xrpl-node
   # Wait 30 seconds
   ```

3. **Amendment Activation**:
   Even though NFT features are in the config file, they may not be activated in the ledger.
   We need to ensure the amendments are active in the current ledger.

## Step 1: Update your rippled.cfg file

Edit the `rippled.cfg` file in your `xrpl-config` directory to ensure the following features are enabled:

```
[features]
NFTokenMint
NFTokenBurn
NonFungibleTokensV1
NonFungibleTokensV1_1
fixNFTokenDirV1
fixNFTokenRemint
```

## Step 2: Update your docker-compose.yml

Make sure your docker-compose.yml mounts the config directory:

```yaml
services:
  xrpl-node:
    # other settings...
    command: -a --conf /config/rippled.cfg --validators-file /config/validators.txt
    volumes:
      - ./xrpl-config:/config
```

## Step 3: Restart your XRPL node

```bash
docker-compose down
docker-compose up -d
```

## Step 4: Verify NFT features are enabled

You can verify NFT features are enabled by checking the enabled amendments:

```bash
# Wait for the node to start (about 10-15 seconds)
curl -X POST -H "Content-Type: application/json" -d '{
  "method": "server_info",
  "params": [{}]
}' http://localhost:8080/
```

Look for NFToken-related amendments in the response.

## Common Errors

### "The transaction requires logic that is currently disabled"

This error means the NFT features are not enabled on your XRPL node. Follow the steps above to enable them.

### "Bad signature"

This usually indicates an issue with the wallet credentials. Make sure you're using the correct master account seed for standalone mode:

```
address: rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
seed: snoPBrXtMeMyMHUVTgbuqAfg1SUTb
```

## Important Notes

- NFT operations cannot be mocked or simulated - they require actual ledger support
- The application will fail explicitly if NFT features are not enabled
- In standalone mode, always use the master account for minting NFTs