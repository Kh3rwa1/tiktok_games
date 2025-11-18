#!/bin/bash

# Start All Services
echo "============================================"
echo "   Starting All TikTok Games Services"
echo "============================================"
echo ""

# Get script directory
SCRIPT_DIR="$(dirname "$0")"

# Start backend in background
echo "Starting Backend..."
cd "$SCRIPT_DIR/../backend" && npm run dev &
BACKEND_PID=$!

sleep 3

# Start admin panel in background
echo "Starting Admin Panel..."
cd "$SCRIPT_DIR/../admin-panel" && npm run dev &
ADMIN_PID=$!

sleep 3

# Start mobile in foreground
echo "Starting Mobile App..."
cd "$SCRIPT_DIR/../mobile" && npm start

# Cleanup on exit
trap "kill $BACKEND_PID $ADMIN_PID 2>/dev/null" EXIT
