'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      Conversation.belongsTo(models.Office, {
        foreignKey: 'officeId',
        allowNull: true,
      });
      Conversation.belongsTo(models.User, {
        as: 'creator',
        foreignKey: 'createdBy',
      });
    //   Conversation.hasMany(models.Message, {
    //     as: 'messages',
    //     foreignKey: 'conversationId',
    //   });
      Conversation.hasMany(models.ConversationParticipant, {
        as: 'participants',
        foreignKey: 'conversationId',
      });
      Conversation.belongsToMany(models.User, {
        through: models.ConversationParticipant,
        as: 'users',
        foreignKey: 'conversationId',
        otherKey: 'userId',
      });
    //   Conversation.belongsTo(models.Message, {
    //     as: 'lastMessage',
    //     foreignKey: 'lastMessageId',
    //   });
    }
  }

  Conversation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true, // Direct conversations don't need names
      },
      type: {
        type: DataTypes.ENUM('direct', 'group', 'support'),
        allowNull: false,
        defaultValue: 'direct',
      },
      purpose: {
        type: DataTypes.ENUM(
          'lead_consultant',
          'manager_consultant',
          'manager_receptionist',
          'manager_lead',
          'general',
          'support'
        ),
        allowNull: false,
        defaultValue: 'general',
      },
      officeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Offices', key: 'id' },
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      lastMessageId: {
        type: DataTypes.UUID,
        allowNull: true,
        // references: { model: 'Messages', key: 'id' },
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      isArchived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      settings: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          notifications: true,
          soundEnabled: true,
          theme: 'default',
        },
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: 'Conversation',
      tableName: 'Conversations',
      timestamps: true,
      indexes: [
        {
          fields: ['officeId'],
        },
        {
          fields: ['createdBy'],
        },
        {
          fields: ['type', 'purpose'],
        },
        {
          fields: ['lastMessageAt'],
        },
        {
          fields: ['isActive', 'isArchived'],
        },
        {
          unique: true,
          fields: ['type', 'officeId'],
          where: {
            type: 'direct',
          },
          name: 'unique_direct_conversation_per_office',
        },
      ],
    }
  );

  return Conversation;
};
