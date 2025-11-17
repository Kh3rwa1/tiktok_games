# 🎮 TikTok Games - Super Simple Guide for Everyone!

> **Even a 10-year-old can understand this!** This guide explains everything in simple words.

---

## 🤔 What Is This?

Imagine TikTok, but instead of videos, you swipe through **awesome games**! That's what this app is!

- 📱 **Mobile App**: An app for phones where people play games
- 💻 **Admin Panel**: A website where YOU can manage everything
- 🔥 **Firebase**: A big computer in the cloud that stores all your data

---

## 🏗️ The Three Main Parts

### 1. 📱 Mobile App (`/mobile` folder)
**What it does**: This is the app that people download on their phones!

**Cool features**:
- ⬆️⬇️ Swipe up and down to see different games (like TikTok!)
- ❤️ Like your favorite games
- 🎮 Play games right in the app
- 👤 Create your own profile
- 🔍 Search for games you want to play

**How it looks**: Bold colors, thick black borders, sharp corners - looks super cool!

---

### 2. 💻 Admin Panel (`/admin-panel` folder)
**What it does**: This is YOUR control room! You can manage everything from here.

**What you can do**:
- ➕ Add new games
- ✏️ Edit existing games
- 🗑️ Delete games you don't want
- 👥 See all your users
- 📊 Check cool statistics (how many people played each game)
- ⚙️ Change settings

**How to use it**: Open it in your web browser (like Chrome or Firefox)

---

### 3. 🔧 Backend (`/backend` folder)
**What it does**: This is like the brain of your app. It:
- Saves all the games people upload
- Remembers who likes what
- Keeps track of how many times each game was played
- Makes sure only the right people can do certain things

**You don't see this**: It runs in the background, like magic!

---

## 🚀 How to Get Started

### Step 1: Install Node.js (The Engine) 🚗

Node.js is like the engine that makes everything run.

1. Go to https://nodejs.org
2. Click the big green button that says "Download"
3. Install it (just keep clicking "Next")
4. Done!

**How to check if it worked**:
- Open Terminal (Mac) or Command Prompt (Windows)
- Type: `node --version`
- If you see a number like `v18.17.0`, it worked! 🎉

---

### Step 2: Set Up Firebase (Your Cloud Computer) ☁️

Firebase is like a huge computer in the sky that stores all your data!

**Easy steps**:

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Give it a name (like "my-awesome-game-app")
4. Click "Continue" three times
5. Once created, click the web icon `</>`
6. Copy the config values (they look like this):

```
apiKey: "ABC123..."
authDomain: "my-app.firebaseapp.com"
projectId: "my-app"
```

**Where to put these**:
- For the mobile app: Put them in `/mobile/src/config/firebase.ts`
- For the admin panel: Put them in `/admin-panel/.env`

---

### Step 3: Start Everything Up! 🎉

#### Start the Backend (The Brain)

```bash
# Go to the backend folder
cd backend

# Install all the helpers
npm install

# Start it!
npm start
```

You should see: "Server running on port 3000" ✅

---

#### Start the Mobile App (The Phone App)

```bash
# Go to the mobile folder
cd mobile

# Install all the helpers
npm install

# Start it!
npm start
```

A QR code will appear! Scan it with the Expo Go app on your phone. 📱

---

#### Start the Admin Panel (Your Control Room)

```bash
# Go to the admin panel folder
cd admin-panel

# Install all the helpers
npm install

# Start it!
npm run dev
```

Open your browser and go to: http://localhost:3001 🌐

---

## 📚 Understanding the Files

### Mobile App Files

```
mobile/
├── src/
│   ├── screens/           # Different pages in the app
│   │   ├── HomeScreen.tsx       # Main swipe screen
│   │   ├── LoginScreen.tsx      # Where you sign in
│   │   ├── ProfileScreen.tsx    # Your profile page
│   │   └── GamePlayerScreen.tsx # Where you play games
│   │
│   ├── components/        # Reusable pieces (like LEGO blocks)
│   │   ├── PremiumButton.tsx    # Cool buttons
│   │   └── PremiumGameCard.tsx  # Game cards
│   │
│   ├── store/             # Where we remember things
│   │   ├── authStore.ts         # Remembers who's logged in
│   │   └── gameStore.ts         # Remembers all the games
│   │
│   └── config/
│       └── firebase.ts    # Connects to Firebase
```

**Simple explanation**:
- **Screens**: Different pages you see in the app
- **Components**: Pieces you can reuse (like buttons, cards)
- **Store**: Where the app remembers stuff
- **Config**: Setup files

---

### Admin Panel Files

