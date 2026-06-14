const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listRegionDrivers,
  reviewDriverApplication,
  toggleDriverBlock,
  getRegionStats,
} = require('../controllers/regionAdminController');

const router = express.Router();

// Hudud admini va bosh admin kira oladi (bosh admin ?regionId= bilan istalgan hududni ko'radi)
router.use(authenticate, authorize('region_admin', 'super_admin'));

router.get('/drivers', listRegionDrivers);
router.patch('/drivers/:driverId/approval', reviewDriverApplication);
router.patch('/drivers/:driverId/block', toggleDriverBlock);
router.get('/stats', getRegionStats);

module.exports = router;
