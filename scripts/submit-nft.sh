#!/bin/bash

# Script to submit NFT mint transaction via rippled command
# This script is meant to be called from outside of Docker
# and will use docker exec to run the command inside the container

if [ $# -ne 2 ]; then
  echo "Usage: $0 <secret> <transaction_json>"
  exit 1
fi

SECRET="$1"
TX_JSON="$2"

# Execute rippled command
docker exec xrpl-node rippled submit "$SECRET" "$TX_JSON"