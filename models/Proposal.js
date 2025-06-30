'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Proposal extends Model {
    static associate(models) {
      // Proposal belongs to Lead
      Proposal.belongsTo(models.Lead, {
        foreignKey: 'leadId',
        as: 'lead',
      });

      // Proposal belongs to Consultant (User)
      Proposal.belongsTo(models.User, {
        foreignKey: 'consultantId',
        as: 'consultant',
      });

      // Proposal belongs to Student (User)
      Proposal.belongsTo(models.User, {
        foreignKey: 'studentId',
        as: 'student',
      });
    }
  }

  Proposal.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      leadId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Leads',
          key: 'id',
        },
      },
      consultantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      proposedProgram: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      proposedUniversity: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      estimatedCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      timeline: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Proposal',
      tableName: 'Proposals',
      timestamps: true,
      indexes: [
        {
          fields: ['leadId'],
        },
        {
          fields: ['consultantId'],
        },
        {
          fields: ['studentId'],
        },
        {
          fields: ['status'],
        },
        {
          unique: true,
          fields: ['leadId', 'status'],
          where: {
            status: 'pending',
          },
          name: 'unique_pending_proposal_per_lead',
        },
      ],
    }
  );

  return Proposal;
};
