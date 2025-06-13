'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Courses', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      duration: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'e.g., 2 years, 4 semesters',
      },
      level: {
        type: Sequelize.ENUM(
          'bachelor',
          'master',
          'phd',
          'diploma',
          'certificate'
        ),
        allowNull: true,
      },
      tuitionFee: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      creditHour: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'e.g: 3',
      },
      universityId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Universities',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Courses');
  },
};
