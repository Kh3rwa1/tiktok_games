import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ============================================
// API Configuration
// ============================================
// Set your API URL via environment variable or edit here
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://yourdomain.com/api';
// ============================================

// Validate API URL configuration
if (API_URL.includes('yourdomain.com')) {
  console.warn(
    '⚠️ API URL not configured!\n' +
    'Please set EXPO_PUBLIC_API_URL in your .env file or update mobile/src/services/api.js\n' +
    'Example: EXPO_PUBLIC_API_URL=https://api.yoursite.com/api'
  );
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased timeout for slower connections
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check network connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('No internet connection. Please check your network.');
    }

    // Add auth token
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network errors
    if (!error.response) {
      if (error.message === 'Network Error') {
        error.message = 'Network error. Please check your internet connection.';
      } else if (error.code === 'ECONNABORTED') {
        error.message = 'Request timed out. Please try again.';
      }
      return Promise.reject(error);
    }

    // Handle specific HTTP errors
    const { status, data } = error.response;

    switch (status) {
      case 401:
        await AsyncStorage.removeItem('userToken');
        error.message = data?.message || 'Session expired. Please login again.';
        break;
      case 403:
        error.message = data?.message || 'Access denied.';
        break;
      case 404:
        error.message = data?.message || 'Resource not found.';
        break;
      case 422:
        error.message = data?.message || 'Validation error. Please check your input.';
        break;
      case 429:
        error.message = 'Too many requests. Please wait a moment.';
        break;
      case 500:
        error.message = 'Server error. Please try again later.';
        break;
      case 503:
        error.message = 'Service unavailable. Server may be under maintenance.';
        break;
      default:
        error.message = data?.message || `Request failed (${status})`;
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),

  getProfile: () =>
    api.get('/auth/me'),

  updateProfile: (data) =>
    api.put('/auth/profile', data),

  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/password', { currentPassword, newPassword }),
};

// Games API
export const gamesAPI = {
  getGames: (params = {}) =>
    api.get('/games', { params }),

  getGame: (id) =>
    api.get(`/games/${id}`),

  createGame: (gameData) =>
    api.post('/games', gameData),

  updateGame: (id, gameData) =>
    api.put(`/games/${id}`, gameData),

  deleteGame: (id) =>
    api.delete(`/games/${id}`),

  likeGame: (id) =>
    api.post(`/games/${id}/like`),

  rateGame: (id, rating) =>
    api.post(`/games/${id}/rate`, { rating }),

  recordPlay: (id, duration) =>
    api.post(`/games/${id}/play`, { duration }),

  getTrending: (limit = 10) =>
    api.get('/games/trending', { params: { limit } }),

  getRecommended: (limit = 10) =>
    api.get('/games/recommended', { params: { limit } }),
};

export default api;
