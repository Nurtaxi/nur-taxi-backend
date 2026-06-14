const { Tariff } = require('../models');

/**
 * Ikki koordinata orasidagi masofani km da hisoblaydi (Haversine formula).
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Yer radiusi (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Taxminiy vaqtni hisoblaydi (daqiqada), o'rtacha shahar tezligi 30km/soat deb olingan.
 */
const estimateDurationMin = (distanceKm) => {
  const avgSpeedKmh = 30;
  return (distanceKm / avgSpeedKmh) * 60;
};

/**
 * Berilgan hudud uchun tarifni topadi. Agar topilmasa, .env dagi default qiymatlardan foydalanadi.
 */
const getTariffForRegion = async (regionId) => {
  const tariff = await Tariff.findOne({ where: { regionId } });

  if (tariff) return tariff;

  // Default tarif (.env)
  return {
    baseFare: Number(process.env.BASE_FARE || 5000),
    pricePerKm: Number(process.env.PRICE_PER_KM || 1500),
    pricePerMinute: Number(process.env.PRICE_PER_MINUTE || 300),
    minFare: Number(process.env.MIN_FARE || 8000),
    commissionPercent: 10,
  };
};

/**
 * Safar narxini hisoblaydi: baseFare + (km * pricePerKm) + (min * pricePerMinute)
 * Natija minFare dan kam bo'lmasligi kerak.
 */
const calculatePrice = ({ distanceKm, durationMin, tariff }) => {
  const raw =
    Number(tariff.baseFare) +
    distanceKm * Number(tariff.pricePerKm) +
    durationMin * Number(tariff.pricePerMinute);

  const price = Math.max(raw, Number(tariff.minFare));

  // 100 so'mga yaxlitlash
  return Math.round(price / 100) * 100;
};

module.exports = {
  calculateDistanceKm,
  estimateDurationMin,
  getTariffForRegion,
  calculatePrice,
};
