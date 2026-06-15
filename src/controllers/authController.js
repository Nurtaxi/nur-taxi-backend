const { User, Driver, Region, ROLES } = require('../models');
const { generateToken } = require('../utils/jwt');

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

const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { fullName } = req.body;

    if (fullName) {
      req.user.fullName = fullName;
      await req.user.save();
    }

    res.json({ success: true, data: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const isValid = await req.user.checkPassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Joriy parol noto\'g\'ri' });
    }

    req.user.passwordHash = newPassword;
    await req.user.save();

    res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerClient, registerDriver, login, getMe, updateProfile, changePassword };
