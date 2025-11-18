# TikTok Games Server-Admin Panel Architecture

## 1. SERVER ARCHITECTURE & TECH STACK

### Backend Stack
- **Framework**: Express.js 4.18.2
- **Database**: MySQL 8.0+ (mysql2/promise)
- **Authentication**: JWT (JSON Web Tokens) - 30 day expiration
- **Password Hashing**: bcryptjs
- **Additional Libraries**:
  - Morgan - HTTP request logging
  - Helmet - Security headers
  - CORS - Cross-origin resource sharing
  - Express Validator - Input validation
  - Compression - Response compression
  - Express Rate Limit - DDoS protection
  - multer - File upload handling
  - adm-zip - ZIP file handling
  - node-fetch - HTTP requests

### Key Features
- Production-ready with enhanced security
- Rate limiting for APIs and auth endpoints
- Maintenance mode support
- Audit logging for all admin actions
- Security headers and CORS configuration
- Request tracking with unique IDs
- Response time monitoring and metrics
- Graceful shutdown handling

### Configuration
- Environment-based configuration via .env
- Centralized config management
- Database connection pooling (10 connections by default)
- File upload size limits configurable
- OneSignal integration for push notifications
- CDN support for assets
- Email configuration (SMTP)

---

## 2. API ENDPOINTS AVAILABLE

### AUTH ENDPOINTS (`/api/auth`)
```
POST   /api/auth/register           - Register new user
POST   /api/auth/login              - User login (returns JWT token)
GET    /api/auth/me                 - Get current user profile (protected)
PUT    /api/auth/profile            - Update user profile (protected)
PUT    /api/auth/password           - Change password (protected)
```

### GAMES ENDPOINTS (`/api/games`)
```
GET    /api/games                   - List all games with pagination, filtering, sorting
GET    /api/games/:id               - Get single game details
POST   /api/games                   - Create new game (protected)
PUT    /api/games/:id               - Update game (protected)
DELETE /api/games/:id               - Delete game (protected)
POST   /api/games/:id/like          - Toggle game like (protected)
POST   /api/games/:id/rate          - Rate a game (protected)
POST   /api/games/:id/play          - Record game play (protected)
GET    /api/games/trending          - Get trending games
GET    /api/games/recommended       - Get recommended games
GET    /api/games/app/settings      - Get public app settings
GET    /api/games/app/notifications - Get active notifications for user
POST   /api/games/app/notifications/:id/read - Mark notification as read
```

### ADMIN ENDPOINTS (`/api/admin`) - Requires Admin Role
```
DASHBOARD & STATISTICS
GET    /api/admin/stats             - Get platform statistics
GET    /api/admin/system-info       - Get system configuration
GET    /api/admin/database-info     - Get database table info

APP SETTINGS
GET    /api/admin/settings          - Get all app settings
PUT    /api/admin/settings          - Update app settings (bulk)
POST   /api/admin/settings          - Create/add new setting

USER MANAGEMENT
GET    /api/admin/users             - List all users with pagination
PUT    /api/admin/users/:id/role    - Change user role
PUT    /api/admin/users/:id/toggle-active - Activate/deactivate user
DELETE /api/admin/users/:id         - Delete user

GAME MANAGEMENT
GET    /api/admin/games             - List all games (admin view)
GET    /api/admin/games/:id         - Get game details
POST   /api/admin/games             - Create game with file upload
PUT    /api/admin/games/:id         - Update game
DELETE /api/admin/games/:id         - Delete game
PUT    /api/admin/games/:id/toggle-featured - Toggle featured status
PUT    /api/admin/games/:id/toggle-active   - Toggle active status
GET    /api/admin/games/:id/files   - Get game file structure

IN-APP NOTIFICATIONS
GET    /api/admin/notifications     - List notifications
POST   /api/admin/notifications     - Create notification
PUT    /api/admin/notifications/:id - Update notification
DELETE /api/admin/notifications/:id - Delete notification
GET    /api/admin/notifications/active - Get active notifications

PUSH NOTIFICATIONS (OneSignal)
GET    /api/admin/push-notifications         - Get push notification history
POST   /api/admin/push-notifications         - Send push notification
POST   /api/admin/test-onesignal             - Test OneSignal connection

ENVIRONMENT MANAGEMENT
GET    /api/admin/env               - Get .env configuration (masked)
PUT    /api/admin/env               - Update .env file

AUDIT LOG
GET    /api/admin/audit-log         - Get audit log with filtering

SETUP
POST   /api/admin/setup             - Create first admin user (one-time)
```

