const jwt = require('jsonwebtoken');
const { User } = require('../models');

class SocketMiddleware {
  // Authentication middleware for Socket.IO
  async authenticateSocket(socket, next) {
    try {
      // Get token from auth object or handshake
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.request.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        return next(new Error('Account is inactive'));
      }

      // Attach user to socket
      socket.user = user;
      socket.userId = user.id;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);

      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Invalid authentication token'));
      }

      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication token expired'));
      }

      return next(new Error('Authentication failed'));
    }
  }

  // Rate limiting middleware
  rateLimitMiddleware(socket, next) {
    const userId = socket.userId || socket.id;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 100; // max requests per window

    // Initialize rate limit data if not exists
    if (!socket.rateLimitData) {
      socket.rateLimitData = {
        requests: [],
        windowStart: now,
      };
    }

    // Clean old requests outside the window
    socket.rateLimitData.requests = socket.rateLimitData.requests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Check if limit exceeded
    if (socket.rateLimitData.requests.length >= maxRequests) {
      console.warn(`Rate limit exceeded for user ${userId}`);
      return next(new Error('Rate limit exceeded. Too many requests.'));
    }

    // Add current request timestamp
    socket.rateLimitData.requests.push(now);

    next();
  }

  // Logging middleware
  loggingMiddleware(socket, next) {
    const originalEmit = socket.emit;
    const originalOn = socket.on;

    // Log outgoing events
    socket.emit = function (eventName, ...args) {
      if (!this.isSystemEvent(eventName)) {
        console.log(
          `[SOCKET OUT] ${socket.userId || socket.id} -> ${eventName}`
        );
      }
      return originalEmit.apply(this, arguments);
    };

    // Log incoming events
    socket.on = function (eventName, callback) {
      const wrappedCallback = (...args) => {
        if (!this.isSystemEvent(eventName)) {
          console.log(
            `[SOCKET IN] ${socket.userId || socket.id} <- ${eventName}`
          );
        }
        return callback.apply(this, args);
      };
      return originalOn.call(this, eventName, wrappedCallback);
    };

    // Helper method to check if event is system event
    socket.isSystemEvent = function (eventName) {
      const systemEvents = [
        'connect',
        'disconnect',
        'error',
        'ping',
        'pong',
        'connection_established',
        'heartbeat',
      ];
      return systemEvents.includes(eventName);
    };

    next();
  }

  // Permission checking middleware
  permissionMiddleware(requiredPermissions = []) {
    return (socket, next) => {
      const user = socket.user;

      if (!user) {
        return next(new Error('User not authenticated'));
      }

      // Check if user has required permissions
      const hasPermission = requiredPermissions.every((permission) => {
        switch (permission) {
          case 'admin':
            return ['super_admin'].includes(user.role);
          case 'manager':
            return ['super_admin', 'manager'].includes(user.role);
          case 'staff':
            return [
              'super_admin',
              'manager',
              'consultant',
              'receptionist',
            ].includes(user.role);
          case 'monitoring':
            return ['super_admin', 'manager'].includes(user.role);
          default:
            return true;
        }
      });

      if (!hasPermission) {
        return next(new Error('Insufficient permissions'));
      }

      next();
    };
  }

  // Office access middleware
  officeAccessMiddleware(socket, next) {
    const user = socket.user;

    if (!user) {
      return next(new Error('User not authenticated'));
    }

    // Attach office-specific data
    socket.officeId = user.officeId;
    socket.canAccessOffice = (officeId) => {
      // Super admin can access all offices
      if (user.role === 'super_admin') return true;

      // Others can only access their assigned office
      return user.officeId === officeId;
    };

    next();
  }

  // Connection limit middleware
  connectionLimitMiddleware(maxConnections = 5) {
    const userConnections = new Map();

    return (socket, next) => {
      const userId = socket.userId;

      if (!userId) {
        return next(new Error('User ID required'));
      }

      // Count current connections for this user
      const currentConnections = userConnections.get(userId) || 0;

      if (currentConnections >= maxConnections) {
        return next(
          new Error(`Maximum ${maxConnections} connections per user exceeded`)
        );
      }

      // Increment connection count
      userConnections.set(userId, currentConnections + 1);

      // Decrement on disconnect
      socket.on('disconnect', () => {
        const count = userConnections.get(userId) || 0;
        if (count <= 1) {
          userConnections.delete(userId);
        } else {
          userConnections.set(userId, count - 1);
        }
      });

      next();
    };
  }

  // CORS middleware for socket connections
  corsMiddleware(socket, next) {
    const origin = socket.handshake.headers.origin;
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
    ].filter(Boolean);

    if (
      process.env.NODE_ENV === 'production' &&
      !allowedOrigins.includes(origin)
    ) {
      return next(new Error('CORS: Origin not allowed'));
    }

    next();
  }

  // Heartbeat middleware to keep connections alive
  heartbeatMiddleware(socket, next) {
    const heartbeatInterval = 30000; // 30 seconds

    socket.isAlive = true;

    // Send heartbeat
    const heartbeat = setInterval(() => {
      if (!socket.isAlive) {
        console.log(`Terminating inactive socket ${socket.id}`);
        clearInterval(heartbeat);
        socket.terminate();
        return;
      }

      socket.isAlive = false;
      socket.emit('heartbeat', { timestamp: new Date() });
    }, heartbeatInterval);

    // Handle heartbeat response
    socket.on('heartbeat_response', () => {
      socket.isAlive = true;
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      clearInterval(heartbeat);
    });

    next();
  }

  // Spam protection middleware
  spamProtectionMiddleware(socket, next) {
    const spamConfig = {
      messageWindow: 10000, // 10 seconds
      maxMessages: 20, // max messages per window
      duplicateWindow: 2000, // 2 seconds
      maxDuplicates: 3, // max duplicate messages
    };

    socket.spamProtection = {
      messages: [],
      lastMessages: [],
    };

    // Override socket emit to track outgoing messages
    const originalEmit = socket.emit;
    socket.emit = function (eventName, data) {
      if (eventName === 'message_received' && data?.message?.content) {
        this.trackMessage(data.message.content);
      }
      return originalEmit.apply(this, arguments);
    };

    socket.trackMessage = function (content) {
      const now = Date.now();

      // Clean old messages
      this.spamProtection.messages = this.spamProtection.messages.filter(
        (msg) => now - msg.timestamp < spamConfig.messageWindow
      );

      this.spamProtection.lastMessages =
        this.spamProtection.lastMessages.filter(
          (msg) => now - msg.timestamp < spamConfig.duplicateWindow
        );

      // Check for spam
      if (this.spamProtection.messages.length >= spamConfig.maxMessages) {
        this.emit('error', { message: 'Message rate limit exceeded' });
        return false;
      }

      // Check for duplicate spam
      const duplicateCount = this.spamProtection.lastMessages.filter(
        (msg) => msg.content === content
      ).length;

      if (duplicateCount >= spamConfig.maxDuplicates) {
        this.emit('error', { message: 'Duplicate message spam detected' });
        return false;
      }

      // Track message
      this.spamProtection.messages.push({ timestamp: now });
      this.spamProtection.lastMessages.push({ content, timestamp: now });

      return true;
    };

    next();
  }

  // Error handling middleware
  errorHandlingMiddleware(socket, next) {
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });

    // Wrap socket handlers with error catching
    const originalOn = socket.on;
    socket.on = function (eventName, handler) {
      const wrappedHandler = async (...args) => {
        try {
          await handler.apply(this, args);
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
          this.emit('error', {
            event: eventName,
            message: 'Internal server error',
            timestamp: new Date(),
          });
        }
      };

      return originalOn.call(this, eventName, wrappedHandler);
    };

    next();
  }

  // Session management middleware
  sessionMiddleware(socket, next) {
    const sessionId = socket.handshake.query.sessionId || socket.id;

    socket.sessionId = sessionId;
    socket.sessionData = {
      startTime: new Date(),
      lastActivity: new Date(),
      events: 0,
    };

    // Track activity
    const originalOn = socket.on;
    socket.on = function (eventName, handler) {
      const wrappedHandler = (...args) => {
        this.sessionData.lastActivity = new Date();
        this.sessionData.events++;
        return handler.apply(this, args);
      };

      return originalOn.call(this, eventName, wrappedHandler);
    };

    next();
  }
}

module.exports = new SocketMiddleware();
