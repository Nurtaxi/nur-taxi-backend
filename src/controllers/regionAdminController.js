const { User, Driver, Vehicle, Trip, Tariff, ROLES, DRIVER_STATUS } = require('../models');
const { Op } = require('sequelize');

/**
 * O'z hududidagi barcha haydovchilarni ko'rish (filtr bilan: status, ism)
 * GET /api/region-admin/drivers
 */
const listRegionDrivers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const regionId = req.user.role === 'super_admin' ? req.query.regionId : req.user.regionId;

    const userWhere = { role: ROLES.DRIVER, regionId };
    if (search) {
      userWhere.fullName = { [Op.iLike]: `%${search}%` };
    }

    const driverWhere = {};
    if (status) driverWhere.status = status;

    const drivers = await Driver.findAll({
      where: driverWhere,
      include: [
        { association: 'user', where: userWhere, attributes: ['id', 'fullName', 'phone', 'regionId', 'isActive'] },
        { association: 'vehicles' },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: drivers });
  } catch (err) {
    next(err);
  }
};

/**
 * Yangi ro'yxatdan o'tgan ("pending_approval") haydovchini tasdiqlash yoki rad etish
 * PATCH /api/region-admin/drivers/:driverId/approval
 * body: { approve: true/false }
 */
const reviewDriverApplication = async (req, res, next) => {
  try {
    const { approve } = req.body;
    const driver = await Driver.findByPk(req.params.driverId, { include: ['user'] });

    if (!driver) return res.status(404).json({ success: false, message: 'Haydovchi topilmadi' });

    // Hudud admini faqat o'z hududidagi haydovchini tasdiqlay oladi
    if (req.user.role === 'region_admin' && driver.user.regionId !== req.user.regionId) {
      return res.status(403).json({ success: false, message: 'Bu boshqa hududga tegishli haydovchi' });
    }

    if (driver.status !== DRIVER_STATUS.PENDING_APPROVAL) {
      return res.status(400).json({ success: false, message: 'Bu ariza allaqachon ko\'rib chiqilgan' });
    }

    driver.status = approve ? DRIVER_STATUS.OFFLINE : DRIVER_STATUS.BLOCKED;
    await driver.save();

    res.json({
      success: true,
      message: approve ? 'Haydovchi tasdiqlandi' : 'Ariza rad etildi',
      data: driver,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Haydovchini bloklash / blokdan chiqarish
 * PATCH /api/region-admin/drivers/:driverId/block
 * body: { block: true/false }
 */
const toggleDriverBlock = async (req, res, next) => {
  try {
    const { block } = req.body;
    const driver = await Driver.findByPk(req.params.driverId, { include: ['user'] });

    if (!driver) return res.status(404).json({ success: false, message: 'Haydovchi topilmadi' });

    if (req.user.role === 'region_admin' && driver.user.regionId !== req.user.regionId) {
      return res.status(403).json({ success: false, message: 'Bu boshqa hududga tegishli haydovchi' });
    }

    driver.status = block ? DRIVER_STATUS.BLOCKED : DRIVER_STATUS.OFFLINE;
    await driver.save();

    res.json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
};

/**
 * O'z hududi bo'yicha statistika (kunlik/umumiy)
 * GET /api/region-admin/stats
 */
const getRegionStats = async (req, res, next) => {
  try {
    const regionId = req.user.role === 'super_admin' ? req.query.regionId : req.user.regionId;

    if (!regionId) {
      return res.status(400).json({ success: false, message: 'regionId ko\'rsatilmagan' });
    }

    const totalDrivers = await Driver.count({
      include: [{ association: 'user', where: { regionId, role: ROLES.DRIVER } }],
    });

    const onlineDrivers = await Driver.count({
      where: { status: DRIVER_STATUS.ONLINE },
      include: [{ association: 'user', where: { regionId, role: ROLES.DRIVER } }],
    });

    const pendingDrivers = await Driver.count({
      where: { status: DRIVER_STATUS.PENDING_APPROVAL },
      include: [{ association: 'user', where: { regionId, role: ROLES.DRIVER } }],
    });

    const totalTrips = await Trip.count({ where: { regionId } });
    const completedTrips = await Trip.count({ where: { regionId, status: 'completed' } });

    const revenueResult = await Trip.sum('finalPrice', { where: { regionId, status: 'completed' } });

    res.json({
      success: true,
      data: {
        totalDrivers,
        onlineDrivers,
        pendingDrivers,
        totalTrips,
        completedTrips,
        totalRevenue: revenueResult || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listRegionDrivers,
  reviewDriverApplication,
  toggleDriverBlock,
  getRegionStats,
};
