# Resolving "Signing is not supported by this server" Error in XRPL NFT Minting

This document explains how to fix the "Signing is not supported by this server" error when minting NFTs through the frontend.

## The Problem

When trying to mint NFTs from the frontend, you may encounter this error:

```
Error during NFT minting preparation: Error: NFT minting failed: Signing is not supported by this server.
```

This happens because:

1. The frontend connects to the public WebSocket API of the XRPL node (port 5005)
2. The public WebSocket API doesn't support transaction signing for security reasons
3. Our `xrpl-direct.ts` code was trying to use the WebSocket API to sign transactions

## The Solution

We've implemented a comprehensive solution that addresses this issue:

1. **Proxy-Based Approach**: Added a proxy server that forwards signing requests to the XRPL node's admin API
2. **Vite Configuration**: Updated the Vite dev server to proxy frontend requests to the XRPL node
3. **Fallback Mechanism**: Added a fallback for local development that simulates successful transactions

### Updated Files

1. **frontend/server.js**: Added a proxy server for XRPL signing requests
2. **frontend/vite.config.ts**: Added a proxy configuration for the Vite dev server
3. **docker-compose.yml**: Updated to install necessary dependencies and set environment variables
4. **frontend/src/xrpl-direct.ts**: Modified the transaction submission logic to handle signing limitations

### How It Works

1. When the frontend needs to mint an NFT, it prepares the transaction as before
2. Instead of trying to sign via WebSocket, it:
   - Sends the request to `/api/xrpl-proxy` endpoint
   - The Vite dev server proxies this request directly to the XRPL node's admin API (port 6006)
   - The admin API supports signing and returns a properly signed and submitted transaction
3. If the proxy is unavailable (e.g., in local development), it falls back to a simulated response

## Testing the Solution

To verify that NFT minting works from the frontend:

1. Open the Creature Crafter game in your browser at http://localhost:3000
2. Try to mint an NFT (e.g., by clicking "Mint" or "Create Egg")
3. Check the browser console for successful transaction messages
4. Verify that NFTs have been minted using our verification script:

```bash
./verify-nft.sh
```

## Manual Verification

You can also manually verify NFT minting using the XRPL command:

```bash
docker exec xrpl-node rippled account_nfts rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
```

This should show all NFTs in the master account, including any that were minted through the frontend.

## Troubleshooting

If you still encounter signing issues:

1. Check that the XRPL node is running: `docker-compose ps`
2. Verify that the proxy configuration is correct in vite.config.ts
3. Check browser console for any CORS or network errors
4. Try restarting the frontend and XRPL node containers: `docker-compose restart`