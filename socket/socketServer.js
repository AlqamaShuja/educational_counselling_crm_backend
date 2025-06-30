const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const socketService = require('../services/socketService');
const socketHandlers = require('./socketHandlers');
const socketMiddleware = require('./socketMiddleware');
const socketUtils = require('./socketUtils');

class SocketServer {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  // Initialize Socket.IO server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // process.env.FRONTEND_URL,
        methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT',],
        allowedHeaders: ['Authorization'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Initialize socket service
    socketService.initialize(this.io);

    // Set up middleware
    this.setupMiddleware();

    // Set up connection handling
    this.setupConnectionHandling();

    console.log('Socket.IO server initialized');
    return this.io;
  }

  // Set up socket middleware
  setupMiddleware() {
    // Authentication middleware
    this.io.use(socketMiddleware.authenticateSocket);

    // Rate limiting middleware
    this.io.use(socketMiddleware.rateLimitMiddleware);

    // Logging middleware
    this.io.use(socketMiddleware.loggingMiddleware);
  }

  // Set up connection handling
  setupConnectionHandling() {
    this.io.on('connection', async (socket) => {
      try {
        console.log(`Socket connected: ${socket.id}`);

        // Get user from authentication middleware
        const user = socket.user;
        if (!user) {
          socket.disconnect(true);
          return;
        }

        // Register user connection
        await socketService.registerUser(socket, user.id);

        // Set up event handlers for this socket
        this.setupSocketHandlers(socket, user);

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
          console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
          await socketService.unregisterUser(socket);
        });

        // Handle connection errors
        socket.on('error', (error) => {
          console.error(`Socket error for ${socket.id}:`, error);
        });

        // Send welcome message
        socket.emit('connection_established', {
          message: 'Connected successfully',
          userId: user.id,
          socketId: socket.id,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Error handling socket connection:', error);
        socket.disconnect(true);
      }
    });

    // Handle server-level events
    this.io.engine.on('connection_error', (err) => {
      console.error('Socket connection error:', err);
    });
  }

  // Set up event handlers for individual socket
  setupSocketHandlers(socket, user) {
    // Message events
    socket.on('send_message', (data) => {
      socketHandlers.handleSendMessage(socket, user, data);
    });

    socket.on('edit_message', (data) => {
      socketHandlers.handleEditMessage(socket, user, data);
    });

    socket.on('delete_message', (data) => {
      socketHandlers.handleDeleteMessage(socket, user, data);
    });

    socket.on('mark_message_read', (data) => {
      socketHandlers.handleMarkMessageRead(socket, user, data);
    });

    // Conversation events
    socket.on('join_conversation', (data) => {
      socketHandlers.handleJoinConversation(socket, user, data);
    });

    socket.on('leave_conversation', (data) => {
      socketHandlers.handleLeaveConversation(socket, user, data);
    });

    socket.on('create_conversation', (data) => {
      socketHandlers.handleCreateConversation(socket, user, data);
    });

    socket.on('typing_start', (data) => {
      socketHandlers.handleTypingStart(socket, user, data);
    });

    socket.on('typing_stop', (data) => {
      socketHandlers.handleTypingStop(socket, user, data);
    });

    // Presence events
    socket.on('update_presence', (data) => {
      socketHandlers.handleUpdatePresence(socket, user, data);
    });

    socket.on('get_online_users', (data) => {
      socketHandlers.handleGetOnlineUsers(socket, user, data);
    });

    // File sharing events
    socket.on('file_upload_start', (data) => {
      socketHandlers.handleFileUploadStart(socket, user, data);
    });

    socket.on('file_upload_progress', (data) => {
      socketHandlers.handleFileUploadProgress(socket, user, data);
    });

    socket.on('file_upload_complete', (data) => {
      socketHandlers.handleFileUploadComplete(socket, user, data);
    });

    // Notification events
    socket.on('mark_notification_read', (data) => {
      socketHandlers.handleMarkNotificationRead(socket, user, data);
    });

    socket.on('get_unread_count', (data) => {
      socketHandlers.handleGetUnreadCount(socket, user, data);
    });

    // Real-time collaboration events (future features)
    socket.on('start_voice_call', (data) => {
      socketHandlers.handleStartVoiceCall(socket, user, data);
    });

    socket.on('start_video_call', (data) => {
      socketHandlers.handleStartVideoCall(socket, user, data);
    });

    socket.on('screen_share_start', (data) => {
      socketHandlers.handleScreenShareStart(socket, user, data);
    });

    // Admin/monitoring events
    if (['super_admin', 'manager'].includes(user.role)) {
      socket.on('monitor_conversation', (data) => {
        socketHandlers.handleMonitorConversation(socket, user, data);
      });

      socket.on('broadcast_announcement', (data) => {
        socketHandlers.handleBroadcastAnnouncement(socket, user, data);
      });
    }

    // Error handling for unknown events
    socket.onAny((eventName, ...args) => {
      if (!this.isKnownEvent(eventName)) {
        console.warn(`Unknown socket event: ${eventName} from user ${user.id}`);
        socket.emit('error', {
          message: 'Unknown event type',
          event: eventName,
        });
      }
    });
  }

  // Check if event is known/allowed
  isKnownEvent(eventName) {
    const knownEvents = [
      'send_message',
      'edit_message',
      'delete_message',
      'mark_message_read',
      'join_conversation',
      'leave_conversation',
      'create_conversation',
      'typing_start',
      'typing_stop',
      'update_presence',
      'get_online_users',
      'file_upload_start',
      'file_upload_progress',
      'file_upload_complete',
      'mark_notification_read',
      'get_unread_count',
      'start_voice_call',
      'start_video_call',
      'screen_share_start',
      'monitor_conversation',
      'broadcast_announcement',
      'disconnect',
      'error',
    ];

    return knownEvents.includes(eventName);
  }

  // Broadcast to all connected sockets
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Broadcast to specific room
  broadcastToRoom(room, event, data) {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  // Get server statistics
  getStats() {
    return {
      connectedSockets: this.io ? this.io.sockets.sockets.size : 0,
      rooms: this.io ? this.io.sockets.adapter.rooms.size : 0,
      ...socketService.getStats(),
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('Shutting down Socket.IO server...');

    if (this.io) {
      // Notify all clients of shutdown
      this.broadcast('server_shutdown', {
        message: 'Server is shutting down for maintenance',
        timestamp: new Date(),
      });

      // Close all connections
      this.io.close();
    }

    console.log('Socket.IO server shutdown complete');
  }

  // Health check
  healthCheck() {
    return {
      status: 'healthy',
      connectedSockets: this.io ? this.io.sockets.sockets.size : 0,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  // Force disconnect user (admin function)
  async forceDisconnectUser(userId, reason = 'Admin action') {
    await socketService.emergencyDisconnectUser(userId, reason);
  }

  // Send system announcement
  async sendSystemAnnouncement(announcement) {
    await socketService.broadcastSystemAnnouncement(announcement);
  }

  // Get online users count
  getOnlineUsersCount() {
    return socketService.getStats().onlineUsers;
  }

  // Get user connection info
  getUserConnectionInfo(userId) {
    return {
      isOnline: socketService.isUserOnline(userId),
      socketCount: socketService.getUserSocketCount(userId),
    };
  }
}

module.exports = new SocketServer();
