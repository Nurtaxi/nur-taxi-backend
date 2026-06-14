const sequelize = require('../config/database');
const { User, ROLES } = require('./User');
const Region = require('./Region');
const { Driver, DRIVER_STATUS } = require('./Driver');
const Vehicle = require('./Vehicle');
const Tariff = require('./Tariff');
const { Trip, TRIP_STATUS } = require('./Trip');

Region.hasMany(User, { foreignKey: 'regionId', as: 'users' });
User.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

Region.hasOne(Tariff, { foreignKey: 'regionId', as: 'tariff' });
Tariff.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

User.hasOne(Driver, { foreignKey: 'userId', as: 'driverProfile' });
Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Driver.hasMany(Vehicle, { foreignKey: 'driverId', as: 'vehicles' });
Vehicle.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

User.hasMany(Trip, { foreignKey: 'clientId', as: 'tripsAsClient' });
Trip.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

Driver.hasMany(Trip, { foreignKey: 'driverId', as: 'trips' });
Trip.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

Region.hasMany(Trip, { foreignKey: 'regionId', as: 'trips' });
Trip.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

module.exports = {
  sequelize,
  User,
  Region,
  Driver,
  Vehicle,
  Tariff,
  Trip,
  ROLES,
  DRIVER_STATUS,
  TRIP_STATUS,
};
