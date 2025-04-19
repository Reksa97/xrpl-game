# XRPL NFT Minting - Final Solution

This document provides the definitive solution to the NFT minting issues.

## The Two Issues

1. **Port Mapping Issue**: The Docker container has the WebSocket ports swapped:
   - Container port 5005 → Host port 6006
   - Container port 6006 → Host port 5005

2. **NFT Feature Enablement**: The NFT amendments are in the config file but not enabled in the ledger.

## Quick Fix

Run the enhanced script to fix both issues:

```bash
./enable-nft.sh
```

This script will:
1. Fix port mappings in docker-compose.yml
2. Update the xrpl-direct.ts file to use the correct ports
3. Restart the XRPL node with NFT features enabled
4. Enable the NFT amendments in the ledger

## Manual Solution (If the script doesn't work)

### Step 1: Fix port mappings

Update `xrpl-direct.ts` to use the admin port:

```javascript
// In xrpl-direct.ts
const url = 'ws://localhost:5005'; // Connect to admin WebSocket API
```

### Step 2: Enable NFT features 

Update rippled.cfg with the following amendments:

```
[features]
NFTokenMint
NFTokenBurn
NonFungibleTokensV1
NonFungibleTokensV1_1
```

### Step 3: Restart containers

```bash
docker-compose down
docker-compose up -d
```

### Step 4: Enable amendments via API

```bash
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
```

## Verification

Run the direct NFT test to verify the solution:

```bash
./tests/run-direct-test.sh
```

## Important Notes

1. The application now uses direct connections to the XRPL - no mock implementations
2. The UI will show clear errors if NFT features are not properly enabled
3. It may take a minute for the XRPL node to fully start and enable amendments

## Tech Details

- Current port mappings in docker-compose.yml expose container port 5005 on host port 6006
- We must connect to host port 5005 which maps to container port 6006 (admin port)
- NFT features in the config file don't automatically enable in the ledger
- XRPL standalone mode requires manual amendment activation