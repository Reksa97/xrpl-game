# Ultimate Solution to XRPL NFT Minting

This document provides the definitive solution to the NFT minting issue where you see:

```
Error: NFT minting failed: The XRPL node does not have the NFToken amendment enabled.
```

## The Solution (Option 1 - Fastest)

Use our forced-enable script that sets up everything correctly:

```bash
./force-enable-nft.sh
```

This script will:
1. Apply a special configuration file that forces NFT support
2. Fix WebSocket port mappings in both config and code
3. Restart the XRPL node in a clean state with amendments enabled
4. Verify NFT features are available

## The Solution (Option 2 - Manual)

If the automatic script doesn't work, follow these steps:

1. Fix the port mappings:
   ```bash
   # In docker-compose.yml
   - VITE_XRPL_WS=ws://localhost:5005

   # In xrpl-direct.ts
   const url = 'ws://localhost:5005';
   ```

2. Enable the NFT amendments by adding `--start` flag:
   ```bash
   # In docker-compose.yml for xrpl-node:
   command: -a --start --conf /config/rippled.cfg --validators-file /config/validators.txt
   ```

3. Update the rippled.cfg to include all NFT amendments:
   ```
   [features]
   NFTokenMint
   NFTokenBurn
   NonFungibleTokensV1
   NonFungibleTokensV1_1
   ```

4. Restart the containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Technical Details

- The XRPL node must have NFT amendments enabled in both config AND the active ledger
- The `--start` flag forces amendments to be enabled at startup
- Port 5005 is the correct port to connect to for the WebSocket API
- In standalone mode, the master account (rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh) must be used for minting

## Verifying It Works

Run the direct test to confirm NFT minting is working:

```bash
./tests/run-direct-test.sh
```

You should see "NFT minting completed successfully" if everything is configured correctly.

Remember: **No mocks - only real XRPL NFT operations!**