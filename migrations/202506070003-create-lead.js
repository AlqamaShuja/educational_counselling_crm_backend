'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Leads', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      officeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Offices', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      assignedConsultant: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('new', 'in_progress', 'converted', 'lost'),
        allowNull: false,
        defaultValue: 'new',
      },
      source: {
        type: Sequelize.ENUM('walk_in', 'online', 'referral'),
        allowNull: false,
      },
      studyPreferences: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      languagePreference: {
        type: Sequelize.ENUM('english', 'urdu'),
        allowNull: true,
      },
      history: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    // Drop ENUMs before table (PostgreSQL best practice)
    await queryInterface.dropTable('Leads');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Leads_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Leads_source";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Leads_languagePreference";'
    );
  },
};
