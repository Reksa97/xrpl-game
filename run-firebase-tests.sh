#!/bin/bash

echo "Starting Firebase tests..."

# Function to run tests
run_tests() {
  echo "Running tests..."
  cd tests || exit 1
  npm test
  echo "Tests finished."
}

# Main execution
run_tests

echo "Firebase tests completed."