'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if StudentProfiles table exists
    const tableExists = await queryInterface.tableExists('StudentProfiles');

    if (!tableExists) {
      // Create table if it doesn't exist
      await queryInterface.createTable('StudentProfiles', {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        personalInfo: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        educationalBackground: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        testScores: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        studyPreferences: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        workExperience: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        financialInfo: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        additionalInfo: {
          type: Sequelize.JSONB,
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
    } else {
      // Check if userId column exists
      const columns = await queryInterface.describeTable('StudentProfiles');
      if (!columns.userId) {
        // Add userId column if missing
        await queryInterface.addColumn('StudentProfiles', 'userId', {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('StudentProfiles');
  },
};
