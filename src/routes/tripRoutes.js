const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createTrip,
  acceptTrip,
  updateTripStatus,
  rateTrip,
  getMyTrips,
  getTripById,
  getAvailableTrips,
} = require('../controllers/tripController');

const router = express.Router();

router.use(authenticate);

// Mijoz: buyurtma yaratish
router.post('/', authorize('client'), createTrip);

// Haydovchi: mavjud buyurtmalarni ko'rish va qabul qilish
router.get('/available', authorize('driver'), getAvailableTrips);
router.patch('/:id/accept', authorize('driver'), acceptTrip);

// Haydovchi: holatni o'zgartirish (arrived, on_ride, completed, cancelled)
// Mijoz ham bekor qilishi mumkin
router.patch('/:id/status', authorize('driver', 'client'), updateTripStatus);

// Mijoz: baholash
router.patch('/:id/rate', authorize('client'), rateTrip);

// Umumiy: o'z safarlar tarixi
router.get('/my', getMyTrips);

// Umumiy: bitta safar tafsilotlari
router.get('/:id', getTripById);

module.exports = router;
