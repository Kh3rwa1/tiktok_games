import axios from 'axios';
import { auth } from '../config/firebase';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login';
      } else if (status === 403) {
        // Forbidden - not admin
        console.error('Access denied: Admin privileges required');
      }

      return Promise.reject({
        message: data.message || data.error || 'An error occurred',
        status,
        data
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        message: 'Network error - server not responding',
        status: 0
      });
    } else {
      // Error setting up request
      return Promise.reject({
        message: error.message || 'An error occurred',
        status: 0
      });
    }
  }
);

// API Service Methods
export const apiService = {
  // Authentication
  auth: {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
  },

  // Users Management
  users: {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    getStats: () => api.get('/users/stats'),
  },

  // Games Management
  games: {
    getAll: (params) => api.get('/games', { params }),
    getById: (id) => api.get(`/games/${id}`),
    create: (data) => api.post('/games', data),
    update: (id, data) => api.put(`/games/${id}`, data),
    delete: (id) => api.delete(`/games/${id}`),
    upload: (formData) => api.post('/games/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getTrending: () => api.get('/games/trending'),
    getStats: () => api.get('/games/stats'),
  },

  // Analytics
  analytics: {
    getOverview: () => api.get('/analytics/overview'),
    getUserGrowth: (period) => api.get('/analytics/users', { params: { period } }),
    getGamePerformance: (period) => api.get('/analytics/games', { params: { period } }),
    getEngagement: () => api.get('/analytics/engagement'),
  },
};

export default api;
