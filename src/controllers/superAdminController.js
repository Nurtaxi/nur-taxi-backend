const { Region, Tariff, User, Driver, Trip, ROLES } = require('../models');

/**
 * Yangi hudud yaratish
 * POST /api/admin/regions
 */
const createRegion = async (req, res, next) => {
  try {
    const { name, code, centerLat, centerLng } = req.body;

    const region = await Region.create({ name, code, centerLat, centerLng });

    // Har bir yangi hudud uchun default tarif ham yaratamiz
    await Tariff.create({
      regionId: region.id,
      baseFare: Number(process.env.BASE_FARE || 5000),
      pricePerKm: Number(process.env.PRICE_PER_KM || 1500),
      pricePerMinute: Number(process.env.PRICE_PER_MINUTE || 300),
      minFare: Number(process.env.MIN_FARE || 8000),
      commissionPercent: 10,
    });

    res.status(201).json({ success: true, data: region });
  } catch (err) {
    next(err);
  }
};

/**
 * Barcha hududlar ro'yxati
 * GET /api/admin/regions
 */
const listRegions = async (req, res, next) => {
  try {
    const regions = await Region.findAll({ include: ['tariff'], order: [['name', 'ASC']] });
    res.json({ success: true, data: regions });
  } catch (err) {
    next(err);
  }
};

/**
 * Hududni yangilash (faollik, nom va h.k.)
 * PATCH /api/admin/regions/:id
 */
const updateRegion = async (req, res, next) => {
  try {
    const region = await Region.findByPk(req.params.id);
    if (!region) return res.status(404).json({ success: false, message: 'Hudud topilmadi' });

    await region.update(req.body);
    res.json({ success: true, data: region });
  } catch (err) {
    next(err);
  }
};

/**
 * Hudud uchun tarifni o'zgartirish
 * PATCH /api/admin/regions/:id/tariff
 */
const updateRegionTariff = async (req, res, next) => {
  try {
    const { baseFare, pricePerKm, pricePerMinute, minFare, commissionPercent } = req.body;

    let tariff = await Tariff.findOne({ where: { regionId: req.params.id } });
    if (!tariff) {
      tariff = await Tariff.create({ regionId: req.params.id, baseFare, pricePerKm, pricePerMinute, minFare, commissionPercent });
    } else {
      await tariff.update({ baseFare, pricePerKm, pricePerMinute, minFare, commissionPercent, updatedBy: req.user.id });
    }

    res.json({ success: true, data: tariff });
  } catch (err) {
    next(err);
  }
};

/**
 * Yangi hudud admini tayinlash
 * POST /api/admin/region-admins
 * body: { fullName, phone, password, regionId }
 */
const createRegionAdmin = async (req, res, next) => {
  try {
    const { fullName, phone, password, regionId } = req.body;

    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
    }

    const region = await Region.findByPk(regionId);
    if (!region) return res.status(400).json({ success: false, message: 'Hudud topilmadi' });

    const admin = await User.create({
      fullName,
      phone,
      passwordHash: password,
      role: ROLES.REGION_ADMIN,
      regionId,
      isVerified: true,
    });

    res.status(201).json({ success: true, data: admin.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * Barcha hudud adminlari ro'yxati
 * GET /api/admin/region-admins
 */
const listRegionAdmins = async (req, res, next) => {
  try {
    const admins = await User.findAll({
      where: { role: ROLES.REGION_ADMIN },
      attributes: { exclude: ['passwordHash'] },
      include: ['region'],
    });
    res.json({ success: true, data: admins });
  } catch (err) {
    next(err);
  }
};

/**
 * Hudud adminini bloklash/blokdan chiqarish
 * PATCH /api/admin/region-admins/:id/block
 */
const toggleRegionAdminBlock = async (req, res, next) => {
  try {
    const { block } = req.body;
    const admin = await User.findOne({ where: { id: req.params.id, role: ROLES.REGION_ADMIN } });
    if (!admin) return res.status(404).json({ success: false, message: 'Hudud admini topilmadi' });

    admin.isActive = !block;
    await admin.save();

    res.json({ success: true, data: admin.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * Butun tizim bo'yicha umumiy statistika (barcha hududlar)
 * GET /api/admin/stats
 */
const getGlobalStats = async (req, res, next) => {
  try {
    const totalRegions = await Region.count();
    const totalClients = await User.count({ where: { role: ROLES.CLIENT } });
    const totalDrivers = await User.count({ where: { role: ROLES.DRIVER } });
    const totalTrips = await Trip.count();
    const completedTrips = await Trip.count({ where: { status: 'completed' } });
    const totalRevenue = await Trip.sum('finalPrice', { where: { status: 'completed' } });

    // Hudud bo'yicha taqsimot
    const regions = await Region.findAll({
      attributes: ['id', 'name', 'code'],
    });

    const regionBreakdown = await Promise.all(
      regions.map(async (region) => {
        const driverCount = await User.count({ where: { role: ROLES.DRIVER, regionId: region.id } });
        const tripCount = await Trip.count({ where: { regionId: region.id, status: 'completed' } });
        const revenue = await Trip.sum('finalPrice', { where: { regionId: region.id, status: 'completed' } });
        return {
          regionId: region.id,
          regionName: region.name,
          driverCount,
          tripCount,
          revenue: revenue || 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalRegions,
        totalClients,
        totalDrivers,
        totalTrips,
        completedTrips,
        totalRevenue: totalRevenue || 0,
        regionBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRegion,
  listRegions,
  updateRegion,
  updateRegionTariff,
  createRegionAdmin,
  listRegionAdmins,
  toggleRegionAdminBlock,
  getGlobalStats,
};
