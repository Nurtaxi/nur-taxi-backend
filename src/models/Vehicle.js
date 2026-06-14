const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Vehicle extends Model {}

Vehicle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'drivers',
        key: 'id',
      },
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Masalan: Chevrolet',
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Masalan: Cobalt',
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    plateNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      comment: 'Davlat raqami, masalan: 01A123BC',
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Vehicle',
    tableName: 'vehicles',
    timestamps: true,
  }
);

module.exports = Vehicle;
