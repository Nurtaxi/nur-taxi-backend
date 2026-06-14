const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

/**
 * Foydalanuvchi tizimga kirganligini tekshiradi (JWT token orqali).
 * req.user ga foydalanuvchi ma'lumotlarini qo'shadi.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token topilmadi' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi yoki bloklangan' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token yaroqsiz yoki muddati o\'tgan' });
  }
};

/**
 * Faqat ko'rsatilgan rollarga ruxsat beradi.
 * Masalan: authorize('super_admin', 'region_admin')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Sizda bu amal uchun ruxsat yo\'q' });
    }
    next();
  };
};

/**
 * Hudud admini faqat o'z hududidagi ma'lumotlarga kira oladi.
 * Bosh admin (super_admin) cheklovsiz kira oladi.
 * req.params.regionId yoki req.body.regionId bilan solishtiriladi.
 */
const restrictToOwnRegion = (req, res, next) => {
  if (req.user.role === 'super_admin') {
    return next();
  }

  const targetRegionId = req.params.regionId || req.body.regionId || req.query.regionId;

  if (req.user.role === 'region_admin') {
    if (!targetRegionId || targetRegionId !== req.user.regionId) {
      return res.status(403).json({
        success: false,
        message: 'Siz faqat o\'z hududingiz ma\'lumotlariga kira olasiz',
      });
    }
    return next();
  }

  return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
};

module.exports = { authenticate, authorize, restrictToOwnRegion };