```
admin-panel/
├── src/
│   ├── pages/             # Different pages
│   │   ├── Dashboard.jsx        # Home page with stats
│   │   ├── Games.jsx            # Manage games
│   │   ├── Users.jsx            # Manage users
│   │   ├── Analytics.jsx        # See cool charts
│   │   └── Login.jsx            # Sign in page
│   │
│   ├── components/        # Reusable pieces
│   │   ├── Layout.jsx           # Sidebar and header
│   │   └── StatCard.jsx         # Those cool number cards
│   │
│   └── styles/
│       └── global.css     # How everything looks
```

---

### Backend Files

```
backend/
├── models/                # Data structures
│   └── firestore/
│       ├── User.js              # User data structure
│       └── Game.js              # Game data structure
│
├── controllers/           # Business logic
│   ├── authController.js        # Handles sign in/sign up
│   └── gameController.js        # Handles game stuff
│
└── routes/                # URL paths
    ├── auth.js                  # /api/auth/...
    └── games.js                 # /api/games/...
```

**Simple explanation**:
- **Models**: Describe what your data looks like
- **Controllers**: Do the actual work
- **Routes**: Tell the app what to do when you visit a URL

---

## 🎨 Neo-Brutalism Design Guide

### What is Neo-Brutalism?

It's a design style that looks **bold, raw, and unapologetic**! Think:
- 🟥 Big, bright colors
- ⬛ Thick black borders everywhere
- 📦 Sharp corners (no rounded edges)
- 💥 Harsh shadows that POP!

### Our Colors

| Color | What It Looks Like | Where We Use It |
|-------|-------------------|-----------------|
| **Neon Pink** `#FF0080` | 💗 Super bright pink | Main buttons, headers |
| **Electric Blue** `#00D9FF` | 💙 Bright electric blue | Secondary buttons |
| **Toxic Green** `#00FF85` | 💚 Neon green | Success messages |
| **Cyber Yellow** `#FFE600` | 💛 Bright yellow | Warnings, featured badges |
| **Blood Orange** `#FF4500` | 🧡 Bright red-orange | Delete buttons, errors |
| **Black** `#000000` | 🖤 Pure black | All borders, shadows |
| **White** `#FFFFFF` | 🤍 Pure white | Backgrounds, text |

### Design Rules

1. ✅ **Always use thick borders** (3-4 pixels)
2. ✅ **Always add harsh shadows** (no soft, blurry shadows!)
3. ✅ **Use UPPERCASE text** for important things
4. ✅ **Keep it simple** - no fancy decorations
5. ✅ **High contrast** - make colors POP!
6. ❌ **NO gradients** - use solid colors only!
7. ❌ **NO rounded corners** - keep them sharp!

---

## 🔧 Common Things You'll Want to Do

### How to Add a New Game (Admin Panel)

1. Open the admin panel: http://localhost:3001
2. Sign in with your admin account
3. Click "Games" in the sidebar
4. Click the "Add Game" button
5. Fill in:
   - **Title**: Name of the game
   - **Description**: What the game is about
   - **Category**: What type of game it is (action, puzzle, etc.)
   - **Difficulty**: Easy, Medium, or Hard
   - **Game URL**: Where the game file is hosted
   - **Thumbnail**: Upload a cool picture
6. Click "Create Game"
7. Done! 🎉

---

### How to Make Someone an Admin

1. Go to Firebase Console: https://console.firebase.google.com
2. Click on your project
3. Click "Firestore Database" on the left
4. Find the "users" collection
5. Find the user you want to make admin
6. Edit their document
7. Add a field: `role` = `"admin"`
8. Save!

Now they can log into the admin panel! 👑

---

### How to See Game Statistics

1. Open the admin panel
2. Go to "Dashboard" (home page)
3. You'll see:
   - How many users you have
   - How many games you have
   - How many times games were played
   - Top games by popularity

---

## 🐛 Fixing Common Problems

### Problem: "npm: command not found"
**What it means**: Node.js isn't installed
**Fix**: Go to https://nodejs.org and install it!

---

### Problem: "Port 3000 is already in use"
**What it means**: Something else is using that port
**Fix**:
- Option 1: Close whatever is using it
- Option 2: Change the port in the code

---

### Problem: Can't sign in to admin panel
**What it means**: Either your email/password is wrong, or you're not an admin
**Fix**:
1. Make sure your email and password are correct
2. Check Firebase - make sure your role is "admin"

---

### Problem: App shows no games
**What it means**: There are no games in the database yet!
**Fix**: Add some games using the admin panel!

---

## 📱 How the Mobile App Works (Simple Explanation)

### 1. Opening the App

When you open the app:
1. It checks if you're logged in
2. If yes: Shows you the game feed
3. If no: Shows you the login screen

### 2. The Main Feed (HomeScreen)

This is the coolest part! It works like TikTok:

- **Swipe up**: See the next game
- **Swipe down**: See the previous game
- **Tap the game**: Play it!
- **Tap the heart**: Like it!

**How it works behind the scenes**:
1. Loads games from Firebase
2. Shows them in a vertical list
3. You can scroll through them
4. When you like a game, it updates Firebase

