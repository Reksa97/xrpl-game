#!/bin/bash

# Set the path to the XRPL configuration file
XRPL_CONFIG_PATH="xrpl-config/rippled-firebase.cfg"

# Function to start rippled
start_rippled() {
  echo "Starting rippled..."
  # Check if rippled is already running
  if pgrep -x "rippled" > /dev/null
  then
    echo "rippled is already running"
    return
  fi

  # Check if the database path exists and create it if it doesn't
  DATABASE_PATH=$(grep -m 1 "database_path" "$XRPL_CONFIG_PATH" | awk '{print $1}')
    DATABASE_PATH=$(echo "$DATABASE_PATH" | sed 's#^#/#')
  if [ ! -d "$DATABASE_PATH" ]; then
    echo "Creating database directory: $DATABASE_PATH"
    mkdir -p "$DATABASE_PATH"
  fi
    
    # Check if the log file exists and create it if it doesn't
    LOG_FILE=$(grep -m 1 "debug_logfile" "$XRPL_CONFIG_PATH" | awk '{print $1}')
    LOG_FILE=$(echo "$LOG_FILE" | sed 's#^#/#')
    if [ ! -f "$LOG_FILE" ]; then
      echo "Creating log file: $LOG_FILE"
      touch "$LOG_FILE"
    fi

  # Start rippled with the specified configuration
  rippled --conf "$XRPL_CONFIG_PATH" &
  echo "rippled started."
}

# Function to start the backend
start_backend() {
  echo "Starting backend..."
  make run &
  echo "Backend started."
}

# Function to start the frontend
start_frontend() {
  echo "Starting frontend..."
  cd frontend && npm run dev &
  echo "Frontend started."
}

# Main execution
echo "Starting Firebase environment..."

start_rippled
start_backend
start_frontend

echo "Firebase environment started."