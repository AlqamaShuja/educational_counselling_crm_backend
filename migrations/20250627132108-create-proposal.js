'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Proposals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      leadId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Leads',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      consultantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      proposedProgram: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      proposedUniversity: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      estimatedCost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      timeline: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejectedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('Proposals', ['leadId']);
    await queryInterface.addIndex('Proposals', ['consultantId']);
    await queryInterface.addIndex('Proposals', ['studentId']);
    await queryInterface.addIndex('Proposals', ['status']);
    await queryInterface.addIndex('Proposals', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Proposals');
  },
};
