#!/bin/bash

echo "Fixing port mappings in docker-compose.yml..."

# Update environment variable in docker-compose.yml to use correct port
sed -i.bak 's/VITE_XRPL_WS=ws:\/\/localhost:6006/VITE_XRPL_WS=ws:\/\/localhost:5005/' /Users/reko/dev/xrpl/mica_sdk/docker-compose.yml

# Update xrpl-direct.ts to use correct port
sed -i.bak 's/const url = .ws:\/\/localhost:6006.;/const url = "ws:\/\/localhost:5005";/' /Users/reko/dev/xrpl/mica_sdk/frontend/src/xrpl-direct.ts

echo "Stopping and recreating containers with correct port mappings..."
cd /Users/reko/dev/xrpl/mica_sdk
docker-compose down
docker-compose up -d

echo "Wait for services to start..."
sleep 10

echo "Port mappings fixed. Check the application at http://localhost:3000"