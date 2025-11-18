/**
 * Sync Manager for TikTok Games Mobile App
 * Handles data synchronization, offline queue, retry logic, and real-time updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { io, Socket } from 'socket.io-client';
import { api, getApiUrl } from './api';
import { Game, Notification } from '../types';

// Storage keys
const STORAGE_KEYS = {
  LAST_SYNC: '@sync_last_timestamp',
  OFFLINE_QUEUE: '@sync_offline_queue',
  CACHED_GAMES: '@cache_games',
  CACHED_NOTIFICATIONS: '@cache_notifications',
  CACHED_SETTINGS: '@cache_settings',
};

// Action types for offline queue
interface OfflineAction {
  id: string;
  type: 'like' | 'play' | 'rate' | 'comment' | 'notification_read';
  gameId?: string;
  notificationId?: number;
  rating?: number;
  duration?: number;
  content?: string;
  parentId?: number;
  timestamp: string;
  retries: number;
}

// Sync data structure
interface SyncData {
  games?: {
    updated: Game[];
    deleted: string[];
  };
  notifications?: {
    updated: Notification[];
    unreadCount: number;
  };
  settings?: Record<string, any>;
  userProfile?: any;
}

// Event listeners
type SyncEventType =
  | 'connectionChange'
  | 'syncStart'
  | 'syncComplete'
  | 'syncError'
  | 'gameUpdate'
  | 'newGame'
  | 'newNotification'
  | 'newComment'
  | 'newFollower';

type SyncEventCallback = (data: any) => void;

class SyncManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<SyncEventType, Set<SyncEventCallback>> = new Map();
  private retryTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor() {
    this.initNetworkListener();
  }

  /**
   * Initialize network status listener
   */
  private initNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      this.emit('connectionChange', { isOnline: this.isOnline });

      // If we just came online, process offline queue and sync
      if (!wasOnline && this.isOnline) {
        this.processOfflineQueue();
        this.sync();
      }
    });
  }

  /**
   * Initialize WebSocket connection
   */
  async initWebSocket(token?: string): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
    }

    const authToken = token || await api.getStoredToken();

    this.socket = io(getApiUrl(), {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[SyncManager] WebSocket connected');
      this.isConnected = true;
      this.emit('connectionChange', { isConnected: true, isOnline: this.isOnline });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SyncManager] WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connectionChange', { isConnected: false, isOnline: this.isOnline });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SyncManager] WebSocket connection error:', error);
    });

    // Listen for real-time updates
    this.socket.on('game:updated', (data) => {
      this.emit('gameUpdate', data);
    });

    this.socket.on('game:new', (data) => {
      this.emit('newGame', data);
    });

    this.socket.on('notification:new', (data) => {
      this.emit('newNotification', data);
    });

    this.socket.on('comment:new', (data) => {
      this.emit('newComment', data);
    });

    this.socket.on('follower:new', (data) => {
      this.emit('newFollower', data);
    });

    this.socket.on('feed:update', (data) => {
      this.emit('newGame', data);
    });

    this.socket.on('system:notification', (data) => {
      this.emit('newNotification', data);
    });

    this.socket.on('pong', (data) => {
      console.log('[SyncManager] Pong received, latency:', Date.now() - data.timestamp, 'ms');
    });
  }

  /**
   * Subscribe to game updates
   */
  subscribeToGame(gameId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:game', gameId);
    }
  }

  /**
   * Unsubscribe from game updates
   */
  unsubscribeFromGame(gameId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe:game', gameId);
    }
  }

  /**
   * Subscribe to feed updates
   */
  subscribeToFeed() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:feed');
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  /**
   * Add event listener
   */
  on(event: SyncEventType, callback: SyncEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: SyncEventType, callback: SyncEventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: SyncEventType, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[SyncManager] Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(intervalMs: number = 60000) {
    this.stopAutoSync();
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform sync with server
   */
  async sync(types?: string[]): Promise<SyncData | null> {
    if (!this.isOnline || this.isSyncing) {
      return null;
    }

    this.isSyncing = true;
    this.emit('syncStart', { types });

    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);

      const response = await this.requestWithRetry<{ success: boolean; data: SyncData }>(
        '/api/sync/delta',
        {
          method: 'POST',
          body: JSON.stringify({
            lastSync: lastSync || new Date(0).toISOString(),
            types: types || ['games', 'notifications', 'settings', 'profile']
          })
        }
      );

      if (response.success && response.data) {
        // Cache the synced data
        if (response.data.games?.updated) {
          await this.cacheGames(response.data.games.updated);
        }
        if (response.data.notifications?.updated) {
          await this.cacheNotifications(response.data.notifications.updated);
        }
        if (response.data.settings) {
          await this.cacheSettings(response.data.settings);
        }

        // Update last sync timestamp
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

        this.emit('syncComplete', response.data);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('[SyncManager] Sync error:', error);
      this.emit('syncError', error);
      return null;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Make HTTP request with retry logic and exponential backoff
   */
  async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = await api.getStoredToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...((options.headers as Record<string, string>) || {}),
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${getApiUrl()}${endpoint}`, {
          ...options,
          headers,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
        }

        return data;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[SyncManager] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Add action to offline queue
   */
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    const queue = await this.getOfflineQueue();
    queue.push(offlineAction);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));

    console.log('[SyncManager] Action queued:', offlineAction.type);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processOfflineQueue();
    }
  }

  /**
   * Get offline queue
   */
  private async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const queue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }

  /**
   * Process offline queue
   */
  async processOfflineQueue() {
    if (!this.isOnline) return;

    const queue = await this.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`[SyncManager] Processing ${queue.length} queued actions`);

    try {
      const response = await this.requestWithRetry<{
        success: boolean;
        data: {
          processed: number;
          failed: number;
          results: Array<{ id: string; success: boolean; error?: string }>;
        };
      }>('/api/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ actions: queue }),
      });

      if (response.success) {
        // Remove successful actions from queue
        const failedIds = response.data.results
          .filter(r => !r.success)
          .map(r => r.id);

        const remainingQueue = queue.filter(action => {
          if (failedIds.includes(action.id)) {
            // Increment retry count for failed actions
            action.retries++;
            // Remove if too many retries
            return action.retries < 5;
          }
          return false;
        });

        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(remainingQueue));

        console.log(`[SyncManager] Processed: ${response.data.processed}, Failed: ${response.data.failed}`);
      }
    } catch (error) {
      console.error('[SyncManager] Failed to process offline queue:', error);
    }
  }

  /**
   * Cache games data
   */
  private async cacheGames(games: Game[]) {
    try {
      const existing = await this.getCachedGames();
      const gameMap = new Map(existing.map(g => [g.id, g]));

      games.forEach(game => {
        gameMap.set(game.id, game);
      });

      const allGames = Array.from(gameMap.values());
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_GAMES, JSON.stringify(allGames));
    } catch (error) {
      console.error('[SyncManager] Failed to cache games:', error);
    }
  }

  /**
   * Get cached games
   */
  async getCachedGames(): Promise<Game[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_GAMES);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  /**
   * Cache notifications
   */
  private async cacheNotifications(notifications: Notification[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_NOTIFICATIONS, JSON.stringify(notifications));
    } catch (error) {
      console.error('[SyncManager] Failed to cache notifications:', error);
    }
  }

  /**
   * Get cached notifications
   */
  async getCachedNotifications(): Promise<Notification[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_NOTIFICATIONS);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  /**
   * Cache settings
   */
  private async cacheSettings(settings: Record<string, any>) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('[SyncManager] Failed to cache settings:', error);
    }
  }

  /**
   * Get cached settings
   */
  async getCachedSettings(): Promise<Record<string, any>> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_SETTINGS);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.CACHED_GAMES),
      AsyncStorage.removeItem(STORAGE_KEYS.CACHED_NOTIFICATIONS),
      AsyncStorage.removeItem(STORAGE_KEYS.CACHED_SETTINGS),
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC),
    ]);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isConnected: this.isConnected,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Check if online
   */
  async checkOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  /**
   * Utility: Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
export default syncManager;
