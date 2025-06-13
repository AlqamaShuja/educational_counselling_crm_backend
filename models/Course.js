'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      // A course belongs to a university
      this.belongsTo(models.University, {
        foreignKey: 'universityId',
        as: 'university',
      });
    }
  }

  Course.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      duration: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'e.g., 2 years, 4 semesters',
      },
      creditHour: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'e.g: 3',
      },
      level: {
        type: DataTypes.ENUM(
          'bachelor',
          'master',
          'phd',
          'diploma',
          'certificate'
        ),
        allowNull: true,
      },
      tuitionFee: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      universityId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Universities',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: 'Course',
      tableName: 'Courses',
      timestamps: true,
    }
  );

  return Course;
};
