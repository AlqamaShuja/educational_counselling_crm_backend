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
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false, // Make this required for direct messaging
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
      // Add a conversation identifier for grouping messages
      conversationHash: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Hash of senderId and recipientId for grouping messages',
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
        {
          fields: ['senderId', 'recipientId', 'createdAt'],
          name: 'messages_conversation_index',
        },
        {
          fields: ['conversationHash', 'createdAt'],
          name: 'messages_conversation_hash_index',
        },
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
      hooks: {
        beforeCreate: (message) => {
          // Create a conversation hash for easy grouping
          const ids = [message.senderId, message.recipientId].sort();
          message.conversationHash = `${ids[0]}_${ids[1]}`;
        },
        beforeUpdate: (message) => {
          if (message.changed('senderId') || message.changed('recipientId')) {
            const ids = [message.senderId, message.recipientId].sort();
            message.conversationHash = `${ids[0]}_${ids[1]}`;
          }
        },
      },
    }
  );

  return Message;
};
