const { Trip, Driver, User, TRIP_STATUS, DRIVER_STATUS } = require('../models');
const {
  calculateDistanceKm,
  estimateDurationMin,
  getTariffForRegion,
  calculatePrice,
} = require('../services/pricingService');
const { notifyNewTrip, notifyTripUpdate } = require('../services/socketService');

/**
 * Mijoz yangi buyurtma so'rovi yaratadi.
 * Narx avtomatik hisoblanadi (masofa + vaqt bo'yicha).
 * POST /api/trips
 * body: { regionId, pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress }
 */
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

    // Mijozning faol (tugamagan) buyurtmasi bormi - tekshirish
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

    const distanceKm = calculateDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const durationMin = estimateDurationMin(distanceKm);
    const tariff = await getTariffForRegion(regionId);
    const estimatedPrice = calculatePrice({ distanceKm, durationMin, tariff });

    const trip = await Trip.create({
      clientId: req.user.id,
      regionId,
      pickupLat,
      pickupLng,
      pickupAddress,
      dropoffLat,
      dropoffLng,
      dropoffAddress,
      estimatedDistanceKm: distanceKm.toFixed(2),
      estimatedDurationMin: durationMin.toFixed(2),
      estimatedPrice,
      status: TRIP_STATUS.SEARCHING,
    });

    // Shu hududdagi online haydovchilarga real-time xabar yuborish
    const io = req.app.get('io');
    if (io) notifyNewTrip(io, regionId, trip);

    res.status(201).json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

/**
 * Haydovchi buyurtmani qabul qiladi.
 * PATCH /api/trips/:id/accept
 */
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

    // Mijozga "haydovchi topildi" xabarini yuborish
    const io = req.app.get('io');
    if (io) notifyTripUpdate(io, trip.id, trip);

    res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

/**
 * Safar holatini o'zgartirish: arrived -> on_ride -> completed
 * yoki bekor qilish.
 * PATCH /api/trips/:id/status
 * body: { status: 'arrived' | 'on_ride' | 'completed' | 'cancelled_by_driver' | 'cancelled_by_client' }
 */
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

        // Haqiqiy davomiylik va narx (real masofa GPS'dan kelishi kerak;
        // hozircha estimated qiymatlarni final deb olamiz)
        const durationMs = trip.startedAt ? now - new Date(trip.startedAt) : 0;
        trip.actualDurationMin = (durationMs / 60000).toFixed(2);
        trip.actualDistanceKm = trip.estimatedDistanceKm;
        trip.finalPrice = trip.estimatedPrice;
        trip.isPaid = true; // naqd, joyida to'landi

        // Haydovchini bo'shatish va statistikasini yangilash
        const driver = await Driver.findByPk(trip.driverId);
        if (driver) {
          driver.status = DRIVER_STATUS.ONLINE;
          driver.totalTrips += 1;

          const tariff = await getTariffForRegion(trip.regionId);
          const commission = (Number(trip.finalPrice) * Number(tariff.commissionPercent)) / 100;
          driver.balance = Number(driver.balance) - commission;
          await driver.save();
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

    // Holat o'zgarishini ikkala tomonga (mijoz va haydovchi) yuborish
    const io = req.app.get('io');
    if (io) notifyTripUpdate(io, trip.id, trip);

    res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
};

/**
 * Safarni baholash (mijoz tomonidan)
 * PATCH /api/trips/:id/rate
 * body: { rating: 1-5, comment }
 */
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

    // Haydovchining o'rtacha bahosini qayta hisoblash
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

/**
 * Mening safarlarim tarixi (mijoz yoki haydovchi)
 * GET /api/trips/my
 */
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

/**
 * Bitta safar haqida to'liq ma'lumot
 * GET /api/trips/:id
 */
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

/**
 * Hozir "searching" holatdagi buyurtmalar - online haydovchilarga ko'rsatish uchun.
 * Haydovchi o'z hududidagi kutilayotgan buyurtmalarni ko'radi.
 * GET /api/trips/available
 */
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
