/* eslint-disable camelcase */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ───── 1. Offices  ──────────────────────────────────────────────────────────
    await queryInterface.createTable('Offices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },

      address: { type: Sequelize.JSONB, allowNull: false }, //  { street, city, … }
      contact: { type: Sequelize.JSONB, allowNull: false }, //  { phone, email, … }
      officeHours: { type: Sequelize.JSONB, allowNull: false }, //  { Mon: '09-17', Tue: … }
      workingDays: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
      }, // ['Mon','Tue', …]
      serviceCapacity: { type: Sequelize.JSONB, allowNull: false }, //  { desks: 20, meetingRooms: 3 }

      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      isBranch: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // FK targets – added later
      managerId: { type: Sequelize.UUID, allowNull: true },
      consultantId: { type: Sequelize.UUID, allowNull: true },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // ───── 2. Users  ────────────────────────────────────────────────────────────
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },

      role: {
        // ENUM declared inline
        type: Sequelize.ENUM(
          'super_admin',
          'manager',
          'consultant',
          'receptionist',
          'student'
        ),
        allowNull: false,
      },

      // FK target – added later
      officeId: { type: Sequelize.UUID, allowNull: true },

      name: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      signupLocation: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'in-app',
      },

      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // ───── 3. Add foreign-key constraints now that both tables exist ───────────
    await queryInterface.addConstraint('Users', {
      fields: ['officeId'],
      type: 'foreign key',
      name: 'fk_users_office',
      references: { table: 'Offices', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('Offices', {
      fields: ['managerId'],
      type: 'foreign key',
      name: 'fk_offices_manager',
      references: { table: 'Users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('Offices', {
      fields: ['consultantId'],
      type: 'foreign key',
      name: 'fk_offices_consultant',
      references: { table: 'Users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    // Remove FKs first (Postgres restriction)
    await queryInterface.removeConstraint('Offices', 'fk_offices_consultant');
    await queryInterface.removeConstraint('Offices', 'fk_offices_manager');
    await queryInterface.removeConstraint('Users', 'fk_users_office');

    await queryInterface.dropTable('Users');
    await queryInterface.dropTable('Offices');

    // Optional: drop ENUM type so it can be recreated cleanly on re-migrate
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Users_role";'
    );
  },
};
