'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'notificationPreferences', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: { email: true, sms: true, in_app: true },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'notificationPreferences');
  },
};
