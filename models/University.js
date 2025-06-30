'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class University extends Model {
    static associate(models) {
      // A university can have many courses
      this.hasMany(models.Course, {
        foreignKey: 'universityId',
        as: 'courses',
      });
    }
  }

  University.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isUrl: true },
      },
      // 👇 MOU Status with enum
      mouStatus: {
        type: DataTypes.ENUM('direct', 'third_party', 'none'),
        allowNull: false,
        defaultValue: 'none',
        comment: 'Relationship of university with us',
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      percentageAgreed: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        defaultValue: 10,
        validate: {
          min: 1,
          max: 100,
        },
        comment: 'percentage Agreed value based on MOU status',
      },
    },
    {
      sequelize,
      modelName: 'University',
      tableName: 'Universities',
      timestamps: true,
    }
  );

  return University;
};
