'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      // Appointment belongs to student (User)
      Appointment.belongsTo(models.User, {
        as: 'student',
        foreignKey: 'studentId',
      });

      // Appointment belongs to consultant (User)
      Appointment.belongsTo(models.User, {
        as: 'consultant',
        foreignKey: 'consultantId',
      });

      // Appointment belongs to an Office
      Appointment.belongsTo(models.Office, {
        foreignKey: 'officeId',
      });
    }
  }

  Appointment.init(
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
      consultantId: {
        type: DataTypes.UUID,
        allowNull: true,
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
      dateTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'completed', 'canceled', 'no_show'),
        defaultValue: 'scheduled',
      },
      type: {
        type: DataTypes.ENUM('in_person', 'virtual'),
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Appointment',
      tableName: 'Appointments',
      timestamps: true,
    }
  );

  return Appointment;
};
