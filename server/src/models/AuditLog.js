const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    tokenId: Number,
    actionType: {
      type: String,
      enum: [
        'DOCUMENT_VIEWED',
        'DOCUMENT_MINTED',
        'DOCUMENT_UPDATED',
        'ACCESS_GRANTED',
        'ACCESS_REVOKED',
        'OWNERSHIP_TRANSFERRED',
        'ACCESS_EXHAUSTED',
        'CHANGE_REQUEST_SUBMITTED',
        'CHANGE_REQUEST_APPROVED',
        'CHANGE_REQUEST_REJECTED',
      ],
    },
    actor: { type: String, lowercase: true },
    details: String,
    blockNumber: Number,
    transactionHash: String,
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
