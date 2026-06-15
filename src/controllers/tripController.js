const { Trip, Driver, User, TRIP_STATUS, DRIVER_STATUS } = require('../models');
const {
  calculateDistanceKm,
  estimateDurationMin,
  getTariffForRegion,
  calculatePrice,
} = require('../services/pricingService');
const { notifyNewTrip, notifyTripUpdate } = require('../services/socketService');

const createTrip = async (req, res, next) => {
  try {
    const {
      regionId,
      pickupLat,
      pickupLng,
      pickupAddress,
      dropoffLat,
      dropoffLng,
      dropoffAddress,
    } = req.body;

    const activeTrip = await Trip.findOne({
      where: { clientId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    if (
      activeTrip &&
      [TRIP_STATUS.SEARCHING, TRIP_STATUS.ACCEPTED, TRIP_STATUS.ARRIVED, TRIP_STATUS.ON_RIDE].includes(
        activeTrip.status
      )
    ) {
      return res.status(400).json({ success: false, message: 'Sizda allaqachon faol buyurtma mavjud' });
    }

    const hasDestination = dropoffLat != null && dropoffLng != null;
    const tariff = await getTariffForRegion(regionId);

    let distanceKm = null;
    let durationMin = null;
    let estimatedPrice;

    if (hasDestination) {
      distanceKm = calculateDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
      durationMin = estimateDurationMin(distanceKm);
      estimatedPrice = calculatePrice({ distanceKm, durationMin, tariff });
    } else {
      estimatedPrice = Number(tariff.minFare);
    }

    const trip = await Trip.create({
      clientId: req.user.id,
      regionId,
      pickupLat,
      pickupLng,
      pickupAddress,
      dropoffLat: hasDestination ? dropoffLat : null,
      dropoffLng: hasDestination ? dropoffLng : null,
      dropoffAddress: hasDestination ? dropoffAddress : null,
      isDestinationPending: !hasDestination,
      estimatedDistanceKm: distanceKm != null ? distanceKm.toFixed(2) : null,
      estimatedDurationMin: durationMin != null ? durationMin.toFixed(2) : null,
      estimatedPrice,
      status: TRIP_STATUS.SEARCHING,
    });

    const io = req.app.get('io');
    if (io) notifyNewTrip(io, regionId, trip);

    res.status(201).json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

const acceptTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    if (trip.status !== TRIP_STATUS.SEARCHING) {
      return res.status(400).json({ success: false, message: 'Bu buyurtma allaqachon band qilingan' });
    }

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ success: false, message: 'Haydovchi profili topilmadi' });

    if (driver.status !== DRIVER_STATUS.ONLINE) {
      return res.status(400).json({ success: false, message: 'Buyurtma qabul qilish uchun online bo\'lishingiz kerak' });
    }

    trip.driverId = driver.id;
    trip.status = TRIP_STATUS.ACCEPTED;
    trip.acceptedAt = new Date();
    await trip.save();

    driver.status = DRIVER_STATUS.ON_TRIP;
    await driver.save();

    const io = req.app.get('io');
    if (io) notifyTripUpdate(io, trip.id, trip);

    res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

const updateTripStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    const now = new Date();

    switch (status) {
      case TRIP_STATUS.ARRIVED:
        if (trip.status !== TRIP_STATUS.ACCEPTED) {
          return res.status(400).json({ success: false, message: 'Noto\'g\'ri holat o\'tishi' });
        }
        trip.status = TRIP_STATUS.ARRIVED;
        trip.arrivedAt = now;
        break;

      case TRIP_STATUS.ON_RIDE:
        if (trip.status !== TRIP_STATUS.ARRIVED) {
          return res.status(400).json({ success: false, message: 'Noto\'g\'ri holat o\'tishi' });
        }
        trip.status = TRIP_STATUS.ON_RIDE;
        trip.startedAt = now;
        break;

      case TRIP_STATUS.COMPLETED: {
        if (trip.status !== TRIP_STATUS.ON_RIDE) {
          return res.status(400).json({ success: false, message: 'Noto\'g\'ri holat o\'tishi' });
        }
        trip.status = TRIP_STATUS.COMPLETED;
        trip.completedAt = now;

        const durationMs = trip.startedAt ? now - new Date(trip.startedAt) : 0;
        trip.actualDurationMin = (durationMs / 60000).toFixed(2);
        trip.actualDistanceKm = trip.estimatedDistanceKm;
        trip.finalPrice = trip.estimatedPrice;
        trip.isPaid = true;

        const driver = await Driver.findByPk(trip.driverId);
        if (driver) {
          driver.status = DRIVER_STATUS.ONLINE;
          driver.totalTrips += 1;

          const tariff = await getTariffForRegion(trip.regionId);
          const commission = (Number(trip.finalPrice) * Number(tariff.commissionPercent)) / 100;
          driver.balance = Number(driver.balance) - commission;
          await driver.save();
        }

        const client = await User.findByPk(trip.clientId);
        if (client) {
          const bonusEarned = Number(trip.finalPrice) * 0.01;
          client.bonusBalance = Number(client.bonusBalance) + bonusEarned;
          await client.save();
        }
        break;
      }

      case TRIP_STATUS.CANCELLED_BY_CLIENT:
      case TRIP_STATUS.CANCELLED_BY_DRIVER:
        if ([TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED_BY_CLIENT, TRIP_STATUS.CANCELLED_BY_DRIVER].includes(trip.status)) {
          return res.status(400).json({ success: false, message: 'Bu buyurtma allaqachon yopilgan' });
        }
        trip.status = status;
        trip.cancelledAt = now;
        trip.cancellationReason = req.body.reason || null;

        if (trip.driverId) {
          const driver = await Driver.findByPk(trip.driverId);
          if (driver && driver.status === DRIVER_STATUS.ON_TRIP) {
            driver.status = DRIVER_STATUS.ONLINE;
            await driver.save();
          }
        }
        break;

      default:
        return res.status(400).json({ success: false, message: 'Noto\'g\'ri holat' });
    }

    await trip.save();

    const io = req.app.get('io');
    if (io) notifyTripUpdate(io, trip.id, trip);

    res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

const rateTrip = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const trip = await Trip.findByPk(req.params.id);

    if (!trip) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    if (trip.status !== TRIP_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: 'Faqat tugagan safarni baholash mumkin' });
    }
    if (trip.clientId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
    }

    trip.clientRating = rating;
    trip.clientComment = comment || null;
    await trip.save();

    const driver = await Driver.findByPk(trip.driverId);
    if (driver) {
      const allRated = await Trip.findAll({
        where: { driverId: driver.id, clientRating: { [require('sequelize').Op.ne]: null } },
        attributes: ['clientRating'],
      });
      const avg = allRated.reduce((sum, t) => sum + t.clientRating, 0) / allRated.length;
      driver.rating = avg.toFixed(2);
      await driver.save();
    }

    res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

const getMyTrips = async (req, res, next) => {
  try {
    let where = {};

    if (req.user.role === 'client') {
      where = { clientId: req.user.id };
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { userId: req.user.id } });
      if (!driver) return res.json({ success: true, data: [] });
      where = { driverId: driver.id };
    }

    const trips = await Trip.findAll({ where, order: [['createdAt', 'DESC']], limit: 50 });
    res.json({ success: true, data: trips });
  } catch (err) {
    next(err);
  }
};

const getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [
        { association: 'client', attributes: ['id', 'fullName', 'phone'] },
        {
          association: 'driver',
          include: [{ association: 'user', attributes: ['id', 'fullName', 'phone'] }, { association: 'vehicles' }],
        },
      ],
    });

    if (!trip) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

const getAvailableTrips = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ success: false, message: 'Haydovchi profili topilmadi' });

    const trips = await Trip.findAll({
      where: { status: TRIP_STATUS.SEARCHING, regionId: req.user.regionId },
      order: [['createdAt', 'ASC']],
      limit: 20,
    });

    res.json({ success: true, data: trips });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTrip,
  acceptTrip,
  updateTripStatus,
  rateTrip,
  getMyTrips,
  getTripById,
  getAvailableTrips,
};
