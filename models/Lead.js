'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Lead extends Model {
    static associate(models) {
      // Lead belongs to student (User)
      Lead.belongsTo(models.User, {
        as: 'student',
        foreignKey: 'studentId',
      });

      // Lead belongs to consultant (User)
      Lead.belongsTo(models.User, {
        as: 'consultant',
        foreignKey: 'assignedConsultant',
      });

      // Lead belongs to an Office
      Lead.belongsTo(models.Office, {
        foreignKey: 'officeId',
      });

      Lead.hasMany(models.Task, {
        foreignKey: 'leadId',
        as: 'tasks',
      });

      // Lead has many Proposals
      Lead.hasMany(models.Proposal, {
        foreignKey: 'leadId',
        as: 'proposals',
      });

      //
    }
  }

  Lead.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      officeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Offices',
          key: 'id',
        },
      },
      assignedConsultant: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'lead',
        allowNull: false,
        // Recommended values: lead, opportunity, project, done, deal
      },
      parked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      source: {
        type: DataTypes.ENUM(
          'walk_in',
          'online',
          'referral',
          'Google OAuth',
          'Facebook OAuth'
        ),
        allowNull: false,
      },
      studyPreferences: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      languagePreference: {
        type: DataTypes.ENUM('english', 'urdu'),
        allowNull: true,
      },
      history: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: 'Lead',
      tableName: 'Leads',
      timestamps: true,
    }
  );

  return Lead;
};
