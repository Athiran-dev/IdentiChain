const { Router } = require('express');
const walletAuth = require('../middleware/walletAuth');
const { getAuditLogs, exportAuditLogs } = require('../controllers/audit.controller');

const router = Router();

// GET /api/audit/log — list audit logs
router.get('/log', walletAuth, getAuditLogs);

// GET /api/audit/export — export audit logs to CSV
router.get('/export', walletAuth, exportAuditLogs);

module.exports = router;
