const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyProfile,
  updateMyStatus,
  updateMyLocation,
  upsertMyVehicle,
} = require('../controllers/driverController');

const router = express.Router();

// Barcha endpointlar faqat haydovchi uchun
router.use(authenticate, authorize('driver'));

router.get('/me', getMyProfile);
router.patch('/me/status', updateMyStatus);
router.patch('/me/location', updateMyLocation);
router.post('/me/vehicle', upsertMyVehicle);

module.exports = router;
