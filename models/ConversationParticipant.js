'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConversationParticipant extends Model {
    static associate(models) {
      ConversationParticipant.belongsTo(models.Conversation, {
        foreignKey: 'conversationId',
      });
      ConversationParticipant.belongsTo(models.User, {
        foreignKey: 'userId',
      });
      ConversationParticipant.belongsTo(models.User, {
        as: 'addedBy',
        foreignKey: 'addedById',
      });
    }
  }

  ConversationParticipant.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Conversations', key: 'id' },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      role: {
        type: DataTypes.ENUM('admin', 'member', 'moderator'),
        allowNull: false,
        defaultValue: 'member',
      },
      addedById: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      leftAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastReadAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      isMuted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      unreadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      permissions: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          canSendMessages: true,
          canSendFiles: true,
          canAddMembers: false,
          canRemoveMembers: false,
          canEditConversation: false,
        },
      },
      preferences: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          notifications: true,
          soundEnabled: true,
          emailNotifications: false,
        },
      },
    },
    {
      sequelize,
      modelName: 'ConversationParticipant',
      tableName: 'ConversationParticipants',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['conversationId', 'userId'],
          name: 'unique_conversation_participant',
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['conversationId'],
        },
        {
          fields: ['isActive'],
        },
        {
          fields: ['lastReadAt'],
        },
        {
          fields: ['unreadCount'],
        },
      ],
    }
  );

  return ConversationParticipant;
};
