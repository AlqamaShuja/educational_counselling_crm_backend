'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OfficeConsultant extends Model {
    static associate(models) {
      OfficeConsultant.belongsTo(models.Office, { foreignKey: 'officeId' });
      OfficeConsultant.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  OfficeConsultant.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      officeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'OfficeConsultant',
      tableName: 'OfficeConsultants',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['officeId', 'userId'], // Composite unique index
        },
      ],
    }
  );

  return OfficeConsultant;
};
