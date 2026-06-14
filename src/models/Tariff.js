const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

// Har bir hudud o'z tarif sozlamalariga ega bo'lishi mumkin.
// Agar hudud uchun tarif kiritilmagan bo'lsa, default qiymatlar .env'dan olinadi.
class Tariff extends Model {}

Tariff.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'regions',
        key: 'id',
      },
    },
    baseFare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Boshlang\'ich narx (so\'mda)',
    },
    pricePerKm: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '1 km uchun narx',
    },
    pricePerMinute: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '1 daqiqa kutish/harakat uchun narx',
    },
    minFare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Eng kam narx (qisqa masofalar uchun)',
    },
    commissionPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10.0,
      comment: 'Platforma komissiyasi (%) - haydovchi daromadidan',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Tarifni o\'zgartirgan admin ID',
    },
  },
  {
    sequelize,
    modelName: 'Tariff',
    tableName: 'tariffs',
    timestamps: true,
  }
);

module.exports = Tariff;
