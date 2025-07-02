const { Op, Sequelize } = require('sequelize');
const {
  Conversation,
  ConversationParticipant,
  Message,
  User,
  Lead,
  Office,
} = require('../models');
const socketService = require('./socketService');
const notificationService = require('./notificationService');
const AppError = require('../utils/appError');

class ConversationService {
  // Create a new conversation
  async createConversation(creatorId, data) {
    try {
      const {
        participants,
        type = 'direct',
        purpose,
        name,
        settings = {},
      } = data;

      // Get creator info
      const creator = await User.findByPk(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      // Check if direct conversation already exists between these participants
      if (type === 'direct' && participants.length === 2) {
        const existingConversation = await this.findExistingDirectConversation(
          participants,
          purpose
        );
        if (existingConversation) {
          return existingConversation;
        }
      }

      // Create conversation
      const conversation = await Conversation.create({
        name: name || (type === 'direct' ? null : `Group Chat`),
        type,
        purpose,
        officeId: creator.officeId,
        createdBy: creatorId,
        settings: {
          notifications: true,
          soundEnabled: true,
          theme: 'default',
          ...settings,
        },
      });

      // Add participants
      const participantPromises = participants.map((userId) =>
        ConversationParticipant.create({
          conversationId: conversation.id,
          userId,
          role: userId === creatorId ? 'admin' : 'member',
          addedById: creatorId,
          joinedAt: new Date(),
          permissions: this.getDefaultPermissions(
            purpose,
            userId === creatorId
          ),
        })
      );

      await Promise.all(participantPromises);

      // Get complete conversation with participants
      const completeConversation = await this.getConversationById(
        conversation.id,
        creatorId
      );

      // Emit real-time event to all participants
      await socketService.emitToUsers(participants, 'conversation_created', {
        conversation: completeConversation,
      });

      // Send notifications to participants (except creator)
      const otherParticipants = participants.filter((id) => id !== creatorId);
      for (const participantId of otherParticipants) {
        await notificationService.sendNotification({
          userId: participantId,
          type: 'in_app',
          message: `${creator.name} started a conversation with you`,
          details: {
            conversationId: conversation.id,
            creatorId,
            purpose,
          },
        });
      }

      // Create welcome message for group conversations
      if (type === 'group') {
        await Message.create({
          conversationId: conversation.id,
          senderId: creatorId,
          content: `${creator.name} created this group conversation`,
          type: 'system',
          metadata: { systemEvent: 'conversation_created' },
        });
      }

      return completeConversation;
    } catch (error) {
      throw error;
    }
  }

  // Get consultant's assigned leads
  async getConsultantLeads(consultantId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Get all leads assigned to this consultant
      const leads = await Lead.findAndCountAll({
        where: {
          assignedConsultant: consultantId,
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'name', 'email', 'phone'],
          },
          {
            model: User,
            as: 'consultant',
            attributes: ['id', 'name', 'email'],
          },
        ],
        order: [['updatedAt', 'DESC']],
        limit,
        offset,
      });

      // For each lead, get conversation info and unread count
      const leadsWithConversationInfo = await Promise.all(
        leads.rows.map(async (lead) => {
          if (!lead.student) return null;

          // Find existing conversation between consultant and lead
          const existingConversation =
            await this.findExistingDirectConversation(
              [consultantId, lead.student.id],
              'lead_consultant'
            );

          let unreadCount = 0;
          let lastMessage = null;
          let lastMessageAt = null;
          let conversationId = null;

          if (existingConversation) {
            conversationId = existingConversation.id;
            // Get unread count for consultant
            const consultantParticipant = await ConversationParticipant.findOne(
              {
                where: {
                  conversationId: existingConversation.id,
                  userId: consultantId,
                },
              }
            );
            unreadCount = consultantParticipant?.unreadCount || 0;

            // Get last message
            if (existingConversation.lastMessageId) {
              lastMessage = await Message.findByPk(
                existingConversation.lastMessageId,
                {
                  include: [
                    {
                      model: User,
                      as: 'sender',
                      attributes: ['id', 'name'],
                    },
                  ],
                }
              );
            }
            lastMessageAt = existingConversation.lastMessageAt;
          }

          return {
            id: lead.student.id, // Use student ID as the identifier
            leadId: lead.id,
            conversationId,
            name: lead.student.name,
            email: lead.student.email,
            phone: lead.student.phone,
            leadStatus: lead.status,
            unreadCount,
            lastMessage,
            lastMessageAt,
            hasConversation: !!existingConversation,
          };
        })
      );

      // Filter out null entries
      const validLeads = leadsWithConversationInfo.filter(
        (lead) => lead !== null
      );

