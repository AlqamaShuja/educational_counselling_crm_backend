const { Op, Sequelize } = require('sequelize');
const {
  Message,
  Conversation,
  ConversationParticipant,
  User,
} = require('../models');
const socketService = require('./socketService');
const notificationService = require('./notificationService');
const AppError = require('../utils/appError');

class MessageService {
  // Send a text message
  async sendMessage(
    senderId,
    conversationId,
    content,
    type = 'text',
    replyToId = null,
    metadata = {}
  ) {
    try {
      // Verify conversation exists and user is participant
      const conversation = await Conversation.findByPk(conversationId, {
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { userId: senderId, isActive: true },
            required: true,
          },
        ],
      });

      if (!conversation) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      // Create the message
      const message = await Message.create({
        conversationId,
        senderId,
        content,
        type,
        replyToId,
        metadata,
      });

      // Update conversation's last message info
      await conversation.update({
        lastMessageId: message.id,
        lastMessageAt: new Date(),
      });

      // Update unread count for other participants
      await this.updateUnreadCounts(conversationId, senderId);

      // Get complete message with sender info
      const completeMessage = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'email', 'role'],
          },
          {
            model: Message,
            as: 'replyTo',
            include: [
              {
                model: User,
                as: 'sender',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
      });

      // Emit real-time message to conversation participants
      await socketService.emitToConversation(
        conversationId,
        'message_received',
        {
          message: completeMessage,
          conversationId,
        }
      );

      // Send push notifications to offline participants
      await this.sendMessageNotifications(
        conversationId,
        senderId,
        completeMessage
      );

      return completeMessage;
    } catch (error) {
      throw error;
    }
  }

  // Send a message with file attachment
  async sendMessageWithFile(
    senderId,
    conversationId,
    fileData,
    content = '',
    replyToId = null
  ) {
    try {
      const { fileUrl, fileName, fileSize, mimeType, messageType } = fileData;

      const message = await this.sendMessage(
        senderId,
        conversationId,
        content || fileName,
        messageType,
        replyToId,
        {
          fileUrl,
          fileName,
          fileSize,
          mimeType,
        }
      );

      // Update message with file information
      await message.update({
        fileUrl,
        fileName,
        fileSize,
        mimeType,
      });

      return message;
    } catch (error) {
      throw error;
    }
  }

  // Edit an existing message
  async editMessage(messageId, senderId, newContent) {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new AppError('Message not found', 404);
      }

      if (message.senderId !== senderId) {
        throw new AppError('Can only edit your own messages', 403);
      }

      // Check if message is within edit time limit (15 minutes)
      const editTimeLimit = 15 * 60 * 1000;
      const messageAge = Date.now() - new Date(message.createdAt).getTime();

      if (messageAge > editTimeLimit) {
        throw new AppError('Message can only be edited within 15 minutes', 403);
      }

      // Update message
      await message.update({
        content: newContent,
        isEdited: true,
        editedAt: new Date(),
      });

      // Get updated message with sender info
      const updatedMessage = await Message.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'email', 'role'],
          },
        ],
      });

      // Emit real-time update
      await socketService.emitToConversation(
        message.conversationId,
        'message_edited',
        {
          message: updatedMessage,
        }
      );

      return updatedMessage;
    } catch (error) {
      throw error;
    }
  }

  // Delete a message (soft delete)
  async deleteMessage(messageId, senderId) {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new AppError('Message not found', 404);
      }

      if (message.senderId !== senderId) {
        throw new AppError('Can only delete your own messages', 403);
      }

      // Soft delete
      await message.update({
        content: 'This message was deleted',
        deletedAt: new Date(),
        metadata: { ...message.metadata, deleted: true },
      });

      // Emit real-time update
      await socketService.emitToConversation(
        message.conversationId,
        'message_deleted',
        {
          messageId,
          conversationId: message.conversationId,
        }
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId, userId) {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new AppError('Message not found', 404);
      }

      // Don't mark own messages as read
      if (message.senderId === userId) {
        return { success: true };
      }

      // Update message read status
      await message.update({
        readAt: new Date(),
      });

      // Update participant's last read timestamp
      await ConversationParticipant.update(
        { lastReadAt: new Date() },
        {
          where: {
            conversationId: message.conversationId,
            userId,
          },
        }
      );

      // Emit read receipt
      await socketService.emitToConversation(
        message.conversationId,
        'message_read',
        {
          messageId,
          userId,
          readAt: new Date(),
        }
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Mark multiple messages as read
  async markMultipleMessagesAsRead(messageIds, userId) {
    try {
      // Update all messages
      await Message.update(
        { readAt: new Date() },
        {
          where: {
            id: messageIds,
            senderId: { [Op.ne]: userId }, // Don't mark own messages
          },
        }
      );

      // Get unique conversation IDs
      const messages = await Message.findAll({
        where: { id: messageIds },
        attributes: ['conversationId'],
        group: ['conversationId'],
      });

      const conversationIds = messages.map((m) => m.conversationId);

      // Update participant's last read timestamp for each conversation
      for (const conversationId of conversationIds) {
        await ConversationParticipant.update(
          { lastReadAt: new Date() },
          {
            where: {
              conversationId,
              userId,
            },
          }
        );

        // Emit read receipts
        await socketService.emitToConversation(
          conversationId,
          'messages_read',
          {
            messageIds: messageIds.filter((id) =>
              messages.some((m) => m.conversationId === conversationId)
            ),
            userId,
            readAt: new Date(),
          }
        );
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Get conversation messages with pagination
  async getConversationMessages(conversationId, userId, options = {}) {
    try {
      const { page = 1, limit = 50, before, after } = options;
      const offset = (page - 1) * limit;

      // Verify user is participant
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Access denied to this conversation', 403);
      }

      // Build where clause
      const whereClause = { conversationId };

      if (before) {
        whereClause.createdAt = { [Op.lt]: before };
      }

      if (after) {
        whereClause.createdAt = { [Op.gt]: after };
      }

      // Get messages
      const messages = await Message.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'email', 'role'],
          },
          {
            model: Message,
            as: 'replyTo',
            include: [
              {
                model: User,
                as: 'sender',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        messages: messages.rows.reverse(), // Reverse to show oldest first
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(messages.count / limit),
          totalMessages: messages.count,
          hasNext: page * limit < messages.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Search messages
  async searchMessages(userId, query, options = {}) {
    try {
      const { conversationId, type, from, to, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Get user's accessible conversation IDs
      const userConversations = await ConversationParticipant.findAll({
        where: { userId, isActive: true },
        attributes: ['conversationId'],
      });

      const accessibleConversationIds = userConversations.map(
        (p) => p.conversationId
      );

      if (accessibleConversationIds.length === 0) {
        return { messages: [], pagination: { totalMessages: 0 } };
      }

      // Build where clause
      const whereClause = {
        conversationId: conversationId || {
          [Op.in]: accessibleConversationIds,
        },
        [Op.and]: [
          Sequelize.literal(
            `to_tsvector('english', content) @@ plainto_tsquery('english', '${query}')`
          ),
        ],
      };

      if (type) {
        whereClause.type = type;
      }

      if (from) {
        whereClause.createdAt = { [Op.gte]: from };
      }

      if (to) {
        whereClause.createdAt = {
          ...(whereClause.createdAt || {}),
          [Op.lte]: to,
        };
      }

      // Search messages
      const messages = await Message.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'email', 'role'],
          },
          {
            model: Conversation,
            as: 'conversation',
            attributes: ['id', 'name', 'type', 'purpose'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        messages: messages.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(messages.count / limit),
          totalMessages: messages.count,
          hasNext: page * limit < messages.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get message replies
  async getMessageReplies(messageId, userId) {
    try {
      const originalMessage = await Message.findByPk(messageId);

      if (!originalMessage) {
        throw new AppError('Message not found', 404);
      }

      // Verify user has access to conversation
      const participant = await ConversationParticipant.findOne({
        where: {
          conversationId: originalMessage.conversationId,
          userId,
          isActive: true,
        },
      });

      if (!participant) {
        throw new AppError('Access denied to this conversation', 403);
      }

      // Get replies
      const replies = await Message.findAll({
        where: { replyToId: messageId },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'email', 'role'],
          },
        ],
        order: [['createdAt', 'ASC']],
      });

      return replies;
    } catch (error) {
      throw error;
    }
  }

  // Update unread counts for conversation participants
  async updateUnreadCounts(conversationId, senderId) {
    try {
      // Increment unread count for all participants except sender
      await ConversationParticipant.update(
        {
          unreadCount: Sequelize.literal('unread_count + 1'),
        },
        {
          where: {
            conversationId,
            userId: { [Op.ne]: senderId },
            isActive: true,
          },
        }
      );
    } catch (error) {
      console.error('Error updating unread counts:', error);
    }
  }

  // Send message notifications to offline participants
  async sendMessageNotifications(conversationId, senderId, message) {
    try {
      // Get all participants except sender
      const participants = await ConversationParticipant.findAll({
        where: {
          conversationId,
          userId: { [Op.ne]: senderId },
          isActive: true,
        },
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      // Get sender info
      const sender = await User.findByPk(senderId, {
        attributes: ['id', 'name', 'role'],
      });

      // Send notifications to participants who have notifications enabled
      for (const participant of participants) {
        if (participant.preferences.notifications) {
          await notificationService.sendNotification({
            userId: participant.userId,
            type: 'in_app',
            message: `New message from ${sender.name}`,
            details: {
              conversationId,
              messageId: message.id,
              senderName: sender.name,
              messagePreview: message.content.substring(0, 100),
            },
          });

          // Send push notification if user is offline
          const isOnline = await socketService.isUserOnline(participant.userId);
          if (!isOnline && participant.preferences.emailNotifications) {
            // Send email notification
            await notificationService.sendEmailNotification({
              to: participant.User.email,
              subject: `New message from ${sender.name}`,
              template: 'new_message',
              data: {
                senderName: sender.name,
                messagePreview: message.content.substring(0, 200),
                conversationId,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message notifications:', error);
    }
  }

  // Get message statistics
  async getMessageStats(conversationId, userId) {
    try {
      // Verify access
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Access denied to this conversation', 403);
      }

      // Get message counts by type
      const stats = await Message.findAll({
        where: { conversationId },
        attributes: [
          'type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        group: ['type'],
      });

      // Get total message count
      const totalMessages = await Message.count({
        where: { conversationId },
      });

      // Get unread count for user
      const unreadCount = await Message.count({
        where: {
          conversationId,
          senderId: { [Op.ne]: userId },
          readAt: null,
        },
      });

      return {
        totalMessages,
        unreadCount,
        messagesByType: stats.reduce((acc, stat) => {
          acc[stat.type] = parseInt(stat.dataValues.count);
          return acc;
        }, {}),
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MessageService();
