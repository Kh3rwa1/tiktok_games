#!/bin/bash

# Start Backend Server
echo "Starting TikTok Games Backend..."
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies first..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from example..."
    cp .env.example .env 2>/dev/null || {
        echo "PORT=5000" > .env
        echo "NODE_ENV=development" >> .env
    }
fi

echo "Backend starting on http://localhost:5000"
echo ""
npm run dev
