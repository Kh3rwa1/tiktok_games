#!/bin/bash

# Start Mobile App
echo "Starting TikTok Games Mobile App..."
echo ""

cd "$(dirname "$0")/../mobile" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies first..."
    npm install
fi

echo "Mobile App starting..."
echo "Scan the QR code with Expo Go app on your phone"
echo ""
npm start
