const { Region } = require('../models');

/**
 * Faol hududlar ro'yxati - ro'yxatdan o'tish formalarida ishlatish uchun.
 * Autentifikatsiya talab qilinmaydi.
 * GET /api/regions
 */
const listActiveRegions = async (req, res, next) => {
  try {
    const regions = await Region.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: regions });
  } catch (err) {
    next(err);
  }
};

module.exports = { listActiveRegions };
