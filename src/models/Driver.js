const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

// Haydovchi holati
const DRIVER_STATUS = {
  OFFLINE: 'offline', // Tizimga kirmagan / dam olishda
  ONLINE: 'online', // Ish boshlagan, buyurtma kutmoqda
  ON_TRIP: 'on_trip', // Hozir safarda
  PENDING_APPROVAL: 'pending_approval', // Hujjatlari tekshirilmoqda
  BLOCKED: 'blocked', // Admin tomonidan bloklangan
};

class Driver extends Model {}

Driver.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Haydovchilik guvohnomasi raqami',
    },
    licensePhotoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DRIVER_STATUS)),
      defaultValue: DRIVER_STATUS.PENDING_APPROVAL,
    },
    // Real vaqtda joylashuv (Socket.io orqali yangilanadi)
    currentLat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    currentLng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    lastLocationUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 5.0,
      comment: 'O\'rtacha baho (1.00 - 5.00)',
    },
    totalTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: 'Haydovchi hisobidagi mablag\' (komissiya hisob-kitobi uchun)',
    },
  },
  {
    sequelize,
    modelName: 'Driver',
    tableName: 'drivers',
    timestamps: true,
  }
);

module.exports = { Driver, DRIVER_STATUS };
