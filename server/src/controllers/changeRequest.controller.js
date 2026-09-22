const { decodeEventLog } = require('viem');
const ChangeRequest = require('../models/ChangeRequest');
const Asset = require('../models/Asset');
const AssetVersion = require('../models/AssetVersion');
const AuditLog = require('../models/AuditLog');
const EncryptionKey = require('../models/EncryptionKey');
const { computeHash, generateKey, encryptFile, decryptFile, wrapKey, unwrapKey } = require('../utils/crypto');
const { uploadFileToPinata, uploadJSONToPinata, fetchFromIPFS } = require('../utils/ipfs');
const { generateCertificateSVG } = require('../utils/svgGenerator');
const {
  publicClient,
  assetNFTContract,
  assetNFTABI,
} = require('../config/viemClient');

const ROLE_MAP = { 0: 'NONE', 1: 'EMPLOYEE', 2: 'MANAGER', 3: 'AUDITOR', 4: 'ADMIN' };
const ACCESS_MAP = { 0: 'NONE', 1: 'VIEW', 2: 'EDIT' };

/**
 * POST /api/asset/:tokenId/propose-change
 * Employee submits a change for review — same pipeline as prepare-update,
 * but creates a ChangeRequest instead of a PendingUpdate.
 *
 * Uses the SAME getAccessLevel() on-chain EDIT check as prepareUpdate.
 */
async function proposeChange(req, res) {
  const { tokenId } = req.params;
  const wallet = req.walletAddress;
  const file = req.file;
  const { name, description, assetType } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }

  // --- PRE-FLIGHT: same on-chain EDIT check as prepareUpdate ---
  const levelRaw = await assetNFTContract.read.getAccessLevel([BigInt(tokenId), wallet]);
  const level = ACCESS_MAP[Number(levelRaw)] || 'NONE';

  if (level !== 'EDIT') {
    return res.status(403).json({
      error: 'No EDIT access on-chain for this document. Cannot propose change.',
    });
  }

  // Fetch existing asset
  const existingAsset = await Asset.findOne({ tokenId: Number(tokenId) });
  if (!existingAsset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const newVersion = (existingAsset.currentVersion || 1) + 1;
  const docName = name || existingAsset.name;

  // 1. Hash the original file
  const fileHash = computeHash(file.buffer);

  // 2. Generate AES key & encrypt
  const aesKey = generateKey();
  const encryptedBuffer = encryptFile(file.buffer, aesKey);

  // 3. Upload encrypted file to IPFS
  const encryptedCID = await uploadFileToPinata(
    encryptedBuffer,
    `${docName}_cr_v${newVersion}_encrypted`
  );

  // 4. Generate SVG → upload to IPFS
  const svgString = generateCertificateSVG({
    name: docName,
    hash: fileHash,
    owner: existingAsset.owner,
    version: newVersion,
  });
  const imageCID = await uploadFileToPinata(
    Buffer.from(svgString, 'utf8'),
    `${docName}_cr_v${newVersion}_certificate.svg`
  );

  // 5. Build metadata JSON → upload to IPFS
  const metadata = {
    name: docName,
    description: description || existingAsset.description || '',
    assetType: assetType || existingAsset.assetType || 'document',
    currentVersion: newVersion,
    currentCID: encryptedCID,
    currentHash: fileHash,
    image: `ipfs://${imageCID}`,
  };
  const metadataCID = await uploadJSONToPinata(metadata);

  // 6. Wrap AES key
  const wrappedKey = wrapKey(aesKey);

  // 7. Create ChangeRequest (no TTL — persists until reviewed)
  const cr = await ChangeRequest.create({
    tokenId: Number(tokenId),
    submittedBy: wallet.toLowerCase(),
    status: 'PENDING',
    metadataCID,
    currentCID: encryptedCID,
    currentHash: fileHash,
    imageCID,
    encryptedKeyHex: wrappedKey,
    baseVersion: existingAsset.currentVersion,
    name: docName,
    description: description || existingAsset.description || '',
    assetType: assetType || existingAsset.assetType || 'document',
    fileType: file.mimetype,
  });

  // Audit log
  await AuditLog.create({
    tokenId: Number(tokenId),
    actionType: 'CHANGE_REQUEST_SUBMITTED',
    actor: wallet.toLowerCase(),
    details: `Submitted change request for "${docName}" (base version ${existingAsset.currentVersion})`,
  });

  res.status(201).json({
    success: true,
    changeRequestId: cr._id,
    metadataCID,
    baseVersion: existingAsset.currentVersion,
  });
}

/**
 * GET /api/asset/:tokenId/change-requests
 * List PENDING change requests for an asset.
 * Only accessible to asset owner or ADMIN.
 */
