'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const roles = [
  'super_admin',
  'manager',
  'consultant',
  'receptionist',
  'student',
];

module.exports = {
  up: async (queryInterface) => {
    const users = await Promise.all(
      roles.map(async (role) => {
        const email = `${role.replace('_', '')}@yopmail.com`;
        return {
          id: uuidv4(),
          email,
          password: await bcrypt.hash(email, 10), // ← hash = email
          role,
          name: role
            .split('_')
            .map((s) => s[0].toUpperCase() + s.slice(1))
            .join(' '),
          isProfileCreated: false,
          phone: null,
          signupLocation: 'in-app',
          isActive: true,

          // 🔑  JSONB MUST be stringified for bulkInsert
          notificationPreferences: JSON.stringify({
            email: true,
            sms: true,
            in_app: true,
          }),

          status: 'approved',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
    );

    await queryInterface.bulkInsert('Users', users, {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete(
      'Users',
      {
        email: roles.map((r) => `${r.replace('_', '')}@yopmail.com`),
      },
      {}
    );
  },
};
