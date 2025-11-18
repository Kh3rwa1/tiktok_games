/**
 * Unified API Client for TikTok Games
 * Single URL connection for all app/admin/server communication
 * Includes retry logic, token refresh, and error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, User, Comment, FetchGamesParams, ApiResponse, PaginatedResponse } from '../types';

// Single URL configuration - change this to your server URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private isRefreshing: boolean = false;
  private refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }>[] = [];
  private lastSyncTimestamp: string | null = null;
  private onAuthError: (() => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set callback for auth errors (logout user)
   */
  setOnAuthError(callback: () => void) {
    this.onAuthError = callback;
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Set refresh token
   */
  setRefreshToken(refreshToken: string | null) {
    this.refreshTokenValue = refreshToken;
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      this.token = await AsyncStorage.getItem('userToken');
      this.refreshTokenValue = await AsyncStorage.getItem('refreshToken');
      return this.token;
    } catch {
      return null;
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed');
      }

      // Store new tokens
      this.token = data.data.token;
      this.refreshTokenValue = data.data.refreshToken;
      await AsyncStorage.setItem('userToken', data.data.token);
      await AsyncStorage.setItem('refreshToken', data.data.refreshToken);

      return data.data.token;
    } catch (error) {
      // Clear tokens on refresh failure
      await this.clearTokens();
      throw error;
    }
  }

  /**
   * Handle token refresh with queue to prevent multiple simultaneous refreshes
   */
  private async handleTokenRefresh(): Promise<string> {
    if (this.isRefreshing) {
      // Wait for the current refresh to complete
      return new Promise((resolve, reject) => {
        this.refreshQueue.push([{ resolve, reject }]);
      });
    }

    this.isRefreshing = true;

    try {
      const newToken = await this.refreshAccessToken();

      // Resolve all queued promises
      this.refreshQueue.forEach(queue => {
        queue.forEach(({ resolve }) => resolve(newToken));
      });
      this.refreshQueue = [];

      return newToken;
    } catch (error) {
      // Reject all queued promises
      this.refreshQueue.forEach(queue => {
        queue.forEach(({ reject }) => reject(error as Error));
      });
      this.refreshQueue = [];

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with retry logic and automatic token refresh
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0,
    isRetryAfterRefresh: boolean = false
  ): Promise<T> {
    const token = await this.getStoredToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle token expiration - try to refresh
      if (response.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN')) {
        // Don't retry refresh if we already did
        if (isRetryAfterRefresh) {
          await this.clearTokens();
          if (this.onAuthError) {
            this.onAuthError();
          }
          throw new Error('Session expired. Please login again.');
        }

        // Try to refresh the token
        if (this.refreshTokenValue) {
          try {
            await this.handleTokenRefresh();
            // Retry the original request with new token
            return this.request<T>(endpoint, options, retryCount, true);
          } catch (refreshError) {
            // Refresh failed, clear tokens and notify
            await this.clearTokens();
            if (this.onAuthError) {
              this.onAuthError();
            }
            throw new Error('Session expired. Please login again.');
          }
        } else {
          await this.clearTokens();
          if (this.onAuthError) {
            this.onAuthError();
          }
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error = new Error(data.message || data.error || 'Request failed') as any;
        error.status = response.status;
        error.code = data.code;
        throw error;
      }

      return data;
    } catch (error: any) {
      // Don't retry auth errors (except token expiration which is handled above)
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // Retry on network errors or server errors (5xx)
      const shouldRetry =
        !error.status || // Network error
        (error.status >= 500 && error.status < 600); // Server error

      if (shouldRetry && retryCount < MAX_RETRIES) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Retrying request to ${endpoint} in ${delayMs}ms (attempt ${retryCount + 1})`);
        await this.delay(delayMs);
        return this.request<T>(endpoint, options, retryCount + 1, isRetryAfterRefresh);
      }

      throw error;
    }
  }

  /**
   * Clear stored tokens
   */
  private async clearTokens(): Promise<void> {
    this.token = null;
    this.refreshTokenValue = null;
    await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTimestamp(): string | null {
    return this.lastSyncTimestamp;
  }

  /**
   * Set last sync timestamp
   */
  setLastSyncTimestamp(timestamp: string): void {
    this.lastSyncTimestamp = timestamp;
  }

  // ==================== AUTH ====================

  async login(email: string, password: string): Promise<{ user: User; token: string; refreshToken?: string }> {
    const response = await this.request<ApiResponse<{ user: User; token: string; refreshToken: string }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data) {
      this.token = response.data.token;
      this.refreshTokenValue = response.data.refreshToken;
      await AsyncStorage.setItem('userToken', response.data.token);
      if (response.data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }

    return response.data!;
  }

  async register(username: string, email: string, password: string): Promise<{ user: User; token: string; refreshToken?: string }> {
    const response = await this.request<ApiResponse<{ user: User; token: string; refreshToken: string }>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    if (response.data) {
      this.token = response.data.token;
      this.refreshTokenValue = response.data.refreshToken;
      await AsyncStorage.setItem('userToken', response.data.token);
      if (response.data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }

    return response.data!;
  }

  async logout(): Promise<void> {
    this.token = null;
    this.refreshTokenValue = null;
    await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
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

  // ==================== SYNC ====================

  async syncChanges(since?: string): Promise<{
    games: Game[];
    userLikes: number[];
    userFavorites: number[];
    notifications: any[];
    syncTimestamp: string;
    hasMore: boolean;
  }> {
    const timestamp = since || this.lastSyncTimestamp || new Date(0).toISOString();
    const response = await this.request<any>(`/api/sync/changes?since=${encodeURIComponent(timestamp)}`);

    if (response.syncTimestamp) {
      this.lastSyncTimestamp = response.syncTimestamp;
    }

    return {
      games: response.data?.games || [],
      userLikes: response.data?.userLikes || [],
      userFavorites: response.data?.userFavorites || [],
      notifications: response.data?.notifications || [],
      syncTimestamp: response.syncTimestamp,
      hasMore: response.hasMore || false
    };
  }

  async syncFull(page: number = 1, limit: number = 50): Promise<{
    games: Game[];
    userLikes: number[];
    userFavorites: number[];
    userRatings: Array<{ game_id: number; rating: number }>;
    notifications: any[];
    pagination: any;
    syncTimestamp: string;
  }> {
    const response = await this.request<any>(`/api/sync/full?page=${page}&limit=${limit}`);

    if (response.syncTimestamp) {
      this.lastSyncTimestamp = response.syncTimestamp;
    }

    return {
      games: response.data?.games || [],
      userLikes: response.data?.userLikes || [],
      userFavorites: response.data?.userFavorites || [],
      userRatings: response.data?.userRatings || [],
      notifications: response.data?.notifications || [],
      pagination: response.pagination,
      syncTimestamp: response.syncTimestamp
    };
  }

  async syncGame(gameId: string): Promise<Game & { isLiked: boolean; isFavorited: boolean; userRating: number | null }> {
    const response = await this.request<any>(`/api/sync/game/${gameId}`);
    return response.data;
  }

  async syncBatchGames(gameIds: string[]): Promise<Array<Game & { isLiked: boolean; isFavorited: boolean }>> {
    const response = await this.request<any>(`/api/sync/games/batch`, {
      method: 'POST',
      body: JSON.stringify({ gameIds: gameIds.map(id => parseInt(id)) }),
    });
    return response.data || [];
  }

  async heartbeat(): Promise<{ status: string; timestamp: string }> {
    const response = await this.request<any>('/api/sync/heartbeat');
    return response;
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export the base URL for reference
export const getApiUrl = () => API_BASE_URL;

export default api;
