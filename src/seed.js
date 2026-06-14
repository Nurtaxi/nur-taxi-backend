require('dotenv').config();
const sequelize = require('../config/database');
const { Region, Tariff, User, ROLES } = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    // 1. Bosh admin (glavni admin) - agar mavjud bo'lmasa yaratish
    const existingSuperAdmin = await User.findOne({ where: { role: ROLES.SUPER_ADMIN } });

    if (!existingSuperAdmin) {
      await User.create({
        fullName: 'Bosh Administrator',
        phone: '+998900000000',
        passwordHash: 'admin123', // ❗ Productionda majburiy o'zgartiring
        role: ROLES.SUPER_ADMIN,
        isVerified: true,
      });
      console.log('✅ Bosh admin yaratildi: +998900000000 / admin123');
    } else {
      console.log('ℹ️  Bosh admin allaqachon mavjud');
    }

    // 2. Namuna hudud - Toshkent
    const [region] = await Region.findOrCreate({
      where: { code: 'TSH' },
      defaults: {
        name: 'Toshkent shahri',
        code: 'TSH',
        centerLat: 41.311081,
        centerLng: 69.240562,
      },
    });
    console.log(`✅ Hudud tayyor: ${region.name}`);

    // 3. Shu hudud uchun default tarif
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
    console.log('✅ Tarif tayyor');

    console.log('\n🎉 Seed muvaffaqiyatli yakunlandi!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed xatosi:', err);
    process.exit(1);
  }
};

seed();
