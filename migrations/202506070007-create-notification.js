'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Notifications', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('email', 'sms', 'in_app'),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('sent', 'pending', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      details: {
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
    await queryInterface.dropTable('Notifications');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Notifications_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Notifications_status";'
    );
  },
};
