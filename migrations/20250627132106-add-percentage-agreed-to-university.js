'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Universities', 'percentageAgreed', {
      type: Sequelize.DECIMAL,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 1,
        max: 100
      },
      comment: 'percentage Agreed value based on MOU status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Universities', 'percentageAgreed');
  }
};