### SOCIAL ENDPOINTS (`/api/social`)
```
COMMENTS
GET    /api/social/games/:gameId/comments              - Get game comments
GET    /api/social/comments/:commentId/replies         - Get comment replies
POST   /api/social/games/:gameId/comments              - Create comment (protected)
POST   /api/social/comments/:commentId/like            - Like comment (protected)
DELETE /api/social/comments/:commentId                 - Delete comment (protected)

FOLLOWS
POST   /api/social/users/:userId/follow                - Follow user (protected)
DELETE /api/social/users/:userId/follow                - Unfollow user (protected)
GET    /api/social/users/:userId/followers             - Get user followers
GET    /api/social/users/:userId/following             - Get users being followed
GET    /api/social/suggestions                         - Get follow suggestions (protected)

USER PROFILES
GET    /api/social/users/:userId/profile               - Get user profile
GET    /api/social/users/:userId/games                 - Get user's games

FEED
GET    /api/social/feed                                - Get personalized feed
GET    /api/social/feed/following                      - Get following feed (protected)

SHARES
POST   /api/social/games/:gameId/share                 - Record game share
```

### HEALTH & MONITORING
```
GET    /health                      - Health check endpoint
GET    /api/metrics                 - Server metrics and performance
GET    /api/server-info             - Server information
```

---

## 3. DATA MODELS & SCHEMAS

### USERS Table
```sql
users (
  id: INT PRIMARY KEY AUTO_INCREMENT
  username: VARCHAR(30) UNIQUE NOT NULL
  email: VARCHAR(255) UNIQUE NOT NULL
  password: VARCHAR(255) NOT NULL (hashed)
  avatar: VARCHAR(500) DEFAULT placeholder
  bio: VARCHAR(200)
  total_games_played: INT DEFAULT 0
  total_play_time: INT DEFAULT 0
  followers_count: INT DEFAULT 0
  following_count: INT DEFAULT 0
  games_count: INT DEFAULT 0
  is_active: BOOLEAN DEFAULT TRUE
  role: ENUM('user', 'admin') DEFAULT 'user'
  last_login: TIMESTAMP NULL
  password_changed_at: TIMESTAMP NULL
  failed_login_attempts: INT DEFAULT 0
  locked_until: TIMESTAMP NULL
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
  
  INDEXES: username, email, role
)
```

### GAMES Table
```sql
games (
  id: INT PRIMARY KEY AUTO_INCREMENT
  title: VARCHAR(100) NOT NULL
  description: VARCHAR(500) NOT NULL
  thumbnail: VARCHAR(500) NOT NULL
  game_url: VARCHAR(500) NOT NULL (points to /games/{id}/index.html)
  category: ENUM('action', 'puzzle', 'adventure', 'strategy', 'casual', 'arcade', 'racing', 'sports', 'other')
  tags: JSON array
  difficulty: ENUM('easy', 'medium', 'hard')
  creator_id: INT FOREIGN KEY (users)
  views: INT DEFAULT 0 (incremented on view)
  plays: INT DEFAULT 0 (incremented on play)
  likes: INT DEFAULT 0 (denormalized from game_likes)
  shares: INT DEFAULT 0 (incremented on share)
  average_play_time: INT DEFAULT 0
  average_rating: DECIMAL(3,2) DEFAULT 0 (computed from game_ratings)
  comments_count: INT DEFAULT 0 (denormalized)
  is_active: BOOLEAN DEFAULT TRUE
  is_featured: BOOLEAN DEFAULT FALSE
  version: VARCHAR(20) DEFAULT '1.0.0'
  file_size: INT DEFAULT 0
  controls: VARCHAR(300) (description of game controls)
  requirements: VARCHAR(200) (browser/hardware requirements)
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
  
  INDEXES: category, plays DESC, likes DESC, rating DESC, featured+plays, active, FULLTEXT search
)
```

