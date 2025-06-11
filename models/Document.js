'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(models) {
      // Document belongs to User
      Document.belongsTo(models.User, {
        foreignKey: 'userId',
      });
    }
  }

  Document.init(
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
        type: DataTypes.ENUM(
          'passport',
          'cnic',
          'transcript',
          'test_score',
          'degree',
          'experience_letter',
          'bank_statement',
          'photo',
          'other'
        ),
        allowNull: false,
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Document',
      tableName: 'Documents',
      timestamps: true,
    }
  );

  return Document;
};
