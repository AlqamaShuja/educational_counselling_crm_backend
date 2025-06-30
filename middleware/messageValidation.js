const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/appError');
const { Conversation, ConversationParticipant } = require('../models');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new AppError(errorMessages.join(', '), 400));
  }
  next();
};

// Message validation rules
const validateMessage = [
  body('conversationId')
    .isUUID()
    .withMessage('Valid conversation ID is required'),

  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10000 characters'),

  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'file', 'system'])
    .withMessage('Invalid message type'),

  body('replyToId')
    .optional()
    .isUUID()
    .withMessage('Reply to ID must be a valid UUID'),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),

  handleValidationErrors,

  // Check if user is participant in conversation
  async (req, res, next) => {
    try {
      const { conversationId } = req.body;
      const userId = req.user.id;

      const participant = await ConversationParticipant.findOne({
        where: {
          conversationId,
          userId,
          isActive: true,
        },
      });

      if (!participant) {
        return next(
          new AppError('You are not a participant in this conversation', 403)
        );
      }

      // Check if user has permission to send messages
      if (!participant.permissions.canSendMessages) {
        return next(
          new AppError(
            'You do not have permission to send messages in this conversation',
            403
          )
        );
      }

      req.participant = participant;
      next();
    } catch (error) {
      next(error);
    }
  },
];

// Message edit validation rules
const validateMessageEdit = [
  param('id').isUUID().withMessage('Valid message ID is required'),

  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10000 characters'),

  handleValidationErrors,
];

// Search validation rules
const validateMessageSearch = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),

  query('conversationId')
    .optional()
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),

  query('type')
    .optional()
    .isIn(['text', 'image', 'video', 'file', 'system'])
    .withMessage('Invalid message type'),

  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be a valid ISO8601 date'),

  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be a valid ISO8601 date'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors,
];

// Bulk read validation
const validateBulkRead = [
  body('messageIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Message IDs must be an array with 1-100 items'),

  body('messageIds.*')
    .isUUID()
    .withMessage('Each message ID must be a valid UUID'),

  handleValidationErrors,
];

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  // Check file size (50MB limit)
  if (req.file.size > 50 * 1024 * 1024) {
    return next(
      new AppError('File size too large. Maximum 50MB allowed.', 400)
    );
  }

  // Validate conversation ID from form data
  const { conversationId } = req.body;
  if (!conversationId) {
    return next(new AppError('Conversation ID is required', 400));
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(conversationId)) {
    return next(new AppError('Invalid conversation ID format', 400));
  }

  next();
};

// Check message ownership for edit/delete operations
const checkMessageOwnership = async (req, res, next) => {
  try {
    const { Message } = require('../models');
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findByPk(messageId);

    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    // Check if user is the sender or has admin permissions
    if (message.senderId !== userId) {
      // Check if user is admin in the conversation
      const participant = await ConversationParticipant.findOne({
        where: {
          conversationId: message.conversationId,
          userId,
          isActive: true,
        },
      });

      if (!participant || participant.role !== 'admin') {
        return next(
          new AppError('You can only edit/delete your own messages', 403)
        );
      }
    }

    // Check if message was sent within edit time limit (e.g., 15 minutes)
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes in milliseconds
    const messageAge = Date.now() - new Date(message.createdAt).getTime();

    if (
      req.method === 'PUT' &&
      messageAge > editTimeLimit &&
      message.senderId === userId
    ) {
      return next(
        new AppError(
          'Message can only be edited within 15 minutes of sending',
          403
        )
      );
    }

    req.message = message;
    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting for messages
const messageRateLimit = (req, res, next) => {
  // Implement rate limiting logic here
  // For example, using Redis to track message count per user per minute

  const userId = req.user.id;
  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `message_rate_${userId}_${currentMinute}`;

  // This is a placeholder - implement actual Redis logic
  // const messageCount = await redis.get(key) || 0;
  // if (messageCount >= 30) { // 30 messages per minute limit
  //   return next(new AppError('Rate limit exceeded. Too many messages sent.', 429));
  // }
  // await redis.setex(key, 60, messageCount + 1);

  next();
};

// Content moderation middleware
const moderateContent = (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    return next();
  }

  // Basic profanity filter (implement more sophisticated filtering as needed)
  const profanityWords = ['spam', 'scam']; // Add more words as needed
  const lowerContent = content.toLowerCase();

  const containsProfanity = profanityWords.some((word) =>
    lowerContent.includes(word)
  );

  if (containsProfanity) {
    return next(new AppError('Message contains inappropriate content', 400));
  }

  // Check for excessive caps (more than 70% uppercase)
  const uppercaseCount = (content.match(/[A-Z]/g) || []).length;
  const letterCount = (content.match(/[A-Za-z]/g) || []).length;

  if (letterCount > 10 && uppercaseCount / letterCount > 0.7) {
    req.body.content = content.toLowerCase();
  }

  next();
};

module.exports = {
  validateMessage,
  validateMessageEdit,
  validateMessageSearch,
  validateBulkRead,
  validateFileUpload,
  checkMessageOwnership,
  messageRateLimit,
  moderateContent,
  handleValidationErrors,
};
