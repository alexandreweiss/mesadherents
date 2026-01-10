#!/bin/bash
echo "Starting mesadherents development server..."

# Function to start the server
start_server() {
    echo "Starting Next.js server at $(date)"
    npm run dev
}

# Function to handle cleanup
cleanup() {
    echo "Shutting down server..."
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Start the server in a loop for auto-restart
while true; do
    start_server
    echo "Server crashed at $(date). Restarting in 3 seconds..."
    sleep 3
done