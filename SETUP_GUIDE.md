# Quick Setup Guide

This guide will get you up and running in 15 minutes.

## Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] MongoDB installed (or MongoDB Atlas account)
- [ ] AWS Account with S3 access
- [ ] Expo CLI installed globally
- [ ] Git installed

## Step-by-Step Setup

### 1. Clone and Install (5 minutes)

```bash
# Clone the repository
cd tiktok_games

# Install backend dependencies
cd backend
npm install

# Install mobile dependencies
cd ../mobile
npm install
```

### 2. Database Setup (3 minutes)

#### Option A: Local MongoDB
```bash
# Start MongoDB
mongod

# MongoDB will run at: mongodb://localhost:27017
```

#### Option B: MongoDB Atlas (Recommended for production)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Get connection string

### 3. AWS S3 Setup (5 minutes)

1. **Create S3 Bucket**
   - Login to AWS Console
   - Go to S3
   - Create bucket: `tiktok-games-assets`
   - Region: `us-east-1`
   - **Uncheck** "Block all public access"
   - Create bucket

2. **Create IAM User**
   - Go to IAM → Users → Add User
   - User name: `tiktok-games-uploader`
   - Access type: Programmatic access
   - Attach policy: `AmazonS3FullAccess`
   - Save Access Key ID and Secret Key

3. **Configure Bucket CORS**
   - Go to your bucket
   - Permissions → CORS
   - Add this configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

### 4. Configure Backend (2 minutes)

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
PORT=5000

# Use your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/tiktok_games

# Generate a random secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_generated_secret_here
JWT_EXPIRE=30d

# Your AWS credentials from step 3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=us-east-1
AWS_S3_BUCKET=tiktok-games-assets

ALLOWED_ORIGINS=http://localhost:19006
```

### 5. Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Server running on port 5000 in development mode
```

### 6. Configure Mobile App

Find your computer's local IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig

# Look for something like: 192.168.1.XXX
```

Edit `mobile/src/services/api.js`:
```javascript
const API_URL = 'http://192.168.1.XXX:5000/api';
// Replace XXX with your IP
```

### 7. Start Mobile App

```bash
cd mobile
npm start
```

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR with Expo Go app on phone

## Testing the App

### 1. Create an Account
- Open the app
- Click "Sign Up"
- Enter username, email, password
- Login

### 2. Add a Test Game

Use the sample game provided:

```bash
# Upload the sample game to S3
aws s3 cp sample_games/simple-clicker/index.html \
  s3://tiktok-games-assets/games/clicker/index.html \
  --acl public-read
```

Or use the API:

```bash
# First, login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'

# Use the token to create a game
curl -X POST http://localhost:5000/api/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Simple Clicker",
    "description": "Tap to increase your score! Upgrade for more points per click.",
    "thumbnail": "https://tiktok-games-assets.s3.amazonaws.com/thumbnails/clicker.png",
    "gameUrl": "https://tiktok-games-assets.s3.amazonaws.com/games/clicker/index.html",
    "category": "casual",
    "tags": ["clicker", "idle", "casual"],
    "difficulty": "easy"
  }'
```

### 3. Test Features
- Scroll through games ✓
- Play a game ✓
- Like a game ✓
- Search for games ✓
- View profile ✓

## Troubleshooting

### Backend won't start

**Error: Cannot connect to MongoDB**
```bash
# Check if MongoDB is running
pgrep mongod

# Start MongoDB if not running
mongod
```

**Error: Port 5000 already in use**
```bash
# Change PORT in .env to 5001 or kill the process
lsof -ti:5000 | xargs kill
```

### Mobile app can't connect to API

**Error: Network request failed**
1. Check backend is running
2. Verify you're using local IP, not `localhost`
3. Check firewall isn't blocking port 5000
4. Make sure phone and computer are on same WiFi

**Quick test:**
```bash
# From your phone's browser, visit:
http://192.168.1.XXX:5000/health

# Should return: {"status":"healthy",...}
```

### WebView not loading games

1. Test game URL in browser first
2. Check S3 bucket permissions
3. Verify CORS configuration
4. Check game files are uploaded correctly

## Next Steps

1. **Add More Games**
   - Create or download HTML5 games
   - Upload to S3
   - Add via API or create admin panel

2. **Customize Design**
   - Edit colors in mobile screens
   - Change app name in `mobile/app.json`
   - Add custom icons

3. **Deploy to Production**
   - Follow deployment guide in README.md
   - Use MongoDB Atlas
   - Deploy backend to Heroku/AWS
   - Build mobile app with Expo

## Need Help?

- Check the main README.md for detailed documentation
- Review API endpoints in README.md
- Check console logs for errors
- Test API with Postman/curl

## Quick Commands Reference

```bash
# Backend
cd backend
npm run dev          # Start dev server
npm start           # Start production server

# Mobile
cd mobile
npm start           # Start Expo
npm run android     # Run on Android
npm run ios         # Run on iOS

# MongoDB
mongod              # Start MongoDB
mongo               # Open MongoDB shell

# AWS CLI
aws s3 ls           # List buckets
aws s3 cp file.html s3://bucket/path --acl public-read
```

## Success Checklist

- [ ] Backend running at http://localhost:5000
- [ ] MongoDB connected
- [ ] Mobile app running in Expo
- [ ] Can create account
- [ ] Can see games in feed
- [ ] Can play games
- [ ] Can like/rate games

🎉 **You're all set!** Start adding games and building your gaming platform!
