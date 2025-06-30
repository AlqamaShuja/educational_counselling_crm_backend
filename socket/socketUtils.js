const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const {
  ConversationParticipant,
  Message,
  Conversation,
  User,
  Notification,
} = require('../models');

class SocketUtils {
  // Generate unique IDs for various purposes
  generateUploadId() {
    return `upload_${uuidv4()}`;
  }

  generateCallId() {
    return `call_${uuidv4()}`;
  }

  generateAnnouncementId() {
    return `announcement_${uuidv4()}`;
  }

  generateSessionId() {
    return `session_${uuidv4()}`;
  }

  // Get unread counts for a user
  async getUnreadCounts(userId) {
    try {
      // Get total unread messages across all conversations
      const totalUnread = await Message.count({
        include: [
          {
            model: Conversation,
            as: 'conversation',
            include: [
              {
                model: ConversationParticipant,
                as: 'participants',
                where: { userId, isActive: true },
                required: true,
              },
            ],
          },
        ],
        where: {
          senderId: { [Op.ne]: userId },
          readAt: null,
        },
      });

      // Get unread count per conversation
      const conversationCounts = await ConversationParticipant.findAll({
        where: { userId, isActive: true },
        attributes: ['conversationId', 'unreadCount'],
      });

      const conversationUnreadMap = {};
      conversationCounts.forEach((participant) => {
        conversationUnreadMap[participant.conversationId] =
          participant.unreadCount;
      });

      // Get unread notifications
      const unreadNotifications = await Notification.count({
        where: {
          userId,
          readAt: null,
        },
      });

      return {
        totalUnread,
        conversationCounts: conversationUnreadMap,
        unreadNotifications,
      };
    } catch (error) {
      console.error('Error getting unread counts:', error);
      return {
        totalUnread: 0,
        conversationCounts: {},
        unreadNotifications: 0,
      };
    }
  }

  // Validate conversation access
  async validateConversationAccess(userId, conversationId) {
    try {
      const participant = await ConversationParticipant.findOne({
        where: {
          conversationId,
          userId,
          isActive: true,
        },
      });

      return !!participant;
    } catch (error) {
      console.error('Error validating conversation access:', error);
      return false;
    }
  }

