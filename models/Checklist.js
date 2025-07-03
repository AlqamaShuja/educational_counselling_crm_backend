'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Checklist extends Model {
    static associate(models) {
      // A checklist belongs to a student
      Checklist.belongsTo(models.User, {
        foreignKey: 'studentId',
        as: 'student'
      });

      // A checklist belongs to a consultant
      Checklist.belongsTo(models.User, {
        foreignKey: 'consultantId',
        as: 'consultant'
      });
    }
  }

  Checklist.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    consultantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      defaultValue: 'pending'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium'
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    additionalData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Checklist',
    tableName: 'Checklists',
    timestamps: true
  });

  return Checklist;
};