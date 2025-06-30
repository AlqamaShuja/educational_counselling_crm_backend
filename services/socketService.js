const { ConversationParticipant } = require('../models');

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId -> Set of socket IDs
    this.userSockets = new Map(); // socketId -> userId
    this.typingUsers = new Map(); // conversationId -> Set of userIds
  }

  // Initialize Socket.IO instance
  initialize(io) {
    this.io = io;
    console.log('Socket service initialized');
  }

  // Register user connection
  async registerUser(socket, userId) {
    try {
      // Add socket to user's socket set
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId).add(socket.id);
      this.userSockets.set(socket.id, userId);

      // Join user to their personal room
      socket.join(`user_${userId}`);

      // Join user to all their conversation rooms
      await this.joinUserConversations(socket, userId);

      // Emit online status to relevant users
      await this.broadcastUserStatus(userId, true);

      console.log(`User ${userId} connected with socket ${socket.id}`);
    } catch (error) {
      console.error('Error registering user:', error);
    }
  }

  // Unregister user connection
  async unregisterUser(socket) {
    try {
      const userId = this.userSockets.get(socket.id);
      if (!userId) return;

      // Remove socket from user's socket set
      const userSockets = this.onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // If no more sockets for this user, mark as offline
        if (userSockets.size === 0) {
          this.onlineUsers.delete(userId);
          await this.broadcastUserStatus(userId, false);
        }
      }

      // Remove from socket-user mapping
      this.userSockets.delete(socket.id);

      // Remove from typing users
      this.removeUserFromAllTyping(userId);

      console.log(`User ${userId} disconnected from socket ${socket.id}`);
    } catch (error) {
      console.error('Error unregistering user:', error);
    }
  }

  // Join user to all their conversation rooms
  async joinUserConversations(socket, userId) {
    try {
      const participants = await ConversationParticipant.findAll({
        where: { userId, isActive: true },
        attributes: ['conversationId'],
      });

      for (const participant of participants) {
        socket.join(`conversation_${participant.conversationId}`);
      }
    } catch (error) {
      console.error('Error joining user conversations:', error);
    }
  }

  // Join user to a specific conversation room
  joinConversation(socket, conversationId) {
    socket.join(`conversation_${conversationId}`);
  }

  // Leave conversation room
  leaveConversation(socket, conversationId) {
    socket.leave(`conversation_${conversationId}`);
  }

  // Emit event to all participants in a conversation
  async emitToConversation(conversationId, event, data) {
    if (!this.io) return;

    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }

  // Emit event to all participants in a conversation except one user
  async emitToConversationExcept(conversationId, excludeUserId, event, data) {
    if (!this.io) return;

    const room = this.io.sockets.adapter.rooms.get(
      `conversation_${conversationId}`
    );
    if (!room) return;

    // Get sockets to exclude
    const excludeSockets = this.onlineUsers.get(excludeUserId) || new Set();

    // Emit to all sockets in conversation room except excluded ones
    for (const socketId of room) {
      if (!excludeSockets.has(socketId)) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  // Emit event to specific user(s)
  async emitToUser(userId, event, data) {
    if (!this.io) return;

    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Emit event to multiple users
  async emitToUsers(userIds, event, data) {
    if (!this.io) return;

    for (const userId of userIds) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  // Broadcast user online/offline status
  async broadcastUserStatus(userId, isOnline) {
    try {
      // Get user's conversation participants to notify
      const participants = await ConversationParticipant.findAll({
        where: { userId, isActive: true },
        include: [
          {
            model: ConversationParticipant,
            as: 'conversation',
            where: { isActive: true },
            attributes: ['userId'],
          },
        ],
      });

      // Get unique user IDs to notify
      const usersToNotify = new Set();
      for (const participant of participants) {
        if (participant.conversation && participant.conversation.participants) {
          for (const otherParticipant of participant.conversation
            .participants) {
            if (otherParticipant.userId !== userId) {
              usersToNotify.add(otherParticipant.userId);
            }
          }
        }
      }

      // Emit status update to relevant users
      const statusData = {
        userId,
        isOnline,
        timestamp: new Date(),
      };

      for (const userToNotify of usersToNotify) {
        await this.emitToUser(userToNotify, 'user_status_changed', statusData);
      }
    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  }

  // Handle typing indicators
  handleTypingStart(socket, conversationId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }

    this.typingUsers.get(conversationId).add(userId);

    // Emit to other participants
    this.emitToConversationExcept(conversationId, userId, 'user_typing_start', {
      conversationId,
      userId,
      timestamp: new Date(),
    });

    // Set timeout to auto-stop typing after 3 seconds
    setTimeout(() => {
      this.handleTypingStop(socket, conversationId);
    }, 3000);
  }

  handleTypingStop(socket, conversationId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    if (this.typingUsers.has(conversationId)) {
      this.typingUsers.get(conversationId).delete(userId);

      if (this.typingUsers.get(conversationId).size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }

    // Emit to other participants
    this.emitToConversationExcept(conversationId, userId, 'user_typing_stop', {
      conversationId,
      userId,
      timestamp: new Date(),
    });
  }

  // Remove user from all typing indicators
  removeUserFromAllTyping(userId) {
    for (const [conversationId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(userId)) {
        typingSet.delete(userId);

        // Emit typing stop
        this.emitToConversationExcept(
          conversationId,
          userId,
          'user_typing_stop',
          {
            conversationId,
            userId,
            timestamp: new Date(),
          }
        );

        // Clean up empty sets
        if (typingSet.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }
    }
  }

  // Get online users in a conversation
  async getOnlineUsersInConversation(conversationId) {
    try {
      const participants = await ConversationParticipant.findAll({
        where: { conversationId, isActive: true },
        attributes: ['userId'],
      });

      const onlineParticipants = participants
        .map((p) => p.userId)
        .filter((userId) => this.onlineUsers.has(userId));

      return onlineParticipants;
    } catch (error) {
      console.error('Error getting online users in conversation:', error);
      return [];
    }
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  // Get user's socket count
  getUserSocketCount(userId) {
    const userSockets = this.onlineUsers.get(userId);
    return userSockets ? userSockets.size : 0;
  }

  // Get typing users in conversation
  getTypingUsersInConversation(conversationId) {
    const typingSet = this.typingUsers.get(conversationId);
    return typingSet ? Array.from(typingSet) : [];
  }

  // Emit notification to user
  async emitNotification(userId, notification) {
    await this.emitToUser(userId, 'notification_received', notification);
  }

  // Handle message delivery confirmation
  async handleMessageDelivered(messageId, userId) {
    // Update message delivery status in database if needed
    await this.emitToUser(userId, 'message_delivered', {
      messageId,
      deliveredAt: new Date(),
    });
  }

  // Handle message read confirmation
  async handleMessageRead(messageId, conversationId, userId) {
    await this.emitToConversation(conversationId, 'message_read', {
      messageId,
      userId,
      readAt: new Date(),
    });
  }

  // Send real-time conversation update
  async sendConversationUpdate(conversationId, updateType, data) {
    await this.emitToConversation(conversationId, 'conversation_updated', {
      conversationId,
      updateType,
      data,
      timestamp: new Date(),
    });
  }

  // Handle user presence updates
  async updateUserPresence(userId, presence) {
    const presenceData = {
      userId,
      presence, // 'online', 'away', 'busy', 'offline'
      timestamp: new Date(),
    };

    // Emit to all users who have conversations with this user
    await this.broadcastUserPresence(userId, presenceData);
  }

  async broadcastUserPresence(userId, presenceData) {
    try {
      // Get all conversation participants to notify about presence change
      const participants = await ConversationParticipant.findAll({
        where: { userId, isActive: true },
        include: [
          {
            model: ConversationParticipant,
            as: 'conversation',
            where: { isActive: true },
            attributes: ['userId'],
          },
        ],
      });

      const usersToNotify = new Set();
      for (const participant of participants) {
        if (participant.conversation && participant.conversation.participants) {
          for (const otherParticipant of participant.conversation
            .participants) {
            if (otherParticipant.userId !== userId) {
              usersToNotify.add(otherParticipant.userId);
            }
          }
        }
      }

      for (const userToNotify of usersToNotify) {
        await this.emitToUser(
          userToNotify,
          'user_presence_changed',
          presenceData
        );
      }
    } catch (error) {
      console.error('Error broadcasting user presence:', error);
    }
  }

  // Get system statistics
  getStats() {
    return {
      totalConnections: this.userSockets.size,
      onlineUsers: this.onlineUsers.size,
      activeConversations: this.typingUsers.size,
      typingUsers: Array.from(this.typingUsers.values()).reduce(
        (total, set) => total + set.size,
        0
      ),
    };
  }

  // Clean up inactive connections
  cleanup() {
    // Remove empty user socket sets
    for (const [userId, socketSet] of this.onlineUsers.entries()) {
      if (socketSet.size === 0) {
        this.onlineUsers.delete(userId);
      }
    }

    // Remove empty typing sets
    for (const [conversationId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  // Handle room-based events for better organization
  async handleRoomJoin(socket, roomType, roomId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    const roomName = `${roomType}_${roomId}`;
    socket.join(roomName);

    // Emit to room that user joined
    socket.to(roomName).emit('user_joined_room', {
      roomType,
      roomId,
      userId,
      timestamp: new Date(),
    });
  }

  async handleRoomLeave(socket, roomType, roomId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    const roomName = `${roomType}_${roomId}`;
    socket.leave(roomName);

    // Emit to room that user left
    socket.to(roomName).emit('user_left_room', {
      roomType,
      roomId,
      userId,
      timestamp: new Date(),
    });
  }

  // Broadcast system-wide announcements
  async broadcastSystemAnnouncement(announcement) {
    if (!this.io) return;

    this.io.emit('system_announcement', {
      ...announcement,
      timestamp: new Date(),
    });
  }

  // Handle emergency disconnection of user
  async emergencyDisconnectUser(userId, reason = 'Admin action') {
    const userSockets = this.onlineUsers.get(userId);
    if (!userSockets) return;

    // Disconnect all user's sockets
    for (const socketId of userSockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('force_disconnect', { reason });
        socket.disconnect(true);
      }
    }

    // Clean up user data
    this.onlineUsers.delete(userId);
    for (const socketId of userSockets) {
      this.userSockets.delete(socketId);
    }

    // Remove from typing
    this.removeUserFromAllTyping(userId);
  }
}

module.exports = new SocketService();
