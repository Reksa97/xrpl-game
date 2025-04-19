#!/bin/bash

echo "Starting Creature Crafter development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Stop any existing containers to avoid port conflicts
echo "Stopping any existing containers..."
docker-compose down

# Ensure we have the latest image of XRPL node
echo "Pulling latest XRPL image..."
docker pull xrpllabsofficial/xrpld:latest

# Start in detached mode
echo "Starting containers in detached mode with NFT support..."
docker-compose up -d

# Wait for XRPL node to be ready (increased wait time for emulation on ARM)
echo "Waiting for XRPL node to start (this may take up to 30 seconds on Apple silicon)..."
attempt=1
max_attempts=10
sleep_time=3

while [ $attempt -le $max_attempts ]; do
  echo "Checking XRPL node status (attempt $attempt/$max_attempts)..."
  
  if docker-compose logs xrpl-node | grep -q "Entering validated mode"; then
    echo "XRPL node is ready!"
    break
  fi
  
  if [ $attempt -eq $max_attempts ]; then
    echo "XRPL node did not start in time. It might still be starting up."
    echo "Check the logs with: docker-compose logs xrpl-node"
  fi
  
  attempt=$((attempt + 1))
  sleep $sleep_time
done

# Check if frontend is ready
echo "Waiting for frontend to start..."
attempt=1
max_attempts=10
sleep_time=2

while [ $attempt -le $max_attempts ]; do
  if docker-compose logs frontend | grep -q "Local:"; then
    echo "Frontend is ready!"
    break
  fi
  
  if [ $attempt -eq $max_attempts ]; then
    echo "Frontend did not start completely in time. It might still be initializing."
    echo "Check the logs with: docker-compose logs frontend"
  fi
  
  attempt=$((attempt + 1))
  sleep $sleep_time
done

echo ""
echo "🚀 Development environment is ready (or starting up)!"
echo "- Frontend: http://localhost:3000"
echo "- XRPL WebSocket Admin API: ws://localhost:6006"
echo "- XRPL WebSocket Public API: ws://localhost:5005"
echo "- XRPL JSON-RPC API: http://localhost:8080"
echo ""
echo "📋 Useful commands:"
echo "- View all logs: docker-compose logs -f"
echo "- View XRPL logs: docker-compose logs -f xrpl-node"
echo "- View frontend logs: docker-compose logs -f frontend"
echo "- Stop all containers: docker-compose down"
echo ""
echo "Important notes:"
echo "- The app will use mock data if it cannot connect to the XRPL node"
echo "- This is normal and allows development to continue without a running XRPL node"
echo "- On Apple Silicon Macs, the XRPL node runs under emulation and may take longer to start"
echo "- To use actual XRPL transactions, make sure the node is running with: docker ps"
echo "- Check node status with: docker-compose logs xrpl-node | grep 'Entering validated'"