      return {
        leads: validLeads,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(leads.count / limit),
          totalLeads: leads.count,
          hasNext: page * limit < leads.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get manager conversations (for their office)
  async getManagerConversations(managerId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Get manager's office
      const manager = await User.findByPk(managerId, {
        attributes: ['id', 'name', 'officeId'],
      });

      if (!manager || !manager.officeId) {
        throw new AppError('Manager office not found', 404);
      }

      // Get all lead-consultant conversations in this office
      const conversations = await Conversation.findAndCountAll({
        where: {
          officeId: manager.officeId,
          purpose: 'lead_consultant',
          isActive: true,
        },
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'email', 'role'],
              },
            ],
          },
        ],
        order: [['lastMessageAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      // Format conversations for manager view
      const formattedConversations = await Promise.all(
        conversations.rows.map(async (conversation) => {
          const participants = conversation.participants;
          const consultant = participants.find(
            (p) => p.User.role === 'consultant'
          );
          const student = participants.find((p) => p.User.role === 'student');

          // Get last message
          let lastMessage = null;
          if (conversation.lastMessageId) {
            lastMessage = await Message.findByPk(conversation.lastMessageId, {
              include: [
                {
                  model: User,
                  as: 'sender',
                  attributes: ['id', 'name'],
                },
              ],
            });
          }

          // Get total unread messages in conversation
          const unreadCount = await Message.count({
            where: {
              conversationId: conversation.id,
              readAt: null,
            },
          });

          return {
            id: conversation.id,
            displayName: `${consultant?.User?.name || 'Unknown'} - ${student?.User?.name || 'Unknown'}`,
            consultantName: consultant?.User?.name,
            consultantEmail: consultant?.User?.email,
            studentName: student?.User?.name,
            studentEmail: student?.User?.email,
            lastMessage,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount,
            participants: conversation.participants,
            type: 'monitoring',
          };
        })
      );

      return {
        conversations: formattedConversations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(conversations.count / limit),
          totalConversations: conversations.count,
          hasNext: page * limit < conversations.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get super admin conversations (all conversations)
  async getSuperAdminConversations(options = {}) {
    try {
      const { page = 1, limit = 20, officeId } = options;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {
        purpose: 'lead_consultant',
        isActive: true,
      };
      if (officeId) {
        whereClause.officeId = officeId;
      }

      // Get all lead-consultant conversations
      const conversations = await Conversation.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'email', 'role'],
              },
            ],
          },
          {
            model: Office,
            attributes: ['id', 'name'],
          },
        ],
        order: [['lastMessageAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      // Format conversations for super admin view
      const formattedConversations = await Promise.all(
        conversations.rows.map(async (conversation) => {
          const participants = conversation.participants;
          const consultant = participants.find(
            (p) => p.User.role === 'consultant'
          );
          const student = participants.find((p) => p.User.role === 'student');

          // Get last message
          let lastMessage = null;
          if (conversation.lastMessageId) {
            lastMessage = await Message.findByPk(conversation.lastMessageId, {
              include: [
                {
                  model: User,
                  as: 'sender',
                  attributes: ['id', 'name'],
                },
              ],
            });
          }

          // Get total unread messages in conversation
          const unreadCount = await Message.count({
            where: {
              conversationId: conversation.id,
              readAt: null,
            },
          });

          return {
            id: conversation.id,
            displayName: `${consultant?.User?.name || 'Unknown'} - ${student?.User?.name || 'Unknown'}`,
            consultantName: consultant?.User?.name,
            consultantEmail: consultant?.User?.email,
            studentName: student?.User?.name,
            studentEmail: student?.User?.email,
            officeName: conversation.Office?.name,
            officeId: conversation.officeId,
            lastMessage,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount,
            participants: conversation.participants,
            type: 'monitoring',
          };
        })
      );

      return {
        conversations: formattedConversations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(conversations.count / limit),
          totalConversations: conversations.count,
          hasNext: page * limit < conversations.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify consultant has access to lead
  async verifyConsultantLeadAccess(consultantId, leadUserId) {
    try {
      const lead = await Lead.findOne({
        where: {
          assignedConsultant: consultantId,
          studentId: leadUserId,
        },
      });
      return !!lead;
    } catch (error) {
      return false;
    }
  }

  // Get or create conversation between consultant and lead
  async getOrCreateLeadConversation(userId, leadUserId, userRole) {
    try {
      let consultantId, studentId;

      if (userRole === 'consultant') {
        consultantId = userId;
        studentId = leadUserId;
      } else {
        // For manager/super_admin accessing existing conversation
        const lead = await Lead.findOne({
          where: { studentId: leadUserId },
          include: [
            { model: User, as: 'consultant', attributes: ['id'] },
            { model: User, as: 'student', attributes: ['id'] },
          ],
        });

        if (!lead) {
          throw new AppError('Lead not found', 404);
        }

        consultantId = lead.assignedConsultant;
        studentId = lead.studentId;
      }

      // Check if conversation already exists
      const existingConversation = await this.findExistingDirectConversation(
        [consultantId, studentId],
        'lead_consultant'
      );

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation if user is consultant
      if (userRole === 'consultant') {
        return await this.createConversation(consultantId, {
          participants: [consultantId, studentId],
          type: 'direct',
          purpose: 'lead_consultant',
        });
      } else {
        throw new AppError('Conversation not found', 404);
      }
    } catch (error) {
      throw error;
    }
  }

  // Find existing direct conversation
  async findExistingDirectConversation(participants, purpose) {
    try {
      if (participants.length !== 2) return null;

      const conversations = await Conversation.findAll({
        where: {
          type: 'direct',
          purpose,
        },
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            required: true,
          },
        ],
      });

      // Find conversation with exactly these two participants
      for (const conversation of conversations) {
        const participantIds = conversation.participants
          .map((p) => p.userId)
          .sort();
        const targetIds = participants.sort();

        if (
          participantIds.length === 2 &&
          participantIds[0] === targetIds[0] &&
          participantIds[1] === targetIds[1]
        ) {
          return await this.getConversationById(
            conversation.id,
            participants[0]
          );
        }
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  // Get conversation by ID - Modified to handle monitoring access
  async getConversationById(conversationId, userId, userRole = null) {
    try {
      // For managers and super admins, allow monitoring access
      if (userRole === 'manager' || userRole === 'super_admin') {
        const conversation = await Conversation.findByPk(conversationId, {
          include: [
            {
              model: ConversationParticipant,
              as: 'participants',
              where: { isActive: true },
              include: [
                {
                  model: User,
                  attributes: ['id', 'name', 'email', 'role'],
                },
              ],
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'role'],
            },
            {
              model: Office,
              attributes: ['id', 'name'],
            },
          ],
        });

        if (!conversation) {
          throw new AppError('Conversation not found', 404);
        }

        // For managers, verify they have access to this office
        if (userRole === 'manager') {
          const manager = await User.findByPk(userId, {
            attributes: ['officeId'],
          });
          if (manager.officeId !== conversation.officeId) {
            throw new AppError('Access denied to this conversation', 403);
          }
        }

        // Add monitoring metadata
        conversation.dataValues.userRole = 'monitor';
        conversation.dataValues.unreadCount = 0;
        conversation.dataValues.lastReadAt = null;
        conversation.dataValues.isMuted = false;
        conversation.dataValues.isPinned = false;

        return conversation;
      }

      // Regular participant access
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      const conversation = await Conversation.findByPk(conversationId, {
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'email', 'role'],
              },
            ],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'role'],
          },
          {
            model: Office,
            attributes: ['id', 'name'],
          },
        ],
      });

      // Get last message separately to avoid association issues
      let lastMessage = null;
      if (conversation.lastMessageId) {
        lastMessage = await Message.findByPk(conversation.lastMessageId, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'name'],
            },
          ],
        });
      }

      // Add last message to conversation data
      if (lastMessage) {
        conversation.dataValues.lastMessage = lastMessage;
      }

      // Add user-specific data
      const userParticipant = conversation.participants.find(
        (p) => p.userId === userId
      );
      conversation.dataValues.userRole = userParticipant.role;
      conversation.dataValues.unreadCount = userParticipant.unreadCount;
      conversation.dataValues.lastReadAt = userParticipant.lastReadAt;
      conversation.dataValues.isMuted = userParticipant.isMuted;
      conversation.dataValues.isPinned = userParticipant.isPinned;

      return conversation;
    } catch (error) {
      throw error;
    }
  }

  // Get user conversations (for students and other regular users)
  async getUserConversations(userId, options = {}) {
    try {
      const { type, purpose, archived = false, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = { isActive: true };
      if (type) whereClause.type = type;
      if (purpose) whereClause.purpose = purpose;
      if (archived) whereClause.isArchived = true;

      // First, get conversations where user is participant
      const userParticipants = await ConversationParticipant.findAll({
        where: {
          userId,
          isActive: true,
        },
        include: [
          {
            model: Conversation,
            where: whereClause,
          },
        ],
      });

      const conversationIds = userParticipants.map((p) => p.conversationId);

      if (conversationIds.length === 0) {
        return {
          conversations: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalConversations: 0,
            hasNext: false,
            hasPrevious: false,
          },
        };
      }

      // Get conversations with all participants
      const conversations = await Conversation.findAndCountAll({
        where: {
          id: conversationIds,
          ...whereClause,
        },
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'email', 'role'],
              },
            ],
          },
        ],
        order: [['lastMessageAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      // Add user-specific data and last message to each conversation
      const conversationsWithUserData = await Promise.all(
        conversations.rows.map(async (conversation) => {
          const userParticipant = conversation.participants.find(
            (p) => p.userId === userId
          );

          // Add user-specific fields directly to the conversation object
          const conversationData = conversation.toJSON();
          conversationData.userRole = userParticipant?.role || 'member';
          conversationData.unreadCount = userParticipant?.unreadCount || 0;
          conversationData.lastReadAt = userParticipant?.lastReadAt;
          conversationData.isMuted = userParticipant?.isMuted || false;
          conversationData.isPinned = userParticipant?.isPinned || false;

          // Get last message separately
          if (conversation.lastMessageId) {
            try {
              const lastMessage = await Message.findByPk(
                conversation.lastMessageId,
                {
                  include: [
                    {
                      model: User,
                      as: 'sender',
                      attributes: ['id', 'name'],
                    },
                  ],
                }
              );
              conversationData.lastMessage = lastMessage;
            } catch (error) {
              console.error('Error fetching last message:', error);
              conversationData.lastMessage = null;
            }
          }

          return conversationData;
        })
      );

      return {
        conversations: conversationsWithUserData,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(conversations.count / limit),
          totalConversations: conversations.count,
          hasNext: page * limit < conversations.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      throw error;
    }
  }

  // Update conversation
  async updateConversation(conversationId, userId, updates) {
    try {
      // Verify user has permission to update conversation
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      if (
        participant.role !== 'admin' &&
        !participant.permissions.canEditConversation
      ) {
        throw new AppError('No permission to update this conversation', 403);
      }

      const conversation = await Conversation.findByPk(conversationId);
      await conversation.update(updates);

      // Get updated conversation
      const updatedConversation = await this.getConversationById(
        conversationId,
        userId
      );

      // Emit real-time update
      await socketService.emitToConversation(
        conversationId,
        'conversation_updated',
        {
          conversation: updatedConversation,
          updatedBy: userId,
        }
      );

      return updatedConversation;
    } catch (error) {
      throw error;
    }
  }

  // Add participants to conversation
  async addParticipants(conversationId, userId, userIds) {
    try {
      // Verify user has permission
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant || !participant.permissions.canAddMembers) {
        throw new AppError('No permission to add participants', 403);
      }

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) {
        throw new AppError('Conversation not found', 404);
      }

      // Validate new participants
      const newUsers = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'name', 'role', 'officeId'],
      });

      if (newUsers.length !== userIds.length) {
        throw new AppError('One or more users not found', 404);
      }

      // Add participants
      const addPromises = userIds.map(async (newUserId) => {
        // Check if already participant
        const existingParticipant = await ConversationParticipant.findOne({
          where: { conversationId, userId: newUserId },
        });

        if (existingParticipant) {
          if (!existingParticipant.isActive) {
            // Reactivate if previously removed
            await existingParticipant.update({
              isActive: true,
              leftAt: null,
              addedById: userId,
              joinedAt: new Date(),
            });
          }
          return existingParticipant;
        }

        // Create new participant
        return await ConversationParticipant.create({
          conversationId,
          userId: newUserId,
          role: 'member',
          addedById: userId,
          joinedAt: new Date(),
          permissions: this.getDefaultPermissions(conversation.purpose, false),
        });
      });

      await Promise.all(addPromises);

      // Create system message
      const adder = await User.findByPk(userId, { attributes: ['name'] });
      const addedNames = newUsers.map((u) => u.name).join(', ');

      await Message.create({
        conversationId,
        senderId: userId,
        content: `${adder.name} added ${addedNames} to the conversation`,
        type: 'system',
        metadata: {
          systemEvent: 'participants_added',
          addedUsers: userIds,
        },
      });

      // Emit real-time updates
      await socketService.emitToConversation(
        conversationId,
        'participants_added',
        {
          conversationId,
          addedUsers: newUsers,
          addedBy: userId,
        }
      );

      // Send notifications to new participants
      for (const newUser of newUsers) {
        await notificationService.sendNotification({
          userId: newUser.id,
          type: 'in_app',
          message: `${adder.name} added you to a conversation`,
          details: {
            conversationId,
            addedBy: userId,
          },
        });
      }

      return { success: true, addedUsers: newUsers };
    } catch (error) {
      throw error;
    }
  }

  // Remove participant from conversation
  async removeParticipant(conversationId, userId, targetUserId) {
    try {
      // Verify user has permission
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (
        !participant ||
        (!participant.permissions.canRemoveMembers && userId !== targetUserId)
      ) {
        throw new AppError('No permission to remove this participant', 403);
      }

      // Find target participant
      const targetParticipant = await ConversationParticipant.findOne({
        where: { conversationId, userId: targetUserId, isActive: true },
      });

      if (!targetParticipant) {
        throw new AppError('Participant not found', 404);
      }

      // Cannot remove conversation creator unless they're leaving themselves
      const conversation = await Conversation.findByPk(conversationId);
      if (conversation.createdBy === targetUserId && userId !== targetUserId) {
        throw new AppError('Cannot remove conversation creator', 403);
      }

      // Remove participant
      await targetParticipant.update({
        isActive: false,
        leftAt: new Date(),
      });

      // Create system message
      const remover = await User.findByPk(userId, { attributes: ['name'] });
      const targetUser = await User.findByPk(targetUserId, {
        attributes: ['name'],
      });

      const isLeaving = userId === targetUserId;
      const content = isLeaving
        ? `${targetUser.name} left the conversation`
        : `${remover.name} removed ${targetUser.name} from the conversation`;

      await Message.create({
        conversationId,
        senderId: userId,
        content,
        type: 'system',
        metadata: {
          systemEvent: isLeaving ? 'participant_left' : 'participant_removed',
          targetUser: targetUserId,
        },
      });

      // Emit real-time updates
      await socketService.emitToConversation(
        conversationId,
        'participant_removed',
        {
          conversationId,
          removedUser: targetUserId,
          removedBy: userId,
          isLeaving,
        }
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Archive/unarchive conversation
  async archiveConversation(conversationId, userId, archived) {
    try {
      // Verify user is participant
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      const conversation = await Conversation.findByPk(conversationId);
      await conversation.update({ isArchived: archived });

      // Emit real-time update
      await socketService.emitToConversation(
        conversationId,
        'conversation_archived',
        {
          conversationId,
          archived,
          archivedBy: userId,
        }
      );

      return { success: true, archived };
    } catch (error) {
      throw error;
    }
  }

  // Mark conversation as read
  async markConversationAsRead(conversationId, userId) {
    try {
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      // Update participant's read status
      await participant.update({
        lastReadAt: new Date(),
        unreadCount: 0,
      });

      // Mark all messages as read
      await Message.update(
        { readAt: new Date() },
        {
          where: {
            conversationId,
            senderId: { [Op.ne]: userId },
            readAt: null,
          },
        }
      );

      // Emit read receipt
      await socketService.emitToConversation(
        conversationId,
        'conversation_read',
        {
          conversationId,
          userId,
          readAt: new Date(),
        }
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Send typing indicator
  async sendTypingIndicator(conversationId, userId, isTyping) {
    try {
      // Verify user is participant
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      // Emit typing indicator to other participants
      await socketService.emitToConversationExcept(
        conversationId,
        userId,
        'user_typing',
        {
          conversationId,
          userId,
          isTyping,
          timestamp: new Date(),
        }
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Get office conversations for monitoring (Manager/Super Admin)
  async getOfficeConversationsForMonitoring(officeId, userRole, options = {}) {
    try {
      const { purpose, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = { officeId, isActive: true };
      if (purpose) whereClause.purpose = purpose;

      const conversations = await Conversation.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'email', 'role'],
              },
            ],
          },
          {
            model: Message,
            as: 'lastMessage',
            include: [
              {
                model: User,
                as: 'sender',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        order: [['lastMessageAt', 'DESC']],
        limit,
        offset,
      });

      return {
        conversations: conversations.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(conversations.count / limit),
          totalConversations: conversations.count,
          hasNext: page * limit < conversations.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all conversations for monitoring (Super Admin only)
  async getAllConversationsForMonitoring(options = {}) {
    try {
      const { officeId, purpose, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = { isActive: true };
      if (officeId) whereClause.officeId = officeId;
      if (purpose) whereClause.purpose = purpose;

      const conversations = await Conversation.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { isActive: true },
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'email', 'role'],
              },
            ],
          },
          {
            model: Message,
            as: 'lastMessage',
            include: [
              {
                model: User,
                as: 'sender',
                attributes: ['id', 'name'],
              },
            ],
          },
          {
            model: Office,
            attributes: ['id', 'name'],
          },
        ],
        order: [['lastMessageAt', 'DESC']],
        limit,
        offset,
      });

      return {
        conversations: conversations.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(conversations.count / limit),
          totalConversations: conversations.count,
          hasNext: page * limit < conversations.count,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Auto-create conversations based on assignments
  async autoCreateConversations() {
    try {
      // Create lead-consultant conversations for new assignments
      const unassignedLeads = await Lead.findAll({
        where: {
          assignedConsultant: { [Op.ne]: null },
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id'],
          },
          {
            model: User,
            as: 'consultant',
            attributes: ['id'],
          },
        ],
      });

      for (const lead of unassignedLeads) {
        if (lead.student && lead.consultant) {
          // Check if conversation already exists
          const existingConversation =
            await this.findExistingDirectConversation(
              [lead.student.id, lead.consultant.id],
              'lead_consultant'
            );

          if (!existingConversation) {
            await this.createConversation(lead.consultant.id, {
              participants: [lead.student.id, lead.consultant.id],
              type: 'direct',
              purpose: 'lead_consultant',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error auto-creating conversations:', error);
    }
  }

  // Get default permissions based on conversation purpose and role
  getDefaultPermissions(purpose, isAdmin) {
    const basePermissions = {
      canSendMessages: true,
      canSendFiles: true,
      canAddMembers: false,
      canRemoveMembers: false,
      canEditConversation: false,
    };

    if (isAdmin) {
      return {
        ...basePermissions,
        canAddMembers: true,
        canRemoveMembers: true,
        canEditConversation: true,
      };
    }

    // Specific permissions based on purpose
    switch (purpose) {
      case 'lead_consultant':
      case 'manager_consultant':
      case 'manager_receptionist':
      case 'manager_lead':
        return basePermissions; // Direct conversations have standard permissions

      case 'general':
      case 'support':
        return {
          ...basePermissions,
          canAddMembers: true, // Allow adding members to general/support chats
        };

      default:
        return basePermissions;
    }
  }

  // Get conversation statistics
  async getConversationStats(conversationId, userId) {
    try {
      // Verify access
      const participant = await ConversationParticipant.findOne({
        where: { conversationId, userId, isActive: true },
      });

      if (!participant) {
        throw new AppError('Access denied to this conversation', 403);
      }

      // Get message count
      const totalMessages = await Message.count({
        where: { conversationId },
      });

      // Get participant count
      const participantCount = await ConversationParticipant.count({
        where: { conversationId, isActive: true },
      });

      // Get messages by type
      const messagesByType = await Message.findAll({
        where: { conversationId },
        attributes: [
          'type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        group: ['type'],
      });

      return {
        totalMessages,
        participantCount,
        messagesByType: messagesByType.reduce((acc, item) => {
          acc[item.type] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ConversationService();

// const { Op, Sequelize } = require('sequelize');
// const {
//   Conversation,
//   ConversationParticipant,
//   Message,
//   User,
//   Lead,
//   Office,
// } = require('../models');
// const socketService = require('./socketService');
// const notificationService = require('./notificationService');
// const AppError = require('../utils/appError');

// class ConversationService {
//   // Create a new conversation
//   async createConversation(creatorId, data) {
//     try {
//       const {
//         participants,
//         type = 'direct',
//         purpose,
//         name,
//         settings = {},
//       } = data;

//       // Get creator info
//       const creator = await User.findByPk(creatorId);
//       if (!creator) {
//         throw new AppError('Creator not found', 404);
//       }

//       // Check if direct conversation already exists between these participants
//       if (type === 'direct' && participants.length === 2) {
//         const existingConversation = await this.findExistingDirectConversation(
//           participants,
//           purpose
//         );
//         if (existingConversation) {
//           return existingConversation;
//         }
//       }

//       // Create conversation
//       const conversation = await Conversation.create({
//         name: name || (type === 'direct' ? null : `Group Chat`),
//         type,
//         purpose,
//         officeId: creator.officeId,
//         createdBy: creatorId,
//         settings: {
//           notifications: true,
//           soundEnabled: true,
//           theme: 'default',
//           ...settings,
//         },
//       });

//       // Add participants
//       const participantPromises = participants.map((userId) =>
//         ConversationParticipant.create({
//           conversationId: conversation.id,
//           userId,
//           role: userId === creatorId ? 'admin' : 'member',
//           addedById: creatorId,
//           joinedAt: new Date(),
//           permissions: this.getDefaultPermissions(
//             purpose,
//             userId === creatorId
//           ),
//         })
//       );

//       await Promise.all(participantPromises);

//       // Get complete conversation with participants
//       const completeConversation = await this.getConversationById(
//         conversation.id,
//         creatorId
//       );

//       // Emit real-time event to all participants
//       await socketService.emitToUsers(participants, 'conversation_created', {
//         conversation: completeConversation,
//       });

//       // Send notifications to participants (except creator)
//       const otherParticipants = participants.filter((id) => id !== creatorId);
//       for (const participantId of otherParticipants) {
//         await notificationService.sendNotification({
//           userId: participantId,
//           type: 'in_app',
//           message: `${creator.name} started a conversation with you`,
//           details: {
//             conversationId: conversation.id,
//             creatorId,
//             purpose,
//           },
//         });
//       }

//       // Create welcome message for group conversations
//       if (type === 'group') {
//         await Message.create({
//           conversationId: conversation.id,
//           senderId: creatorId,
//           content: `${creator.name} created this group conversation`,
//           type: 'system',
//           metadata: { systemEvent: 'conversation_created' },
//         });
//       }

//       return completeConversation;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Find existing direct conversation
//   async findExistingDirectConversation(participants, purpose) {
//     try {
//       if (participants.length !== 2) return null;

//       const conversations = await Conversation.findAll({
//         where: {
//           type: 'direct',
//           purpose,
//         },
//         include: [
//           {
//             model: ConversationParticipant,
//             as: 'participants',
//             where: { isActive: true },
//             required: true,
//           },
//         ],
//       });

//       // Find conversation with exactly these two participants
//       for (const conversation of conversations) {
//         const participantIds = conversation.participants
//           .map((p) => p.userId)
//           .sort();
//         const targetIds = participants.sort();

//         if (
//           participantIds.length === 2 &&
//           participantIds[0] === targetIds[0] &&
//           participantIds[1] === targetIds[1]
//         ) {
//           return await this.getConversationById(
//             conversation.id,
//             participants[0]
//           );
//         }
//       }

//       return null;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get conversation by ID
//   async getConversationById(conversationId, userId) {
//     try {
//       // Verify user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (!participant) {
//         throw new AppError('Conversation not found or access denied', 404);
//       }

//       const conversation = await Conversation.findByPk(conversationId, {
//         include: [
//           {
//             model: ConversationParticipant,
//             as: 'participants',
//             where: { isActive: true },
//             include: [
//               {
//                 model: User,
//                 attributes: ['id', 'name', 'email', 'role'],
//               },
//             ],
//           },
//           {
//             model: User,
//             as: 'creator',
//             attributes: ['id', 'name', 'role'],
//           },
//           {
//             model: Office,
//             attributes: ['id', 'name'],
//           },
//         ],
//       });

//       // Get last message separately to avoid association issues
//       let lastMessage = null;
//       if (conversation.lastMessageId) {
//         lastMessage = await Message.findByPk(conversation.lastMessageId, {
//           include: [
//             {
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'name'],
//             },
//           ],
//         });
//       }

//       // Add last message to conversation data
//       if (lastMessage) {
//         conversation.dataValues.lastMessage = lastMessage;
//       }

//       // Add user-specific data
//       const userParticipant = conversation.participants.find(
//         (p) => p.userId === userId
//       );
//       conversation.dataValues.userRole = userParticipant.role;
//       conversation.dataValues.unreadCount = userParticipant.unreadCount;
//       conversation.dataValues.lastReadAt = userParticipant.lastReadAt;
//       conversation.dataValues.isMuted = userParticipant.isMuted;
//       conversation.dataValues.isPinned = userParticipant.isPinned;

//       return conversation;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get user conversations
//   //   async getUserConversations(userId, options = {}) {
//   //     try {
//   //       const { type, purpose, archived = false, page = 1, limit = 20 } = options;
//   //       const offset = (page - 1) * limit;

//   //       // Build where clause
//   //       const whereClause = { isActive: true };
//   //       if (type) whereClause.type = type;
//   //       if (purpose) whereClause.purpose = purpose;
//   //       if (archived) whereClause.isArchived = true;

//   //       // Get conversations where user is participant
//   //       const conversations = await Conversation.findAndCountAll({
//   //         where: whereClause,
//   //         include: [
//   //           {
//   //             model: ConversationParticipant,
//   //             as: 'participants',
//   //             where: { userId, isActive: true },
//   //             required: true,
//   //           },
//   //           {
//   //             model: ConversationParticipant,
//   //             as: 'participants',
//   //             where: { isActive: true },
//   //             include: [
//   //               {
//   //                 model: User,
//   //                 attributes: ['id', 'name', 'email', 'role'],
//   //               },
//   //             ],
//   //           },
//   //         ],
//   //         order: [['lastMessageAt', 'DESC']],
//   //         limit,
//   //         offset,
//   //         distinct: true,
//   //       });

//   //       // Add user-specific data and last message to each conversation
//   //       const conversationsWithUserData = await Promise.all(
//   //         conversations.rows.map(async (conversation) => {
//   //           const userParticipant = conversation.participants.find(
//   //             (p) => p.userId === userId
//   //           );

//   //           conversation.dataValues.userRole = userParticipant.role;
//   //           conversation.dataValues.unreadCount = userParticipant.unreadCount;
//   //           conversation.dataValues.lastReadAt = userParticipant.lastReadAt;
//   //           conversation.dataValues.isMuted = userParticipant.isMuted;
//   //           conversation.dataValues.isPinned = userParticipant.isPinned;

//   //           // Get last message separately
//   //           if (conversation.lastMessageId) {
//   //             const lastMessage = await Message.findByPk(
//   //               conversation.lastMessageId,
//   //               {
//   //                 include: [
//   //                   {
//   //                     model: User,
//   //                     as: 'sender',
//   //                     attributes: ['id', 'name'],
//   //                   },
//   //                 ],
//   //               }
//   //             );
//   //             conversation.dataValues.lastMessage = lastMessage;
//   //           }

//   //           return conversation;
//   //         })
//   //       );

//   //       return {
//   //         conversations: conversationsWithUserData,
//   //         pagination: {
//   //           currentPage: page,
//   //           totalPages: Math.ceil(conversations.count / limit),
//   //           totalConversations: conversations.count,
//   //           hasNext: page * limit < conversations.count,
//   //           hasPrevious: page > 1,
//   //         },
//   //       };
//   //     } catch (error) {
//   //       throw error;
//   //     }
//   //   }

//   async getUserConversations(userId, options = {}) {
//     try {
//       const { type, purpose, archived = false, page = 1, limit = 20 } = options;
//       const offset = (page - 1) * limit;

//       // Build where clause
//       const whereClause = { isActive: true };
//       if (type) whereClause.type = type;
//       if (purpose) whereClause.purpose = purpose;
//       if (archived) whereClause.isArchived = true;

//       // First, get conversations where user is participant
//       const userParticipants = await ConversationParticipant.findAll({
//         where: {
//           userId,
//           isActive: true,
//         },
//         include: [
//           {
//             model: Conversation,
//             where: whereClause,
//           },
//         ],
//       });

//       const conversationIds = userParticipants.map((p) => p.conversationId);

//       if (conversationIds.length === 0) {
//         return {
//           conversations: [],
//           pagination: {
//             currentPage: page,
//             totalPages: 0,
//             totalConversations: 0,
//             hasNext: false,
//             hasPrevious: false,
//           },
//         };
//       }

//       // Get conversations with all participants
//       const conversations = await Conversation.findAndCountAll({
//         where: {
//           id: conversationIds,
//           ...whereClause,
//         },
//         include: [
//           {
//             model: ConversationParticipant,
//             as: 'participants',
//             where: { isActive: true },
//             include: [
//               {
//                 model: User,
//                 attributes: [
//                   'id',
//                   'name',
//                   'email',
//                   'role',
//                 //   'profilePicture', // Use profilePicture instead of avatar
//                 //   'firstName',
//                 //   'lastName',
//                 "name",
//                 ],
//               },
//             ],
//           },
//         ],
//         order: [['lastMessageAt', 'DESC']],
//         limit,
//         offset,
//         distinct: true,
//       });

//       // Add user-specific data and last message to each conversation
//       const conversationsWithUserData = await Promise.all(
//         conversations.rows.map(async (conversation) => {
//           const userParticipant = conversation.participants.find(
//             (p) => p.userId === userId
//           );

//           // Add user-specific fields directly to the conversation object
//           const conversationData = conversation.toJSON();
//           conversationData.userRole = userParticipant?.role || 'member';
//           conversationData.unreadCount = userParticipant?.unreadCount || 0;
//           conversationData.lastReadAt = userParticipant?.lastReadAt;
//           conversationData.isMuted = userParticipant?.isMuted || false;
//           conversationData.isPinned = userParticipant?.isPinned || false;

//           // Get last message separately
//           if (conversation.lastMessageId) {
//             try {
//               const lastMessage = await Message.findByPk(
//                 conversation.lastMessageId,
//                 {
//                   include: [
//                     {
//                       model: User,
//                       as: 'sender',
//                       attributes: ['id', 'name', 'firstName', 'lastName'],
//                     },
//                   ],
//                 }
//               );
//               conversationData.lastMessage = lastMessage;
//             } catch (error) {
//               console.error('Error fetching last message:', error);
//               conversationData.lastMessage = null;
//             }
//           }

//           return conversationData;
//         })
//       );

//       return {
//         conversations: conversationsWithUserData,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(conversations.count / limit),
//           totalConversations: conversations.count,
//           hasNext: page * limit < conversations.count,
//           hasPrevious: page > 1,
//         },
//       };
//     } catch (error) {
//       console.error('Error in getUserConversations:', error);
//       throw error;
//     }
//   }

//   // Update conversation
//   async updateConversation(conversationId, userId, updates) {
//     try {
//       // Verify user has permission to update conversation
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (!participant) {
//         throw new AppError('Conversation not found or access denied', 404);
//       }

//       if (
//         participant.role !== 'admin' &&
//         !participant.permissions.canEditConversation
//       ) {
//         throw new AppError('No permission to update this conversation', 403);
//       }

//       const conversation = await Conversation.findByPk(conversationId);
//       await conversation.update(updates);

//       // Get updated conversation
//       const updatedConversation = await this.getConversationById(
//         conversationId,
//         userId
//       );

//       // Emit real-time update
//       await socketService.emitToConversation(
//         conversationId,
//         'conversation_updated',
//         {
//           conversation: updatedConversation,
//           updatedBy: userId,
//         }
//       );

//       return updatedConversation;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Add participants to conversation
//   async addParticipants(conversationId, userId, userIds) {
//     try {
//       // Verify user has permission
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (!participant || !participant.permissions.canAddMembers) {
//         throw new AppError('No permission to add participants', 403);
//       }

//       const conversation = await Conversation.findByPk(conversationId);
//       if (!conversation) {
//         throw new AppError('Conversation not found', 404);
//       }

//       // Validate new participants
//       const newUsers = await User.findAll({
//         where: { id: userIds },
//         attributes: ['id', 'name', 'role', 'officeId'],
//       });

//       if (newUsers.length !== userIds.length) {
//         throw new AppError('One or more users not found', 404);
//       }

//       // Add participants
//       const addPromises = userIds.map(async (newUserId) => {
//         // Check if already participant
//         const existingParticipant = await ConversationParticipant.findOne({
//           where: { conversationId, userId: newUserId },
//         });

//         if (existingParticipant) {
//           if (!existingParticipant.isActive) {
//             // Reactivate if previously removed
//             await existingParticipant.update({
//               isActive: true,
//               leftAt: null,
//               addedById: userId,
//               joinedAt: new Date(),
//             });
//           }
//           return existingParticipant;
//         }

//         // Create new participant
//         return await ConversationParticipant.create({
//           conversationId,
//           userId: newUserId,
//           role: 'member',
//           addedById: userId,
//           joinedAt: new Date(),
//           permissions: this.getDefaultPermissions(conversation.purpose, false),
//         });
//       });

//       await Promise.all(addPromises);

//       // Create system message
//       const adder = await User.findByPk(userId, { attributes: ['name'] });
//       const addedNames = newUsers.map((u) => u.name).join(', ');

//       await Message.create({
//         conversationId,
//         senderId: userId,
//         content: `${adder.name} added ${addedNames} to the conversation`,
//         type: 'system',
//         metadata: {
//           systemEvent: 'participants_added',
//           addedUsers: userIds,
//         },
//       });

//       // Emit real-time updates
//       await socketService.emitToConversation(
//         conversationId,
//         'participants_added',
//         {
//           conversationId,
//           addedUsers: newUsers,
//           addedBy: userId,
//         }
//       );

//       // Send notifications to new participants
//       for (const newUser of newUsers) {
//         await notificationService.sendNotification({
//           userId: newUser.id,
//           type: 'in_app',
//           message: `${adder.name} added you to a conversation`,
//           details: {
//             conversationId,
//             addedBy: userId,
//           },
//         });
//       }

//       return { success: true, addedUsers: newUsers };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Remove participant from conversation
//   async removeParticipant(conversationId, userId, targetUserId) {
//     try {
//       // Verify user has permission
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (
//         !participant ||
//         (!participant.permissions.canRemoveMembers && userId !== targetUserId)
//       ) {
//         throw new AppError('No permission to remove this participant', 403);
//       }

//       // Find target participant
//       const targetParticipant = await ConversationParticipant.findOne({
//         where: { conversationId, userId: targetUserId, isActive: true },
//       });

//       if (!targetParticipant) {
//         throw new AppError('Participant not found', 404);
//       }

//       // Cannot remove conversation creator unless they're leaving themselves
//       const conversation = await Conversation.findByPk(conversationId);
//       if (conversation.createdBy === targetUserId && userId !== targetUserId) {
//         throw new AppError('Cannot remove conversation creator', 403);
//       }

//       // Remove participant
//       await targetParticipant.update({
//         isActive: false,
//         leftAt: new Date(),
//       });

//       // Create system message
//       const remover = await User.findByPk(userId, { attributes: ['name'] });
//       const targetUser = await User.findByPk(targetUserId, {
//         attributes: ['name'],
//       });

//       const isLeaving = userId === targetUserId;
//       const content = isLeaving
//         ? `${targetUser.name} left the conversation`
//         : `${remover.name} removed ${targetUser.name} from the conversation`;

//       await Message.create({
//         conversationId,
//         senderId: userId,
//         content,
//         type: 'system',
//         metadata: {
//           systemEvent: isLeaving ? 'participant_left' : 'participant_removed',
//           targetUser: targetUserId,
//         },
//       });

//       // Emit real-time updates
//       await socketService.emitToConversation(
//         conversationId,
//         'participant_removed',
//         {
//           conversationId,
//           removedUser: targetUserId,
//           removedBy: userId,
//           isLeaving,
//         }
//       );

//       return { success: true };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Archive/unarchive conversation
//   async archiveConversation(conversationId, userId, archived) {
//     try {
//       // Verify user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (!participant) {
//         throw new AppError('Conversation not found or access denied', 404);
//       }

//       const conversation = await Conversation.findByPk(conversationId);
//       await conversation.update({ isArchived: archived });

//       // Emit real-time update
//       await socketService.emitToConversation(
//         conversationId,
//         'conversation_archived',
//         {
//           conversationId,
//           archived,
//           archivedBy: userId,
//         }
//       );

//       return { success: true, archived };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Mark conversation as read
//   async markConversationAsRead(conversationId, userId) {
//     try {
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (!participant) {
//         throw new AppError('Conversation not found or access denied', 404);
//       }

//       // Update participant's read status
//       await participant.update({
//         lastReadAt: new Date(),
//         unreadCount: 0,
//       });

//       // Mark all messages as read
//       await Message.update(
//         { readAt: new Date() },
//         {
//           where: {
//             conversationId,
//             senderId: { [Op.ne]: userId },
//             readAt: null,
//           },
//         }
//       );

//       // Emit read receipt
//       await socketService.emitToConversation(
//         conversationId,
//         'conversation_read',
//         {
//           conversationId,
//           userId,
//           readAt: new Date(),
//         }
//       );

//       return { success: true };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Send typing indicator
//   async sendTypingIndicator(conversationId, userId, isTyping) {
//     try {
//       // Verify user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (!participant) {
//         throw new AppError('Conversation not found or access denied', 404);
//       }

//       // Emit typing indicator to other participants
//       await socketService.emitToConversationExcept(
//         conversationId,
//         userId,
//         'user_typing',
//         {
//           conversationId,
//           userId,
//           isTyping,
//           timestamp: new Date(),
//         }
//       );

//       return { success: true };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get office conversations for monitoring (Manager/Super Admin)
//   async getOfficeConversationsForMonitoring(officeId, userRole, options = {}) {
//     try {
//       const { purpose, page = 1, limit = 20 } = options;
//       const offset = (page - 1) * limit;

//       // Build where clause
//       const whereClause = { officeId, isActive: true };
//       if (purpose) whereClause.purpose = purpose;

//       const conversations = await Conversation.findAndCountAll({
//         where: whereClause,
//         include: [
//           {
//             model: ConversationParticipant,
//             as: 'participants',
//             where: { isActive: true },
//             include: [
//               {
//                 model: User,
//                 attributes: ['id', 'name', 'email', 'role'],
//               },
//             ],
//           },
//           {
//             model: Message,
//             as: 'lastMessage',
//             include: [
//               {
//                 model: User,
//                 as: 'sender',
//                 attributes: ['id', 'name'],
//               },
//             ],
//           },
//         ],
//         order: [['lastMessageAt', 'DESC']],
//         limit,
//         offset,
//       });

//       return {
//         conversations: conversations.rows,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(conversations.count / limit),
//           totalConversations: conversations.count,
//           hasNext: page * limit < conversations.count,
//           hasPrevious: page > 1,
//         },
//       };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get all conversations for monitoring (Super Admin only)
//   async getAllConversationsForMonitoring(options = {}) {
//     try {
//       const { officeId, purpose, page = 1, limit = 20 } = options;
//       const offset = (page - 1) * limit;

//       // Build where clause
//       const whereClause = { isActive: true };
//       if (officeId) whereClause.officeId = officeId;
//       if (purpose) whereClause.purpose = purpose;

//       const conversations = await Conversation.findAndCountAll({
//         where: whereClause,
//         include: [
//           {
//             model: ConversationParticipant,
//             as: 'participants',
//             where: { isActive: true },
//             include: [
//               {
//                 model: User,
//                 attributes: ['id', 'name', 'email', 'role'],
//               },
//             ],
//           },
//           {
//             model: Message,
//             as: 'lastMessage',
//             include: [
//               {
//                 model: User,
//                 as: 'sender',
//                 attributes: ['id', 'name'],
//               },
//             ],
//           },
//           {
//             model: Office,
//             attributes: ['id', 'name'],
//           },
//         ],
//         order: [['lastMessageAt', 'DESC']],
//         limit,
//         offset,
//       });

//       return {
//         conversations: conversations.rows,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(conversations.count / limit),
//           totalConversations: conversations.count,
//           hasNext: page * limit < conversations.count,
//           hasPrevious: page > 1,
//         },
//       };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Auto-create conversations based on assignments
//   async autoCreateConversations() {
//     try {
//       // Create lead-consultant conversations for new assignments
//       const unassignedLeads = await Lead.findAll({
//         where: {
//           assignedConsultant: { [Op.ne]: null },
//         },
//         include: [
//           {
//             model: User,
//             as: 'student',
//             attributes: ['id'],
//           },
//           {
//             model: User,
//             as: 'consultant',
//             attributes: ['id'],
//           },
//         ],
//       });

//       for (const lead of unassignedLeads) {
//         if (lead.student && lead.consultant) {
//           // Check if conversation already exists
//           const existingConversation =
//             await this.findExistingDirectConversation(
//               [lead.student.id, lead.consultant.id],
//               'lead_consultant'
//             );

//           if (!existingConversation) {
//             await this.createConversation(lead.consultant.id, {
//               participants: [lead.student.id, lead.consultant.id],
//               type: 'direct',
//               purpose: 'lead_consultant',
//             });
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error auto-creating conversations:', error);
//     }
//   }

//   // Get default permissions based on conversation purpose and role
//   getDefaultPermissions(purpose, isAdmin) {
//     const basePermissions = {
//       canSendMessages: true,
//       canSendFiles: true,
//       canAddMembers: false,
//       canRemoveMembers: false,
//       canEditConversation: false,
//     };

//     if (isAdmin) {
//       return {
//         ...basePermissions,
//         canAddMembers: true,
//         canRemoveMembers: true,
//         canEditConversation: true,
//       };
//     }

//     // Specific permissions based on purpose
//     switch (purpose) {
//       case 'lead_consultant':
//       case 'manager_consultant':
//       case 'manager_receptionist':
//       case 'manager_lead':
//         return basePermissions; // Direct conversations have standard permissions

//       case 'general':
//       case 'support':
//         return {
//           ...basePermissions,
//           canAddMembers: true, // Allow adding members to general/support chats
//         };

//       default:
//         return basePermissions;
//     }
//   }

//   // Get conversation statistics
//   async getConversationStats(conversationId, userId) {
//     try {
//       // Verify access
//       const participant = await ConversationParticipant.findOne({
//         where: { conversationId, userId, isActive: true },
//       });

//       if (!participant) {
//         throw new AppError('Access denied to this conversation', 403);
//       }

//       // Get message count
//       const totalMessages = await Message.count({
//         where: { conversationId },
//       });

//       // Get participant count
//       const participantCount = await ConversationParticipant.count({
//         where: { conversationId, isActive: true },
//       });

//       // Get messages by type
//       const messagesByType = await Message.findAll({
//         where: { conversationId },
//         attributes: [
//           'type',
//           [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
//         ],
//         group: ['type'],
//       });

//       return {
//         totalMessages,
//         participantCount,
//         messagesByType: messagesByType.reduce((acc, item) => {
//           acc[item.type] = parseInt(item.dataValues.count);
//           return acc;
//         }, {}),
//       };
//     } catch (error) {
//       throw error;
//     }
//   }
// }

// module.exports = new ConversationService();
