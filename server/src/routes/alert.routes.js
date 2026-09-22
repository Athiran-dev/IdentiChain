const { Router } = require('express');
const walletAuth = require('../middleware/walletAuth');
const { listAlerts, updateAlertStatus } = require('../controllers/alert.controller');

const router = Router();

// GET /api/alerts/list
router.get('/list', walletAuth, listAlerts);

// PATCH /api/alerts/:id/status
router.patch('/:id/status', walletAuth, updateAlertStatus);

module.exports = router;