async function listChangeRequests(req, res) {
  const { tokenId } = req.params;
  const wallet = req.walletAddress;

  // Auth check: must be owner or ADMIN
  const asset = await Asset.findOne({ tokenId: Number(tokenId) });
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const isOwner = asset.owner === wallet.toLowerCase();
  if (!isOwner) {
    // Check if ADMIN on-chain
    const { identityRegistryContract } = require('../config/viemClient');
    const roleRaw = await identityRegistryContract.read.getRole([wallet]);
    const role = ROLE_MAP[Number(roleRaw)] || 'NONE';
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the asset owner or ADMIN can view change requests' });
    }
  }

  const changeRequests = await ChangeRequest.find({
    tokenId: Number(tokenId),
    status: 'PENDING',
  }).sort({ createdAt: -1 });

  res.json({ changeRequests });
}

/**
 * GET /api/asset/change-request/:id/preview
 * Returns current and proposed decrypted content (base64) for diff view.
 * Auth: must be asset owner or ADMIN.
 */
async function previewChangeRequest(req, res) {
  const { id } = req.params;
  const wallet = req.walletAddress;

  const cr = await ChangeRequest.findById(id);
  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }

  const asset = await Asset.findOne({ tokenId: cr.tokenId });
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Auth check
  const isOwner = asset.owner === wallet.toLowerCase();
  if (!isOwner) {
    const { identityRegistryContract } = require('../config/viemClient');
    const roleRaw = await identityRegistryContract.read.getRole([wallet]);
    const role = ROLE_MAP[Number(roleRaw)] || 'NONE';
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the asset owner or ADMIN can preview change requests' });
    }
  }

  // Decrypt current version
  const currentKeyDoc = await EncryptionKey.findOne({
    tokenId: cr.tokenId,
    version: asset.currentVersion,
  });
  if (!currentKeyDoc) {
    return res.status(500).json({ error: 'Current version encryption key not found' });
  }

  const currentEncrypted = await fetchFromIPFS(asset.currentCID);
  const currentKey = unwrapKey(currentKeyDoc.encryptedKeyHex);
  const currentDecrypted = decryptFile(currentEncrypted, currentKey);

  // Decrypt proposed version (the CR's encrypted file)
  const proposedEncrypted = await fetchFromIPFS(cr.currentCID);
  const proposedKey = unwrapKey(cr.encryptedKeyHex);
  const proposedDecrypted = decryptFile(proposedEncrypted, proposedKey);

  res.json({
    current: {
      content: currentDecrypted.toString('base64'),
      fileType: asset.fileType,
      version: asset.currentVersion,
    },
    proposed: {
      content: proposedDecrypted.toString('base64'),
      fileType: cr.fileType || asset.fileType,
      version: cr.baseVersion + 1,
    },
    changeRequest: {
      id: cr._id,
      submittedBy: cr.submittedBy,
      baseVersion: cr.baseVersion,
      name: cr.name,
      createdAt: cr.createdAt,
    },
    // Warn if base version has diverged
    versionWarning: cr.baseVersion !== asset.currentVersion
      ? `This change was based on version ${cr.baseVersion}, but the document is now at version ${asset.currentVersion}. The review may not reflect the latest state.`
      : null,
  });
}

/**
 * POST /api/asset/change-request/:id/approve
 * Returns metadataCID for the reviewer to call updateDocument on-chain.
 */
async function approveChangeRequest(req, res) {
  const { id } = req.params;
  const wallet = req.walletAddress;

  const cr = await ChangeRequest.findById(id);
  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }
  if (cr.status !== 'PENDING') {
    return res.status(400).json({ error: `Change request is already ${cr.status}` });
  }

  const asset = await Asset.findOne({ tokenId: cr.tokenId });
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Auth: must be owner or ADMIN
  const isOwner = asset.owner === wallet.toLowerCase();
  if (!isOwner) {
    const { identityRegistryContract } = require('../config/viemClient');
    const roleRaw = await identityRegistryContract.read.getRole([wallet]);
    const role = ROLE_MAP[Number(roleRaw)] || 'NONE';
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the asset owner or ADMIN can approve change requests' });
    }
  }

  // Return metadataCID for on-chain tx
  res.json({
    success: true,
    tokenId: cr.tokenId,
    metadataCID: cr.metadataCID,
    versionWarning: cr.baseVersion !== asset.currentVersion
      ? `Base version ${cr.baseVersion} ≠ current version ${asset.currentVersion}. Proceeding will skip intermediate changes.`
      : null,
  });
}

/**
 * POST /api/asset/change-request/:id/confirm-approval
 * After the reviewer's on-chain updateDocument tx confirms.
 * Same pattern as confirm-update: verify receipt → decode event → mirror to MongoDB.
 */
