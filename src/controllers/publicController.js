const { Region } = require('../models');
const { Tariff, User, ROLES } = require('../models');

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

const runSeed = async (req, res, next) => {
  try {
    const providedKey = req.query.key;
    if (!process.env.SEED_KEY || providedKey !== process.env.SEED_KEY) {
      return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
    }

    const results = [];

    const existingSuperAdmin = await User.findOne({ where: { role: ROLES.SUPER_ADMIN } });
    if (!existingSuperAdmin) {
      await User.create({
        fullName: 'Bosh Administrator',
        phone: '+998502102552',
        passwordHash: 'nurmuhammad2000+',
        role: ROLES.SUPER_ADMIN,
        isVerified: true,
      });
      results.push('Bosh admin yaratildi');
    } else {
      results.push('Bosh admin allaqachon mavjud');
    }

    const [region] = await Region.findOrCreate({
      where: { code: 'TSH' },
      defaults: {
        name: 'Toshkent shahri',
        code: 'TSH',
        centerLat: 41.311081,
        centerLng: 69.240562,
      },
    });
    results.push(`Hudud tayyor: ${region.name}`);

    await Tariff.findOrCreate({
      where: { regionId: region.id },
      defaults: {
        baseFare: Number(process.env.BASE_FARE || 5000),
        pricePerKm: Number(process.env.PRICE_PER_KM || 1500),
        pricePerMinute: Number(process.env.PRICE_PER_MINUTE || 300),
        minFare: Number(process.env.MIN_FARE || 8000),
        commissionPercent: 10,
      },
    });
    results.push('Tarif tayyor');

    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
};

module.exports = { listActiveRegions, runSeed };