### GAME_LIKES Table
```sql
game_likes (
  id: INT PRIMARY KEY AUTO_INCREMENT
  game_id: INT FOREIGN KEY (games) ON DELETE CASCADE
  user_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  UNIQUE KEY (game_id, user_id) - Prevents duplicate likes
)
```

### GAME_RATINGS Table
```sql
game_ratings (
  id: INT PRIMARY KEY AUTO_INCREMENT
  game_id: INT FOREIGN KEY (games) ON DELETE CASCADE
  user_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  rating: TINYINT (1-5 rating)
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
  
  UNIQUE KEY (game_id, user_id) - One rating per user per game
)
```

### USER_FAVORITES Table
```sql
user_favorites (
  id: INT PRIMARY KEY AUTO_INCREMENT
  user_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  game_id: INT FOREIGN KEY (games) ON DELETE CASCADE
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  UNIQUE KEY (user_id, game_id)
)
```

### PLAY_HISTORY Table
```sql
play_history (
  id: INT PRIMARY KEY AUTO_INCREMENT
  user_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  game_id: INT FOREIGN KEY (games) ON DELETE CASCADE
  duration: INT DEFAULT 0 (in seconds)
  played_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  INDEX (user_id, played_at DESC)
)
```

### GAME_COMMENTS Table
```sql
game_comments (
  id: INT PRIMARY KEY AUTO_INCREMENT
  game_id: INT FOREIGN KEY (games) ON DELETE CASCADE
  user_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  parent_id: INT NULL FOREIGN KEY (game_comments) ON DELETE CASCADE
  content: TEXT NOT NULL
  likes: INT DEFAULT 0
  is_pinned: BOOLEAN DEFAULT FALSE
  is_hidden: BOOLEAN DEFAULT FALSE
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
  
  INDEXES: (game_id, created_at DESC), (user_id), (parent_id)
)
```

### COMMENT_LIKES Table
```sql
comment_likes (
  id: INT PRIMARY KEY AUTO_INCREMENT
  comment_id: INT FOREIGN KEY (game_comments) ON DELETE CASCADE
  user_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  UNIQUE KEY (comment_id, user_id)
)
```

### USER_FOLLOWS Table
```sql
user_follows (
  id: INT PRIMARY KEY AUTO_INCREMENT
  follower_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  following_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  UNIQUE KEY (follower_id, following_id)
  INDEXES: follower_id, following_id
)
```

### GAME_SHARES Table
```sql
game_shares (
  id: INT PRIMARY KEY AUTO_INCREMENT
  game_id: INT FOREIGN KEY (games) ON DELETE CASCADE
  user_id: INT NULL FOREIGN KEY (users) ON DELETE SET NULL
  platform: VARCHAR(50) DEFAULT 'link'
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  INDEX (game_id)
)
```

### APP_SETTINGS Table
```sql
app_settings (
  id: INT PRIMARY KEY AUTO_INCREMENT
  setting_key: VARCHAR(100) UNIQUE NOT NULL
  setting_value: TEXT
  setting_type: ENUM('string', 'number', 'boolean', 'json')
  description: VARCHAR(500)
  is_public: BOOLEAN DEFAULT FALSE
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
  
  INDEX (setting_key)
)
```

### NOTIFICATIONS Table
```sql
notifications (
  id: INT PRIMARY KEY AUTO_INCREMENT
  title: VARCHAR(200) NOT NULL
  message: TEXT NOT NULL
  type: ENUM('info', 'warning', 'success', 'error', 'promotion')
  target_audience: ENUM('all', 'users', 'admins')
  is_active: BOOLEAN DEFAULT TRUE
  priority: INT DEFAULT 0
  start_date: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  end_date: TIMESTAMP NULL
  action_url: VARCHAR(500)
  image_url: VARCHAR(500)
  created_by: INT FOREIGN KEY (users) ON DELETE SET NULL
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
  
  INDEX (is_active, start_date, end_date)
)
```

