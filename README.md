# TikTok Games Platform

A premium mobile gaming platform with React Native app and Node.js backend featuring AAA+ quality UI/UX, smooth 60fps animations, and comprehensive game management.

## Architecture Overview

```
tiktok_games/
├── mobile/                    # React Native Expo App
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── screens/           # App screens
│   │   ├── store/             # Zustand state management
│   │   ├── services/          # API services
│   │   ├── config/            # Firebase configuration
│   │   ├── types/             # TypeScript definitions
│   │   └── utils/             # Utility functions
│   └── package.json
│
└── server-admin-panel/        # Node.js Express Backend
    ├── config/                # Database configuration
    ├── controllers/           # Business logic
    ├── middleware/            # Auth, security
    ├── models/                # Database models
    ├── routes/                # API routes
    └── server.js              # Entry point
```

## Technology Stack

### Mobile App
- **Framework**: React Native 0.73+ with Expo 50+
- **Language**: TypeScript
- **State Management**: Zustand
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Animations**: React Native Reanimated (60fps)
- **UI**: Custom Neo-Brutalism design

### Backend Server
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.x
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate Limiting

---

## Server & Admin Panel Setup (cPanel)

### Prerequisites

- cPanel hosting account with Node.js support
- MySQL database access
- Domain name pointing to your server

### Step 1: Create MySQL Database

1. Log in to cPanel
2. Navigate to **MySQL Databases**
3. Create a new database:
   - Database name: `yourusername_tiktokgames`
4. Create a new MySQL user:
   - Username: `yourusername_dbuser`
   - Password: Use a strong password
5. Add user to database with **ALL PRIVILEGES**

### Step 2: Upload Server Files

#### Option A: File Manager Upload
1. In cPanel, go to **File Manager**
2. Navigate to your domain's directory (usually `public_html`)
3. Create a new folder: `server-admin-panel`
4. Upload all files from the `server-admin-panel` directory

#### Option B: Git Deployment
```bash
# SSH into your server
ssh username@yourdomain.com

# Navigate to your directory
cd public_html

# Clone or upload the repository
git clone https://github.com/yourusername/tiktok_games.git
cd tiktok_games/server-admin-panel
```

### Step 3: Configure Environment Variables

1. In the `server-admin-panel` directory, copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=yourusername_dbuser
DB_PASSWORD=your_secure_password
DB_NAME=yourusername_tiktokgames
DB_PORT=3306

# Security
JWT_SECRET=generate-a-random-64-character-string-here
JWT_EXPIRES_IN=30d
REFRESH_TOKEN_EXPIRES_IN=90d

# CORS (your frontend domain)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=50
```

**Important**: Generate a strong JWT secret:
```bash
openssl rand -hex 32
```

### Step 4: Setup Node.js Application in cPanel

1. In cPanel, navigate to **Setup Node.js App**
2. Click **Create Application**
3. Configure the application:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: `server-admin-panel` (or full path)
   - **Application URL**: your domain or subdomain
   - **Application startup file**: `server.js`
4. Click **Create**
5. Note the **virtual environment path** shown

### Step 5: Install Dependencies

#### Option A: cPanel Interface
1. In the Node.js App section, click **Run NPM Install**

#### Option B: SSH
```bash
# Activate the virtual environment
source /home/username/nodevenv/server-admin-panel/18/bin/activate

# Navigate to app directory
cd ~/public_html/server-admin-panel

# Install dependencies
npm install --production
```

### Step 6: Initialize Database

The database tables are created automatically on first run. Start the application:

1. In cPanel Node.js App, click **Start App**
2. Or via SSH: `npm start`

### Step 7: Configure Apache Proxy (If Needed)

Add to `.htaccess` in your domain root:
```apache
RewriteEngine On
RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]
```

### Step 8: SSL Certificate

1. In cPanel, go to **SSL/TLS Status**
2. Enable **AutoSSL** for your domain

### Step 9: Verify Installation

```bash
curl https://yourdomain.com/health
curl https://yourdomain.com/api/games
```

### Troubleshooting cPanel Setup

**App won't start:**
- Check error logs in cPanel > Errors
- Verify .env file exists and has correct values
- Ensure database credentials are correct

**Database connection errors:**
- Verify MySQL user has correct privileges
- Check DB_HOST is `localhost` for same-server MySQL
- Confirm database name includes cPanel prefix

**502 Bad Gateway:**
- App may not be running - restart in Node.js App section
- Check port conflicts
- Review Apache error logs

---

## Mobile App Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- Firebase account
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on physical device (optional)

### Step 1: Install Dependencies

```bash
cd mobile
npm install
```

### Step 2: Firebase Setup

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name (e.g., "tiktok-games")
4. Disable Google Analytics (optional)
5. Click **Create Project**

#### Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in method

#### Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create Database**
3. Choose **Start in test mode** (for development)
4. Select a location close to your users

#### Configure Firestore Rules

In Firestore > Rules, set:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Games are readable by all, writable by authenticated users
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

#### Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your Apps** section
3. Click **Add App** > **Web** (</>)
4. Register app with a nickname
5. Copy the configuration values

### Step 3: Configure Environment Variables

Create `.env` file in the `mobile` directory:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# API Configuration (for MySQL backend integration)
EXPO_PUBLIC_API_URL=https://yourdomain.com/api
```

