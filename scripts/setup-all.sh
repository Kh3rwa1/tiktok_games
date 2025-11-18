#!/bin/bash

# ONE-CLICK SETUP SCRIPT
# Makes deploying super easy!

echo "============================================"
echo "   TIKTOK GAMES - ONE CLICK SETUP"
echo "   World's Best Gaming Platform"
echo "============================================"
echo ""

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to print info
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Node.js is installed
echo "Checking requirements..."
if ! command -v node &> /dev/null; then
    error "Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi
success "Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    error "npm is not installed!"
    exit 1
fi
success "npm found: $(npm --version)"

echo ""
echo "============================================"
echo "   STEP 1: Installing Backend"
echo "============================================"

cd backend || { error "backend folder not found!"; exit 1; }

info "Installing backend dependencies..."
npm install --silent
success "Backend dependencies installed!"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        success "Created backend .env file"
    else
        echo "PORT=5000" > .env
        echo "NODE_ENV=development" >> .env
        success "Created default backend .env file"
    fi
else
    warn "Backend .env already exists, skipping..."
fi

cd ..

echo ""
echo "============================================"
echo "   STEP 2: Installing Admin Panel"
echo "============================================"

cd admin-panel || { error "admin-panel folder not found!"; exit 1; }

info "Installing admin panel dependencies..."
npm install --silent
success "Admin panel dependencies installed!"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        success "Created admin panel .env file"
        warn "Please edit admin-panel/.env with your Firebase config!"
    fi
else
    warn "Admin panel .env already exists, skipping..."
fi

cd ..

echo ""
echo "============================================"
echo "   STEP 3: Installing Mobile App"
echo "============================================"

cd mobile || { error "mobile folder not found!"; exit 1; }

info "Installing mobile app dependencies..."
npm install --silent
success "Mobile app dependencies installed!"

cd ..

echo ""
echo "============================================"
echo "   SETUP COMPLETE!"
echo "============================================"
echo ""
success "All dependencies installed!"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Set up Firebase (see SUPER_SIMPLE_GUIDE.md)"
echo ""
echo "2. Configure your .env files:"
echo "   - backend/.env"
echo "   - admin-panel/.env"
echo "   - mobile/.env (create this)"
echo ""
echo "3. Start everything:"
echo "   - Backend:     cd backend && npm run dev"
echo "   - Admin Panel: cd admin-panel && npm run dev"
echo "   - Mobile App:  cd mobile && npm start"
echo ""
echo "Or use the quick start scripts:"
echo "   - ./scripts/start-backend.sh"
echo "   - ./scripts/start-admin.sh"
echo "   - ./scripts/start-mobile.sh"
echo ""
echo "============================================"
echo "   Enjoy your World's Best Gaming App!"
echo "============================================"
