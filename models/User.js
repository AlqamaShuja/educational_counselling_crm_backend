'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Notification, { foreignKey: 'userId' });
      // this.hasMany(models.Lead, { foreignKey: 'studentId' });
      this.hasMany(models.Appointment, { foreignKey: 'studentId' });
      this.hasMany(models.Report, {
        as: 'createdReports',
        foreignKey: 'createdBy',
      });
      this.hasMany(models.LeadDistributionRule, {
        foreignKey: 'consultantId',
        as: 'distributionRules',
      });
      this.belongsTo(models.Office, { foreignKey: 'officeId', as: 'office' });
      this.hasMany(models.Lead, {
        foreignKey: 'studentId',
        as: 'studentLeads',
      });
      this.hasMany(models.Lead, {
        foreignKey: 'assignedConsultant',
        as: 'consultantLeads',
      });
      this.hasMany(models.Document, { foreignKey: 'userId' });
      this.hasMany(models.Appointment, {
        foreignKey: 'studentId',
        as: 'studentAppointments',
      });
      this.hasMany(models.Appointment, {
        foreignKey: 'consultantId',
        as: 'consultantAppointments',
      });
      this.hasOne(models.StudentProfile, {
        foreignKey: 'userId',
        as: 'profile',
      });

      this.belongsToMany(models.Office, {
        through: 'OfficeConsultants',
        as: 'consultantOffices',
        foreignKey: 'userId',
      });
    }
  }
  User.init(
    {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
      },
      password: DataTypes.STRING,
      role: DataTypes.ENUM(
        'super_admin',
        'manager',
        'consultant',
        'receptionist',
        'student'
      ),
      officeId: DataTypes.UUID,
      name: DataTypes.STRING,
      isProfileCreated: DataTypes.BOOLEAN,
      phone: DataTypes.STRING,
      signupLocation: DataTypes.STRING,
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      notificationPreferences: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: { email: true, sms: true, in_app: true },
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  );
  return User;
};
