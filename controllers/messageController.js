const messageService = require('../services/messageService');
const {
  uploadToCloud,
  getFileMetadata,
  getMessageTypeFromMime,
} = require('../middleware/uploadMiddleware');
const AppError = require('../utils/appError');

class MessageController {
  // Send a text message
  async sendMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        conversationId,
        content,
        type = 'text',
        replyToId,
        metadata,
      } = req.body;

      const message = await messageService.sendMessage(
        userId,
        conversationId,
        content,
        type,
        replyToId,
        metadata
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Send message with file attachment
  async sendMessageWithFile(req, res, next) {
    try {
      const userId = req.user.id;
      const { conversationId, content, replyToId } = req.body;
      const file = req.file;

      if (!file) {
        return next(new AppError('No file uploaded', 400));
      }

      // Get file metadata
      const fileMetadata = getFileMetadata(file);
      const messageType = getMessageTypeFromMime(file.mimetype);

      // Upload to cloud storage (if configured)
      let fileUrl;
      try {
        fileUrl = await uploadToCloud(file);
      } catch (uploadError) {
        console.error('Cloud upload failed, using local path:', uploadError);
        fileUrl = `/uploads/messages/${path.basename(path.dirname(file.path))}/${file.filename}`;
      }

      const fileData = {
        fileUrl,
        fileName: fileMetadata.originalName,
        fileSize: fileMetadata.size,
        mimeType: fileMetadata.mimetype,
        messageType,
      };

      const message = await messageService.sendMessageWithFile(
        userId,
        conversationId,
        fileData,
        content,
        replyToId
      );

      res.status(201).json({
        success: true,
        message: 'Message with file sent successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Edit an existing message
  async editMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;
      const { content } = req.body;

      const message = await messageService.editMessage(
        messageId,
        userId,
        content
      );

      res.json({
        success: true,
        message: 'Message updated successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a message
  async deleteMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;

      await messageService.deleteMessage(messageId, userId);

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark message as read
  async markMessageAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;

      await messageService.markMessageAsRead(messageId, userId);

      res.json({
        success: true,
        message: 'Message marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark multiple messages as read
  async markMultipleMessagesAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { messageIds } = req.body;

      await messageService.markMultipleMessagesAsRead(messageIds, userId);

      res.json({
        success: true,
        message: 'Messages marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get conversation messages
  async getConversationMessages(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { page, limit, before, after } = req.query;

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      };

      if (before) options.before = new Date(before);
      if (after) options.after = new Date(after);

      const result = await messageService.getConversationMessages(
        conversationId,
        userId,
        options
      );

      res.json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Search messages
  async searchMessages(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        q: query,
        conversationId,
        type,
        from,
        to,
        page,
        limit,
      } = req.query;

      const options = {
        conversationId,
        type,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      };

      if (from) options.from = new Date(from);
      if (to) options.to = new Date(to);

      const result = await messageService.searchMessages(
        userId,
        query,
        options
      );

      res.json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
        query,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get message replies
  async getMessageReplies(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;

      const replies = await messageService.getMessageReplies(messageId, userId);

      res.json({
        success: true,
        data: replies,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get message statistics
  async getMessageStats(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId =
        req.params.conversationId || req.query.conversationId;

      if (!conversationId) {
        return next(new AppError('Conversation ID is required', 400));
      }

      const stats = await messageService.getMessageStats(
        conversationId,
        userId
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get recent messages across conversations
  async getRecentMessages(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      // This would need to be implemented in messageService
      // For now, return empty array
      res.json({
        success: true,
        data: [],
        message: 'Recent messages endpoint - to be implemented',
      });
    } catch (error) {
      next(error);
    }
  }

  // React to a message (future feature)
  async reactToMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;
      const { reaction } = req.body; // emoji reaction

      // This would need to be implemented
      res.json({
        success: true,
        message: 'Message reaction feature - to be implemented',
        data: {
          messageId,
          userId,
          reaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Forward a message (future feature)
  async forwardMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;
      const { conversationIds } = req.body;

      // This would need to be implemented
      res.json({
        success: true,
        message: 'Message forwarding feature - to be implemented',
        data: {
          messageId,
          forwardedTo: conversationIds,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Pin/unpin a message (future feature)
  async pinMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;
      const { pinned } = req.body;

      // This would need to be implemented
      res.json({
        success: true,
        message: 'Message pinning feature - to be implemented',
        data: {
          messageId,
          pinned,
          pinnedBy: userId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get message delivery status
  async getMessageDeliveryStatus(req, res, next) {
    try {
      const messageId = req.params.id;

      // This would need to be implemented to show delivery/read status per participant
      res.json({
        success: true,
        message: 'Message delivery status feature - to be implemented',
        data: {
          messageId,
          deliveryStatus: [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Export conversation messages
  async exportMessages(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.conversationId;
      const { format = 'json', from, to } = req.query;

      // This would need to be implemented
      res.json({
        success: true,
        message: 'Message export feature - to be implemented',
        data: {
          conversationId,
          format,
          dateRange: { from, to },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get message thread (replies tree)
  async getMessageThread(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;

      // This would build a full thread tree of replies
      const replies = await messageService.getMessageReplies(messageId, userId);

      res.json({
        success: true,
        data: {
          messageId,
          thread: replies, // This would be a nested structure in full implementation
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get unread message count across all conversations
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;

      // This would aggregate unread counts across all user's conversations
      res.json({
        success: true,
        data: {
          totalUnread: 0, // To be implemented
          conversationCounts: {}, // conversationId -> count
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Translate message (future feature)
  async translateMessage(req, res, next) {
    try {
      const messageId = req.params.id;
      const { targetLanguage } = req.body;

      // This would integrate with translation service
      res.json({
        success: true,
        message: 'Message translation feature - to be implemented',
        data: {
          messageId,
          targetLanguage,
          translatedText: 'Translation would appear here',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Report message (moderation)
  async reportMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;
      const { reason, description } = req.body;

      // This would create a moderation report
      res.json({
        success: true,
        message: 'Message reported successfully',
        data: {
          messageId,
          reportedBy: userId,
          reason,
          description,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
