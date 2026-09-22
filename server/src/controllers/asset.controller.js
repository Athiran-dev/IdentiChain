const { decodeEventLog } = require('viem');
const Asset = require('../models/Asset');
const AssetVersion = require('../models/AssetVersion');
const AuditLog = require('../models/AuditLog');
const AccessGrant = require('../models/AccessGrant');
const EncryptionKey = require('../models/EncryptionKey');
const PendingUpdate = require('../models/PendingUpdate');
const { computeHash, generateKey, encryptFile, decryptFile, wrapKey, unwrapKey } = require('../utils/crypto');
const { uploadFileToPinata, uploadJSONToPinata, fetchFromIPFS } = require('../utils/ipfs');
const { generateCertificateSVG } = require('../utils/svgGenerator');
const {
  publicClient,
  assetNFTContract,
  identityRegistryContract,
  assetNFTABI,
} = require('../config/viemClient');

const ROLE_MAP = { 0: 'NONE', 1: 'EMPLOYEE', 2: 'MANAGER', 3: 'AUDITOR', 4: 'ADMIN' };
const ACCESS_MAP = { 0: 'NONE', 1: 'VIEW', 2: 'EDIT' };

/**
 * POST /api/asset/create
 * Full mint flow: hash → encrypt → upload → SVG → metadata → mintDocument → mirror
 */
async function createAsset(req, res) {
  const wallet = req.walletAddress; // from walletAuth
  const { name, description, assetType, ownerAddress } = req.body;
  const file = req.file;

  if (!file || !name) {
    return res.status(400).json({ error: 'File and name are required' });
  }

  const owner = (ownerAddress || wallet).toLowerCase();

  // --- PRE-FLIGHT: check on-chain before wasting gas ---
  const [roleRaw, isVerified] = await Promise.all([
    identityRegistryContract.read.getRole([owner]),
    identityRegistryContract.read.isVerified([owner]),
  ]);

  const role = ROLE_MAP[Number(roleRaw)] || 'NONE';
  if (role === 'NONE') {
    return res.status(400).json({ error: 'Owner has no on-chain role. Register identity first.' });
  }
  if (!isVerified) {
    return res.status(400).json({ error: 'Owner is not verified on-chain.' });
  }

  // 1. Hash the original file
  const fileHash = computeHash(file.buffer);

  // 2. Generate AES key & encrypt
  const aesKey = generateKey();
  const encryptedBuffer = encryptFile(file.buffer, aesKey);

  // 3. Upload encrypted file to IPFS
  const encryptedCID = await uploadFileToPinata(encryptedBuffer, `${name}_encrypted`);

  // 4. Generate hash-derived SVG certificate image → upload to IPFS
  const svgString = generateCertificateSVG({ name, hash: fileHash, owner, version: 1 });
  const svgBuffer = Buffer.from(svgString, 'utf8');
  const imageCID = await uploadFileToPinata(svgBuffer, `${name}_certificate.svg`);

  // 5. Build metadata JSON → upload to IPFS
  const metadata = {
    name,
    description: description || '',
    assetType: assetType || 'document',
    currentVersion: 1,
    currentCID: encryptedCID,
    currentHash: fileHash,
    image: `ipfs://${imageCID}`,
  };
  const metadataCID = await uploadJSONToPinata(metadata);

  // 6. Mint on-chain via backend MANAGER wallet
  const { walletClient, assetNFTABI: abi } = require('../config/viemClient');
  const mintTxHash = await walletClient.writeContract({
    address: process.env.ASSET_NFT_ADDRESS,
    abi,
    functionName: 'mintDocument',
    args: [owner, metadataCID],
  });

  // 7. Wait for receipt and extract tokenId from DocumentMinted event
  const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTxHash });

  if (receipt.status !== 'success') {
    return res.status(500).json({ error: 'Mint transaction reverted on-chain' });
  }

  let tokenId;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: assetNFTABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'DocumentMinted') {
        tokenId = Number(decoded.args.tokenId);
        break;
      }
    } catch {
      // Not our event, skip
    }
  }

  if (tokenId === undefined) {
    return res.status(500).json({ error: 'Could not extract tokenId from mint transaction' });
  }

  // 8. Wrap AES key and store in EncryptionKey (NEVER store raw key)
  const wrappedKey = wrapKey(aesKey);
  await EncryptionKey.create({ tokenId, version: 1, encryptedKeyHex: wrappedKey });

  // 9. Mirror to MongoDB
  const [asset] = await Promise.all([
    Asset.create({
      tokenId,
      name,
      description: description || '',
      assetType: assetType || 'document',
      fileType: file.mimetype,
      owner,
      currentVersion: 1,
      currentCID: encryptedCID,
      currentHash: fileHash,
      metadataCID,
      imageCID,
      mintTxHash,
    }),
    AssetVersion.create({
      tokenId,
      version: 1,
      cid: encryptedCID,
      hash: fileHash,
      metadataCID,
      editedBy: wallet,
      transactionHash: mintTxHash,
    }),
    AuditLog.create({
      tokenId,
      actionType: 'DOCUMENT_MINTED',
      actor: wallet,
      details: `Minted document "${name}" for owner ${owner}`,
      blockNumber: Number(receipt.blockNumber),
      transactionHash: mintTxHash,
    }),
  ]);

  res.status(201).json({ success: true, tokenId, asset, metadataCID, mintTxHash });
}

