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
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isReceiverRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: 'boolean',
      },
      type: {
        type: DataTypes.ENUM('text', 'image', 'video', 'file'),
        allowNull: false,
        defaultValue: 'boolean',
      },
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'Messages',
      timestamps: true,
    }
  );

  return Message;
};
