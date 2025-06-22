'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Office extends Model {
    static associate(models) {
      // Office has many Users
      Office.hasMany(models.User, {
        foreignKey: 'officeId',
      });

      // Office has many Leads
      Office.hasMany(models.Lead, {
        foreignKey: 'officeId',
      });

      // Office has many LeadDistributionRules
      Office.hasMany(models.LeadDistributionRule, {
        foreignKey: 'officeId',
      });

      // Optional: Office has many Appointments
      Office.hasMany(models.Appointment, {
        foreignKey: 'officeId',
      });
      
      Office.belongsTo(models.User, {
        foreignKey: 'managerId',
        as: 'manager',
      });

      Office.belongsToMany(models.User, {
        through: 'OfficeConsultants',
        as: 'consultants',
        foreignKey: 'officeId',
      });
      
    }
  }

  Office.init(
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
      address: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      contact: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      officeHours: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      workingDays: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
      },
      serviceCapacity: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      managerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      isBranch: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Office',
      tableName: 'Offices',
      timestamps: true,
    }
  );

  return Office;
};
