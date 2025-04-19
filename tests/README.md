# XRPL NFT Minting Tests

This directory contains automated tests and diagnostic tools for the XRPL NFT minting functionality.

## Test Files

- `auto-mint-test.js` - Automated UI test for NFT minting
- `diagnostic-test.js` - Detailed diagnostic test with screenshots
- `fix-nft-support.js` - Script to add mock NFT support
- `monitor-nft-features.js` - Tool to check NFT feature status on XRPL node
- `enable-nft-features.sh` - Script to enable NFT features on XRPL node

## Running Tests

### Quick NFT Minting Test

To run a quick test of the NFT minting functionality:

```bash
./run-mint-test.sh
```

This will:
1. Check if the application is running
2. Install required dependencies
3. Run the automated NFT minting test
4. Save screenshots to the `screenshots` directory

### Diagnostic Test

To run a comprehensive diagnostic test:

```bash
node diagnostic-test.js
```

This will:
1. Check XRPL connection
2. Verify NFT feature support
3. Test NFT minting if possible
4. Generate a diagnostic report

### Monitoring NFT Features

To check if NFT features are enabled on your XRPL node:

```bash
node monitor-nft-features.js
```

## Fixing NFT Support

If NFT features are not enabled on your XRPL node, you have two options:

### Option 1: Enable Mock NFT Support

This allows the application to work without requiring XRPL node changes:

```bash
node fix-nft-support.js
```

After running this script, restart your frontend:

```bash
docker-compose restart frontend
```

### Option 2: Enable Real NFT Features on XRPL Node

This enables actual NFT functionality on your XRPL node:

```bash
./enable-nft-features.sh
```

This will:
1. Update your rippled.cfg file to include NFT amendments
2. Restart your XRPL node
3. Verify the features are enabled

## Troubleshooting

If you're experiencing issues:

1. Check the screenshots in the `screenshots` directory
2. Look for error messages in the console output
3. Run the diagnostic test for detailed information
4. Check if NFT features are enabled with `monitor-nft-features.js`

Common errors:

- "The transaction requires logic that is currently disabled" - NFT features not enabled
- "Bad signature" - Issue with wallet credentials
- "Cannot connect to XRPL node" - XRPL node not running or connection issues