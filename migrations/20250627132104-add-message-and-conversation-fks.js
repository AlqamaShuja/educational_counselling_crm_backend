'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add the column back if it doesn't exist
    await queryInterface.addColumn('Messages', 'conversationId', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    // Step 2: Add the foreign key constraint
    await queryInterface.addConstraint('Messages', {
      fields: ['conversationId'],
      type: 'foreign key',
      name: 'fk_messages_conversation',
      references: {
        table: 'Conversations',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Also add the constraint for lastMessageId
    await queryInterface.addConstraint('Conversations', {
      fields: ['lastMessageId'],
      type: 'foreign key',
      name: 'fk_conversations_last_message',
      references: {
        table: 'Messages',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'Messages',
      'fk_messages_conversation'
    );
    await queryInterface.removeConstraint(
      'Conversations',
      'fk_conversations_last_message'
    );

    // Optional: Remove the column if you want a clean rollback
    await queryInterface.removeColumn('Messages', 'conversationId');
  },
};
