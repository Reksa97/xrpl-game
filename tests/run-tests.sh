#!/bin/bash

echo "Setting up test environment..."

# Check if application is running
echo "Checking if application is running at http://localhost:3000..."
if curl -s http://localhost:3000 | grep -q "Creature Crafter"; then
  echo "✅ Application is running"
else
  echo "❌ Application is not running at http://localhost:3000"
  echo "Please start the application with ./start-dev.sh before running tests"
  exit 1
fi

# Install test dependencies
echo "Installing test dependencies..."
cd "$(dirname "$0")"
npm install

# Run the tests
echo "Running tests..."
npm test

echo "Tests completed!"