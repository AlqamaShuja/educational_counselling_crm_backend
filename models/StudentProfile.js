'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentProfile extends Model {
    static associate(models) {
      // Association: StudentProfile belongs to User
      StudentProfile.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  StudentProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      personalInfo: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      educationalBackground: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      testScores: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      studyPreferences: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      workExperience: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      financialInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      additionalInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'StudentProfile',
      tableName: 'StudentProfiles',
      timestamps: true,
    }
  );

  return StudentProfile;
};
