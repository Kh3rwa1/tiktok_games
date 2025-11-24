# 🚀 Deployment Guide for bolt.new

This guide explains how to deploy your TikTok Games admin panel on bolt.new and connect it to a backend server.

## 📋 Overview

The project structure is designed for bolt.new compatibility:
- **Frontend (Admin Panel)**: Static HTML/CSS/JS in `public/` → Deployed on bolt.new
- **Backend (API Server)**: Node.js/Express in `server/` → Deployed separately
- **Mobile App**: React Native in `mobile/` → Built separately with Expo

## 🌐 Step 1: Deploy Backend Server

The admin panel needs a backend server for authentication, database operations, and API calls. You can deploy it on any Node.js hosting platform:

### Option A: Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `tiktok_games` repository
4. Configure the deployment:
   - **Root Directory**: `server`
   - **Start Command**: `npm start`
5. Add environment variables (copy from `server/.env.example`)
6. Add your MySQL database (Railway provides one-click database)
7. Copy your deployment URL (e.g., `https://tiktok-games-api.railway.app`)

### Option B: Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables
6. Copy your deployment URL

### Option C: DigitalOcean App Platform

1. Go to [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
2. Create a new app from GitHub
3. Configure:
   - **Source Directory**: `server`
   - **Run Command**: `npm start`
4. Add managed MySQL database
5. Add environment variables
6. Copy your deployment URL

### Required Environment Variables for Backend

```env
# Server Configuration
NODE_ENV=production
PORT=3001
DOMAIN=https://your-backend-url.com

# Database Configuration
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=tiktok_games

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration - IMPORTANT!
ALLOWED_ORIGINS=https://your-bolt-new-url.bolt.new,https://stackblitz.com

# File Upload Configuration
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=.html,.js,.css,.png,.jpg,.jpeg,.gif,.mp3,.wav,.json
```

**Important**: After deploying to bolt.new (Step 2), come back and add your bolt.new URL to `ALLOWED_ORIGINS`!

## 🎨 Step 2: Deploy Frontend on bolt.new

1. Go to [bolt.new](https://bolt.new)
2. Click "Import from GitHub"
3. Enter your repository URL: `https://github.com/Kh3rwa1/tiktok_games`
4. Select branch: `claude/restructure-bolt-new-01XkiWrdfuBRueGWvfPnmreA` (or your main branch after merging)
5. bolt.new will automatically detect the project structure
6. The admin panel will be available at: `https://[your-project].bolt.new`

## 🔗 Step 3: Connect Frontend to Backend

Now you need to tell the admin panel where your backend API is located:

1. In your bolt.new editor, open `public/config.js`
2. Update the `API_BASE_URL` with your backend server URL:

```javascript
const CONFIG = {
  // Replace with your backend URL from Step 1 (no trailing slash)
  API_BASE_URL: 'https://tiktok-games-api.railway.app',

  // Enable debug logging if needed
  DEBUG: false,
};
```

3. Save the file

## 🔒 Step 4: Update Backend CORS Settings

Go back to your backend server deployment and update the CORS settings:

1. Edit your environment variables
2. Update `ALLOWED_ORIGINS` to include your bolt.new URL:

```env
ALLOWED_ORIGINS=https://your-project.bolt.new,https://stackblitz.com
```

3. Restart your backend server

## ✅ Step 5: Test the Connection

1. Open your bolt.new URL: `https://[your-project].bolt.new`
2. You should see the admin panel login screen
3. Try logging in with your admin credentials
4. If it works, you're all set! 🎉

## 🐛 Troubleshooting

### "Network error. Please check your connection."

**Problem**: Admin panel can't reach the backend server

**Solutions**:
1. Check that `public/config.js` has the correct `API_BASE_URL`
2. Verify your backend server is running (visit `https://your-backend-url.com/health`)
3. Check browser console for CORS errors
4. Ensure `ALLOWED_ORIGINS` in backend includes your bolt.new URL

### CORS Errors in Browser Console

**Problem**: Backend is blocking requests from bolt.new

**Solutions**:
1. Add your bolt.new URL to `ALLOWED_ORIGINS` in backend environment variables
2. Make sure to include `https://` protocol
3. Restart backend server after changing environment variables
4. Check that backend logs show the correct allowed origins

### "Failed to fetch" or "TypeError: Failed to fetch"

**Problem**: Backend URL is incorrect or backend is down

**Solutions**:
1. Verify backend URL in `public/config.js` (no trailing slash)
2. Visit backend URL directly to check if it's running
3. Check backend logs for errors
4. Ensure backend server started successfully

### Images/Games Not Loading

**Problem**: File uploads are stored on backend server

**Solutions**:
1. If using temporary hosting, files may be lost on restart
2. Consider using cloud storage (S3, Cloudinary, etc.) for uploads
3. Update backend to serve files with correct CORS headers

## 🎯 Accessing the Admin Panel

Once deployed:

1. **Admin Panel URL**: `https://[your-project].bolt.new`
2. **Login Page**: Automatically shown at root URL (`/`)
3. **First Time Setup**: If no admin exists, you'll see a setup screen
4. **Default Credentials**: Set during first-time setup

## 📱 Mobile App Configuration

Don't forget to update your mobile app to point to the backend API:

1. Open `mobile/src/services/api.ts` (or similar)
2. Update the API base URL to your deployed backend
3. Rebuild and republish your mobile app

## 🔄 Continuous Deployment

Both bolt.new and most backend hosting platforms support automatic deployments:

1. **bolt.new**: Automatically updates when you push to GitHub
2. **Railway/Render/DigitalOcean**: Connect to GitHub for auto-deploy
3. Push changes to your repository
4. Both frontend and backend will auto-update

## 📚 Additional Resources

- [bolt.new Documentation](https://bolt.new/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Express.js CORS Guide](https://expressjs.com/en/resources/middleware/cors.html)

## 💡 Tips

1. **Free Tiers**: Railway, Render, and DigitalOcean offer free tiers perfect for testing
2. **Database**: Use managed MySQL services for reliability
3. **Environment Variables**: Never commit `.env` files to GitHub
4. **HTTPS**: All platforms provide free HTTPS certificates
5. **Monitoring**: Set up uptime monitoring for your backend (UptimeRobot, etc.)

---

Need help? Check the [GitHub Issues](https://github.com/Kh3rwa1/tiktok_games/issues) or create a new issue.
