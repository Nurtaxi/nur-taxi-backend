const express = require('express');
const { body } = require('express-validator');
const { registerClient, registerDriver, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const phoneValidator = body('phone')
  .matches(/^\+998\d{9}$/)
  .withMessage('Telefon raqam formati: +998901234567');

const passwordValidator = body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 belgidan iborat bo\'lishi kerak');

router.post(
  '/register/client',
  [body('fullName').notEmpty(), phoneValidator, passwordValidator],
  validate,
  registerClient
);

router.post(
  '/register/driver',
  [
    body('fullName').notEmpty(),
    phoneValidator,
    passwordValidator,
    body('regionId').isUUID().withMessage('regionId noto\'g\'ri'),
    body('licenseNumber').notEmpty(),
  ],
  validate,
  registerDriver
);

router.post('/login', [phoneValidator, body('password').notEmpty()], validate, login);

router.get('/me', authenticate, getMe);

router.patch('/me', authenticate, [body('fullName').optional().notEmpty()], validate, updateProfile);

router.patch(
  '/me/password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }).withMessage('Yangi parol kamida 6 belgidan iborat bo\'lishi kerak'),
  ],
  validate,
  changePassword
);

module.exports = router;
