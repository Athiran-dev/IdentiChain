const mongoose = require('mongoose');

const securityAlertSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'ANOMALY_DETECTION' },
    wallet: { type: String, lowercase: true, index: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    reason: String,
    status: {
      type: String,
      enum: ['PENDING_AUDITOR', 'ESCALATED_MANAGER', 'ESCALATED_ADMIN', 'DISMISSED', 'RESOLVED'],
      default: 'PENDING_AUDITOR'
    },
    context: mongoose.Schema.Types.Mixed, // Storing AI context/logs
  },
  { timestamps: true }
);

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);
