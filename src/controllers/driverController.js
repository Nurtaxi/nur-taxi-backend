const { Driver, Vehicle, DRIVER_STATUS } = require('../models');

/**
 * Haydovchi profilini olish (o'ziniki)
 * GET /api/drivers/me
 */
const getMyProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({
      where: { userId: req.user.id },
      include: ['vehicles'],
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi profili topilmadi' });
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
};

/**
 * Haydovchi holatini o'zgartiradi: online / offline
 * Faqat tasdiqlangan (approved) haydovchilar ish boshlay oladi.
 * PATCH /api/drivers/me/status
 * body: { status: 'online' | 'offline' }
 */
const updateMyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (![DRIVER_STATUS.ONLINE, DRIVER_STATUS.OFFLINE].includes(status)) {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri holat' });
    }

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi profili topilmadi' });
    }

    if (driver.status === DRIVER_STATUS.PENDING_APPROVAL) {
      return res.status(403).json({ success: false, message: 'Profilingiz hali tasdiqlanmagan' });
    }

    if (driver.status === DRIVER_STATUS.BLOCKED) {
      return res.status(403).json({ success: false, message: 'Profilingiz bloklangan' });
    }

    if (driver.status === DRIVER_STATUS.ON_TRIP && status === DRIVER_STATUS.OFFLINE) {
      return res.status(400).json({ success: false, message: 'Safar davomida offline bo\'lib bo\'lmaydi' });
    }

    driver.status = status;
    await driver.save();

    res.json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
};

/**
 * Haydovchining real vaqtdagi joylashuvini yangilash
 * (Asosiy oqim Socket.io orqali bo'lishi tavsiya etiladi, bu - zaxira REST endpoint)
 * PATCH /api/drivers/me/location
 * body: { lat, lng }
 */
const updateMyLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi profili topilmadi' });
    }

    driver.currentLat = lat;
    driver.currentLng = lng;
    driver.lastLocationUpdate = new Date();
    await driver.save();

    res.json({ success: true, data: { lat, lng } });
  } catch (err) {
    next(err);
  }
};

/**
 * Avtomobil ma'lumotlarini qo'shish/yangilash
 * POST /api/drivers/me/vehicle
 */
const upsertMyVehicle = async (req, res, next) => {
  try {
    const { brand, model, color, plateNumber, year } = req.body;

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi profili topilmadi' });
    }

    let vehicle = await Vehicle.findOne({ where: { driverId: driver.id } });

    if (vehicle) {
      await vehicle.update({ brand, model, color, plateNumber, year });
    } else {
      vehicle = await Vehicle.create({ driverId: driver.id, brand, model, color, plateNumber, year });
    }

    res.json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyProfile, updateMyStatus, updateMyLocation, upsertMyVehicle };
