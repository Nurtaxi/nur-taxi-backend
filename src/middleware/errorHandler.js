/* eslint-disable no-unused-vars */

// 404 - topilmagan yo'l
const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Yo'l topilmadi: ${req.originalUrl}` });
};

// Umumiy xatolarni qayta ishlash
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Sequelize validatsiya xatosi
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Ma\'lumotlar noto\'g\'ri kiritildi',
      errors: err.errors?.map((e) => e.message),
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server xatosi yuz berdi',
  });
};

module.exports = { notFound, errorHandler };
