'use strict';

module.exports = {
  /**
   * Apply the migration.
   * @param {import('sequelize').QueryInterface} queryInterface
   * @param {import('sequelize')} Sequelize
   */
  async up(queryInterface, Sequelize) {
    // 1. Table definition
    await queryInterface.createTable('Conversations', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: true, // direct chats don’t need names
      },

      type: {
        type: Sequelize.ENUM('direct', 'group', 'support'),
        allowNull: false,
        defaultValue: 'direct',
      },

      purpose: {
        type: Sequelize.ENUM(
          'lead_consultant',
          'manager_consultant',
          'manager_receptionist',
          'manager_lead',
          'general',
          'support'
        ),
        allowNull: false,
        defaultValue: 'general',
      },

      officeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Offices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      lastMessageId: {
        type: Sequelize.UUID,
        allowNull: true,
        // references: { model: 'Messages', key: 'id' },
        // onUpdate: 'CASCADE',
        // onDelete: 'SET NULL',
      },

      lastMessageAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isArchived: { type: Sequelize.BOOLEAN, defaultValue: false },
      isPinned: { type: Sequelize.BOOLEAN, defaultValue: false },

      settings: {
        type: Sequelize.JSONB,
        allowNull: true,
        // Postgres default literal – avoids Sequelize converting the object to TEXT
        defaultValue: Sequelize.literal(
          `'{"notifications":true,"soundEnabled":true,"theme":"default"}'::jsonb`
        ),
      },

      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: Sequelize.literal(`'{}'::jsonb`),
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 2. Regular composite & single-column indexes
    await queryInterface.addIndex('Conversations', ['officeId']);
    await queryInterface.addIndex('Conversations', ['createdBy']);
    await queryInterface.addIndex('Conversations', ['type', 'purpose']);
    await queryInterface.addIndex('Conversations', ['lastMessageAt']);
    await queryInterface.addIndex('Conversations', ['isActive', 'isArchived']);

    // 3. Partial UNIQUE index – one 'direct' conversation per office
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_direct_conversation_per_office
      ON "Conversations"( "officeId" )
      WHERE type = 'direct';
    `);
  },

  /**
   * Revert the migration.
   * @param {import('sequelize').QueryInterface} queryInterface
   */
  async down(queryInterface) {
    // Dropping the table also removes all indexes automatically
    await queryInterface.dropTable('Conversations');
  },
};
