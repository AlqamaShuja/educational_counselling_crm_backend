'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OfficeConsultants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      officeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Offices',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Add composite unique constraint
    await queryInterface.addConstraint('OfficeConsultants', {
      fields: ['officeId', 'userId'],
      type: 'unique',
      name: 'unique_office_user_pair',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('OfficeConsultants');
  },
};
