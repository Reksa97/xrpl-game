#!/bin/bash

# Function to test if the proxy server is running
test_proxy() {
  echo "Testing proxy connection..."
  curl -s -X POST -H "Content-Type: application/json" \
       -d '{"method":"server_info","params":[{}]}' \
       http://localhost:3001/api/xrpl-proxy > /dev/null
  return $?
}

# Kill any existing proxy server on port 3001
echo "Checking for existing proxy servers..."
if lsof -i :3001 > /dev/null; then
  echo "Found existing process on port 3001, stopping it..."
  kill $(lsof -t -i:3001) 2>/dev/null || true
  sleep 1
fi

# Start the proxy server in the background
echo "Starting XRPL proxy server on port 3001..."
node server.js > server.log 2>&1 &
PROXY_PID=$!

# Wait for the proxy server to start
echo "Waiting for proxy server to become available..."
max_attempts=5
attempt=0
while ! test_proxy && [ $attempt -lt $max_attempts ]; do
  attempt=$((attempt + 1))
  echo "Waiting for proxy server (attempt $attempt/$max_attempts)..."
  sleep 2
done

if test_proxy; then
  echo "✅ Proxy server is running and responding"
else
  echo "⚠️ Proxy server may not be running correctly. Check server.log for errors."
  echo "  Starting Vite anyway, but XRPL functionality may not work."
fi

# Start the Vite development server
echo "Starting Vite development server on port 3002..."
npm run dev

# When the Vite server stops, kill the proxy server
echo "Stopping proxy server..."
kill $PROXY_PID 2>/dev/null || true