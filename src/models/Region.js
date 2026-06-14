const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Region extends Model {}

Region.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Hudud nomi, masalan: Toshkent shahri, Samarqand viloyati',
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Qisqa kod, masalan: TSH, SAM',
    },
    // Hudud markazi koordinatalari (xarita uchun)
    centerLat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    centerLng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Region',
    tableName: 'regions',
    timestamps: true,
  }
);

module.exports = Region;
