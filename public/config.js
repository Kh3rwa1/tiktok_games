/**
 * Admin Panel Configuration
 *
 * When deploying to bolt.new or any static hosting:
 * 1. Deploy your backend server separately (Railway, Render, Vercel, etc.)
 * 2. Update API_BASE_URL below with your backend server URL
 * 3. Make sure your backend CORS settings allow requests from your bolt.new domain
 */

const CONFIG = {
  // API Configuration
  // For local development: '' (empty string uses relative URLs)
  // For production: 'https://your-backend-server.com' (no trailing slash)
  API_BASE_URL: '',

  // Example configurations:
  // API_BASE_URL: 'https://tiktok-games-api.railway.app',
  // API_BASE_URL: 'https://tiktok-games-api.onrender.com',
  // API_BASE_URL: 'https://api.yourdomain.com',

  // Enable debug logging
  DEBUG: false,
};

// Make config available globally
window.APP_CONFIG = CONFIG;
