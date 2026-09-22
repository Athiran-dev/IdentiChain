const { Router } = require('express');
const walletAuth = require('../middleware/walletAuth');
const { getOverviewStats } = require('../controllers/stats.controller');

const router = Router();

// GET /api/stats/overview - Requires wallet auth, should probably be ADMIN but we'll let walletAuth handle it, we can restrict to ADMIN in controller if needed, but for now we just return counts.
router.get('/overview', walletAuth, getOverviewStats);

module.exports = router;
