const mongoose = require('mongoose');

const changeRequestSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, index: true },
    submittedBy: { type: String, required: true, lowercase: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    metadataCID: String,
    currentCID: String,       // encrypted file CID for the proposed version
    currentHash: String,      // SHA-256 hex of the proposed (unencrypted) file
    imageCID: String,
    encryptedKeyHex: String,  // wrapped AES key for the proposed version
    baseVersion: Number,      // which version this change was made against
    // Metadata carried from the proposal
    name: String,
    description: String,
    assetType: String,
    fileType: String,         // original mimetype of the proposed file
    // Review fields
    reviewedBy: { type: String, lowercase: true },
    reviewedAt: Date,
    reviewNote: String,
  },
  { timestamps: true }  // createdAt + updatedAt — no TTL
);

// Index for common queries
changeRequestSchema.index({ tokenId: 1, status: 1 });

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
