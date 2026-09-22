const cron = require('node-cron');
const AuditLog = require('../models/AuditLog');
const SecurityAlert = require('../models/SecurityAlert');
const { analyzeLogsForAnomalies } = require('../utils/ai');

// Function to run the AI detection
async function runDetectionSweep() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Find all document views in the last 5 minutes
    const recentLogs = await AuditLog.find({
      actionType: 'DOCUMENT_VIEWED',
      timestamp: { $gte: fiveMinutesAgo }
    }).lean();

    if (recentLogs.length === 0) return;

    console.log(`[SecurityCron] Analyzing ${recentLogs.length} logs for anomalies...`);

    const anomalies = await analyzeLogsForAnomalies(recentLogs);

    if (anomalies && anomalies.length > 0) {
      for (const anomaly of anomalies) {
        // Create an alert
        await SecurityAlert.create({
          type: 'ANOMALY_DETECTION',
          wallet: anomaly.wallet?.toLowerCase(),
          severity: anomaly.severity,
          reason: anomaly.reason,
          status: 'PENDING_AUDITOR',
          context: { logs: recentLogs.filter(l => l.actor === anomaly.wallet?.toLowerCase()) }
        });
        console.log(`[SecurityCron] Alert created for ${anomaly.wallet} (${anomaly.severity})`);
      }
    }
  } catch (error) {
    console.error('[SecurityCron] Error in detection sweep:', error);
  }
}

// Function to handle escalations
async function runEscalationSweep() {
  try {
    // For testing, we use 10 minutes so it doesn't disappear during the demo
    const escalationThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    // Escalate from AUDITOR to MANAGER
    const auditorResult = await SecurityAlert.updateMany(
      { status: 'PENDING_AUDITOR', createdAt: { $lt: escalationThreshold } },
      { $set: { status: 'ESCALATED_MANAGER' } }
    );
    if (auditorResult.modifiedCount > 0) {
      console.log(`[SecurityCron] Escalated ${auditorResult.modifiedCount} alerts to MANAGER`);
    }

    // Escalate from MANAGER to ADMIN
    const adminThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    const managerResult = await SecurityAlert.updateMany(
      { status: 'ESCALATED_MANAGER', createdAt: { $lt: adminThreshold } },
      { $set: { status: 'ESCALATED_ADMIN' } }
    );
    if (managerResult.modifiedCount > 0) {
      console.log(`[SecurityCron] Escalated ${managerResult.modifiedCount} alerts to ADMIN`);
    }
  } catch (error) {
    console.error('[SecurityCron] Error in escalation sweep:', error);
  }
}

function startSecurityCronJobs() {
  console.log('[SecurityCron] Starting cron jobs...');
  // Run detection every 5 minutes (for testing we can run it every 1 minute)
  cron.schedule('*/1 * * * *', runDetectionSweep);
  
  // Run escalation every 1 minute
  cron.schedule('*/1 * * * *', runEscalationSweep);
}

module.exports = { startSecurityCronJobs };