### NOTIFICATION_READS Table
```sql
notification_reads (
  id: INT PRIMARY KEY AUTO_INCREMENT
  notification_id: INT FOREIGN KEY (notifications) ON DELETE CASCADE
  user_id: INT FOREIGN KEY (users) ON DELETE CASCADE
  read_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  UNIQUE KEY (notification_id, user_id)
  INDEX (user_id, notification_id)
)
```

### PUSH_NOTIFICATIONS Table
```sql
push_notifications (
  id: INT PRIMARY KEY AUTO_INCREMENT
  title: VARCHAR(255) NOT NULL
  message: TEXT NOT NULL
  data: JSON
  segment: VARCHAR(100) DEFAULT 'All'
  onesignal_id: VARCHAR(100)
  status: ENUM('pending', 'sent', 'failed')
  error_message: TEXT
  sent_at: TIMESTAMP NULL
  created_by: INT FOREIGN KEY (users) ON DELETE SET NULL
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  INDEX (status)
)
```

### AUDIT_LOG Table
```sql
audit_log (
  id: INT PRIMARY KEY AUTO_INCREMENT
  user_id: INT NULL FOREIGN KEY (users) ON DELETE SET NULL
  action: VARCHAR(100) NOT NULL
  resource_type: VARCHAR(50)
  resource_id: INT
  details: JSON
  ip_address: VARCHAR(45)
  user_agent: TEXT
  created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  
  INDEXES: user_id, action, created_at
)
```

---

## 4. ADMIN PANEL FRONTEND STRUCTURE

- **Location**: `/public/index.html` (SPA - Single Page Application)
- **Type**: Admin dashboard served from Express static middleware
- **Features**:
  - Game management (CRUD operations)
  - User management and role assignment
  - App settings configuration
  - Notification management
  - Push notification delivery (OneSignal integration)
  - Audit log viewing
  - System monitoring and health checks
  - Database statistics
  - Environment variable management
  - OneSignal connection testing

---

## 5. DATA FLOW & SYNCHRONIZATION

### Mobile App -> Server Flow
1. **User Authentication**
   - Mobile app sends login credentials
   - Server validates and returns JWT token
   - Mobile app stores token for future requests

2. **Games Display**
   - Mobile fetches games from `GET /api/games`
   - Supports pagination, filtering by category, search
   - Returns: game list with stats (plays, likes, views, ratings)

3. **Game Interaction**
   - Like/Unlike: `POST /api/games/:id/like` - Updates game_likes table
   - Rating: `POST /api/games/:id/rate` - Updates game_ratings, recalculates average
   - Play: `POST /api/games/:id/play` - Records play_history, increments plays counter
   - View: Tracked automatically when fetching game details via `GET /api/games/:id`

4. **Social Features**
   - Comments: Posted to `POST /api/social/games/:gameId/comments`
   - Follows: Managed via `/api/social/users/:userId/follow`
   - Feed: Personalized based on following list and trending games
   - Shares: Recorded at `POST /api/social/games/:gameId/share`

5. **Settings & Notifications**
   - Mobile fetches public settings from `GET /api/games/app/settings`
   - Notifications fetched from `GET /api/games/app/notifications`
   - OneSignal push notifications sent via admin panel

### Admin Panel -> Server Flow
1. **Admin Authentication**
   - Admin logs in and receives JWT token with admin role
   - All subsequent requests include token in Authorization header

2. **Game Management**
   - Upload game files (ZIP format)
   - Upload thumbnails
   - ZIP automatically extracted to `/public/games/{gameId}/`
   - Game URL set to `/games/{gameId}/index.html`
   - Can toggle active/featured status
   - Can delete games (soft delete + file cleanup)

3. **User Management**
   - List all users with pagination
   - Change user roles (user/admin)
   - Activate/deactivate accounts
   - Delete user accounts

4. **Settings Management**
   - Modify app settings
   - Add new settings
   - Configure OneSignal credentials
   - Settings stored in app_settings table
   - Type-based value parsing (string, number, boolean, JSON)

