const mongoose = require('mongoose');

const assetVersionSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, index: true },
    version: Number,
    cid: String,            // encrypted file CID
    hash: String,           // SHA-256 hex of original file
    metadataCID: String,
    editedBy: { type: String, lowercase: true },
    transactionHash: String,
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

module.exports = mongoose.model('AssetVersion', assetVersionSchema);
