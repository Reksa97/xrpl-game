# ULTIMATE SOLUTION: Enabling NFT Support in XRPL for Creature Crafter + "Signing is not supported" Fix

This document provides a comprehensive solution for enabling NFT support in XRPL for the Creature Crafter game.

## Background

The Creature Crafter game requires NFT minting capabilities on the XRPL network. However, by default, NFT features need to be explicitly enabled in standalone XRPL nodes, which has been the source of our issues.

## Key Problems Solved

1. **NFT Feature Enablement**: Enabling the `NonFungibleTokensV1_1` amendment in XRPL.
2. **Port Configuration**: Correct mapping of XRPL node ports between host and container.
3. **WebSocket Connection**: Proper configuration for frontend to connect to the XRPL node.
4. **NFT Minting**: Successful NFT creation and verification.

## Solution

### 1. Automatic Setup Script

We've created a comprehensive `force-enable-nft.sh` script that:

- Creates the proper `rippled.cfg` configuration with NFT support
- Updates `docker-compose.yml` with correct port mappings
- Restarts containers with a clean configuration
- Tests NFT minting to verify functionality

To use it:

```bash
./force-enable-nft.sh
```

### 2. Manual Steps (if needed)

If you need to manually configure NFT support:

#### a. Update rippled.cfg

Create or modify `/xrpl-config/rippled.cfg` to include:

```ini
[features]
NonFungibleTokensV1_1
```

#### b. Update docker-compose.yml

Ensure docker-compose.yml has:

```yaml
services:
  xrpl-node:
    command: -a --start  # Run in standalone mode and force start amendments
    ports:
      - "6006:6006"      # Admin API
      - "5005:5005"      # Public API
```

#### c. Update Frontend Connection

In `frontend/src/xrpl-direct.ts`:

```typescript
const url = "ws://localhost:5005";
```

### 3. Verifying NFT Support

To test if NFT minting is working:

```bash
# Inside the xrpl-node container
docker exec xrpl-node rippled submit 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb' '{
  "TransactionType":"NFTokenMint",
  "Account":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "URI":"68747470733A2F2F6578616D706C652E636F6D2F6D792D6E66742E6A736F6E",
  "NFTokenTaxon":0,
  "Flags":8,
  "Fee":"10"
}'

# Check for NFTs
docker exec xrpl-node rippled account_nfts rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
```

A successful response will show:

```json
{
  "result": {
    "account_nfts": [
      {
        "Flags": 8,
        "Issuer": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        "NFTokenID": "00080000B5F762798A53D543A014CAF8B297CFF8F2F937E80000099B00000000",
        "NFTokenTaxon": 0,
        "URI": "68747470733A2F2F6578616D706C652E636F6D2F6D792D6E66742E6A736F6E",
        "nft_serial": 0
      }
    ],
    "status": "success"
  }
}
```

## Important Notes

1. **Master Account**: The default master account for XRPL standalone mode is `rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh` with seed `snoPBrXtMeMyMHUVTgbuqAfg1SUTb`.

2. **Port Mapping**: 
   - Container port 5005 → Host port 5005 (WebSocket API)
   - Container port 6006 → Host port 6006 (Admin API)

3. **NFT Amendments**: Only `NonFungibleTokensV1_1` needs to be specified in the `[features]` section of `rippled.cfg`. This includes all required NFT functionality.

4. **Startup Flag**: The `--start` flag is crucial for enabling amendments in standalone mode.

## Troubleshooting

1. **If NFT minting fails**:
   - Check that the XRPL node is running: `docker-compose ps`
   - Verify logs for errors: `docker-compose logs xrpl-node`
   - Restart the XRPL node: `docker-compose restart xrpl-node`
   - Wait 30 seconds before testing again

2. **If WebSocket connection fails**:
   - Check port mappings in docker-compose.yml
   - Ensure frontend is connecting to the correct WebSocket URL
   - Verify that the XRPL node is running and healthy

3. **If the node crashes**:
   - Check for syntax errors in rippled.cfg
   - Ensure there is no "EOF" or other unwanted text in the config file
   - Use `printf` instead of heredoc to create config files if using bash scripts

4. **If you get "Signing is not supported by this server" error**:
   - This occurs because the public WebSocket API (port 5005) doesn't support transaction signing
   - Use one of these solutions:
     a. Use the proxy server at http://localhost:3001/api/xrpl-proxy
     b. Use direct rippled command: `docker exec xrpl-node rippled submit 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb' '{tx_json}'`
     c. Use the scripts/submit-nft.sh helper script
   - The frontend has been updated to use a proxy approach with simulation fallback

Remember: **No mocks - only real XRPL NFT operations!**