# 🎮 TikTok Games - Premium Gaming Platform

<div align="center">

![Neo-Brutalism](https://img.shields.io/badge/Design-Neo--Brutalism-FF0080?style=for-the-badge&logo=react&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.73-00D9FF?style=for-the-badge&logo=react&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-10.7-FFE600?style=for-the-badge&logo=firebase&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18-00FF85?style=for-the-badge&logo=node.js&logoColor=black)

**A 5-Billion-Dollar-Looking TikTok-Style Gaming Platform**

*Swipe. Play. Dominate.*

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Admin Panel](#-admin-panel) • [Architecture](#-architecture)

</div>

---

## 🌟 Overview

Welcome to the **most brutally beautiful** gaming platform you've ever seen. Combining TikTok's addictive swipe interface with premium HTML5 games, all wrapped in a bold **Neo-Brutalism** design that screams 5-billion-dollar startup.

### What Makes This Special?

- 🎨 **Neo-Brutalism Design**: Bold colors, harsh shadows, thick borders - no compromises
- 📱 **TikTok-Style UX**: Addictive vertical scroll that keeps users engaged
- 🚀 **Production-Ready**: Firebase backend, optimized performance, ready to scale
- 🎯 **Full-Stack Admin Panel**: Web-based control center for everything
- 💎 **Premium Quality**: AAA+ code quality, comprehensive documentation, enterprise-ready

---

## ✨ Features

### 🎮 Mobile App (React Native + Expo)

#### Core Features
- **Vertical Swipe Feed**: TikTok-style infinite scroll through games
- **Instant Play**: WebView-based game player, no downloads needed
- **Social Engagement**: Like, rate, share - everything you expect
- **Smart Discovery**: Search, filter, and explore by category
- **User Profiles**: Track stats, favorites, and achievements

#### Premium UX Details
- ⚡ **60fps Animations**: Smooth spring physics using Reanimated
- 🔊 **Haptic Feedback**: Tactile responses for every interaction
- 🎨 **Neo-Brutalism UI**: Bold, high-contrast, unapologetic design
- 📊 **Real-time Stats**: Live play counts, ratings, and views
- 🔐 **Secure Auth**: Firebase Authentication with persistent sessions

---

### 💻 Admin Panel (React + Vite)

#### Dashboard
- 📊 **Real-time Analytics**: User growth, game performance, engagement metrics
- 🎯 **Key Metrics**: Total users, games, plays, views - all at a glance
- 📈 **Trending Games**: See what's hot right now
- 🆕 **Recent Activity**: Latest games, new users, live feed

#### Games Management
- ➕ **Create Games**: Upload thumbnails, set metadata, configure settings
- ✏️ **Edit Anything**: Full CRUD operations on all games
- 🔍 **Advanced Search**: Filter by category, difficulty, status
- 🏷️ **Bulk Actions**: Feature, activate, deactivate, delete - all at once
- 📤 **File Uploads**: Direct integration with Firebase Storage

#### User Management
- 👥 **User Directory**: Complete list with search and filters
- 🛡️ **Role Management**: Promote/demote admins with one click
- ✅ **Status Control**: Activate or deactivate user accounts
- 🗑️ **User Cleanup**: Remove unwanted accounts
- 📊 **User Stats**: See play history, favorites, activity

#### Analytics
- 📈 **Growth Metrics**: Track platform growth over time
- 🎮 **Game Performance**: Which games are winning
- 💡 **Engagement Rates**: Understand user behavior
- 🔥 **Top 10 Charts**: Most played, most liked, highest rated

#### Settings
- ⚙️ **Platform Config**: Maintenance mode, registration control
- 🔔 **Notifications**: Email and push notification settings
- 🚀 **Performance**: Cache settings, file upload limits
- 🎨 **Customization**: Platform name and branding

---

## 🎨 Neo-Brutalism Design System

### The Philosophy

Neo-Brutalism is **raw, bold, and unapologetic**. We reject subtle gradients, soft shadows, and timid colors. Instead:

- **Thick Black Borders** (3-4px everywhere)
- **Harsh Drop Shadows** (no blur, pure offset)
- **Bold Typography** (uppercase, extra bold weights)
- **High Contrast Colors** (neon pink, electric blue, toxic green)
- **Minimal Border Radius** (2px max, mostly 0px)
- **No Gradients** (solid colors only)

### Color Palette

```css
Neon Pink:     #FF0080  /* Primary actions, headers */
Electric Blue: #00D9FF  /* Secondary actions, links */
Toxic Green:   #00FF85  /* Success states, easy difficulty */
Cyber Yellow:  #FFE600  /* Warnings, medium difficulty */
Blood Orange:  #FF4500  /* Danger, hard difficulty */
Pure Black:    #000000  /* Borders, shadows, text */
Pure White:    #FFFFFF  /* Backgrounds, inverse text */
```

### Typography

- **Display Font**: Space Grotesk (800 weight)
- **Mono Font**: Space Mono (700 weight)
- **Letter Spacing**: 1-2px for uppercase text
- **Text Transform**: Uppercase for headings and labels

---

## 🚀 Quick Start

### Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** ([Download](https://nodejs.org))
- **npm or yarn** (comes with Node.js)
- **Expo CLI** (`npm install -g expo-cli`)
- **Firebase Account** ([Get Started](https://firebase.google.com))

---

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/tiktok_games.git
cd tiktok_games

# Install backend dependencies
cd backend
npm install

# Install mobile app dependencies
cd ../mobile
npm install

# Install admin panel dependencies
cd ../admin-panel
npm install
```

---

### 2. Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add Project"
   - Follow the setup wizard

2. **Enable Services**
   - **Authentication**: Enable Email/Password
   - **Firestore**: Create database in production mode
   - **Storage**: Enable for file uploads

3. **Get Configuration**
   - Click the web icon `</>` to add a web app
   - Copy your Firebase config

4. **Configure Apps**

**Backend** (`/backend/.env`):
```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Server
PORT=3000
NODE_ENV=development
```

**Mobile** (`/mobile/src/config/firebase.ts`):
```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

**Admin Panel** (`/admin-panel/.env`):
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_URL=http://localhost:3000/api
```

---

### 3. Create Your First Admin User

```bash
# 1. Start the backend
cd backend
npm start

# 2. In Firebase Console:
#    - Go to Authentication > Users
#    - Click "Add user"
#    - Enter email and password

# 3. Go to Firestore Database
#    - Find the 'users' collection
#    - Find your user document (by UID)
#    - Add field: role = "admin"
```

---

### 4. Start All Services

**Terminal 1 - Backend**:
```bash
cd backend
npm start
```
✅ Backend running on http://localhost:3000

**Terminal 2 - Mobile App**:
```bash
cd mobile
npm start
```
✅ Scan QR code with Expo Go app

**Terminal 3 - Admin Panel**:
```bash
cd admin-panel
npm run dev
```
✅ Admin panel running on http://localhost:3001

---

## 📁 Project Structure

```
tiktok_games/
│
├── 📱 mobile/                    # React Native Mobile App
│   ├── src/
│   │   ├── screens/             # App screens
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── RegisterScreen.tsx
│   │   │   ├── HomeScreen.tsx            # TikTok-style feed
│   │   │   ├── GamePlayerScreen.tsx      # Game player
│   │   │   ├── ProfileScreen.tsx         # User profile
│   │   │   ├── SearchScreen.tsx          # Game discovery
│   │   │   └── FavoritesScreen.tsx       # Liked games
│   │   │
│   │   ├── components/          # Reusable UI components
│   │   │   ├── PremiumButton.tsx         # Neo-Brutalism button
│   │   │   ├── PremiumGameCard.tsx       # Game card with animations
│   │   │   ├── LoadingSkeleton.tsx       # Skeleton loader
│   │   │   └── ErrorBoundary.tsx         # Error handling
│   │   │
│   │   ├── store/               # Zustand state management
│   │   │   ├── authStore.ts              # Auth state
│   │   │   └── gameStore.ts              # Game state
│   │   │
│   │   ├── config/
│   │   │   └── firebase.ts               # Firebase config
│   │   │
│   │   ├── utils/
│   │   │   └── haptics.ts                # Haptic feedback
│   │   │
│   │   └── types/
│   │       └── index.ts                  # TypeScript types
│   │
│   ├── App.tsx                            # Root component
│   ├── app.json                           # Expo config
│   └── package.json
│
├── 💻 admin-panel/               # Web-based Admin Panel
│   ├── src/
│   │   ├── pages/               # Admin pages
│   │   │   ├── Dashboard.jsx             # Main dashboard
│   │   │   ├── Games.jsx                 # Games management
│   │   │   ├── Users.jsx                 # Users management
│   │   │   ├── Analytics.jsx             # Analytics & charts
│   │   │   ├── Settings.jsx              # Platform settings
│   │   │   └── Login.jsx                 # Admin login
│   │   │
│   │   ├── components/          # Reusable components
│   │   │   ├── Layout.jsx                # Sidebar layout
│   │   │   └── StatCard.jsx              # Stat card widget
│   │   │
│   │   ├── services/
│   │   │   └── api.js                    # API client
│   │   │
│   │   ├── store/
│   │   │   └── authStore.js              # Admin auth
│   │   │
│   │   ├── config/
│   │   │   └── firebase.js               # Firebase config
│   │   │
│   │   ├── styles/
│   │   │   └── global.css                # Neo-Brutalism styles
│   │   │
│   │   ├── App.jsx                        # Root component
│   │   └── main.jsx                       # Entry point
│   │
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── 🔧 backend/                   # Node.js + Express API
│   ├── config/
│   │   ├── firebase.js                    # Firebase Admin SDK
│   │   └── db.js                          # Database config (legacy)
│   │
│   ├── models/
│   │   └── firestore/
│   │       ├── User.js                    # User model
│   │       └── Game.js                    # Game model
│   │
│   ├── controllers/
│   │   ├── authController.js              # Auth logic
│   │   └── gameController.js              # Game logic
│   │
│   ├── routes/
│   │   ├── auth.js                        # Auth endpoints
│   │   ├── games.js                       # Game endpoints
│   │   └── admin.js                       # Admin endpoints
│   │
│   ├── middleware/
│   │   └── auth.js                        # Auth middleware
│   │
│   ├── server.js                          # Express app
│   ├── .env.example
│   └── package.json
│
├── 📚 Documentation
│   ├── API_DOCUMENTATION.md               # API reference
│   ├── FIREBASE_SETUP.md                  # Firebase guide
│   ├── SIMPLE_GUIDE.md                    # Kid-friendly guide
│   └── README_PREMIUM.md                  # This file
│
└── 🎮 sample_games/              # Example HTML5 games
    └── simple-clicker/
        └── index.html
```

---

## 🏗️ Architecture

### Tech Stack

#### Mobile App
| Technology | Purpose |
|------------|---------|
| React Native 0.73 | Cross-platform mobile framework |
| Expo 50.0 | Development platform |
| TypeScript | Type safety |
| Zustand | State management |
| React Navigation | Routing |
| Reanimated | 60fps animations |
| Firebase SDK | Auth & Database |
| Expo Haptics | Haptic feedback |

#### Admin Panel
| Technology | Purpose |
|------------|---------|
| React 18.2 | UI framework |
| Vite 5.0 | Build tool |
| React Router | Navigation |
| Firebase SDK | Auth & Database |
| Zustand | State management |
| Recharts | Data visualization |
| Lucide Icons | Icon library |

#### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 18 | Runtime |
| Express 4.18 | Web framework |
| Firebase Admin SDK | Backend services |
| Firestore | NoSQL database |
| Cloud Storage | File storage |
| Express Rate Limit | API protection |
| Helmet | Security headers |

---

### Data Flow

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ Firebase Auth   │   │ Firebase        │
│ (Direct)        │   │ Firestore       │
└─────────────────┘   │ (Direct Read)   │
                      └────────┬────────┘
                               │
         ┌─────────────────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  (Express)      │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ Firestore       │   │ Cloud Storage   │
│ (Admin SDK)     │   │ (Uploads)       │
└─────────────────┘   └─────────────────┘
         ▲
         │
         │
┌────────┴────────┐
│  Admin Panel    │
│  (React)        │
└─────────────────┘
```

---

## 🎯 API Endpoints

### Authentication (`/api/auth`)
```
POST   /register              Create new user
POST   /login                 Login user
GET    /me                    Get current user (protected)
PUT    /profile               Update profile (protected)
PUT    /password              Change password (protected)
```

### Games (`/api/games`)
```
GET    /                      List games (pagination, filters)
GET    /:id                   Get game by ID
POST   /                      Create game (protected)
PUT    /:id                   Update game (protected, creator/admin)
DELETE /:id                   Delete game (protected, creator/admin)
POST   /:id/like              Toggle like (protected)
POST   /:id/rate              Rate game (protected)
POST   /:id/play              Record play (protected)
GET    /trending              Get trending games
GET    /recommended           Get recommended games
POST   /upload                Upload game assets (protected)
```

### Admin (`/api/admin`)
```
GET    /stats                 Platform statistics (admin)
GET    /users                 List users with filters (admin)
PUT    /users/:id/role        Update user role (admin)
PUT    /users/:id/toggle-active  Toggle user status (admin)
DELETE /users/:id             Delete user (admin)
GET    /activity              Recent platform activity (admin)
POST   /games/bulk-action     Bulk game operations (admin)
```

---

## 📚 Documentation

### For Everyone
- **[SIMPLE_GUIDE.md](./SIMPLE_GUIDE.md)** - Super simple guide, even a 10-year-old can understand!

### Technical Docs
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase configuration guide

### Component Docs
Each component has inline JSDoc comments explaining:
- What it does
- Props it accepts
- Usage examples

---

## 🚢 Deployment

### Mobile App

#### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit
```

### Admin Panel

#### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd admin-panel
vercel

# Production deployment
vercel --prod
```

#### Deploy to Netlify

```bash
# Build
npm run build

# Deploy dist folder to Netlify
# (or use Netlify CLI)
```

### Backend

#### Deploy to Railway

1. Create account at [railway.app](https://railway.app)
2. Connect GitHub repo
3. Add environment variables
4. Deploy!

#### Deploy to Render

1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Configure environment
5. Deploy!

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run mobile app tests (if configured)
cd mobile
npm test

# Run admin panel tests
cd admin-panel
npm test
```

---

## 🔒 Security Best Practices

### Implemented
- ✅ Firebase Authentication for secure login
- ✅ JWT token validation on API
- ✅ Role-based access control (admin vs user)
- ✅ Rate limiting on API endpoints
- ✅ Helmet for security headers
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Environment variables for secrets

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Games collection
    match /games/{gameId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.creatorId ||
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if request.auth.uid == resource.data.creatorId ||
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 🎓 Learning Resources

### React Native
- [Official Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [React Native Express](https://www.reactnative.express)

### Firebase
- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Auth](https://firebase.google.com/docs/auth)

### Node.js & Express
- [Node.js Docs](https://nodejs.org/docs)
- [Express Guide](https://expressjs.com/en/guide/routing.html)

### Design
- [Neo-Brutalism](https://uxdesign.cc/neo-brutalism-the-new-trend-in-web-design-d0f7c5c4e4c9)
- [Design System](https://www.designsystems.com)

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Use ESLint and Prettier
- Write JSDoc comments for all functions
- Follow the existing Neo-Brutalism design patterns
- Add tests for new features

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 💬 Support

- 📧 Email: support@tiktokgames.example.com
- 💬 Discord: [Join our server](https://discord.gg/example)
- 🐦 Twitter: [@TikTokGames](https://twitter.com/example)
- 📚 Docs: [docs.tiktokgames.example.com](https://docs.example.com)

---

## 🎉 Acknowledgments

- **Design Inspiration**: Neo-Brutalism movement
- **UI/UX**: TikTok's infinite scroll interface
- **Icons**: Lucide Icons, Ionicons
- **Fonts**: Space Grotesk, Space Mono

---

<div align="center">

**Built with ❤️ and a lot of ☕**

*Bold. Brutal. Unapologetic.*

[⬆ Back to Top](#-tiktok-games---premium-gaming-platform)

</div>
