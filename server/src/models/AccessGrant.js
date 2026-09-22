const mongoose = require('mongoose');

const accessGrantSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, index: true },
    wallet: { type: String, required: true, lowercase: true, index: true },
    level: { type: String, enum: ['VIEW', 'EDIT'] },
    expiresAt: { type: Date, default: null },
    grantedBy: { type: String, lowercase: true },
    transactionHash: String,
    maxViews: { type: Number, default: null },   // null = unlimited views
    viewsUsed: { type: Number, default: 0 },     // incremented atomically on each access
  },
  { timestamps: { createdAt: 'grantedAt', updatedAt: false } }
);

// Compound unique index — prevents duplicates and enables clean upserts
accessGrantSchema.index({ tokenId: 1, wallet: 1 }, { unique: true });

module.exports = mongoose.model('AccessGrant', accessGrantSchema);
