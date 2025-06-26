'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    static associate(models) {
      // Task belongs to Lead
      Task.belongsTo(models.Lead, {
        as: 'lead',
        foreignKey: 'leadId',
      });

      // Task belongs to User (creator)
      Task.belongsTo(models.User, {
        as: 'createdByUser',
        foreignKey: 'createdBy',
      });
    }
  }

  Task.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      leadId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Leads',
          key: 'id',
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'Task',
      tableName: 'Tasks',
      timestamps: true,
    }
  );

  return Task;
};
