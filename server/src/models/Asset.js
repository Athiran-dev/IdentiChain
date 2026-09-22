const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, unique: true, index: true },
    name: String,
    description: String,
    assetType: String,
    fileType: String,           // original mimetype (e.g. 'application/pdf', 'image/png')
    owner: { type: String, lowercase: true, index: true },
    currentVersion: Number,
    currentCID: String,     // encrypted file CID on IPFS
    currentHash: String,    // SHA-256 hex of the original (unencrypted) file
    metadataCID: String,    // tokenURI value (IPFS CID of the metadata JSON)
    imageCID: String,       // NFT image CID (hash-derived SVG on IPFS)
    mintTxHash: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
