const express = require('express');
const { listActiveRegions } = require('../controllers/publicController');

const router = express.Router();

// Autentifikatsiya talab qilinmaydigan endpointlar
router.get('/regions', listActiveRegions);

module.exports = router;