  // Get conversation metadata
  async getConversationMetadata(conversationId) {
    try {
      const conversation = await Conversation.findByPk(conversationId, {
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'role'],
              },
            ],
          },
        ],
      });

      if (!conversation) {
        return null;
      }

      return {
        id: conversation.id,
        name: conversation.name,
        type: conversation.type,
        purpose: conversation.purpose,
        participantCount: conversation.participants.length,
        participants: conversation.participants.map((p) => ({
          userId: p.userId,
          name: p.User.name,
          role: p.User.role,
          joinedAt: p.joinedAt,
        })),
      };
    } catch (error) {
      console.error('Error getting conversation metadata:', error);
      return null;
    }
  }

  // Format message for real-time transmission
  formatMessageForSocket(message) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      mimeType: message.mimeType,
      replyToId: message.replyToId,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: message.sender
        ? {
            id: message.sender.id,
            name: message.sender.name,
            role: message.sender.role,
          }
        : null,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            content: message.replyTo.content,
            sender: message.replyTo.sender
              ? {
                  id: message.replyTo.sender.id,
                  name: message.replyTo.sender.name,
                }
              : null,
          }
        : null,
    };
  }

  // Format conversation for real-time transmission
  formatConversationForSocket(conversation) {
    return {
      id: conversation.id,
      name: conversation.name,
      type: conversation.type,
      purpose: conversation.purpose,
      lastMessageAt: conversation.lastMessageAt,
      isActive: conversation.isActive,
      isArchived: conversation.isArchived,
      participantCount: conversation.participants
        ? conversation.participants.length
        : 0,
      lastMessage: conversation.lastMessage
        ? this.formatMessageForSocket(conversation.lastMessage)
        : null,
    };
  }

  // Get user's online status
  async getUserOnlineStatus(userIds) {
    // This would integrate with socketService to get real-time status
    const statusMap = {};

    for (const userId of userIds) {
      // This is a placeholder - would get actual status from socketService
      statusMap[userId] = {
        isOnline: false,
        lastSeen: null,
        presence: 'offline', // 'online', 'away', 'busy', 'offline'
      };
    }

    return statusMap;
  }

  // Validate file upload constraints
  validateFileUpload(fileData) {
    const { fileName, fileSize, mimeType } = fileData;
    const maxFileSize = 50 * 1024 * 1024; // 50MB

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ];

    const errors = [];

    if (!fileName || fileName.trim().length === 0) {
      errors.push('File name is required');
    }

    if (fileSize > maxFileSize) {
      errors.push(
        `File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`
      );
    }

    if (!allowedTypes.includes(mimeType)) {
      errors.push('File type not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Generate room names for different purposes
  generateRoomName(type, id) {
    const roomTypes = {
      conversation: `conversation_${id}`,
      user: `user_${id}`,
      office: `office_${id}`,
      monitor: `monitor_${id}`,
      call: `call_${id}`,
      announcement: 'announcement_global',
    };

    return roomTypes[type] || `${type}_${id}`;
  }

  // Parse and validate socket event data
  validateEventData(eventName, data) {
    const validationRules = {
      send_message: {
        required: ['conversationId', 'content'],
        optional: ['type', 'replyToId', 'metadata'],
      },
      join_conversation: {
        required: ['conversationId'],
        optional: [],
      },
      typing_start: {
        required: ['conversationId'],
        optional: [],
      },
      typing_stop: {
        required: ['conversationId'],
        optional: [],
      },
      update_presence: {
        required: ['presence'],
        optional: [],
      },
      file_upload_start: {
        required: ['conversationId', 'fileName'],
        optional: ['fileSize', 'mimeType'],
      },
    };

    const rule = validationRules[eventName];
    if (!rule) {
      return { isValid: true }; // No validation rule means it's valid
    }

    const errors = [];

    // Check required fields
    for (const field of rule.required) {
      if (
        !data.hasOwnProperty(field) ||
        data[field] === null ||
        data[field] === undefined
      ) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate specific field types
    if (data.conversationId && typeof data.conversationId !== 'string') {
      errors.push('conversationId must be a string');
    }

    if (data.content && typeof data.content !== 'string') {
      errors.push('content must be a string');
    }

    if (
      data.presence &&
      !['online', 'away', 'busy', 'offline'].includes(data.presence)
    ) {
      errors.push('presence must be one of: online, away, busy, offline');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Rate limiting utilities
  createRateLimiter(windowMs = 60000, maxRequests = 100) {
    const requests = new Map();

    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      if (requests.has(identifier)) {
        requests.set(
          identifier,
          requests
            .get(identifier)
            .filter((timestamp) => timestamp > windowStart)
        );
      } else {
        requests.set(identifier, []);
      }

      const userRequests = requests.get(identifier);

      // Check if limit exceeded
      if (userRequests.length >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + windowMs,
        };
      }

      // Add current request
      userRequests.push(now);

      return {
        allowed: true,
        remaining: maxRequests - userRequests.length,
        resetTime: windowStart + windowMs,
      };
    };
  }

  // Logging utilities
  logSocketEvent(socket, eventName, data, direction = 'in') {
    if (process.env.NODE_ENV === 'development') {
      const userId = socket.userId || 'unknown';
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] SOCKET ${direction.toUpperCase()}: ${userId} ${eventName}`
      );
    }
  }

  // Performance monitoring
  measureEventDuration(eventName, startTime) {
    const duration = Date.now() - startTime;

    if (duration > 1000) {
      // Log slow events (> 1 second)
      console.warn(`Slow socket event: ${eventName} took ${duration}ms`);
    }

    return duration;
  }

  // Error formatting for socket responses
  formatSocketError(error, eventName) {
    return {
      success: false,
      error: {
        message: error.message || 'An error occurred',
        event: eventName,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date(),
      },
    };
  }

  // Success formatting for socket responses
  formatSocketSuccess(data, message = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date(),
    };
  }

  // Clean sensitive data from objects before sending
  sanitizeForSocket(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const cleaned = { ...obj };

    for (const field of sensitiveFields) {
      if (cleaned.hasOwnProperty(field)) {
        delete cleaned[field];
      }
    }

    // Recursively clean nested objects
    for (const key in cleaned) {
      if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
        cleaned[key] = this.sanitizeForSocket(cleaned[key]);
      }
    }

    return cleaned;
  }

  // Convert database models to plain objects for socket transmission
  serializeForSocket(model) {
    if (!model) return null;

    if (Array.isArray(model)) {
      return model.map((item) => this.serializeForSocket(item));
    }

    if (typeof model.toJSON === 'function') {
      return this.sanitizeForSocket(model.toJSON());
    }

    return this.sanitizeForSocket(model);
  }

  // Debounce function for events
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for events
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

module.exports = new SocketUtils();
