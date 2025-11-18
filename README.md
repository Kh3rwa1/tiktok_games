# TikTok Games

Mobile gaming platform with React Native app and Node.js backend.

## Architecture

```
tiktok_games/
├── server-admin-panel/   # Backend API (Node.js + MySQL)
└── mobile/               # Mobile App (React Native + Expo)
```

## Server Setup (cPanel)

### 1. Create MySQL Database

In cPanel > MySQL Databases:
- Create database: `username_tiktok_games`
- Create user: `username_dbuser`
- Add user to database with all privileges

### 2. Configure Server

```bash
cd server-admin-panel
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_USER=username_dbuser
DB_PASSWORD=your_password
DB_NAME=username_tiktok_games
JWT_SECRET=generate-a-secure-random-string
```

### 3. Install & Start

```bash
npm install
npm start
```

Server runs at `http://yourdomain.com:5000`

## Mobile App Setup

### 1. Configure API URL

Edit `mobile/src/services/api.js`:
```javascript
const API_URL = 'https://yourdomain.com/api';
```

### 2. Install & Run

```bash
cd mobile
npm install
npx expo start
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Games
- `GET /api/games` - List games
- `GET /api/games/:id` - Get game
- `POST /api/games` - Create game
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game
- `POST /api/games/:id/like` - Like/unlike
- `POST /api/games/:id/rate` - Rate game
- `POST /api/games/:id/play` - Record play
- `GET /api/games/trending` - Trending games
- `GET /api/games/recommended` - Recommended games

## Database Tables

Tables are created automatically on first run:
- `users` - User accounts
- `games` - Game listings
- `game_likes` - User likes
- `game_ratings` - User ratings
- `user_favorites` - Favorite games
- `play_history` - Play records

## cPanel Node.js Setup

1. Go to cPanel > Setup Node.js App
2. Create application:
   - Node version: 18+
   - Application root: `server-admin-panel`
   - Application startup file: `server.js`
3. Click "Run NPM Install"
4. Start the application

## License

MIT
