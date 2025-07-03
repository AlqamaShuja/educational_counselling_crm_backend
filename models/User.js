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

      // User (Student) has many Proposals
      this.hasMany(models.Proposal, {
        foreignKey: 'studentId',
        as: 'studentProposals',
      });

      // User (Consultant) has many Proposals
      this.hasMany(models.Proposal, {
        foreignKey: 'consultantId',
        as: 'consultantProposals',
      });

      this.hasMany(models.Checklist, {
        foreignKey: 'studentId',
        as: 'studentChecklists', // user.getStudentChecklists()
        onDelete: 'CASCADE', // optional but usually sensible
        onUpdate: 'CASCADE',
      });

      // All checklists where the user is the **consultant**
      this.hasMany(models.Checklist, {
        foreignKey: 'consultantId',
        as: 'consultantChecklists', // user.getConsultantChecklists()
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  );
  return User;
};
