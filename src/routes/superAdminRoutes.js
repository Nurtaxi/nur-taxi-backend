const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createRegion,
  listRegions,
  updateRegion,
  updateRegionTariff,
  createRegionAdmin,
  listRegionAdmins,
  toggleRegionAdminBlock,
  getGlobalStats,
} = require('../controllers/superAdminController');

const router = express.Router();

// Faqat bosh admin (glavni admin)
router.use(authenticate, authorize('super_admin'));

// Hududlar
router.post('/regions', createRegion);
router.get('/regions', listRegions);
router.patch('/regions/:id', updateRegion);
router.patch('/regions/:id/tariff', updateRegionTariff);

// Hudud adminlari
router.post('/region-admins', createRegionAdmin);
router.get('/region-admins', listRegionAdmins);
router.patch('/region-admins/:id/block', toggleRegionAdminBlock);

// Umumiy statistika
router.get('/stats', getGlobalStats);

module.exports = router;
