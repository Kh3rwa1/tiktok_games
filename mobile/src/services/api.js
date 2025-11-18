import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CONFIGURE YOUR SERVER URL HERE
// ============================================
const API_URL = 'https://yourdomain.com/api';  // Change this to your cPanel domain
// ============================================

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('userToken');
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
