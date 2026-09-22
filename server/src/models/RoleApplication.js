const mongoose = require('mongoose');

const roleApplicationSchema = new mongoose.Schema(
  {
    wallet: { type: String, lowercase: true, index: true },
    requestedRole: {
      type: String,
      enum: ['EMPLOYEE', 'MANAGER', 'AUDITOR'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewedBy: String,
    reviewedAt: Date,
  },
  { timestamps: { createdAt: 'submittedAt', updatedAt: false } }
);

module.exports = mongoose.model('RoleApplication', roleApplicationSchema);
