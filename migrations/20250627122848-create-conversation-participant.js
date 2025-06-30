'use strict';

module.exports = {
  /**
   * Create table & indexes
   * @param {import('sequelize').QueryInterface} queryInterface
   * @param {import('sequelize')} Sequelize
   */
  async up(queryInterface, Sequelize) {
    // -------------------------------------------------
    // 1. Table definition
    // -------------------------------------------------
    await queryInterface.createTable('ConversationParticipants', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },

      conversationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Conversations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      role: {
        type: Sequelize.ENUM('admin', 'member', 'moderator'),
        allowNull: false,
        defaultValue: 'member',
      },

      addedById: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      joinedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      leftAt: { type: Sequelize.DATE, allowNull: true },
      lastReadAt: { type: Sequelize.DATE, allowNull: true },
      lastSeenAt: { type: Sequelize.DATE, allowNull: true },

      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isMuted: { type: Sequelize.BOOLEAN, defaultValue: false },
      isPinned: { type: Sequelize.BOOLEAN, defaultValue: false },

      unreadCount: { type: Sequelize.INTEGER, defaultValue: 0 },

      permissions: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: Sequelize.literal(`'{
          "canSendMessages":true,
          "canSendFiles":true,
          "canAddMembers":false,
          "canRemoveMembers":false,
          "canEditConversation":false
        }'::jsonb`),
      },

      preferences: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: Sequelize.literal(`'{
          "notifications":true,
          "soundEnabled":true,
          "emailNotifications":false
        }'::jsonb`),
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // -------------------------------------------------
    // 2. Indexes
    // -------------------------------------------------
    // unique (conversationId, userId)
    await queryInterface.addIndex(
      'ConversationParticipants',
      ['conversationId', 'userId'],
      { unique: true, name: 'unique_conversation_participant' }
    );

    // single-column helpers
    await queryInterface.addIndex('ConversationParticipants', ['userId']);
    await queryInterface.addIndex('ConversationParticipants', [
      'conversationId',
    ]);
    await queryInterface.addIndex('ConversationParticipants', ['isActive']);
    await queryInterface.addIndex('ConversationParticipants', ['lastReadAt']);
    await queryInterface.addIndex('ConversationParticipants', ['unreadCount']);
  },

  /**
   * Roll back
   * @param {import('sequelize').QueryInterface} queryInterface
   */
  async down(queryInterface) {
    await queryInterface.dropTable('ConversationParticipants');
  },
};
