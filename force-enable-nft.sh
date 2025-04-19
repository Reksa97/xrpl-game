#!/bin/bash

echo "=========================================="
echo "  Fixing XRPL NFT Support - Ultimate Solution"
echo "=========================================="

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Create a special standalone config file
echo "Creating rippled.cfg with NFT support..."
mkdir -p xrpl-config

# Use printf instead of heredoc to avoid EOF issues
printf '[server]
port_rpc_admin_local
port_peer
port_ws_admin_local
port_ws_public

[port_rpc_admin_local]
port = 6006
ip = 0.0.0.0
admin = 127.0.0.1
protocol = http

[port_peer]
port = 51235
ip = 0.0.0.0
protocol = peer

[port_ws_admin_local]
port = 6005
ip = 0.0.0.0
admin = 127.0.0.1
protocol = ws

[port_ws_public]
port = 5005
ip = 0.0.0.0
protocol = ws

[node_size]
small

[node_db]
type=NuDB
path=/var/lib/rippled/db/nudb

[database_path]
/var/lib/rippled/db

[debug_logfile]
/var/log/rippled/debug.log

[sntp_servers]
time.windows.com
time.apple.com
time.nist.gov
pool.ntp.org

[rpc_startup]
{"command": "log_level", "severity": "warning"}
{"command": "log_level", "partition": "NFTokens", "severity": "debug"}
{"command": "subscribe", "streams": ["ledger","server","transactions"]}

[features]
NonFungibleTokensV1_1
' > xrpl-config/rippled.cfg

# Fix docker-compose.yml
echo "Updating docker-compose.yml..."
printf 'services:
  # XRPL Standalone node (simplified local network for development)
  xrpl-node:
    image: xrpllabsofficial/xrpld:latest
    platform: linux/amd64  # Required for Apple silicon
    container_name: xrpl-node
    command: -a --start  # Run in standalone mode and force start amendments
    ports:
      - "6006:6006"      # Admin API
      - "5005:5005"      # Public API 
      - "8080:80"        # JSON-RPC API
      - "51235:51235"    # Peer port
    volumes:
      - ./xrpl-config:/config
    networks:
      - xrpl-net

  # Frontend service
  frontend:
    image: node:18
    container_name: frontend
    working_dir: /app
    command: sh -c "npm install buffer vite-plugin-node-polyfills express cors && npm run dev"
    volumes:
      - ./frontend:/app
    ports:
      - "3000:3000"
    environment:
      - VITE_XRPL_WS=ws://localhost:5005
      - VITE_XRPL_HTTP=http://localhost:6006
      - NODE_TLS_REJECT_UNAUTHORIZED=0
      - VITE_EGG_SHOP_ADDR=rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
      - VITE_LOCAL_DEVELOPMENT=true
      - VITE_XRPL_DEBUG=true
      - VITE_ENABLE_PROXY=true
    depends_on:
      - xrpl-node
    networks:
      - xrpl-net

networks:
  xrpl-net:
    driver: bridge
' > docker-compose.yml

# Update xrpl-direct.ts to use the correct port
echo "Updating xrpl-direct.ts to use the correct port..."
sed -i.bak 's/const url = .ws:\/\/localhost:[0-9]*./const url = "ws:\/\/localhost:5005";/' frontend/src/xrpl-direct.ts

# Stop the current containers
echo "Stopping existing containers..."
docker-compose down

# Remove any existing XRPL data for a clean start
echo "Removing any existing XRPL data..."
rm -rf xrpl-config/db/* 2>/dev/null || true

# Restart with the new config
echo "Starting containers with NFT support..."
docker-compose up -d

echo "Waiting for XRPL node to start (30 seconds)..."
# Use a progress indicator
for i in {1..30}; do
  echo -n "."
  sleep 1
done
echo ""

# Test NFT minting directly with a curl command
echo "Testing NFT minting with direct API call..."
curl -s -X POST -H "Content-Type: application/json" http://localhost:6006 -d '{
  "method": "submit",
  "params": [
    {
      "tx_json": {
        "TransactionType": "NFTokenMint",
        "Account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        "URI": "68747470733A2F2F6578616D706C652E636F6D2F6D792D6E66742E6A736F6E",
        "NFTokenTaxon": 0,
        "Flags": 8,
        "Fee": "10"
      },
      "secret": "snoPBrXtMeMyMHUVTgbuqAfg1SUTb"
    }
  ]
}' | grep -o '"engine_result":"[^"]*"' || echo "Error submitting NFT transaction"

# Check the NFTs after a brief wait
echo ""
echo "Waiting 10 seconds for ledger to close..."
sleep 10

echo "Checking for NFTs in the account..."
curl -s -X POST -H "Content-Type: application/json" http://localhost:6006 -d '{
  "method": "account_nfts",
  "params": [
    {
      "account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
    }
  ]
}' | grep -o '"account_nfts":\[[^]]*\]' || echo "No NFTs found"

echo ""
echo "==========================="
echo "NFT Support Status Summary:"
echo "==========================="
echo "1. Configuration: NFT features should be enabled in rippled.cfg"
echo "2. Connection: The XRPL node is running on ports:"
echo "   - WebSocket API: 5005"
echo "   - Admin API: 6006"
echo "3. Frontend: Updated to connect to ws://localhost:5005"
echo ""
echo "If you're still having issues:"
echo "1. Try restarting the XRPL node:"
echo "   docker-compose restart xrpl-node"
echo "2. Wait 30 seconds and try again"
echo "3. Check logs with: docker-compose logs xrpl-node"
echo ""
echo "To manually test NFT minting:"
echo "curl -X POST -H \"Content-Type: application/json\" http://localhost:6006 -d '{\"method\":\"submit\",\"params\":[{\"tx_json\":{\"TransactionType\":\"NFTokenMint\",\"Account\":\"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh\",\"URI\":\"68747470733A2F2F6578616D706C652E636F6D2F6D792D6E66742E6A736F6E\",\"NFTokenTaxon\":0,\"Flags\":8,\"Fee\":\"10\"},\"secret\":\"snoPBrXtMeMyMHUVTgbuqAfg1SUTb\"}]}'"
echo ""
echo "To verify NFTs in account:"
echo "curl -X POST -H \"Content-Type: application/json\" http://localhost:6006 -d '{\"method\":\"account_nfts\",\"params\":[{\"account\":\"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh\"}]}'"