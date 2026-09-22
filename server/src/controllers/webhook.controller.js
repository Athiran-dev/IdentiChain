/**
 * POST /api/webhook/quicknode
 * QuickNode webhook receiver — STUB for Phase 5.
 *
 * Once QuickNode is configured to watch the deployed contract addresses,
 * this endpoint will:
 *   1. Verify the QUICKNODE_WEBHOOK_SECRET header
 *   2. Parse the event payload (block number, event type, args)
 *   3. Upsert into AuditLog / Asset / AccessGrant as appropriate
 *
 * For now, it verifies the secret and returns 200.
 */
async function handleQuickNode(req, res) {
  const secret = req.headers['x-quicknode-webhook-secret'] || req.headers['x-qn-webhook-secret'];

  if (secret !== process.env.QUICKNODE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  // TODO Phase 5: Parse req.body events and upsert MongoDB collections
  // Expected events to handle:
  //   - DocumentMinted → create Asset + AssetVersion + AuditLog
  //   - DocumentUpdated → update Asset + create AssetVersion + AuditLog
  //   - AccessGranted → upsert AccessGrant + AuditLog
  //   - AccessRevoked → delete AccessGrant + AuditLog
  //   - OwnershipTransferred → update Asset.owner + AuditLog

  console.log('[Webhook] QuickNode event received:', JSON.stringify(req.body).slice(0, 500));

  res.json({ success: true, message: 'Webhook received (stub — full processing in Phase 5)' });
}

module.exports = { handleQuickNode };
