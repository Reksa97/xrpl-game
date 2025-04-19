#!/bin/bash

echo "Stopping Firebase environment..."

# Function to stop rippled
stop_rippled() {
  echo "Stopping rippled..."
  if pgrep -x "rippled" > /dev/null
  then
    echo "rippled found, killing all instances..."
    killall rippled
    echo "rippled stopped."
  else
    echo "rippled is not running."
  fi
}

# Function to stop the backend
stop_backend() {
  echo "Stopping backend..."
  backend_pid=$(pgrep -f "make run")
  if [ -n "$backend_pid" ]
  then
    echo "Backend process found with PID: $backend_pid"
    kill "$backend_pid"
    echo "Backend stopped."
  else
    echo "Backend is not running."
  fi
}

# Function to stop the frontend
stop_frontend() {
  echo "Stopping frontend..."
  frontend_pid=$(pgrep -f "npm run dev")
  if [ -n "$frontend_pid" ]
  then
    echo "Frontend process found with PID: $frontend_pid"
    kill "$frontend_pid"
    echo "Frontend stopped."
  else
    echo "Frontend is not running."
  fi
}

# Main execution
stop_rippled
stop_backend
stop_frontend

echo "Firebase environment stopped."