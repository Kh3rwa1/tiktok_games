# API Documentation

Base URL: `http://localhost:5000/api` (development)

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "64abc123...",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "https://via.placeholder.com/150",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation:**
- Username: 3-30 characters, alphanumeric + underscore
- Email: Valid email format
- Password: Minimum 6 characters

---

### Login

Authenticate and get access token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "64abc123...",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "https://via.placeholder.com/150",
    "bio": "",
    "stats": {
      "totalGamesPlayed": 0,
      "totalPlayTime": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Get Current User Profile

Get authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "64abc123...",
    "username": "johndoe",
    "avatar": "https://via.placeholder.com/150",
    "bio": "Gamer and developer",
    "stats": {
      "totalGamesPlayed": 42,
      "totalPlayTime": 3600
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Update Profile

Update user profile information.

**Endpoint:** `PUT /api/auth/profile`

**Authentication:** Required

**Request Body:**
```json
{
  "username": "newusername",
  "bio": "Updated bio",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "64abc123...",
    "username": "newusername",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "Updated bio",
    "stats": {...},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Change Password

Change user password.

**Endpoint:** `PUT /api/auth/password`

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Game Endpoints

### Get All Games

Get paginated list of games with optional filters.

**Endpoint:** `GET /api/games`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `search` (string): Search in title/description
- `sortBy` (string): Sort field (popular, likes, rating, createdAt)
- `order` (string): Sort order (asc, desc)
- `featured` (boolean): Only featured games

**Example:** `GET /api/games?page=1&limit=10&category=action&sortBy=popular`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc123...",
      "title": "Super Clicker",
      "description": "The ultimate clicking game!",
      "thumbnail": "https://example.com/thumb.jpg",
      "gameUrl": "https://example.com/game/index.html",
      "category": "casual",
      "tags": ["clicker", "idle"],
      "difficulty": "easy",
      "creator": {
        "_id": "64def456...",
        "username": "gamedev",
        "avatar": "https://example.com/avatar.jpg"
      },
      "stats": {
        "views": 1000,
        "plays": 500,
        "likes": 100,
        "shares": 20,
        "averagePlayTime": 300
      },
      "averageRating": 4.5,
      "isFeatured": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

### Get Single Game

Get detailed information about a specific game.

**Endpoint:** `GET /api/games/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "title": "Super Clicker",
    "description": "The ultimate clicking game!",
    "thumbnail": "https://example.com/thumb.jpg",
    "gameUrl": "https://example.com/game/index.html",
    "category": "casual",
    "tags": ["clicker", "idle"],
    "difficulty": "easy",
    "controls": "Tap the screen to play",
    "requirements": "None",
    "creator": {
      "_id": "64def456...",
      "username": "gamedev",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "Indie game developer"
    },
    "stats": {...},
    "averageRating": 4.5,
    "ratings": [
      {
        "user": "64xyz789...",
        "rating": 5,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "likedBy": ["64xyz789...", "64xyz790..."],
    "isFeatured": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### Create Game

Create a new game (requires authentication).

**Endpoint:** `POST /api/games`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "My Awesome Game",
  "description": "A fun and addictive game!",
  "thumbnail": "https://example.com/thumb.jpg",
  "gameUrl": "https://example.com/game/index.html",
  "category": "action",
  "tags": ["action", "adventure"],
  "difficulty": "medium",
  "controls": "Arrow keys to move, Space to jump",
  "requirements": "Keyboard required"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "title": "My Awesome Game",
    ...
  }
}
```

---

### Update Game

Update game information (requires authentication and ownership).

**Endpoint:** `PUT /api/games/:id`

**Authentication:** Required

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "thumbnail": "https://example.com/new-thumb.jpg",
  "category": "arcade"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "title": "Updated Title",
    ...
  }
}
```

---

### Delete Game

Soft delete a game (requires authentication and ownership).

**Endpoint:** `DELETE /api/games/:id`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Game deleted successfully"
}
```

---

### Like/Unlike Game

Toggle like status for a game.

**Endpoint:** `POST /api/games/:id/like`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likes": 101
  }
}
```

---

### Rate Game

Rate a game (1-5 stars).

**Endpoint:** `POST /api/games/:id/rate`

**Authentication:** Required

**Request Body:**
```json
{
  "rating": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "totalRatings": 42
  }
}
```

---

### Record Play

Record that a user played a game.

**Endpoint:** `POST /api/games/:id/play`

**Authentication:** Required

**Request Body:**
```json
{
  "duration": 300
}
```
*duration in seconds (optional)*

**Response (200):**
```json
{
  "success": true,
  "message": "Play recorded successfully"
}
```

---

### Get Trending Games

Get currently trending games (last 24 hours).

**Endpoint:** `GET /api/games/trending`

**Query Parameters:**
- `limit` (number): Number of games (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc123...",
      "title": "Trending Game",
      ...
    }
  ]
}
```

---

### Get Recommended Games

Get top-rated and popular games.

**Endpoint:** `GET /api/games/recommended`

**Query Parameters:**
- `limit` (number): Number of games (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc123...",
      "title": "Recommended Game",
      ...
    }
  ]
}
```

---

### Upload Game Asset

Upload a game file or asset to S3.

**Endpoint:** `POST /api/games/upload`

**Authentication:** Required

**Request:** Multipart form data
- `gameFile`: File to upload

**Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/games/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "gameFile=@/path/to/game.html"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.amazonaws.com/games/123456.html",
    "key": "games/123456.html",
    "size": 12345
  }
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "message": "Validation error message",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "message": "Not authorized, no token"
}
```

**403 Forbidden:**
```json
{
  "message": "Access denied. Admin only."
}
```

**404 Not Found:**
```json
{
  "message": "Game not found"
}
```

**500 Internal Server Error:**
```json
{
  "message": "Server error message"
}
```

---

## Rate Limiting

API endpoints are rate limited:
- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## Game Categories

Available categories:
- `action`
- `puzzle`
- `adventure`
- `strategy`
- `casual`
- `arcade`
- `racing`
- `sports`
- `other`

## Difficulty Levels

- `easy`
- `medium`
- `hard`

---

## Testing with cURL

### Register and Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'

# Login (save the token)
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | jq -r '.data.token')
```

### Get Games
```bash
# Get all games
curl http://localhost:5000/api/games

# Get trending games
curl http://localhost:5000/api/games/trending?limit=5
```

### Create Game
```bash
curl -X POST http://localhost:5000/api/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Game",
    "description": "A test game",
    "thumbnail": "https://example.com/thumb.jpg",
    "gameUrl": "https://example.com/game.html",
    "category": "casual",
    "tags": ["test"],
    "difficulty": "easy"
  }'
```

### Like a Game
```bash
curl -X POST http://localhost:5000/api/games/GAME_ID/like \
  -H "Authorization: Bearer $TOKEN"
```

---

## WebSocket Support (Future)

Coming soon: Real-time features
- Live player count
- Real-time leaderboards
- Chat and comments
- Live notifications

---

## Pagination Best Practices

- Default page size: 10
- Maximum page size: 100
- Use `page` and `limit` parameters
- Check `pagination.pages` for total pages
- Implement infinite scroll with incremental pages

---

## Security Notes

- Always use HTTPS in production
- Store JWT tokens securely (HttpOnly cookies recommended)
- Rotate JWT secrets regularly
- Implement refresh tokens for long sessions
- Sanitize all user inputs
- Use prepared statements (Mongoose handles this)
- Enable CORS only for trusted origins

---

For more details, see the main README.md
