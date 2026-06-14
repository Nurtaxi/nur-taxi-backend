require('dotenv').config();
const { Sequelize } = require('sequelize');

// Render kabi xizmatlar bitta DATABASE_URL beradi (masalan:
// postgres://user:pass@host:5432/dbname). Agar shu o'zgaruvchi mavjud bo'lsa,
// undan foydalanamiz; aks holda alohida DB_* o'zgaruvchilardan (local development).
const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...commonOptions,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      ...commonOptions,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
    }
  );
}

module.exports = sequelize;
