# Creature Crafter Frontend

This is the frontend application for the Creature Crafter game, which integrates with the XRPL blockchain.

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd mica_sdk/frontend
npm install
```

## Running the Application

### Quick Start (Development Mode)

To start both the proxy server and the frontend development server in one command:

```bash
# Start both the proxy server and frontend
npm run start-dev
```

Or run the following script:

```bash
# Make the script executable if needed
chmod +x start-dev.sh

# Run the script
./start-dev.sh
```

### Manual Start (For Development)

If you prefer to start the servers manually:

1. Start the proxy server (for XRPL communication):

```bash
# In one terminal
node server.js
```

2. Start the Vite development server:

```bash
# In another terminal
npm run dev
```

### Access the Application

Once both servers are running, access the application at:

- Frontend: http://localhost:3002
- Proxy Server: http://localhost:3001

## XRPL Integration

The application connects to a private XRPL node at `34.88.230.243:51234` using HTTP JSON-RPC via a proxy server. The proxy server handles API requests to the XRPL node to avoid CORS issues.

### CORS Considerations

Direct connections from the browser to the XRPL node will fail due to CORS restrictions. All XRPL requests must go through the proxy server at `/api/xrpl-proxy` to avoid these issues. The application is configured to:

1. Exclusively use the proxy server for all XRPL communication
2. Never attempt direct connections (which would fail due to CORS issues)
3. Display clear error messages if the proxy server is not running

This approach provides a clean solution that:
- Avoids CORS errors in the browser
- Centralizes XRPL communication through a single channel
- Simplifies error handling and troubleshooting

### Verification

When you first open the application, a connection test screen will verify that the proxy connection to the XRPL node is working. This screen displays detailed server information from the XRPL node and allows you to confirm that:

1. The proxy server is running
2. The proxy can successfully connect to the XRPL node
3. The XRPL node returns valid server information

## Available Commands

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run start` - Start the Express server for the production build

## Architecture

- **Frontend**: React + TypeScript + Vite
- **XRPL Communication**: HTTP JSON-RPC API via proxy server
- **Proxy Server**: Express.js server that forwards requests to the XRPL node

## Troubleshooting

If you encounter connection issues:

1. Verify the XRPL node is accessible:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{"method":"server_info","params":[{}]}' http://34.88.230.243:51234
   ```

2. Check that the proxy server is running:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{"method":"server_info","params":[{}]}' http://localhost:3001/api/xrpl-proxy
   ```

3. If needed, update the connection URLs in:
   - `/src/xrpl-direct.ts`
   - `/src/components/ConnectionStatus.tsx`
   - `/server.js`
   - `/vite.config.ts`

### Wallet Generation

The application now generates wallets locally in the browser, eliminating the dependency on the XRPL node's `wallet_generate` method. This approach offers several advantages:

1. No need for the XRPL node to support wallet generation
2. Enhanced security as wallet credentials are generated locally
3. More flexible wallet management options
4. Persistent wallet storage in the browser's localStorage

The wallet generation process works as follows:

1. When a user connects a wallet, the application:
   - First checks localStorage for an existing wallet
   - If found, loads and uses the saved wallet
   - If not found, generates a new demo wallet with pseudorandom values
   - Saves the wallet to localStorage for future sessions

2. Wallet credentials are structured as:
   ```json
   {
     "address": "rBvA4DuaJJzRKuEPNmGm92TJ2joYM3zQFm",  // Public key
     "seed": "sp5mkL7Sy9MfNxJY9XVJJQWiVfW9"            // Private key
   }
   ```

3. The system includes multiple fallback levels in case of wallet generation failures:
   - Primary: Local wallet generation with pseudorandom values
   - Secondary: Proxy server virtual wallet generation
   - Final fallback: Master test wallet

You can still test the proxy's wallet handling with:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"method":"wallet_generate","params":[{}]}' http://localhost:3001/api/xrpl-proxy
```

For testing and development, we've also included a Node.js script that can generate valid XRPL wallets using the xrpl.js library:
```bash
npm run gen-wallet
```

In a production environment, you would want to enhance this implementation by:
1. Using xrpl.js or another cryptographically secure wallet generator
2. Storing the wallet seed in a secure keychain/keystore
3. Adding encryption for the wallet private key
4. Implementing proper key backup mechanisms
5. Adding proper authentication before displaying wallet details