async function confirmApproval(req, res) {
  const { id } = req.params;
  const wallet = req.walletAddress;
  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'txHash is required' });
  }

  const cr = await ChangeRequest.findById(id);
  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }
  if (cr.status !== 'PENDING') {
    return res.status(400).json({ error: `Change request is already ${cr.status}` });
  }

  // Verify the transaction
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    return res.status(400).json({ error: 'Transaction did not succeed on-chain' });
  }

  if (receipt.to?.toLowerCase() !== process.env.ASSET_NFT_ADDRESS.toLowerCase()) {
    return res.status(400).json({ error: 'Transaction was not sent to the AssetNFT contract' });
  }

  // Decode DocumentUpdated event
  let eventData;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: assetNFTABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'DocumentUpdated') {
        eventData = decoded.args;
        break;
      }
    } catch {
      // Not our event, skip
    }
  }

  if (!eventData) {
    return res.status(400).json({ error: 'No DocumentUpdated event found in transaction' });
  }

  const eventTokenId = Number(eventData.tokenId);
  const newVersion = Number(eventData.newVersion);
  const newMetadataCID = eventData.newMetadataCID;
  const editor = eventData.editor?.toLowerCase();

  // Validate tokenId matches
  if (eventTokenId !== cr.tokenId) {
    return res.status(400).json({ error: 'TokenId in event does not match change request' });
  }

  // Validate metadataCID matches what was proposed
  if (newMetadataCID !== cr.metadataCID) {
    return res.status(400).json({
      error: 'MetadataCID in event does not match the change request.',
      expected: cr.metadataCID,
      actual: newMetadataCID,
    });
  }

  // Save encryption key for new version
  await EncryptionKey.create({
    tokenId: eventTokenId,
    version: newVersion,
    encryptedKeyHex: cr.encryptedKeyHex,
  });

  // Mirror to MongoDB (same as confirm-update)
  await Promise.all([
    Asset.findOneAndUpdate(
      { tokenId: eventTokenId },
      {
        currentVersion: newVersion,
        currentCID: cr.currentCID,
        currentHash: cr.currentHash,
        metadataCID: newMetadataCID,
        imageCID: cr.imageCID,
        name: cr.name,
        description: cr.description,
        assetType: cr.assetType,
      }
    ),
    AssetVersion.create({
      tokenId: eventTokenId,
      version: newVersion,
      cid: cr.currentCID,
      hash: cr.currentHash,
      metadataCID: newMetadataCID,
      editedBy: cr.submittedBy,  // credit the original author
      transactionHash: txHash,
    }),
    AuditLog.create({
      tokenId: eventTokenId,
      actionType: 'CHANGE_REQUEST_APPROVED',
      actor: wallet.toLowerCase(),
      details: `Approved change request from ${cr.submittedBy} — document updated to version ${newVersion}`,
      blockNumber: Number(receipt.blockNumber),
      transactionHash: txHash,
    }),
  ]);

  // Mark ChangeRequest as APPROVED
  cr.status = 'APPROVED';
  cr.reviewedBy = wallet.toLowerCase();
  cr.reviewedAt = new Date();
  await cr.save();

  res.json({
    success: true,
    tokenId: eventTokenId,
    version: newVersion,
    transactionHash: txHash,
  });
}

/**
 * POST /api/asset/change-request/:id/reject
 * Reject a change request. No on-chain call needed.
 * Skip Pinata unpinning for rejected CRs — acceptable for prototype.
 */
async function rejectChangeRequest(req, res) {
  const { id } = req.params;
  const wallet = req.walletAddress;
  const { reviewNote } = req.body;

  const cr = await ChangeRequest.findById(id);
  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }
  if (cr.status !== 'PENDING') {
    return res.status(400).json({ error: `Change request is already ${cr.status}` });
  }

  const asset = await Asset.findOne({ tokenId: cr.tokenId });
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Auth: must be owner or ADMIN
  const isOwner = asset.owner === wallet.toLowerCase();
  if (!isOwner) {
    const { identityRegistryContract } = require('../config/viemClient');
    const roleRaw = await identityRegistryContract.read.getRole([wallet]);
    const role = ROLE_MAP[Number(roleRaw)] || 'NONE';
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the asset owner or ADMIN can reject change requests' });
    }
  }

  cr.status = 'REJECTED';
  cr.reviewedBy = wallet.toLowerCase();
  cr.reviewedAt = new Date();
  cr.reviewNote = reviewNote || '';
  await cr.save();

  await AuditLog.create({
    tokenId: cr.tokenId,
    actionType: 'CHANGE_REQUEST_REJECTED',
    actor: wallet.toLowerCase(),
    details: `Rejected change request from ${cr.submittedBy}${reviewNote ? ` — "${reviewNote}"` : ''}`,
  });

  res.json({ success: true, changeRequestId: cr._id });
}

/**
 * GET /api/asset/my-change-requests
 * List change requests submitted by the calling wallet.
 */
async function myChangeRequests(req, res) {
  const wallet = req.walletAddress;
  const { status } = req.query;

  const filter = { submittedBy: wallet.toLowerCase() };
  if (status) {
    filter.status = status.toUpperCase();
  }

  const changeRequests = await ChangeRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ changeRequests });
}

module.exports = {
  proposeChange,
  listChangeRequests,
  previewChangeRequest,
  approveChangeRequest,
  confirmApproval,
  rejectChangeRequest,
  myChangeRequests,
};
