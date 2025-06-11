'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Appointments', {
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
      consultantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      officeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Offices', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      dateTime: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('in_person', 'virtual'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'canceled', 'no_show'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.dropTable('Appointments');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Appointments_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Appointments_status";'
    );
  },
};
