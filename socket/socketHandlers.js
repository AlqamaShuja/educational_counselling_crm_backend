const messageService = require('../services/messageService');
const conversationService = require('../services/conversationService');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');
const { ConversationParticipant } = require('../models');
const socketUtils = require('./socketUtils');

class SocketHandlers {
  // Handle sending a message
  async handleSendMessage(socket, user, data) {
    try {
      const {
        conversationId,
        content,
        type = 'text',
        replyToId,
        metadata,
      } = data;

      // Validate input
      if (!conversationId || !content) {
        return socket.emit('error', {
          message: 'Conversation ID and content are required',
          event: 'send_message',
        });
      }

      // Send message through service
      const message = await messageService.sendMessage(
        user.id,
        conversationId,
        content,
        type,
        replyToId,
        metadata
      );

      // Emit confirmation to sender
      socket.emit('message_sent', {
        success: true,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling send_message:', error);
      socket.emit('error', {
        message: error.message || 'Failed to send message',
        event: 'send_message',
      });
    }
  }

  // Handle editing a message
  async handleEditMessage(socket, user, data) {
    try {
      const { messageId, content } = data;

      if (!messageId || !content) {
        return socket.emit('error', {
          message: 'Message ID and content are required',
          event: 'edit_message',
        });
      }

      const message = await messageService.editMessage(
        messageId,
        user.id,
        content
      );

      socket.emit('message_edited', {
        success: true,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling edit_message:', error);
      socket.emit('error', {
        message: error.message || 'Failed to edit message',
        event: 'edit_message',
      });
    }
  }

  // Handle deleting a message
  async handleDeleteMessage(socket, user, data) {
    try {
      const { messageId } = data;

      if (!messageId) {
        return socket.emit('error', {
          message: 'Message ID is required',
          event: 'delete_message',
        });
      }

      await messageService.deleteMessage(messageId, user.id);

      socket.emit('message_deleted', {
        success: true,
        messageId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling delete_message:', error);
      socket.emit('error', {
        message: error.message || 'Failed to delete message',
        event: 'delete_message',
      });
    }
  }

  // Handle marking message as read
  async handleMarkMessageRead(socket, user, data) {
    try {
      const { messageId, conversationId } = data;

      if (messageId) {
        await messageService.markMessageAsRead(messageId, user.id);
      } else if (conversationId) {
        await conversationService.markConversationAsRead(
          conversationId,
          user.id
        );
      } else {
        return socket.emit('error', {
          message: 'Message ID or Conversation ID is required',
          event: 'mark_message_read',
        });
      }

      socket.emit('message_read_confirmed', {
        success: true,
        messageId,
        conversationId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling mark_message_read:', error);
      socket.emit('error', {
        message: error.message || 'Failed to mark message as read',
        event: 'mark_message_read',
      });
    }
  }

  // Handle joining a conversation
  async handleJoinConversation(socket, user, data) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'join_conversation',
        });
      }

      // Verify user is participant
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId: user.id, isActive: true },
      });

      if (!participant) {
        return socket.emit('error', {
          message: 'Access denied to this conversation',
          event: 'join_conversation',
        });
      }

      // Join socket room
      socketService.joinConversation(socket, conversationId);

      // Update participant's last seen
      await participant.update({ lastSeenAt: new Date() });

      // Emit to other participants that user joined
      await socketService.emitToConversationExcept(
        conversationId,
        user.id,
        'user_joined_conversation',
        {
          conversationId,
          userId: user.id,
          userName: user.name,
          timestamp: new Date(),
        }
      );

      socket.emit('conversation_joined', {
        success: true,
        conversationId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling join_conversation:', error);
      socket.emit('error', {
        message: error.message || 'Failed to join conversation',
        event: 'join_conversation',
      });
    }
  }

  // Handle leaving a conversation
  async handleLeaveConversation(socket, user, data) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'leave_conversation',
        });
      }

      // Leave socket room
      socketService.leaveConversation(socket, conversationId);

      // Emit to other participants that user left
      await socketService.emitToConversationExcept(
        conversationId,
        user.id,
        'user_left_conversation',
        {
          conversationId,
          userId: user.id,
          userName: user.name,
          timestamp: new Date(),
        }
      );

      socket.emit('conversation_left', {
        success: true,
        conversationId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling leave_conversation:', error);
      socket.emit('error', {
        message: error.message || 'Failed to leave conversation',
        event: 'leave_conversation',
      });
    }
  }

  // Handle creating a conversation
  async handleCreateConversation(socket, user, data) {
    try {
      const conversation = await conversationService.createConversation(
        user.id,
        data
      );

      socket.emit('conversation_created', {
        success: true,
        conversation,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling create_conversation:', error);
      socket.emit('error', {
        message: error.message || 'Failed to create conversation',
        event: 'create_conversation',
      });
    }
  }

  // Handle typing start
  async handleTypingStart(socket, user, data) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'typing_start',
        });
      }

      socketService.handleTypingStart(socket, conversationId);
    } catch (error) {
      console.error('Error handling typing_start:', error);
    }
  }

  // Handle typing stop
  async handleTypingStop(socket, user, data) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'typing_stop',
        });
      }

      socketService.handleTypingStop(socket, conversationId);
    } catch (error) {
      console.error('Error handling typing_stop:', error);
    }
  }

  // Handle presence update
  async handleUpdatePresence(socket, user, data) {
    try {
      const { presence } = data; // 'online', 'away', 'busy', 'offline'

      if (!presence) {
        return socket.emit('error', {
          message: 'Presence status is required',
          event: 'update_presence',
        });
      }

      await socketService.updateUserPresence(user.id, presence);

      socket.emit('presence_updated', {
        success: true,
        presence,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling update_presence:', error);
      socket.emit('error', {
        message: error.message || 'Failed to update presence',
        event: 'update_presence',
      });
    }
  }

  // Handle get online users
  async handleGetOnlineUsers(socket, user, data) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'get_online_users',
        });
      }

      const onlineUsers =
        await socketService.getOnlineUsersInConversation(conversationId);

      socket.emit('online_users_list', {
        conversationId,
        onlineUsers,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling get_online_users:', error);
      socket.emit('error', {
        message: error.message || 'Failed to get online users',
        event: 'get_online_users',
      });
    }
  }

  // Handle file upload start
  async handleFileUploadStart(socket, user, data) {
    try {
      const { conversationId, fileName, fileSize, mimeType } = data;

      if (!conversationId || !fileName) {
        return socket.emit('error', {
          message: 'Conversation ID and file name are required',
          event: 'file_upload_start',
        });
      }

      // Generate upload session ID
      const uploadId = socketUtils.generateUploadId();

      // Emit to conversation that file upload started
      await socketService.emitToConversation(
        conversationId,
        'file_upload_started',
        {
          conversationId,
          uploadId,
          userId: user.id,
          userName: user.name,
          fileName,
          fileSize,
          mimeType,
          timestamp: new Date(),
        }
      );

      socket.emit('file_upload_initiated', {
        success: true,
        uploadId,
        conversationId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling file_upload_start:', error);
      socket.emit('error', {
        message: error.message || 'Failed to start file upload',
        event: 'file_upload_start',
      });
    }
  }

  // Handle file upload progress
  async handleFileUploadProgress(socket, user, data) {
    try {
      const { conversationId, uploadId, progress } = data;

      if (!conversationId || !uploadId || progress === undefined) {
        return socket.emit('error', {
          message: 'Conversation ID, upload ID, and progress are required',
          event: 'file_upload_progress',
        });
      }

      // Emit progress to conversation participants
      await socketService.emitToConversation(
        conversationId,
        'file_upload_progress',
        {
          conversationId,
          uploadId,
          userId: user.id,
          progress,
          timestamp: new Date(),
        }
      );
    } catch (error) {
      console.error('Error handling file_upload_progress:', error);
    }
  }

  // Handle file upload complete
  async handleFileUploadComplete(socket, user, data) {
    try {
      const { conversationId, uploadId, fileUrl, message } = data;

      if (!conversationId || !uploadId || !fileUrl) {
        return socket.emit('error', {
          message: 'Conversation ID, upload ID, and file URL are required',
          event: 'file_upload_complete',
        });
      }

      // Create message with file
      const fileMessage = await messageService.sendMessage(
        user.id,
        conversationId,
        message || 'File shared',
        'file',
        null,
        { uploadId, fileUrl }
      );

      // Emit completion to conversation
      await socketService.emitToConversation(
        conversationId,
        'file_upload_completed',
        {
          conversationId,
          uploadId,
          userId: user.id,
          message: fileMessage,
          timestamp: new Date(),
        }
      );

      socket.emit('file_upload_success', {
        success: true,
        uploadId,
        message: fileMessage,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling file_upload_complete:', error);
      socket.emit('error', {
        message: error.message || 'Failed to complete file upload',
        event: 'file_upload_complete',
      });
    }
  }

  // Handle mark notification read
  async handleMarkNotificationRead(socket, user, data) {
    try {
      const { notificationId } = data;

      if (!notificationId) {
        return socket.emit('error', {
          message: 'Notification ID is required',
          event: 'mark_notification_read',
        });
      }

      // Mark notification as read through notification service
      await notificationService.markNotificationAsRead(notificationId, user.id);

      socket.emit('notification_read_confirmed', {
        success: true,
        notificationId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling mark_notification_read:', error);
      socket.emit('error', {
        message: error.message || 'Failed to mark notification as read',
        event: 'mark_notification_read',
      });
    }
  }

  // Handle get unread count
  async handleGetUnreadCount(socket, user, data) {
    try {
      // Get unread message count across all conversations
      const unreadData = await socketUtils.getUnreadCounts(user.id);

      socket.emit('unread_count_update', {
        ...unreadData,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling get_unread_count:', error);
      socket.emit('error', {
        message: error.message || 'Failed to get unread count',
        event: 'get_unread_count',
      });
    }
  }

  // Handle start voice call
  async handleStartVoiceCall(socket, user, data) {
    try {
      const { conversationId, callType = 'voice' } = data;

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'start_voice_call',
        });
      }

      // Generate call ID
      const callId = socketUtils.generateCallId();

      // Emit call invitation to conversation participants
      await socketService.emitToConversationExcept(
        conversationId,
        user.id,
        'incoming_call',
        {
          callId,
          conversationId,
          callerId: user.id,
          callerName: user.name,
          callType,
          timestamp: new Date(),
        }
      );

      socket.emit('call_initiated', {
        success: true,
        callId,
        conversationId,
        callType,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling start_voice_call:', error);
      socket.emit('error', {
        message: error.message || 'Failed to start voice call',
        event: 'start_voice_call',
      });
    }
  }

  // Handle start video call
  async handleStartVideoCall(socket, user, data) {
    try {
      const { conversationId } = data;

      // Similar to voice call but with video
      await this.handleStartVoiceCall(socket, user, {
        ...data,
        callType: 'video',
      });
    } catch (error) {
      console.error('Error handling start_video_call:', error);
      socket.emit('error', {
        message: error.message || 'Failed to start video call',
        event: 'start_video_call',
      });
    }
  }

  // Handle screen share start
  async handleScreenShareStart(socket, user, data) {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'screen_share_start',
        });
      }

      // Emit screen share started to conversation
      await socketService.emitToConversationExcept(
        conversationId,
        user.id,
        'screen_share_started',
        {
          conversationId,
          userId: user.id,
          userName: user.name,
          timestamp: new Date(),
        }
      );

      socket.emit('screen_share_initiated', {
        success: true,
        conversationId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling screen_share_start:', error);
      socket.emit('error', {
        message: error.message || 'Failed to start screen share',
        event: 'screen_share_start',
      });
    }
  }

  // Handle monitor conversation (Admin/Manager only)
  async handleMonitorConversation(socket, user, data) {
    try {
      const { conversationId, action = 'start' } = data; // 'start' or 'stop'

      if (!conversationId) {
        return socket.emit('error', {
          message: 'Conversation ID is required',
          event: 'monitor_conversation',
        });
      }

      // Verify user has monitoring permissions
      if (!['super_admin', 'manager'].includes(user.role)) {
        return socket.emit('error', {
          message: 'Insufficient permissions for conversation monitoring',
          event: 'monitor_conversation',
        });
      }

      if (action === 'start') {
        // Join monitoring room
        socket.join(`monitor_${conversationId}`);

        socket.emit('monitoring_started', {
          success: true,
          conversationId,
          timestamp: new Date(),
        });
      } else if (action === 'stop') {
        // Leave monitoring room
        socket.leave(`monitor_${conversationId}`);

        socket.emit('monitoring_stopped', {
          success: true,
          conversationId,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error handling monitor_conversation:', error);
      socket.emit('error', {
        message: error.message || 'Failed to monitor conversation',
        event: 'monitor_conversation',
      });
    }
  }

  // Handle broadcast announcement (Admin only)
  async handleBroadcastAnnouncement(socket, user, data) {
    try {
      const { message, target = 'all', urgent = false } = data;

      if (!message) {
        return socket.emit('error', {
          message: 'Announcement message is required',
          event: 'broadcast_announcement',
        });
      }

      // Verify user has broadcast permissions
      if (!['super_admin'].includes(user.role)) {
        return socket.emit('error', {
          message: 'Insufficient permissions for broadcasting',
          event: 'broadcast_announcement',
        });
      }

      const announcement = {
        id: socketUtils.generateAnnouncementId(),
        message,
        sender: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        target,
        urgent,
        timestamp: new Date(),
      };

      // Broadcast to all users
      await socketService.broadcastSystemAnnouncement(announcement);

      socket.emit('announcement_sent', {
        success: true,
        announcement,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling broadcast_announcement:', error);
      socket.emit('error', {
        message: error.message || 'Failed to broadcast announcement',
        event: 'broadcast_announcement',
      });
    }
  }
}

module.exports = new SocketHandlers();
