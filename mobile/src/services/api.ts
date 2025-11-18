/**
 * Unified API Client for TikTok Games
 * Single URL connection for all app/admin/server communication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, User, Comment, FetchGamesParams, ApiResponse, PaginatedResponse } from '../types';

// Single URL configuration - change this to your server URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      this.token = await AsyncStorage.getItem('userToken');
      return this.token;
    } catch {
      return null;
    }
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getStoredToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  }

  // ==================== AUTH ====================

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.request<ApiResponse<{ user: User; token: string }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data) {
      this.token = response.data.token;
      await AsyncStorage.setItem('userToken', response.data.token);
    }

    return response.data!;
  }

  async register(username: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.request<ApiResponse<{ user: User; token: string }>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    if (response.data) {
      this.token = response.data.token;
      await AsyncStorage.setItem('userToken', response.data.token);
    }

    return response.data!;
  }

  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('userToken');
  }

  async getMe(): Promise<User> {
    const response = await this.request<ApiResponse<User>>('/api/auth/me');
    return response.data!;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await this.request<ApiResponse<User>>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data!;
  }

  // ==================== GAMES ====================

  async getGames(params: FetchGamesParams = {}): Promise<{ games: Game[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.order) queryParams.append('order', params.order);
    if (params.featured !== undefined) queryParams.append('featured', params.featured.toString());

    const response = await this.request<ApiResponse<Game[]> & { pagination?: any }>(
      `/api/games?${queryParams.toString()}`
    );

    return {
      games: response.data || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
    };
  }

  async getGameById(id: string): Promise<Game> {
    const response = await this.request<ApiResponse<Game>>(`/api/games/${id}`);
    return response.data!;
  }

  async toggleLike(gameId: string): Promise<{ liked: boolean; likes: number }> {
    const response = await this.request<ApiResponse<{ liked: boolean; likes: number }>>(`/api/games/${gameId}/like`, {
      method: 'POST',
    });
    return response.data!;
  }

  async rateGame(gameId: string, rating: number): Promise<{ averageRating: number }> {
    const response = await this.request<ApiResponse<{ averageRating: number }>>(`/api/games/${gameId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
    return response.data!;
  }

  async recordPlay(gameId: string, duration: number): Promise<void> {
    await this.request(`/api/games/${gameId}/play`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  async getTrending(limit: number = 10): Promise<Game[]> {
    const response = await this.request<ApiResponse<Game[]>>(`/api/games/trending?limit=${limit}`);
    return response.data || [];
  }

  async getRecommended(limit: number = 10): Promise<Game[]> {
    const response = await this.request<ApiResponse<Game[]>>(`/api/games/recommended?limit=${limit}`);
    return response.data || [];
  }

  // ==================== SOCIAL / FEED ====================

  async getFeed(page: number = 1, limit: number = 10): Promise<{ games: Game[]; pagination: any }> {
    const response = await this.request<ApiResponse<Game[]> & { pagination: any }>(
      `/api/social/feed?page=${page}&limit=${limit}`
    );
    return {
      games: response.data || [],
      pagination: response.pagination
    };
  }

  async getFollowingFeed(page: number = 1, limit: number = 10): Promise<{ games: Game[]; pagination: any }> {
    const response = await this.request<ApiResponse<Game[]> & { pagination: any }>(
      `/api/social/feed/following?page=${page}&limit=${limit}`
    );
    return {
      games: response.data || [],
      pagination: response.pagination
    };
  }

  // ==================== COMMENTS ====================

  async getComments(gameId: string, page: number = 1, limit: number = 20): Promise<{ comments: Comment[]; pagination: any }> {
    const response = await this.request<ApiResponse<Comment[]> & { pagination: any }>(
      `/api/social/games/${gameId}/comments?page=${page}&limit=${limit}`
    );
    return {
      comments: response.data || [],
      pagination: response.pagination
    };
  }

  async getReplies(commentId: number, page: number = 1, limit: number = 10): Promise<{ replies: Comment[]; pagination: any }> {
    const response = await this.request<ApiResponse<Comment[]> & { pagination: any }>(
      `/api/social/comments/${commentId}/replies?page=${page}&limit=${limit}`
    );
    return {
      replies: response.data || [],
      pagination: response.pagination
    };
  }

  async createComment(gameId: string, content: string, parentId?: number): Promise<{ id: number }> {
    const response = await this.request<ApiResponse<{ id: number }>>(`/api/social/games/${gameId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    });
    return response.data!;
  }

  async likeComment(commentId: number): Promise<{ liked: boolean }> {
    const response = await this.request<ApiResponse<{ liked: boolean }>>(`/api/social/comments/${commentId}/like`, {
      method: 'POST',
    });
    return response.data!;
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.request(`/api/social/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // ==================== FOLLOWS ====================

  async followUser(userId: number): Promise<{ followed: boolean }> {
    const response = await this.request<ApiResponse<{ followed: boolean }>>(`/api/social/users/${userId}/follow`, {
      method: 'POST',
    });
    return response.data!;
  }

  async unfollowUser(userId: number): Promise<{ unfollowed: boolean }> {
    const response = await this.request<ApiResponse<{ unfollowed: boolean }>>(`/api/social/users/${userId}/follow`, {
      method: 'DELETE',
    });
    return response.data!;
  }

  async getFollowers(userId: number, page: number = 1, limit: number = 20): Promise<{ followers: User[]; pagination: any }> {
    const response = await this.request<ApiResponse<User[]> & { pagination: any }>(
      `/api/social/users/${userId}/followers?page=${page}&limit=${limit}`
    );
    return {
      followers: response.data || [],
      pagination: response.pagination
    };
  }

  async getFollowing(userId: number, page: number = 1, limit: number = 20): Promise<{ following: User[]; pagination: any }> {
    const response = await this.request<ApiResponse<User[]> & { pagination: any }>(
      `/api/social/users/${userId}/following?page=${page}&limit=${limit}`
    );
    return {
      following: response.data || [],
      pagination: response.pagination
    };
  }

  async getSuggestions(limit: number = 10): Promise<User[]> {
    const response = await this.request<ApiResponse<User[]>>(`/api/social/suggestions?limit=${limit}`);
    return response.data || [];
  }

  // ==================== USER PROFILES ====================

  async getUserProfile(userId: number): Promise<User & { games: Game[] }> {
    const response = await this.request<ApiResponse<User & { games: Game[] }>>(`/api/social/users/${userId}/profile`);
    return response.data!;
  }

  async getUserGames(userId: number, page: number = 1, limit: number = 10): Promise<{ games: Game[]; pagination: any }> {
    const response = await this.request<ApiResponse<Game[]> & { pagination: any }>(
      `/api/social/users/${userId}/games?page=${page}&limit=${limit}`
    );
    return {
      games: response.data || [],
      pagination: response.pagination
    };
  }

  // ==================== SHARES ====================

  async shareGame(gameId: string, platform: string = 'link'): Promise<void> {
    await this.request(`/api/social/games/${gameId}/share`, {
      method: 'POST',
      body: JSON.stringify({ platform }),
    });
  }

  // ==================== FAVORITES ====================

  async getFavorites(): Promise<Game[]> {
    const response = await this.request<ApiResponse<Game[]>>('/api/games?favorites=true');
    return response.data || [];
  }

  async toggleFavorite(gameId: string): Promise<{ favorited: boolean }> {
    // This uses the existing like endpoint as favorites
    return this.toggleLike(gameId);
  }

  // ==================== APP SETTINGS ====================

  async getAppSettings(): Promise<any> {
    const response = await this.request<ApiResponse<any>>('/api/games/app/settings');
    return response.data;
  }

  async getNotifications(): Promise<any[]> {
    const response = await this.request<ApiResponse<any[]>>('/api/games/app/notifications');
    return response.data || [];
  }

  async markNotificationRead(notificationId: number): Promise<void> {
    await this.request(`/api/games/app/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<any> {
    return this.request('/health');
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export the base URL for reference
export const getApiUrl = () => API_BASE_URL;

export default api;
