const { User, Driver, Region, ROLES } = require('../models');
const { generateToken } = require('../utils/jwt');

/**
 * Mijoz ro'yxatdan o'tishi (ochiq, hammaga ruxsat)
 * POST /api/auth/register/client
 */
const registerClient = async (req, res, next) => {
  try {
    const { fullName, phone, password } = req.body;

    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
    }

    const user = await User.create({
      fullName,
      phone,
      passwordHash: password,
      role: ROLES.CLIENT,
    });

    const token = generateToken(user);
    res.status(201).json({ success: true, data: { user: user.toSafeJSON(), token } });
  } catch (err) {
    next(err);
  }
};

/**
 * Haydovchi ro'yxatdan o'tishi (ariza, "pending_approval" holatida boshlanadi,
 * hudud admini tasdiqlashi kerak)
 * POST /api/auth/register/driver
 */
const registerDriver = async (req, res, next) => {
  try {
    const { fullName, phone, password, regionId, licenseNumber } = req.body;

    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
    }

    const region = await Region.findByPk(regionId);
    if (!region) {
      return res.status(400).json({ success: false, message: 'Hudud topilmadi' });
    }

    const user = await User.create({
      fullName,
      phone,
      passwordHash: password,
      role: ROLES.DRIVER,
      regionId,
    });

    const driver = await Driver.create({
      userId: user.id,
      licenseNumber,
    });

    const token = generateToken(user);
    res.status(201).json({
      success: true,
      message: 'Arizangiz qabul qilindi. Hudud admini tasdiqlashini kuting.',
      data: { user: user.toSafeJSON(), driver, token },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Barcha rollar uchun umumiy login
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Telefon raqam yoki parol noto\'g\'ri' });
    }

    const isValid = await user.checkPassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Telefon raqam yoki parol noto\'g\'ri' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Hisobingiz bloklangan. Admin bilan bog\'laning.' });
    }

    const token = generateToken(user);
    res.json({ success: true, data: { user: user.toSafeJSON(), token } });
  } catch (err) {
    next(err);
  }
};

/**
 * Joriy foydalanuvchi ma'lumotlarini olish
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerClient, registerDriver, login, getMe };
