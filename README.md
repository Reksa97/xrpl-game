# Creature Crafter – minimal PoC repo

> **Goal:** prove XRPL‑based "buy egg → hatch pet → battle → token reward" loop and expose the same XRPL helpers as an SDK.

## 📋 Overview

Creature Crafter is a proof-of-concept game built on the XRPL blockchain. Users can:

1. Buy eggs using XRP
2. Hatch eggs into unique creatures with random stats
3. Battle other creatures
4. Earn Spark tokens as rewards

This project also serves as an example of how to build applications on XRPL and includes reusable XRPL helpers that will form the basis of an SDK.

## 📂 Project Structure

```
mica_sdk/
├─ README.md
├─ frontend/            # React + TypeScript (Vite)
│  ├─ package.json
│  └─ src/
│     ├─ index.tsx
│     ├─ App.tsx
│     ├─ components/
│     │  ├─ EggShop.tsx
│     │  ├─ Pet.tsx
│     │  └─ Battle.tsx
│     ├─ xrpl.ts         # Original XRPL helper (requires Node.js modules)
│     ├─ xrpl-fixed.ts   # Browser-compatible XRPL implementation
│     └─ simple-xrpl.ts  # Simplified implementation
├─ backend/             # Go micro‑services
│  ├─ go.mod
│  ├─ cmd/
│  │  ├─ matchmaker/main.go
│  │  └─ oracle/main.go
│  └─ internal/
│     ├─ xrplclient/
│     │  └─ client.go
│     └─ game/
│        ├─ pet.go
│        └─ arena.go
├─ hook/                # Rust Hook contract
│  ├─ Cargo.toml
│  └─ src/lib.rs
└─ sdk/                 # XRPL SDK for developers
   ├─ index.ts
   └─ index.d.ts
```

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) (for running local XRPL network)
- [Node.js](https://nodejs.org/) (v18 or later)
- [Go](https://golang.org/) v1.22+ (optional, for backend services)
- [Rust](https://www.rust-lang.org/) (optional, for XRPL Hook development)

### Local Development with XRPL Network

The easiest way to get started is to use our Docker Compose setup that runs a local XRPL network and the frontend:

```bash
# Start the local development environment
./start-dev.sh

# Visit http://localhost:3000 in your browser
```

This will start:
- Local XRPL node on ws://localhost:5005
- Frontend on http://localhost:3000

### Alternative: Run Frontend Only (connects to TestNet)

If you prefer to run just the frontend and connect to the XRPL TestNet:

```bash
# Install dependencies
cd frontend
npm install

# Update .env to use TestNet
echo "VITE_LOCAL_DEVELOPMENT=false" > .env

# Start development server
npm run dev
```

### Running Backend Services (requires Go)

```bash
# Start matchmaker
cd backend/cmd/matchmaker
go run main.go

# Start oracle
cd backend/cmd/oracle
go run main.go
```

## 🎮 Dev Flow

1. Start the development environment
2. Connect test wallet (automatically funded with XRP)
3. Buy an egg (sends XRP transaction on XRPL)
4. Hatch the egg (assigns DNA and generates pet stats)
5. Battle and earn rewards

## 💻 Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Go, Gin web framework
- **Blockchain**: XRPL (XRP Ledger)
- **Smart Contract**: Rust (XRPL Hooks)
- **Local Development**: Docker (local XRPL network)

## 🔄 API Endpoints

### Matchmaker Service (Port 8080)
- `POST /match` - Find a battle match and return results

### Oracle Service (Port 8081)
- `POST /mint` - Verify payment and mint an egg NFT
- `POST /hatch` - Generate DNA for an egg and evolve it into a creature

## 📘 XRPL SDK

The `sdk/` directory contains a reusable SDK for interacting with XRPL for NFT-based games. It provides:

- Wallet creation and management
- NFT minting and management
- Game-specific transaction helpers
- Type definitions

## ✨ Next Steps

- Convert `frontend/src/xrpl-fixed.ts` into `sdk/index.ts` with typed wrappers
- Auto‑generate docs using TypeDoc
- Add Jest tests for Go & TS
- Ship CI via GitHub Actions (lint + hook size check)
- After MI​CA licence, enable non‑custodial marketplace and royalties

## 🔧 Troubleshooting

- **Connection issues**: 
  - Ensure Docker is running and the local XRPL network is started
  - On Apple Silicon Macs, the XRPL node runs under emulation and takes longer to start
  - Try running `docker-compose logs xrpl-node` to see if the node is ready
  - The node is ready when you see "Entering validated mode" in the logs

- **WebSocket connection errors**: 
  - The XRPL node exposes two WebSocket endpoints:
    - Admin API: ws://localhost:6006 (or ws://xrpl-node:6006 inside Docker)
    - Public API: ws://localhost:5005 (or ws://xrpl-node:5005 inside Docker)
  - Try both endpoints as they serve different purposes
  - Our client is set to try both automatically

- **Wallet creation failures**: 
  - The local XRPL network might still be starting up
  - Wait a few moments and try again
  - The application will fall back to mock data if the connection fails

- **NFT minting issues**: 
  - Ensure your wallet has sufficient XRP balance
  - Check the browser console for detailed error messages

- **Docker networking issues**:
  - If the frontend can't reach the XRPL node, try restarting both containers
  - Make sure both containers are on the same Docker network (`docker network ls` to check)
  - Verify container status with `docker ps`

## 🔐 Browser Compatibility & Mock Mode

This project includes multiple XRPL implementations:

1. **xrpl.ts** - Original implementation using xrpl.js library (has Node.js dependencies)
2. **xrpl-fixed.ts** - New implementation using native WebSocket API (fully browser-compatible)
3. **simple-xrpl.ts** - Simplified mock implementation as a fallback

The current setup uses `xrpl-fixed.ts` which provides:
- Direct WebSocket communication with the XRPL node
- No Node.js dependencies
- Graceful fallback to mock data if connection fails
- Compatible with browsers, Docker, and local development

### 🧪 About Mock Mode

The application is designed to work in two modes:

1. **Connected Mode**: When the WebSocket connection to the XRPL node is successful, the app uses real XRPL transactions.
2. **Mock Mode**: When the connection fails, the app automatically falls back to using simulated data.

Mock mode allows development to continue even when:
- The XRPL node is not running
- There are network issues between containers
- You're developing on a machine without Docker
- The XRPL node is still starting up

**How to tell if you're in mock mode:**
- Console messages will show "Using mock data for command: X"
- The UI shows explanatory notes about mock mode
- Transactions will appear to succeed but won't actually update the ledger

**To use real XRPL transactions:**
1. Make sure Docker is running: `docker ps` (should show xrpl-node container)
2. Check the XRPL node logs: `docker-compose logs xrpl-node`
3. Look for "Entering validated mode" in the logs
4. Restart the application if needed