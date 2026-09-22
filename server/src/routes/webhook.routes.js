const { Router } = require('express');
const { handleQuickNode } = require('../controllers/webhook.controller');

const router = Router();

// POST /api/webhook/quicknode — QuickNode webhook receiver (Phase 5 stub)
router.post('/quicknode', handleQuickNode);

module.exports = router;