### Step 4: Run Development Server

```bash
# Start Expo development server
npx expo start

# Or with specific options
npx expo start --clear  # Clear cache
npx expo start --ios    # Open iOS simulator
npx expo start --android # Open Android emulator
```

### Step 5: Run on Device/Simulator

**iOS Simulator (Mac only):**
```bash
npx expo start --ios
```

**Android Emulator:**
```bash
npx expo start --android
```

**Physical Device:**
1. Install **Expo Go** from App Store/Play Store
2. Scan the QR code from the terminal
3. App will load on your device

### Step 6: Initialize Sample Data

Create some test games in Firestore:

1. Go to Firebase Console > Firestore
2. Create `games` collection
3. Add a document with these fields:
```javascript
{
  title: "Sample Game",
  description: "A fun test game",
  thumbnail: "https://picsum.photos/400/300",
  gameUrl: "https://example.com/game",
  category: "casual",
  difficulty: "easy",
  creatorId: "system",
  creator: {
    username: "Admin",
    avatar: "https://picsum.photos/100"
  },
  stats: {
    views: 0,
    plays: 0,
    likes: 0,
    shares: 0,
    averagePlayTime: 0
  },
  likedBy: [],
  ratings: [],
  averageRating: 0,
  isActive: true,
  isFeatured: false,
  tags: ["test", "sample"],
  version: "1.0.0",
  fileSize: 1000000,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
```

---

## Building for Production

### iOS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios
```

### Android Build

```bash
# Build for Android
eas build --platform android

# Build APK (for testing)
eas build --platform android --profile preview
```

### Environment Variables for Production

Create `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your-prod-key",
        "EXPO_PUBLIC_API_URL": "https://api.yourdomain.com"
      }
    }
  }
}
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |

### Games Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games` | List games (with filters) |
| GET | `/api/games/:id` | Get single game |
| POST | `/api/games` | Create game (auth required) |
| PUT | `/api/games/:id` | Update game (auth required) |
| DELETE | `/api/games/:id` | Delete game (auth required) |
| POST | `/api/games/:id/like` | Like/unlike game |
| POST | `/api/games/:id/rate` | Rate game (1-5 stars) |
| POST | `/api/games/:id/play` | Record play session |
| GET | `/api/games/trending` | Get trending games |
| GET | `/api/games/recommended` | Get recommended games |

### Query Parameters for `/api/games`

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| category | string | Filter by category |
| search | string | Search in title/description |
| sortBy | string | Sort field (popular, likes, rating, createdAt) |
| order | string | Sort order (asc, desc) |
| featured | boolean | Filter featured games |

---

## Database Schema

### Users Table
```sql
- id (INT, PK, AUTO_INCREMENT)
- username (VARCHAR(50), UNIQUE)
- email (VARCHAR(100), UNIQUE)
- password (VARCHAR(255))
- avatar (VARCHAR(500))
- bio (TEXT)
- role (ENUM: 'user', 'admin')
- is_active (BOOLEAN)
- failed_login_attempts (INT)
- lock_until (DATETIME)
- last_login (DATETIME)
- password_changed_at (DATETIME)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Games Table
```sql
- id (INT, PK, AUTO_INCREMENT)
- title (VARCHAR(100))
- description (TEXT)
- thumbnail (VARCHAR(500))
- game_url (VARCHAR(500))
- category (ENUM)
- difficulty (ENUM: 'easy', 'medium', 'hard')
- creator_id (INT, FK)
- views (INT)
- plays (INT)
- likes (INT)
- shares (INT)
- average_rating (DECIMAL)
- is_featured (BOOLEAN)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## Security Features

- **Password Hashing**: bcrypt with 10 rounds
- **JWT Authentication**: 30-day access tokens
- **Account Lockout**: 5 failed attempts = 60-minute lock
- **Rate Limiting**: 1000 requests/15min (50 for auth)
- **CORS Protection**: Origin whitelist
- **Security Headers**: Helmet.js
- **Input Sanitization**: XSS protection
- **SQL Injection Prevention**: Parameterized queries

---

## Troubleshooting

### Mobile App Issues

**Firebase errors:**
- Verify all `EXPO_PUBLIC_FIREBASE_*` variables in `.env`
- Check Firebase console for correct configuration values
- Ensure Firestore rules allow access

**Network errors:**
- Verify `EXPO_PUBLIC_API_URL` is correct
- Check if server is running and accessible
- Test API endpoints with curl or Postman

**Build errors:**
- Clear cache: `npx expo start --clear`
- Delete `node_modules` and reinstall
- Check for TypeScript errors: `npx tsc --noEmit`

### Server Issues

**Database connection failed:**
- Verify MySQL credentials in `.env`
- Check database user privileges
- Ensure database server is running

**CORS errors:**
- Add your frontend domain to `ALLOWED_ORIGINS`
- Check for protocol mismatch (http vs https)

**Authentication errors:**
- Verify `JWT_SECRET` is set
- Check token expiration settings
- Ensure clock sync between servers

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details.
