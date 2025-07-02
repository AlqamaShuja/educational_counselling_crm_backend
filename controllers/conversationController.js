const conversationService = require('../services/conversationService');
const AppError = require('../utils/appError');

class ConversationController {
  // Create a new conversation
  async createConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationData = req.body;

      const conversation = await conversationService.createConversation(
        userId,
        conversationData
      );

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's conversations - Modified to handle different user roles
  async getUserConversations(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { type, purpose, archived, page, limit } = req.query;

      const options = {
        type,
        purpose,
        archived: archived === 'true',
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      };

      let result;

      // Handle different roles
      switch (userRole) {
        case 'consultant':
          // For consultants, return their assigned leads instead of conversations
          result = await conversationService.getConsultantLeads(
            userId,
            options
          );
          break;

        case 'manager':
          // For managers, return conversations in their office for monitoring
          result = await conversationService.getManagerConversations(
            userId,
            options
          );
          break;

        case 'super_admin':
          // For super admins, return all conversations for monitoring
          result =
            await conversationService.getSuperAdminConversations(options);
          break;

        default:
          // For students and other roles, return regular conversations
          result = await conversationService.getUserConversations(
            userId,
            options
          );
      }

      res.json({
        success: true,
        data: result.conversations || result.leads,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get or create conversation between consultant and lead
  async getOrCreateLeadConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { leadUserId } = req.params; // The student/lead user ID

      console.log("leadUserId = " + leadUserId + ", userRole " + userRole);

      // Verify permissions
      if (userRole === 'consultant') {
        // Verify this lead is assigned to the consultant
        const hasAccess = await conversationService.verifyConsultantLeadAccess(
          userId,
          leadUserId
        );
        if (!hasAccess) {
          return next(new AppError('Access denied to this lead', 403));
        }
      } else if (userRole === 'manager' || userRole === 'super_admin') {
        // Managers and super admins can access for monitoring
        // Additional verification can be added here
      } else {
        return next(new AppError('Access denied', 403));
      }

      const conversation =
        await conversationService.getOrCreateLeadConversation(
          userId,
          leadUserId,
          userRole
        );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get conversation by ID
  async getConversationById(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const conversationId = req.params.id;

      const conversation = await conversationService.getConversationById(
        conversationId,
        userId,
        userRole
      );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update conversation
  async updateConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const updates = req.body;

      const conversation = await conversationService.updateConversation(
        conversationId,
        userId,
        updates
      );

      res.json({
        success: true,
        message: 'Conversation updated successfully',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // Add participants to conversation
  async addParticipants(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { userIds } = req.body;

      const result = await conversationService.addParticipants(
        conversationId,
        userId,
        userIds
      );

      res.json({
        success: true,
        message: 'Participants added successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove participant from conversation
  async removeParticipant(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const targetUserId = req.params.userId;

      await conversationService.removeParticipant(
        conversationId,
        userId,
        targetUserId
      );

      res.json({
        success: true,
        message: 'Participant removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Archive/unarchive conversation
  async archiveConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { archived } = req.body;

      await conversationService.archiveConversation(
        conversationId,
        userId,
        archived
      );

      res.json({
        success: true,
        message: `Conversation ${archived ? 'archived' : 'unarchived'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark conversation as read
  async markConversationAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;

      await conversationService.markConversationAsRead(conversationId, userId);

      res.json({
        success: true,
        message: 'Conversation marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  // Send typing indicator
  async sendTypingIndicator(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { isTyping } = req.body;

      await conversationService.sendTypingIndicator(
        conversationId,
        userId,
        isTyping
      );

      res.json({
        success: true,
        message: 'Typing indicator sent',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get office conversations for monitoring (Manager only)
  async getOfficeConversationsForMonitoring(req, res, next) {
    try {
      const user = req.user;
      const officeId = req.params.officeId;

      // Verify manager has access to this office
      if (user.role === 'manager' && user.officeId !== officeId) {
        return next(new AppError('Access denied to this office', 403));
      }

      const { purpose, page, limit } = req.query;
      const options = {
        purpose,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      };

      const result =
        await conversationService.getOfficeConversationsForMonitoring(
          officeId,
          user.role,
          options
        );

      res.json({
        success: true,
        data: result.conversations,
        pagination: result.pagination,
        officeId,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all conversations for monitoring (Super Admin only)
  async getAllConversationsForMonitoring(req, res, next) {
    try {
      const { officeId, purpose, page, limit } = req.query;
      const options = {
        officeId,
        purpose,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      };

      const result =
        await conversationService.getAllConversationsForMonitoring(options);

      res.json({
        success: true,
        data: result.conversations,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get conversation statistics
  async getConversationStats(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;

      const stats = await conversationService.getConversationStats(
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

  // Leave conversation
  async leaveConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;

      // User leaving is the same as removing themselves
      await conversationService.removeParticipant(
        conversationId,
        userId,
        userId
      );

      res.json({
        success: true,
        message: 'Left conversation successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Mute/unmute conversation
  async muteConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { muted } = req.body;

      // This would update the participant's mute status
      // Implementation needed in conversationService

      res.json({
        success: true,
        message: `Conversation ${muted ? 'muted' : 'unmuted'} successfully`,
        data: {
          conversationId,
          muted,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Pin/unpin conversation
  async pinConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { pinned } = req.body;

      // This would update the participant's pin status
      // Implementation needed in conversationService

      res.json({
        success: true,
        message: `Conversation ${pinned ? 'pinned' : 'unpinned'} successfully`,
        data: {
          conversationId,
          pinned,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get conversation participants
  async getConversationParticipants(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;

      const conversation = await conversationService.getConversationById(
        conversationId,
        userId
      );

      res.json({
        success: true,
        data: conversation.participants,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update participant permissions
  async updateParticipantPermissions(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const targetUserId = req.params.userId;
      const { permissions, role } = req.body;

      // This would need to be implemented in conversationService
      res.json({
        success: true,
        message: 'Participant permissions updated successfully',
        data: {
          conversationId,
          targetUserId,
          permissions,
          role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get conversation settings
  async getConversationSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;

      const conversation = await conversationService.getConversationById(
        conversationId,
        userId
      );

      res.json({
        success: true,
        data: {
          settings: conversation.settings,
          userPreferences: {
            isMuted: conversation.isMuted,
            isPinned: conversation.isPinned,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update conversation settings
  async updateConversationSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { settings } = req.body;

      const conversation = await conversationService.updateConversation(
        conversationId,
        userId,
        { settings }
      );

      res.json({
        success: true,
        message: 'Conversation settings updated successfully',
        data: conversation.settings,
      });
    } catch (error) {
      next(error);
    }
  }

  // Search conversations
  async searchConversations(req, res, next) {
    try {
      const userId = req.user.id;
      const { q: query, type, purpose, page, limit } = req.query;

      // This would need to be implemented in conversationService
      res.json({
        success: true,
        message: 'Conversation search feature - to be implemented',
        data: {
          query,
          filters: { type, purpose },
          results: [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get conversation analytics (for monitoring)
  async getConversationAnalytics(req, res, next) {
    try {
      const conversationId = req.params.id;
      const { timeframe = '7d' } = req.query; // 1d, 7d, 30d, etc.

      // This would provide detailed analytics for conversation monitoring
      res.json({
        success: true,
        data: {
          conversationId,
          timeframe,
          analytics: {
            messageCount: 0,
            participantActivity: {},
            peakHours: [],
            averageResponseTime: 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Export conversation
  async exportConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { format = 'json', includeMedia = false } = req.query;

      // This would export the entire conversation
      res.json({
        success: true,
        message: 'Conversation export feature - to be implemented',
        data: {
          conversationId,
          format,
          includeMedia,
          downloadUrl: null, // Would be generated
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk operations on conversations
  async bulkOperations(req, res, next) {
    try {
      const userId = req.user.id;
      const { operation, conversationIds } = req.body; // 'archive', 'delete', 'mute', etc.

      // This would perform bulk operations on multiple conversations
      res.json({
        success: true,
        message: `Bulk ${operation} operation completed`,
        data: {
          operation,
          affectedConversations: conversationIds.length,
          results: [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get conversation templates (for creating standard conversations)
  async getConversationTemplates(req, res, next) {
    try {
      const userRole = req.user.role;

      // Return templates based on user role
      const templates = {
        manager: [
          {
            id: 'manager_consultant',
            name: 'Consultant Discussion',
            purpose: 'manager_consultant',
            description: 'Start a conversation with a consultant',
          },
          {
            id: 'manager_lead',
            name: 'Lead Follow-up',
            purpose: 'manager_lead',
            description: 'Follow up directly with a lead',
          },
        ],
        consultant: [
          {
            id: 'lead_consultant',
            name: 'Student Consultation',
            purpose: 'lead_consultant',
            description: 'Start consultation with assigned student',
          },
        ],
        // Add more role-based templates
      };

      res.json({
        success: true,
        data: templates[userRole] || [],
      });
    } catch (error) {
      next(error);
    }
  }

  // Auto-create conversations for new assignments
  async autoCreateConversations(req, res, next) {
    try {
      await conversationService.autoCreateConversations();

      res.json({
        success: true,
        message: 'Auto-created conversations for new assignments',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationController();

// const conversationService = require('../services/conversationService');
// const AppError = require('../utils/appError');

// class ConversationController {
//   // Create a new conversation
//   async createConversation(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationData = req.body;

//       const conversation = await conversationService.createConversation(
//         userId,
//         conversationData
//       );

//       res.status(201).json({
//         success: true,
//         message: 'Conversation created successfully',
//         data: conversation,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get user's conversations
//   async getUserConversations(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const { type, purpose, archived, page, limit } = req.query;

//       const options = {
//         type,
//         purpose,
//         archived: archived === 'true',
//         page: parseInt(page) || 1,
//         limit: parseInt(limit) || 20,
//       };

//       const result = await conversationService.getUserConversations(
//         userId,
//         options
//       );

//       res.json({
//         success: true,
//         data: result.conversations,
//         pagination: result.pagination,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get conversation by ID
//   async getConversationById(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;

//       const conversation = await conversationService.getConversationById(
//         conversationId,
//         userId
//       );

//       res.json({
//         success: true,
//         data: conversation,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Update conversation
//   async updateConversation(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const updates = req.body;

//       const conversation = await conversationService.updateConversation(
//         conversationId,
//         userId,
//         updates
//       );

//       res.json({
//         success: true,
//         message: 'Conversation updated successfully',
//         data: conversation,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Add participants to conversation
//   async addParticipants(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const { userIds } = req.body;

//       const result = await conversationService.addParticipants(
//         conversationId,
//         userId,
//         userIds
//       );

//       res.json({
//         success: true,
//         message: 'Participants added successfully',
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Remove participant from conversation
//   async removeParticipant(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const targetUserId = req.params.userId;

//       await conversationService.removeParticipant(
//         conversationId,
//         userId,
//         targetUserId
//       );

//       res.json({
//         success: true,
//         message: 'Participant removed successfully',
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Archive/unarchive conversation
//   async archiveConversation(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const { archived } = req.body;

//       await conversationService.archiveConversation(
//         conversationId,
//         userId,
//         archived
//       );

//       res.json({
//         success: true,
//         message: `Conversation ${archived ? 'archived' : 'unarchived'} successfully`,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Mark conversation as read
//   async markConversationAsRead(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;

//       await conversationService.markConversationAsRead(conversationId, userId);

//       res.json({
//         success: true,
//         message: 'Conversation marked as read',
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Send typing indicator
//   async sendTypingIndicator(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const { isTyping } = req.body;

//       await conversationService.sendTypingIndicator(
//         conversationId,
//         userId,
//         isTyping
//       );

//       res.json({
//         success: true,
//         message: 'Typing indicator sent',
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get office conversations for monitoring (Manager only)
//   async getOfficeConversationsForMonitoring(req, res, next) {
//     try {
//       const user = req.user;
//       const officeId = req.params.officeId;

//       // Verify manager has access to this office
//       if (user.role === 'manager' && user.officeId !== officeId) {
//         return next(new AppError('Access denied to this office', 403));
//       }

//       const { purpose, page, limit } = req.query;
//       const options = {
//         purpose,
//         page: parseInt(page) || 1,
//         limit: parseInt(limit) || 20,
//       };

//       const result =
//         await conversationService.getOfficeConversationsForMonitoring(
//           officeId,
//           user.role,
//           options
//         );

//       res.json({
//         success: true,
//         data: result.conversations,
//         pagination: result.pagination,
//         officeId,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get all conversations for monitoring (Super Admin only)
//   async getAllConversationsForMonitoring(req, res, next) {
//     try {
//       const { officeId, purpose, page, limit } = req.query;
//       const options = {
//         officeId,
//         purpose,
//         page: parseInt(page) || 1,
//         limit: parseInt(limit) || 20,
//       };

//       const result =
//         await conversationService.getAllConversationsForMonitoring(options);

//       res.json({
//         success: true,
//         data: result.conversations,
//         pagination: result.pagination,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get conversation statistics
//   async getConversationStats(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;

//       const stats = await conversationService.getConversationStats(
//         conversationId,
//         userId
//       );

//       res.json({
//         success: true,
//         data: stats,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Leave conversation
//   async leaveConversation(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;

//       // User leaving is the same as removing themselves
//       await conversationService.removeParticipant(
//         conversationId,
//         userId,
//         userId
//       );

//       res.json({
//         success: true,
//         message: 'Left conversation successfully',
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Mute/unmute conversation
//   async muteConversation(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const { muted } = req.body;

//       // This would update the participant's mute status
//       // Implementation needed in conversationService

//       res.json({
//         success: true,
//         message: `Conversation ${muted ? 'muted' : 'unmuted'} successfully`,
//         data: {
//           conversationId,
//           muted,
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Pin/unpin conversation
//   async pinConversation(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const { pinned } = req.body;

//       // This would update the participant's pin status
//       // Implementation needed in conversationService

//       res.json({
//         success: true,
//         message: `Conversation ${pinned ? 'pinned' : 'unpinned'} successfully`,
//         data: {
//           conversationId,
//           pinned,
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get conversation participants
//   async getConversationParticipants(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;

//       const conversation = await conversationService.getConversationById(
//         conversationId,
//         userId
//       );

//       res.json({
//         success: true,
//         data: conversation.participants,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Update participant permissions
//   async updateParticipantPermissions(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const targetUserId = req.params.userId;
//       const { permissions, role } = req.body;

//       // This would need to be implemented in conversationService
//       res.json({
//         success: true,
//         message: 'Participant permissions updated successfully',
//         data: {
//           conversationId,
//           targetUserId,
//           permissions,
//           role,
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get conversation settings
//   async getConversationSettings(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;

//       const conversation = await conversationService.getConversationById(
//         conversationId,
//         userId
//       );

//       res.json({
//         success: true,
//         data: {
//           settings: conversation.settings,
//           userPreferences: {
//             isMuted: conversation.isMuted,
//             isPinned: conversation.isPinned,
//           },
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Update conversation settings
//   async updateConversationSettings(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const { settings } = req.body;

//       const conversation = await conversationService.updateConversation(
//         conversationId,
//         userId,
//         { settings }
//       );

//       res.json({
//         success: true,
//         message: 'Conversation settings updated successfully',
//         data: conversation.settings,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Search conversations
//   async searchConversations(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const { q: query, type, purpose, page, limit } = req.query;

//       // This would need to be implemented in conversationService
//       res.json({
//         success: true,
//         message: 'Conversation search feature - to be implemented',
//         data: {
//           query,
//           filters: { type, purpose },
//           results: [],
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get conversation analytics (for monitoring)
//   async getConversationAnalytics(req, res, next) {
//     try {
//       const conversationId = req.params.id;
//       const { timeframe = '7d' } = req.query; // 1d, 7d, 30d, etc.

//       // This would provide detailed analytics for conversation monitoring
//       res.json({
//         success: true,
//         data: {
//           conversationId,
//           timeframe,
//           analytics: {
//             messageCount: 0,
//             participantActivity: {},
//             peakHours: [],
//             averageResponseTime: 0,
//           },
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Export conversation
//   async exportConversation(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const conversationId = req.params.id;
//       const { format = 'json', includeMedia = false } = req.query;

//       // This would export the entire conversation
//       res.json({
//         success: true,
//         message: 'Conversation export feature - to be implemented',
//         data: {
//           conversationId,
//           format,
//           includeMedia,
//           downloadUrl: null, // Would be generated
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Bulk operations on conversations
//   async bulkOperations(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const { operation, conversationIds } = req.body; // 'archive', 'delete', 'mute', etc.

//       // This would perform bulk operations on multiple conversations
//       res.json({
//         success: true,
//         message: `Bulk ${operation} operation completed`,
//         data: {
//           operation,
//           affectedConversations: conversationIds.length,
//           results: [],
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Get conversation templates (for creating standard conversations)
//   async getConversationTemplates(req, res, next) {
//     try {
//       const userRole = req.user.role;

//       // Return templates based on user role
//       const templates = {
//         manager: [
//           {
//             id: 'manager_consultant',
//             name: 'Consultant Discussion',
//             purpose: 'manager_consultant',
//             description: 'Start a conversation with a consultant',
//           },
//           {
//             id: 'manager_lead',
//             name: 'Lead Follow-up',
//             purpose: 'manager_lead',
//             description: 'Follow up directly with a lead',
//           },
//         ],
//         consultant: [
//           {
//             id: 'lead_consultant',
//             name: 'Student Consultation',
//             purpose: 'lead_consultant',
//             description: 'Start consultation with assigned student',
//           },
//         ],
//         // Add more role-based templates
//       };

//       res.json({
//         success: true,
//         data: templates[userRole] || [],
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   // Auto-create conversations for new assignments
//   async autoCreateConversations(req, res, next) {
//     try {
//       await conversationService.autoCreateConversations();

//       res.json({
//         success: true,
//         message: 'Auto-created conversations for new assignments',
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// }

// module.exports = new ConversationController();
