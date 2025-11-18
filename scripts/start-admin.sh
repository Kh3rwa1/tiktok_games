#!/bin/bash

# Start Admin Panel
echo "Starting TikTok Games Admin Panel..."
echo ""

cd "$(dirname "$0")/../admin-panel" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies first..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Creating .env from example..."
        cp .env.example .env
        echo ""
        echo "WARNING: Please edit admin-panel/.env with your Firebase config!"
        echo ""
    fi
fi

echo "Admin Panel starting on http://localhost:3001"
echo ""
npm run dev
