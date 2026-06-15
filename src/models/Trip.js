const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

const TRIP_STATUS = {
  SEARCHING: 'searching',
  ACCEPTED: 'accepted',
  ARRIVED: 'arrived',
  ON_RIDE: 'on_ride',
  COMPLETED: 'completed',
  CANCELLED_BY_CLIENT: 'cancelled_by_client',
  CANCELLED_BY_DRIVER: 'cancelled_by_driver',
  NO_DRIVER_FOUND: 'no_driver_found',
};

class Trip extends Model {}

Trip.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'drivers', key: 'id' },
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'regions', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TRIP_STATUS)),
      defaultValue: TRIP_STATUS.SEARCHING,
    },

    pickupLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    pickupLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    pickupAddress: { type: DataTypes.STRING, allowNull: true },

    dropoffLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    dropoffLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    dropoffAddress: { type: DataTypes.STRING, allowNull: true },

    isDestinationPending: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Mijoz manzilni tanlamasdan buyurtma bergan',
    },

    estimatedDistanceKm: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    estimatedDurationMin: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    estimatedPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

    actualDistanceKm: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    actualDurationMin: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    finalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

    requestedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    acceptedAt: { type: DataTypes.DATE, allowNull: true },
    arrivedAt: { type: DataTypes.DATE, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
    cancellationReason: { type: DataTypes.STRING, allowNull: true },

    paymentMethod: {
      type: DataTypes.ENUM('cash'),
      defaultValue: 'cash',
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Haydovchi naqd pul olganini tasdiqlagach true bo\'ladi',
    },

    clientRating: { type: DataTypes.INTEGER, allowNull: true, comment: 'Mijoz haydovchiga (1-5)' },
    driverRating: { type: DataTypes.INTEGER, allowNull: true, comment: 'Haydovchi mijozga (1-5)' },
    clientComment: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Trip',
    tableName: 'trips',
    timestamps: true,
  }
);

module.exports = { Trip, TRIP_STATUS };
