'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      // Application belongs to User (student)
      Application.belongsTo(models.User, {
        foreignKey: 'studentId',
        as: 'student',
      });

      // Application belongs to User (consultant)
      Application.belongsTo(models.User, {
        foreignKey: 'consultantId',
        as: 'consultant',
      });
    }
  }

  Application.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      consultantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      status: {
        type: DataTypes.ENUM(
          'draft',
          'in_review',
          'submitted',
          'offers_received',
          'accepted',
          'rejected',
          'visa_applied',
          'completed'
        ),
        defaultValue: 'draft',
        allowNull: false,
      },
      stage: {
        type: DataTypes.ENUM(
          'profile_review',
          'university_selection',
          'document_preparation',
          'submission',
          'offer_management',
          'visa_application',
          'completed'
        ),
        defaultValue: 'profile_review',
        allowNull: false,
      },
      universitySelections: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      offerLetters: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      visaInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      submissionDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completionDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Application',
      tableName: 'Applications',
      timestamps: true,
    }
  );

  return Application;
};