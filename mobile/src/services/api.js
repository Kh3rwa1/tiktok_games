import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your backend URL
const API_URL = __DEV__
  ? 'http://localhost:5000/api'  // Development
  : 'https://your-production-api.com/api'; // Production

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      await AsyncStorage.removeItem('userToken');
      // You might want to trigger a navigation to login screen here
    }
    return Promise.reject(error);
  }
);

// Auth API calls
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

// Games API calls
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

  uploadGameAsset: (formData) =>
    api.post('/games/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export default api;
