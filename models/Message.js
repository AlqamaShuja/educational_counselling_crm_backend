'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.User, {
        as: 'sender',
        foreignKey: 'senderId',
      });
      Message.belongsTo(models.User, {
        as: 'recipient',
        foreignKey: 'recipientId',
      });
      // Message.belongsTo(models.Conversation, {
      //   as: 'conversation',
      //   foreignKey: 'conversationId',
      // });
      Message.belongsTo(models.Message, {
        as: 'replyTo',
        foreignKey: 'replyToId',
      });
      Message.hasMany(models.Message, {
        as: 'replies',
        foreignKey: 'replyToId',
      });
    }
  }

  Message.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        // references: { model: 'Conversations', key: 'id' },
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: true, // Can be null for group conversations
        references: { model: 'Users', key: 'id' },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('text', 'image', 'video', 'file', 'system'),
        allowNull: false,
        defaultValue: 'text',
      },
      fileUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      replyToId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Messages', key: 'id' },
      },
      isEdited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      editedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'Messages',
      timestamps: true,
      paranoid: true,
      indexes: [
        // {
        //   fields: ['conversationId', 'createdAt'],
        // },
        {
          fields: ['senderId'],
        },
        {
          fields: ['recipientId'],
        },
        {
          fields: ['type'],
        },
        {
          name: 'messages_content_search',
          type: 'GIN',
          fields: [sequelize.literal("to_tsvector('english', content)")],
        },
      ],
    }
  );

  return Message;
};