/**
 * GET /api/asset/:tokenId
 * MongoDB asset doc + live on-chain access level for the requesting wallet.
 */
async function getAsset(req, res) {
  const { tokenId } = req.params;
  const wallet = req.query.wallet;

  const asset = await Asset.findOne({ tokenId: Number(tokenId) });
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  let accessLevel = 'NONE';
  if (wallet) {
    try {
      const levelRaw = await assetNFTContract.read.getAccessLevel([
        BigInt(tokenId),
        wallet,
      ]);
      accessLevel = ACCESS_MAP[Number(levelRaw)] || 'NONE';
    } catch {
      accessLevel = 'NONE';
    }
  }

  res.json({ asset, accessLevel });
}

/**
 * GET /api/asset/list
 * Dashboard listing from MongoDB with optional filters.
 */
async function listAssets(req, res) {
  const { owner, page = 1, limit = 20, wallet } = req.query;
  const filter = {};
  if (owner) {
    filter.owner = owner.toLowerCase();
  } else if (wallet) {
    // If querying by wallet (accessible), find grants first
    const grants = await AccessGrant.find({ wallet: wallet.toLowerCase() });
    const grantedTokenIds = grants.map(g => g.tokenId);
    filter.$or = [
      { owner: wallet.toLowerCase() },
      { tokenId: { $in: grantedTokenIds } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [assets, total] = await Promise.all([
    Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Asset.countDocuments(filter),
  ]);

  // Optionally enrich with live access levels
  let enriched = assets;
  if (wallet) {
    enriched = await Promise.all(
      assets.map(async (a) => {
        try {
          const levelRaw = await assetNFTContract.read.getAccessLevel([
            BigInt(a.tokenId),
            wallet,
          ]);
          return { ...a.toObject(), accessLevel: ACCESS_MAP[Number(levelRaw)] || 'NONE' };
        } catch {
          return { ...a.toObject(), accessLevel: 'NONE' };
        }
      })
    );
  }

  res.json({ assets: enriched, total, page: Number(page), limit: Number(limit) });
}

/**
 * GET /api/asset/:tokenId/access
 * Decrypt-and-serve flow with on-chain access verification + integrity check.
 */
async function accessAsset(req, res) {
  const { tokenId } = req.params;
  const { version } = req.query;
  const wallet = req.walletAddress; // from walletAuth

  // On-chain access check — MUST be VIEW or EDIT
  const levelRaw = await assetNFTContract.read.getAccessLevel([BigInt(tokenId), wallet]);
  const level = ACCESS_MAP[Number(levelRaw)] || 'NONE';

  if (level === 'NONE') {
    return res.status(403).json({ error: 'No access to this document on-chain' });
  }

  // Fetch asset from MongoDB for CIDs
  const asset = await Asset.findOne({ tokenId: Number(tokenId) });
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found in database' });
  }

  // --- FEATURE 2: View-count enforcement (server-side only) ---
  // Owners are never view-limited.
  const isOwner = asset.owner === wallet.toLowerCase();
  if (!isOwner) {
    const grant = await AccessGrant.findOne({
      tokenId: Number(tokenId),
      wallet: wallet.toLowerCase(),
    });

    if (grant && grant.maxViews != null && grant.viewsUsed >= grant.maxViews) {
      return res.status(403).json({
        error: 'ACCESS_EXHAUSTED',
        message: 'View limit reached for this document. Contact the owner for renewed access.',
      });
    }

    // Atomically increment the view counter (race-safe)
    if (grant && grant.maxViews != null) {
      const updated = await AccessGrant.findOneAndUpdate(
        { tokenId: Number(tokenId), wallet: wallet.toLowerCase() },
        { $inc: { viewsUsed: 1 } },
        { new: true }
      );

      // If this increment brought viewsUsed to exactly maxViews, log exhaustion
      if (updated && updated.viewsUsed === updated.maxViews) {
        await AuditLog.create({
          tokenId: Number(tokenId),
          actionType: 'ACCESS_EXHAUSTED',
          actor: wallet.toLowerCase(),
          details: `View limit reached (${updated.maxViews}/${updated.maxViews} views used) for document "${asset.name}"`,
        });
      }
    }
  }

  let targetVersion = asset.currentVersion;
  let targetCID = asset.currentCID;
  let targetHash = asset.currentHash;

  if (version && Number(version) !== asset.currentVersion) {
    targetVersion = Number(version);
    const versionDoc = await AssetVersion.findOne({ tokenId: Number(tokenId), version: targetVersion });
    if (!versionDoc) {
      return res.status(404).json({ error: 'Requested version not found' });
    }
    targetCID = versionDoc.cid;
    targetHash = versionDoc.hash;
  }

  // Fetch the encrypted file from IPFS
  const encryptedBuffer = await fetchFromIPFS(targetCID);

  // Unwrap the AES key for the requested version
  const keyDoc = await EncryptionKey.findOne({
    tokenId: Number(tokenId),
    version: targetVersion,
  });
  if (!keyDoc) {
    return res.status(500).json({ error: 'Encryption key not found for this version' });
  }

  const aesKey = unwrapKey(keyDoc.encryptedKeyHex);

  // Decrypt
  const decryptedBuffer = decryptFile(encryptedBuffer, aesKey);

  // Integrity check — recompute hash and compare
  const recomputedHash = computeHash(decryptedBuffer);
  if (recomputedHash !== targetHash) {
    return res.status(409).json({
      error: 'INTEGRITY_VERIFICATION_FAILED',
      message: 'File hash does not match the on-chain recorded hash. Data may have been tampered with.',
      expected: targetHash,
      actual: recomputedHash,
    });
  }

  // Stream the decrypted file inline (no forced download)
  res.set({
    'Content-Type': asset.fileType || 'application/octet-stream',
    'Content-Disposition': `inline; filename="${asset.name || 'document'}"`,
    'X-Integrity-Verified': 'true',
    'X-Access-Level': level,
    'X-Document-Hash': recomputedHash,
  });

  // Log the document view for AI Threat Detection
  await AuditLog.create({
    tokenId: Number(tokenId),
    actionType: 'DOCUMENT_VIEWED',
    actor: wallet.toLowerCase(),
    details: `Viewed document "${asset.name}" (Version ${targetVersion})`,
  });

  res.send(decryptedBuffer);
}

/**
 * POST /api/asset/:tokenId/prepare-update
 * Step 1 of two-step update: hash → encrypt → upload → store pending data.
 * Returns metadataCID for the frontend to call updateDocument on-chain.
 */
async function prepareUpdate(req, res) {
  const { tokenId } = req.params;
  const wallet = req.walletAddress; // from walletAuth
  const file = req.file;
  const { name, description, assetType } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }

  // --- PRE-FLIGHT: check on-chain EDIT permission before wasting bandwidth ---
  const levelRaw = await assetNFTContract.read.getAccessLevel([BigInt(tokenId), wallet]);
  const level = ACCESS_MAP[Number(levelRaw)] || 'NONE';

  if (level !== 'EDIT') {
    return res.status(403).json({
      error: 'No EDIT access on-chain for this document. Cannot prepare update.',
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
  const encryptedCID = await uploadFileToPinata(encryptedBuffer, `${docName}_v${newVersion}_encrypted`);

  // 4. Generate SVG → upload to IPFS
  const svgString = generateCertificateSVG({
    name: docName,
    hash: fileHash,
    owner: existingAsset.owner,
    version: newVersion,
  });
  const imageCID = await uploadFileToPinata(Buffer.from(svgString, 'utf8'), `${docName}_v${newVersion}_certificate.svg`);

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

  // 7. Store pending data in MongoDB (restart-safe, 15-min TTL)
  await PendingUpdate.findOneAndUpdate(
    { tokenId: Number(tokenId), wallet },
    {
      tokenId: Number(tokenId),
      wallet,
      metadataCID,
      currentCID: encryptedCID,
      currentHash: fileHash,
      imageCID,
      encryptedKeyHex: wrappedKey,
      name: docName,
      description: description || existingAsset.description || '',
      assetType: assetType || existingAsset.assetType || 'document',
    },
    { upsert: true, new: true }
  );

  // Return metadataCID — frontend will call updateDocument(tokenId, metadataCID) on-chain
  res.json({
    success: true,
    metadataCID,
    currentCID: encryptedCID,
    currentHash: fileHash,
    imageCID,
    version: newVersion,
  });
}

/**
 * POST /api/asset/:tokenId/confirm-update
 * Step 2 of two-step update: verify tx receipt → decode event → mirror to MongoDB.
 */
async function confirmUpdate(req, res) {
  const { tokenId } = req.params;
  const wallet = req.walletAddress; // from walletAuth
  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'txHash is required' });
  }

  // Verify the transaction
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    return res.status(400).json({ error: 'Transaction did not succeed on-chain' });
  }

  // Verify the tx was sent to the AssetNFT contract
  if (receipt.to?.toLowerCase() !== process.env.ASSET_NFT_ADDRESS.toLowerCase()) {
    return res.status(400).json({ error: 'Transaction was not sent to the AssetNFT contract' });
  }

  // Decode DocumentUpdated event from receipt logs
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

  // Validate tokenId matches the route param
  if (eventTokenId !== Number(tokenId)) {
    return res.status(400).json({ error: 'TokenId in event does not match route parameter' });
  }

  // Retrieve pending data from MongoDB
  const pending = await PendingUpdate.findOne({
    tokenId: Number(tokenId),
    wallet,
  });

  if (!pending) {
    return res.status(400).json({
      error: 'No pending update found. Either it expired (15 min) or prepare-update was not called.',
    });
  }

  // Validate metadataCID matches what we prepared
  if (pending.metadataCID !== newMetadataCID) {
    return res.status(400).json({
      error: 'MetadataCID in event does not match the prepared update. Possible data mismatch.',
      expected: pending.metadataCID,
      actual: newMetadataCID,
    });
  }

  // Save encryption key for new version
  await EncryptionKey.create({
    tokenId: eventTokenId,
    version: newVersion,
    encryptedKeyHex: pending.encryptedKeyHex,
  });

  // Mirror to MongoDB
  await Promise.all([
    Asset.findOneAndUpdate(
      { tokenId: eventTokenId },
      {
        currentVersion: newVersion,
        currentCID: pending.currentCID,
        currentHash: pending.currentHash,
        metadataCID: newMetadataCID,
        imageCID: pending.imageCID,
        name: pending.name,
        description: pending.description,
        assetType: pending.assetType,
      }
    ),
    AssetVersion.create({
      tokenId: eventTokenId,
      version: newVersion,
      cid: pending.currentCID,
      hash: pending.currentHash,
      metadataCID: newMetadataCID,
      editedBy: editor || wallet,
      transactionHash: txHash,
    }),
    AuditLog.create({
      tokenId: eventTokenId,
      actionType: 'DOCUMENT_UPDATED',
      actor: editor || wallet,
      details: `Updated document to version ${newVersion}`,
      blockNumber: Number(receipt.blockNumber),
      transactionHash: txHash,
    }),
  ]);

  // Clean up the pending entry
  await PendingUpdate.deleteOne({ tokenId: Number(tokenId), wallet });

  res.json({ success: true, tokenId: eventTokenId, version: newVersion, transactionHash: txHash });
}

