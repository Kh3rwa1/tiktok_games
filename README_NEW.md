# TikTok-Style Game Streaming App 🎮

A premium AAA+ quality full-stack mobile application for discovering and playing HTML5/JavaScript mini-games in a TikTok-style infinite scroll interface. Built with Firebase, TypeScript, and React Native.

## ✨ Features

### Mobile App (AAA+ Premium Quality)
- **TikTok-Style Interface**: Infinite vertical scroll feed with smooth animations
- **TypeScript**: Fully typed codebase for better developer experience
- **Premium UI/UX**: Glassmorphism, gradients, and smooth transitions
- **Haptic Feedback**: Rich tactile feedback on every interaction
- **Animations**: React Native Reanimated with spring physics
- **State Management**: Zustand for efficient global state
- **Offline Support**: Firebase offline persistence enabled
- **Error Handling**: Comprehensive error boundaries and retry mechanisms
- **Loading States**: Premium skeleton screens and loading indicators

### Backend Features
- **Firebase-First**: 100% Firebase infrastructure
- **Firebase Authentication**: Secure email/password authentication
- **Firestore Database**: NoSQL database with real-time capabilities
- **Firebase Storage**: Scalable cloud storage for game assets
- **RESTful API**: Express.js backend for additional business logic
- **Type-Safe**: Uses Firebase Admin SDK with proper TypeScript types

### Game Features
- 🎮 Full-screen WebView game player
- ❤️ Like/unlike games with animations
- ⭐ 5-star rating system
- 📊 Real-time statistics (views, plays, ratings)
- 🔍 Advanced search with filters
- 📁 Category-based browsing
- 💾 Favorites system
- ⏱️ Play time tracking
- 🎯 Trending and recommended games

## 🏗️ Architecture

```
tiktok_games/
├── backend/                      # Node.js Express API
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK config
│   ├── models/
│   │   └── firestore/           # Firestore data models
│   │       ├── User.js
│   │       └── Game.js
│   ├── controllers/             # Business logic
│   │   ├── authController.js
│   │   └── gameController.js
│   ├── routes/                  # API routes
│   │   ├── auth.js
│   │   └── games.js
│   ├── middleware/
│   │   └── auth.js             # Firebase token verification
│   ├── server.js               # Entry point
│   └── package.json
│
└── mobile/                      # React Native Expo App (TypeScript)
    ├── src/
    │   ├── config/
    │   │   └── firebase.ts     # Firebase client config
    │   ├── types/              # TypeScript type definitions
    │   │   └── index.ts
    │   ├── store/              # Zustand state management
    │   │   ├── authStore.ts
    │   │   └── gameStore.ts
    │   ├── screens/            # Screen components
    │   │   ├── auth/
    │   │   │   ├── LoginScreen.tsx
    │   │   │   └── RegisterScreen.tsx
    │   │   ├── HomeScreen.tsx
    │   │   ├── GamePlayerScreen.tsx
    │   │   ├── SearchScreen.tsx
    │   │   ├── FavoritesScreen.tsx
    │   │   └── ProfileScreen.tsx
    │   ├── components/         # Reusable components
    │   │   ├── PremiumGameCard.tsx
    │   │   ├── LoadingSkeleton.tsx
    │   │   ├── PremiumButton.tsx
    │   │   └── ErrorBoundary.tsx
    │   └── utils/
    │       └── haptics.ts      # Haptic feedback utilities
    ├── App.tsx
    ├── tsconfig.json
    └── package.json
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **Security**: Helmet.js, CORS, Rate Limiting
- **Validation**: express-validator

### Mobile App
- **Framework**: React Native with Expo (~50.0.0)
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation v6
- **Animations**: React Native Reanimated (~3.6.0)
- **UI Components**:
  - expo-linear-gradient (gradients)
  - expo-blur (glassmorphism)
  - expo-haptics (tactile feedback)
  - react-native-fast-image (optimized images)
  - lottie-react-native (complex animations)
- **Firebase**: Firebase SDK v10
- **HTTP Client**: Axios (for backend API calls)
- **Storage**: AsyncStorage

## 📦 Installation

### Prerequisites

- Node.js (v16+) and npm
- Expo CLI: `npm install -g expo-cli`
- Firebase account
- iOS Simulator (macOS) or Android Emulator

### Firebase Setup

1. **Create a Firebase project** - See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions

2. **Quick setup**:
   - Enable Firebase Authentication (Email/Password)
   - Create Firestore Database
   - Enable Firebase Storage
   - Download service account key for backend
   - Get web config for mobile app

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Download your Firebase Admin SDK service account JSON
   - Save it as `firebase-service-account.json` in the `backend/` directory
   - Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file**
   ```env
   NODE_ENV=development
   PORT=5000
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

   Server will run at `http://localhost:5000`

