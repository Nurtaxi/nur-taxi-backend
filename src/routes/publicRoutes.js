const express = require('express');
const { listActiveRegions } = require('../controllers/publicController');

const router = express.Router();

router.get('/regions', listActiveRegions);

module.exports = router;
