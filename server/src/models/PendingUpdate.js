const mongoose = require('mongoose');

const pendingUpdateSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true },
    wallet: { type: String, required: true, lowercase: true },
    metadataCID: String,
    currentCID: String,       // encrypted file CID
    currentHash: String,      // SHA-256 hex
    imageCID: String,
    encryptedKeyHex: String,  // wrapped AES key for the new version
    name: String,
    description: String,
    assetType: String,
  },
  { timestamps: true }
);

// Compound unique — one pending update per tokenId + wallet
pendingUpdateSchema.index({ tokenId: 1, wallet: 1 }, { unique: true });

// TTL index — auto-delete after 15 minutes (restart-safe)
pendingUpdateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model('PendingUpdate', pendingUpdateSchema);