5. **Notifications**
   - Create in-app notifications with scheduling
   - Set target audience (all, users, admins)
   - Send push notifications via OneSignal
   - Track delivery status

6. **Monitoring**
   - View platform statistics (users, games, plays)
   - Check system health
   - Monitor database size and table info
   - View audit logs of all admin actions
   - Check server metrics (response times, memory usage)

### Data Consistency & Denormalization
**Denormalized Fields** (maintained by triggers/code):
- `games.likes` - Aggregated from game_likes table
- `games.average_rating` - Computed from game_ratings table
- `games.comments_count` - Incremented on new comments
- `games.views` - Incremented on game view
- `games.plays` - Incremented on game play
- `games.shares` - Incremented on game share
- `users.followers_count` - Incremented on follow
- `users.following_count` - Incremented on follow
- `users.total_games_played` - Incremented on play record
- `users.total_play_time` - Updated on play record
- `game_comments.likes` - Updated on comment like toggle

**Transaction Safety**:
- Like toggle uses transaction with rollback
- Rating calculation wrapped in transaction
- Follow operations include count updates in transaction
- Settings bulk updates wrapped in transaction

### Request/Response Security
- All requests use Bearer token authentication (JWT)
- Passwords hashed with bcryptjs (10 rounds)
- Input validation on all endpoints
- Rate limiting: 1000 requests/15min (auth: 50/15min)
- CORS configured with allowed origins
- Security headers via Helmet
- Content type validation for API endpoints
- Request sanitization
- Account lockout after 5 failed login attempts

### File Storage
- Game files: `/public/games/{gameId}/index.html`
- Thumbnails: `/public/thumbnails/{filename}`
- Max game ZIP size: 100MB
- Max thumbnail size: 5MB
- Supported image types: jpg, jpeg, png, gif, webp
- All uploads validated and sanitized

---

## 6. CACHING & PERFORMANCE

### Server-Side Caching
- Static game assets cached for 7 days
- HTML files cached for 1 hour
- JS/CSS cached for 7 days with immutable flag
- Images cached for 30 days
- Fonts cached for 30 days
- Audio cached for 30 days

### Response Metrics
- Tracks P95 response time
- Monitors average response time
- Collects response time samples (max 1000)
- Resets metrics hourly
- Exposes via `/api/metrics` endpoint

---

## 7. SECURITY FEATURES

### Authentication
- JWT tokens with 30-day expiration
- Password hashing with bcryptjs
- Account lockout mechanism (5 failed attempts = 5-60 min lockout)
- Password change tracking
- Token invalidation on password change
- Optional auth for public endpoints

### Authorization
- Role-based access control (admin-only endpoints)
- Resource ownership verification
- Audit logging for unauthorized access attempts

### Data Protection
- SQL injection prevention via parameterized queries
- Password field excluded from public profiles
- Sensitive settings masked in admin panel
- Environment variables management with masking
- XSS protection via Helmet CSP

### Rate Limiting
- Global: 1000 requests/15 minutes
- Auth endpoints: 50 requests/15 minutes
- Returns retry-after header

---

## 8. ADMIN PANEL CAPABILITIES

### Dashboard
- User statistics (total, active, admins)
- Game statistics (total, active, featured, plays, likes, views)
- Notification statistics
- Recent games and user registrations
- Server uptime and metrics

### User Management
- Search and filter users
- Change user roles
- Enable/disable accounts
- Delete accounts
- Pagination support

### Game Management
- Upload new games with ZIP files and thumbnails
- Edit game details (title, description, category, difficulty, tags)
- Toggle featured/active status
- View game file structure
- Delete games

### Settings Management
- Configure app settings
- Set up OneSignal credentials
- Manage feature flags
- Configure email settings
- Define max upload sizes

### Notifications
- Create scheduled notifications
- Target specific audiences (all/users/admins)
- Send push notifications to OneSignal
- Track delivery status
- Delete notifications

### System Administration
- View audit logs with filtering
- Monitor database tables and sizes
- Test OneSignal connection
- View/edit environment variables
- Monitor server performance metrics

