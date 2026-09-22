const User = require('../models/User');
const Asset = require('../models/Asset');
const RoleApplication = require('../models/RoleApplication');
const AuditLog = require('../models/AuditLog');

async function getOverviewStats(req, res, next) {
  try {
    const [totalUsers, totalAssets, pendingApps, totalLogs] = await Promise.all([
      User.countDocuments({}),
      Asset.countDocuments({}),
      RoleApplication.countDocuments({ status: 'PENDING' }),
      AuditLog.countDocuments({})
    ]);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalAssets,
        pendingApps,
        totalLogs
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverviewStats
};
