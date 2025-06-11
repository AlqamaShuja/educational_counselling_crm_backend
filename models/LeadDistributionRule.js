'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LeadDistributionRule extends Model {
    static associate(models) {
      // Rule belongs to an Office
      LeadDistributionRule.belongsTo(models.Office, {
        foreignKey: 'officeId',
      });

      // Rule belongs to a User (consultant)
      LeadDistributionRule.belongsTo(models.User, {
        foreignKey: 'consultantId',
        as: 'consultant',
      });
    }
  }

  LeadDistributionRule.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      criteria: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      officeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Offices',
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
    },
    {
      sequelize,
      modelName: 'LeadDistributionRule',
      tableName: 'LeadDistributionRules',
      timestamps: true,
    }
  );

  return LeadDistributionRule;
};