### 3. Playing a Game

When you tap "Play":
1. Opens a full-screen game player
2. Loads the game in a WebView (like a mini browser)
3. You can play the game
4. It tracks how long you played
5. When you exit, it saves your stats

### 4. Your Profile

Shows cool stuff about you:
- Your username
- How many games you've played
- Your favorite games
- Your total play time

---

## 💻 How the Admin Panel Works (Simple Explanation)

### The Dashboard (Home Page)

Shows you the important numbers:
- **Total Users**: How many people signed up
- **Total Games**: How many games you have
- **Total Plays**: How many times games were played
- **Recent Games**: The newest games added
- **Top Games**: Most popular games

### Games Management

This is where you control all your games:

**Features**:
- 🔍 **Search**: Find games by name
- 🏷️ **Filter by category**: Show only action games, puzzle games, etc.
- ➕ **Add**: Upload new games
- ✏️ **Edit**: Change game details
- 🗑️ **Delete**: Remove games

**Each game has**:
- Title and description
- Thumbnail image
- Category (action, puzzle, adventure, etc.)
- Difficulty (easy, medium, hard)
- Statistics (views, plays, likes)
- Status (active or inactive)
- Featured flag (to highlight special games)

### Users Management

See everyone who uses your app:

**What you can do**:
- 👀 View all users
- 🛡️ Make someone an admin
- ✅ Activate or deactivate users
- 🗑️ Delete users (be careful!)
- 🔍 Search users by name or email

### Analytics

See cool charts and statistics:
- How many people use your app
- Which games are most popular
- Engagement rates (how many people who see a game actually play it)
- Growth over time

---

## 🔐 How Login/Security Works

### For Regular Users (Mobile App)

1. **Sign Up**:
   - Enter email and password
   - Firebase creates an account
   - Stores your info in Firestore

2. **Sign In**:
   - Enter email and password
   - Firebase checks if it's correct
   - If yes: You're in!
   - If no: Shows an error

3. **Stay Logged In**:
   - Firebase remembers you
   - You don't have to log in every time

### For Admins (Admin Panel)

**Extra security**:
- Must have `role: "admin"` in Firestore
- Can't log in with a regular account
- Has access to manage everything

---

## 🎯 Glossary (Big Words Explained Simply)

- **API**: A way for different parts of the app to talk to each other
- **Backend**: The part that runs on a server (the brain)
- **Component**: A reusable piece of the app (like a LEGO block)
- **Database**: Where all your data is stored
- **Firestore**: Google's database in the cloud
- **Frontend**: The part you see and interact with
- **Props**: Information you pass to components
- **State**: Data that the app remembers
- **Route**: A URL path (like /games or /users)
- **WebView**: A mini browser inside the app

---

## 🎓 Want to Learn More?

### For Complete Beginners:
- **JavaScript Basics**: https://javascript.info
- **How Websites Work**: https://web.dev/learn
- **React Tutorial**: https://react.dev/learn

### For Mobile App Development:
- **React Native**: https://reactnative.dev/docs/getting-started
- **Expo**: https://docs.expo.dev

### For Backend Development:
- **Node.js**: https://nodejs.dev/learn
- **Express**: https://expressjs.com/en/starter/installing.html

### For Firebase:
- **Firebase Docs**: https://firebase.google.com/docs
- **Firestore Guide**: https://firebase.google.com/docs/firestore

---

## 🆘 Getting Help

### If Something Breaks:

1. **Read the error message** - It usually tells you what's wrong!
2. **Google it** - Someone else probably had the same problem
3. **Check Firebase Console** - Make sure everything is set up correctly
4. **Look at the logs** - They show what the app is doing

### Useful Commands:

```bash
# See what's running
lsof -i :3000   # Check what's using port 3000

# Clear cache
npm cache clean --force

# Reinstall everything
rm -rf node_modules package-lock.json
npm install

# See logs
npm run dev   # Shows what's happening
```

---

## 🎉 You're Ready to Build Something Amazing!

This app is yours now! You can:
- Add as many games as you want
- Customize the colors and design
- Add new features
- Share it with your friends

**Remember**: Even professional developers started where you are now. Keep learning, keep building, and have fun! 🚀

---

## 📄 Quick Reference

### File Types You'll See:

- `.jsx` / `.tsx` - React components (the stuff you see on screen)
- `.js` / `.ts` - JavaScript/TypeScript files (the code)
- `.css` - Styling files (how things look)
- `.json` - Data files (settings and configuration)
- `.md` - Documentation files (like this one!)

### Common npm Commands:

```bash
npm install          # Install all dependencies
npm start           # Start the app
npm run dev         # Start in development mode
npm run build       # Build for production
npm test            # Run tests
```

---

**Made with ❤️ for everyone who wants to learn!**

If you have questions, just remember: **Google is your friend**, and **everyone was a beginner once**! 🌟