### Mobile App Setup

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file with your Firebase config**
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Start Expo**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 🔒 Security Features

### Firebase Security Rules

**Firestore Rules** (auto-enforced):
- Users can only read/write their own data
- Games are publicly readable
- Only creators can modify their games
- Admin role for elevated permissions

**Storage Rules**:
- Public read access for game assets
- Authenticated write access
- User-specific folders for avatars

### Backend Security

- Firebase Admin SDK for server-side auth
- Token verification middleware
- Helmet.js security headers
- Rate limiting on API endpoints
- CORS configuration
- Input validation

## 📱 Key Screens

### Authentication
- **LoginScreen**: Email/password login with Firebase Auth
- **RegisterScreen**: User registration with validation

### Main App
- **HomeScreen**: TikTok-style vertical feed of games
- **GamePlayerScreen**: Full-screen WebView game player with controls
- **SearchScreen**: Search and filter games by category
- **FavoritesScreen**: View saved favorite games
- **ProfileScreen**: User profile with stats and settings

## 🎨 Premium UI Features

- **Glassmorphism**: Frosted glass effects using expo-blur
- **Gradient Overlays**: Beautiful gradients throughout
- **Spring Animations**: Natural, physics-based motion
- **Haptic Feedback**: Rich tactile responses
- **Skeleton Screens**: Premium loading states
- **Error Boundaries**: Graceful error handling
- **Toast Notifications**: Non-intrusive user feedback
- **Smooth Transitions**: 60 FPS animations

## 🚀 Deployment

### Backend (Cloud Run / Cloud Functions)

```bash
cd backend
npm install
# Deploy using your preferred platform
# Google Cloud Run recommended for Express apps
```

### Mobile App

#### iOS (TestFlight/App Store)

```bash
expo build:ios
# Follow Expo prompts
# Upload to App Store Connect
```

#### Android (Google Play)

```bash
expo build:android
# Download APK/AAB
# Upload to Google Play Console
```

## 📊 Performance Optimization

### Backend
- Firebase Admin SDK connection pooling
- Compression middleware
- Efficient Firestore queries with indexes

### Mobile
- FlatList virtualization
- Image caching with react-native-fast-image
- Memoized components
- Optimistic updates
- Offline-first with Firebase persistence

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Mobile
```bash
cd mobile
npm test
```

## 🐛 Troubleshooting

### Backend Issues

**Firebase connection failed**
- Verify `firebase-service-account.json` exists
- Check `FIREBASE_STORAGE_BUCKET` in `.env`
- Ensure service account has proper permissions

### Mobile Issues

**Firebase errors**
- Verify all Firebase env vars are set
- Check Firebase Auth is enabled
- Ensure Firestore security rules are published

**Expo not loading**
- Clear cache: `expo start -c`
- Delete `node_modules` and reinstall
- Update Expo CLI: `npm install -g expo-cli`

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 🎯 Roadmap

- [ ] Real-time multiplayer support
- [ ] In-app game creation tools
- [ ] Social features (follow, comments)
- [ ] Leaderboards with Firebase
- [ ] Push notifications
- [ ] AI-powered game recommendations
- [ ] Live streaming integration
- [ ] Payment integration for premium games

## 📞 Support

- Create an issue on GitHub
- Check [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for setup help
- Review troubleshooting section

---

**Built with ❤️ using Firebase, TypeScript, and React Native**
