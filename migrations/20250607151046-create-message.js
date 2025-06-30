'use strict';

module.exports = {
  /**
   * Run the migration.
   * @param {import('sequelize').QueryInterface} queryInterface
   * @param {import('sequelize')} Sequelize
   */
  async up(queryInterface, Sequelize) {
    // 1. Create the table
    await queryInterface.createTable(
      'Messages',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        conversationId: {
          type: Sequelize.UUID,
          allowNull: false,
          // references: {
          //   model: 'Conversations',
          //   key: 'id',
          // },
          // onUpdate: 'CASCADE',
          // onDelete: 'CASCADE',
        },
        senderId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        recipientId: {
          type: Sequelize.UUID,
          allowNull: true, // null for group messages
          references: {
            model: 'Users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
        fileUrl: { type: Sequelize.STRING, allowNull: true },
        fileName: { type: Sequelize.STRING, allowNull: true },
        fileSize: { type: Sequelize.INTEGER, allowNull: true },
        mimeType: { type: Sequelize.STRING, allowNull: true },

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

        isEdited: { type: Sequelize.BOOLEAN, defaultValue: false },
        editedAt: { type: Sequelize.DATE, allowNull: true },
        deliveredAt: { type: Sequelize.DATE, allowNull: true },
        readAt: { type: Sequelize.DATE, allowNull: true },
        deletedAt: { type: Sequelize.DATE, allowNull: true }, // paranoid

        metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },

        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      },
      {
        paranoid: true, // enables soft-delete (deletedAt)
      }
    );

    // 2. Add composite & simple indexes
    // await queryInterface.addIndex('Messages', ['conversationId', 'createdAt']);
    await queryInterface.addIndex('Messages', ['senderId']);
    await queryInterface.addIndex('Messages', ['recipientId']);
    await queryInterface.addIndex('Messages', ['type']);

    // 3. Add PostgreSQL full-text search GIN index on content
    //    (Sequelize’s addIndex doesn’t accept a literal field list cleanly, so run raw SQL)
    await queryInterface.sequelize.query(`
      CREATE INDEX messages_content_search
      ON "Messages"
      USING GIN (to_tsvector('english', content));
    `);
  },

  /**
   * Revert the migration.
   * @param {import('sequelize').QueryInterface} queryInterface
   */
  async down(queryInterface) {
    await queryInterface.dropTable('Messages');
  },
};