/**
 * POST /api/asset/:tokenId/transfer-ownership
 * Mirrors the ownership transfer in MongoDB by decoding the Transfer event.
 */
async function transferOwnership(req, res) {
  const { tokenId } = req.params;
  const wallet = req.walletAddress;
  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'txHash is required' });
  }

  // Verify the transaction
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    return res.status(400).json({ error: 'Transaction did not succeed on-chain' });
  }

  if (receipt.to?.toLowerCase() !== process.env.ASSET_NFT_ADDRESS.toLowerCase()) {
    return res.status(400).json({ error: 'Transaction was not sent to the AssetNFT contract' });
  }

  let transferEvent;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: assetNFTABI, data: log.data, topics: log.topics });
      // Standard ERC721 Transfer(from, to, tokenId)
      if (decoded.eventName === 'Transfer') {
        transferEvent = decoded.args;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!transferEvent) {
    return res.status(400).json({ error: 'No Transfer event found in transaction' });
  }

  const eventTokenId = Number(transferEvent.tokenId);
  const newOwner = transferEvent.to.toLowerCase();

  if (eventTokenId !== Number(tokenId)) {
    return res.status(400).json({ error: 'TokenId in event does not match route parameter' });
  }

  await Asset.findOneAndUpdate(
    { tokenId: eventTokenId },
    { owner: newOwner }
  );

  await AuditLog.create({
    tokenId: eventTokenId,
    actionType: 'OWNERSHIP_TRANSFERRED',
    actor: wallet,
    details: `Transferred ownership to ${newOwner}`,
    blockNumber: Number(receipt.blockNumber),
    transactionHash: txHash,
  });

  res.json({ success: true, tokenId: eventTokenId, newOwner, transactionHash: txHash });
}

/**
 * GET /api/asset/:tokenId/versions
 * Get version history for a specific document (metadata only, no keys).
 */
async function getVersionHistory(req, res) {
  const { tokenId } = req.params;

  const versions = await AssetVersion.find({ tokenId: Number(tokenId) })
    .sort({ version: -1 })
    .select('-__v'); // Exclude mongoose internals, but NEVER select any key material

  res.json({ versions });
}

module.exports = {
  createAsset,
  getAsset,
  listAssets,
  accessAsset,
  prepareUpdate,
  confirmUpdate,
  transferOwnership,
  getVersionHistory,
};
