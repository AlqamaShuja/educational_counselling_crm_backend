'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Reports', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      type: {
        type: Sequelize.ENUM(
          'office_performance',
          'consultant_productivity',
          'lead_conversion',
          'revenue',
          'student_demographics',
          'study_destinations'
        ),
        allowNull: false,
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      format: {
        type: Sequelize.ENUM('pdf', 'excel'),
        allowNull: false,
      },
      scheduled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.dropTable('Reports');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Reports_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Reports_format";'
    );
  },
};
