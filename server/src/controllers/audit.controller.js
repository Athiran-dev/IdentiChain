const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// Helper to build filter based on query params
async function buildFilter(query) {
  const { tokenId, startDate, endDate, actor, role } = query;
  const filter = {};

  if (tokenId) filter.tokenId = Number(tokenId);
  
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  if (actor) {
    filter.actor = actor.toLowerCase();
  }

  if (role && role !== 'ALL') {
    // Find wallets with this role
    const users = await User.find({ roleCache: role }).lean();
    const wallets = users.map(u => u.walletAddress.toLowerCase());
    
    if (filter.actor) {
      if (!wallets.includes(filter.actor)) {
        filter.actor = 'nobody'; 
      }
    } else {
      filter.actor = { $in: wallets };
    }
  }

  return filter;
}

// Helper to enrich logs with user names and roles
async function enrichLogs(logs) {
  const wallets = new Set();
  logs.forEach(log => {
    if (log.actor) wallets.add(log.actor.toLowerCase());
    
    // Attempt to extract target from details if it's missing in the DB
    if (!log.target && log.details) {
      const match = log.details.match(/0x[a-fA-F0-9]{40}/);
      if (match) log.target = match[0];
    }
    
    if (log.target && log.target.startsWith('0x')) {
      wallets.add(log.target.toLowerCase());
    }
  });

  const users = await User.find({ walletAddress: { $in: Array.from(wallets) } }).lean();
  const userMap = {};
  users.forEach(u => {
    userMap[u.walletAddress.toLowerCase()] = { name: u.name, role: u.roleCache || 'NONE' };
  });

  return logs.map(log => {
    const actorInfo = log.actor ? userMap[log.actor.toLowerCase()] : null;
    let targetInfo = null;
    if (log.target && log.target.startsWith('0x')) {
      targetInfo = userMap[log.target.toLowerCase()];
    }
    return {
      ...log,
      actorName: actorInfo ? actorInfo.name : 'Unknown User',
      actorRole: actorInfo ? actorInfo.role : 'NONE',
      targetName: targetInfo ? targetInfo.name : log.target,
      targetRole: targetInfo ? targetInfo.role : 'NONE',
    };
  });
}

/**
 * GET /api/audit/log
 * Get audit logs, optionally filtered by tokenId.
 */
async function getAuditLogs(req, res) {
  try {
    const filter = await buildFilter(req.query);
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    const enrichedLogs = await enrichLogs(logs);
    res.json({ logs: enrichedLogs, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}

/**
 * GET /api/audit/export
 * Export audit logs to CSV
 */
async function exportAuditLogs(req, res) {
  try {
    const filter = await buildFilter(req.query);
    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(10000).lean();
    const enrichedLogs = await enrichLogs(logs);

    let csv = 'Timestamp,Action Type,Actor Name,Actor Role,Actor Wallet,Target Name,Target Role,Target Value,Details,Token ID,Transaction Hash\n';
    
    enrichedLogs.forEach(log => {
      const date = log.timestamp ? new Date(log.timestamp).toISOString() : '';
      const action = log.actionType || '';
      const actorName = `"${(log.actorName || '').replace(/"/g, '""')}"`;
      const actorRole = log.actorRole || '';
      const actorWallet = log.actor || '';
      const targetName = `"${(log.targetName || '').replace(/"/g, '""')}"`;
      const targetRole = log.targetRole || '';
      const targetVal = log.target || '';
      const details = `"${(log.details || '').replace(/"/g, '""')}"`;
      const tokenId = log.tokenId || '';
      const tx = log.transactionHash || '';

      csv += `${date},${action},${actorName},${actorRole},${actorWallet},${targetName},${targetRole},${targetVal},${details},${tokenId},${tx}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export logs' });
  }
}

module.exports = { getAuditLogs, exportAuditLogs };
