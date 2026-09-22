const mongoose = require('mongoose');
const crypto = require('crypto');

const nonceSchema = new mongoose.Schema({
  wallet: { type: String, required: true, unique: true, lowercase: true, index: true },
  nonce: { type: String, required: true },
  issuedAt: { type: Date, required: true, default: Date.now },
});

// TTL index — auto-expire nonces after 5 minutes
nonceSchema.index({ issuedAt: 1 }, { expireAfterSeconds: 300 });

/**
 * Generate and store a nonce for a wallet. Upserts to prevent stale nonces.
 */
nonceSchema.statics.generateForWallet = async function (wallet) {
  const nonce = crypto.randomUUID();
  const issuedAt = new Date();
  await this.findOneAndUpdate(
    { wallet: wallet.toLowerCase() },
    { nonce, issuedAt },
    { upsert: true, new: true }
  );
  return { nonce, issuedAt: issuedAt.toISOString() };
};

module.exports = mongoose.model('Nonce', nonceSchema);
