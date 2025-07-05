'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      senderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      recipientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('text', 'image', 'video', 'file', 'system'),
        allowNull: false,
        defaultValue: 'text',
      },
      fileUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      replyToId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      isEdited: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      editedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deliveredAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      conversationHash: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Hash of senderId and recipientId for grouping messages',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex(
      'Messages',
      ['senderId', 'recipientId', 'createdAt'],
      {
        name: 'messages_conversation_index',
      }
    );

    await queryInterface.addIndex(
      'Messages',
      ['conversationHash', 'createdAt'],
      {
        name: 'messages_conversation_hash_index',
      }
    );

    await queryInterface.addIndex('Messages', ['senderId']);
    await queryInterface.addIndex('Messages', ['recipientId']);
    await queryInterface.addIndex('Messages', ['type']);

    // Add GIN index for full-text search
    await queryInterface.sequelize.query(`
      CREATE INDEX messages_content_search
      ON "Messages"
      USING GIN (to_tsvector('english', content));
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Messages', 'messages_content_search');
    await queryInterface.removeIndex('Messages', ['senderId']);
    await queryInterface.removeIndex('Messages', ['recipientId']);
    await queryInterface.removeIndex('Messages', ['type']);
    await queryInterface.removeIndex(
      'Messages',
      'messages_conversation_hash_index'
    );
    await queryInterface.removeIndex('Messages', 'messages_conversation_index');
    await queryInterface.dropTable('Messages');
  },
};
