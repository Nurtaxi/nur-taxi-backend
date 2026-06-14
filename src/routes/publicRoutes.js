const express = require('express');
const { listActiveRegions, runSeed } = require('../controllers/publicController');

const router = express.Router();

router.get('/regions', listActiveRegions);
router.get('/setup-seed', runSeed);

module.exports = router;
