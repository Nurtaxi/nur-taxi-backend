const sequelize = require('../config/database');
const { User } = require('./User');
const Region = require('./Region');
const { Driver } = require('./Driver');
const Vehicle = require('./Vehicle');
const Tariff = require('./Tariff');
const { Trip } = require('./Trip');

// --- Region <-> User ---
// Bir hudud ko'p foydalanuvchiga (haydovchi/hudud admini) ega
Region.hasMany(User, { foreignKey: 'regionId', as: 'users' });
User.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

// --- Region <-> Tariff (1:1) ---
Region.hasOne(Tariff, { foreignKey: 'regionId', as: 'tariff' });
Tariff.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

// --- User <-> Driver (1:1) ---
User.hasOne(Driver, { foreignKey: 'userId', as: 'driverProfile' });
Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- Driver <-> Vehicle (1:N, lekin amalda asosan 1ta faol avtomobil) ---
Driver.hasMany(Vehicle, { foreignKey: 'driverId', as: 'vehicles' });
Vehicle.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

// --- Trip bog'lanishlari ---
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
};
