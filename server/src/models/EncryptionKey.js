const mongoose = require('mongoose');

const encryptionKeySchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, index: true },
    version: { type: Number, required: true },
    // AES-256 key, itself wrapped (encrypted) with MASTER_KEY_SECRET before storage.
    // NEVER store raw keys. NEVER expose this collection via any API route.
    encryptedKeyHex: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index — one key per tokenId + version pair
encryptionKeySchema.index({ tokenId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('EncryptionKey', encryptionKeySchema);
