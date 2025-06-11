'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      // Report belongs to User who created it
      Report.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
      });
    }
  }

  Report.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM(
          'office_performance',
          'consultant_productivity',
          'lead_conversion',
          'revenue',
          'student_demographics',
          'study_destinations'
        ),
        allowNull: false,
      },
      data: {
        type: DataTypes.JSONB,
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
      format: {
        type: DataTypes.ENUM('pdf', 'excel'),
        allowNull: false,
      },
      scheduled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Report',
      tableName: 'Reports',
      timestamps: true,
    }
  );

  return Report;
};
