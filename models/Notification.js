'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      // Notification belongs to User
      Notification.belongsTo(models.User, {
        foreignKey: 'userId',
      });
    }
  }

  Notification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      type: {
        type: DataTypes.ENUM('email', 'sms', 'in_app'),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('sent', 'pending', 'failed'),
        defaultValue: 'pending',
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'Notifications',
      timestamps: true,
    }
  );

  return Notification;
};
