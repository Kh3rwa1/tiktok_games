/**
 * WebSocket Service for Real-time Updates
 * Enables bidirectional communication between server and mobile app
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { config } = require('../config');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.cors.allowedOrigins.includes('*')
          ? '*'
          : config.cors.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token ||
                      socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          // Allow anonymous connections for public updates
          socket.userId = null;
          return next();
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId || decoded.id;
        next();
      } catch (error) {
        // Allow connection but mark as unauthenticated
        socket.userId = null;
        next();
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}, User: ${socket.userId || 'anonymous'}`);

      // Track authenticated users
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        socket.join(`user:${socket.userId}`);
      }

      // Join public room for broadcasts
      socket.join('public');

      // Handle room subscriptions
      socket.on('subscribe:game', (gameId) => {
        socket.join(`game:${gameId}`);
        console.log(`[WebSocket] ${socket.id} subscribed to game:${gameId}`);
      });

      socket.on('unsubscribe:game', (gameId) => {
        socket.leave(`game:${gameId}`);
      });

      socket.on('subscribe:feed', () => {
        socket.join('feed');
      });

      // Handle sync requests
      socket.on('sync:request', async (data) => {
        const { lastSync, types } = data;
        // Emit sync data back to the client
        socket.emit('sync:response', {
          timestamp: new Date().toISOString(),
          types: types || ['games', 'notifications']
        });
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}, Reason: ${reason}`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });

      // Error handler
      socket.on('error', (error) => {
        console.error(`[WebSocket] Socket error for ${socket.id}:`, error);
      });
    });

    console.log('[WebSocket] Service initialized');
    return this.io;
  }

  /**
   * Emit event to all connected clients
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.to('public').emit(event, data);
    }
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Emit event to users subscribed to a game
   */
  emitToGame(gameId, event, data) {
    if (this.io) {
      this.io.to(`game:${gameId}`).emit(event, data);
    }
  }

  /**
   * Emit event to feed subscribers
   */
  emitToFeed(event, data) {
    if (this.io) {
      this.io.to('feed').emit(event, data);
    }
  }

  /**
   * Notify about game updates (likes, comments, plays)
   */
  notifyGameUpdate(gameId, updateType, data) {
    this.emitToGame(gameId, 'game:updated', {
      gameId,
      type: updateType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about new game added
   */
  notifyNewGame(game) {
    this.broadcast('game:new', {
      game,
      timestamp: new Date().toISOString()
    });
    this.emitToFeed('feed:update', {
      type: 'new_game',
      game,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify user about notification
   */
  notifyUser(userId, notification) {
    this.emitToUser(userId, 'notification:new', {
      notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about comment on a game
   */
  notifyNewComment(gameId, comment) {
    this.emitToGame(gameId, 'comment:new', {
      gameId,
      comment,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify user about new follower
   */
  notifyNewFollower(userId, follower) {
    this.emitToUser(userId, 'follower:new', {
      follower,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast system notification
   */
  broadcastSystemNotification(notification) {
    this.broadcast('system:notification', {
      notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get number of connected clients
   */
  getConnectionCount() {
    return this.io ? this.io.engine.clientsCount : 0;
  }

  /**
   * Get list of connected user IDs
   */
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
module.exports = websocketService;
