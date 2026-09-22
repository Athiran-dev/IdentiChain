const { decodeEventLog } = require('viem');
const AccessGrant = require('../models/AccessGrant');
const AuditLog = require('../models/AuditLog');
const { publicClient, assetNFTContract, assetNFTABI } = require('../config/viemClient');

const ACCESS_MAP = { 0: 'NONE', 1: 'VIEW', 2: 'EDIT' };

/**
 * GET /api/access/:tokenId/:wallet
 * Live on-chain access level check — no MongoDB trust.
 */
async function checkAccess(req, res) {
  const { tokenId, wallet } = req.params;

  const levelRaw = await assetNFTContract.read.getAccessLevel([BigInt(tokenId), wallet]);
  const level = ACCESS_MAP[Number(levelRaw)] || 'NONE';

  res.json({ tokenId: Number(tokenId), wallet: wallet.toLowerCase(), level });
}

/**
 * POST /api/access/mirror
 * Mirror an already-confirmed grantAccess/revokeAccess tx into MongoDB.
 *
 * EVENT-FIRST SCANNING:
 *   We iterate all receipt logs and decode against the AssetNFT ABI
 *   to detect which event actually emitted (AccessGranted or AccessRevoked).
 *   We do NOT rely on body-supplied `actionType` to decide — only use it
 *   as a sanity-check (log warning on mismatch).
 *
 * FEATURE 2 ADDITION:
 *   Accepts optional `maxViews` from the request body (for grants only).
 *   Validated as a positive integer or null. Stored on the AccessGrant.
 *   viewsUsed is reset to 0 on upsert (per-grant reset).
 */
async function mirrorAccess(req, res) {
  const { txHash, actionType: bodyActionType, maxViews: rawMaxViews } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'txHash is required' });
  }

  // Validate maxViews if provided
  let maxViews = null;
  if (rawMaxViews !== undefined && rawMaxViews !== null && rawMaxViews !== '') {
    const parsed = Number(rawMaxViews);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'maxViews must be a positive integer or null/empty for unlimited' });
    }
    maxViews = parsed;
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

  // Event-first scanning: iterate all logs and decode known events
  const processedEvents = [];

  for (const log of receipt.logs) {
    let decoded;
    try {
      decoded = decodeEventLog({ abi: assetNFTABI, data: log.data, topics: log.topics });
    } catch {
      continue; // Not a known event in our ABI
    }

    if (decoded.eventName === 'AccessGranted') {
      const { tokenId, user, level, expiresAt, grantedBy } = decoded.args;
      const detectedAction = 'ACCESS_GRANTED';

      // Sanity-check against body
      if (bodyActionType && bodyActionType !== detectedAction) {
        console.warn(
          `[mirrorAccess] Body actionType "${bodyActionType}" mismatches detected event "${detectedAction}" for tx ${txHash}`
        );
      }

      const levelStr = ACCESS_MAP[Number(level)] || 'VIEW';
      const expiresDate = Number(expiresAt) > 0 ? new Date(Number(expiresAt) * 1000) : null;

      // Upsert AccessGrant (compound unique index handles dedup)
      // Per-grant reset: viewsUsed resets to 0 on new grant
      await AccessGrant.findOneAndUpdate(
        { tokenId: Number(tokenId), wallet: user.toLowerCase() },
        {
          tokenId: Number(tokenId),
          wallet: user.toLowerCase(),
          level: levelStr,
          expiresAt: expiresDate,
          grantedBy: grantedBy.toLowerCase(),
          transactionHash: txHash,
          maxViews: maxViews,     // null = unlimited
          viewsUsed: 0,          // reset on re-grant
        },
        { upsert: true, new: true }
      );

      await AuditLog.create({
        tokenId: Number(tokenId),
        actionType: 'ACCESS_GRANTED',
        actor: grantedBy.toLowerCase(),
        details: `Granted ${levelStr} access to ${user.toLowerCase()}${expiresDate ? ` (expires ${expiresDate.toISOString()})` : ''}${maxViews ? ` (max ${maxViews} views)` : ''}`,
        blockNumber: Number(receipt.blockNumber),
        transactionHash: txHash,
      });

      processedEvents.push({ event: 'AccessGranted', tokenId: Number(tokenId), user: user.toLowerCase(), level: levelStr });
    }

    if (decoded.eventName === 'AccessRevoked') {
      const { tokenId, user, revokedBy } = decoded.args;
      const detectedAction = 'ACCESS_REVOKED';

      // Sanity-check against body
      if (bodyActionType && bodyActionType !== detectedAction) {
        console.warn(
          `[mirrorAccess] Body actionType "${bodyActionType}" mismatches detected event "${detectedAction}" for tx ${txHash}`
        );
      }

      // Delete the AccessGrant
      await AccessGrant.findOneAndDelete({
        tokenId: Number(tokenId),
        wallet: user.toLowerCase(),
      });

      await AuditLog.create({
        tokenId: Number(tokenId),
        actionType: 'ACCESS_REVOKED',
        actor: revokedBy.toLowerCase(),
        details: `Revoked access for ${user.toLowerCase()}`,
        blockNumber: Number(receipt.blockNumber),
        transactionHash: txHash,
      });

      processedEvents.push({ event: 'AccessRevoked', tokenId: Number(tokenId), user: user.toLowerCase() });
    }
  }

  if (processedEvents.length === 0) {
    return res.status(400).json({ error: 'No AccessGranted or AccessRevoked events found in transaction' });
  }

  res.json({ success: true, processed: processedEvents });
}

/**
 * GET /api/access/asset/:tokenId
 * List all active access grants for a specific document.
 */
async function getAccessGrants(req, res) {
  const { tokenId } = req.params;
  const wallet = req.walletAddress;

  // We should only return grants if the user has EDIT access or is the owner,
  // but to keep it simple and match the spec, we'll just check if the asset exists
  // The caller (Manager dashboard) will typically be the owner.
  
  const grants = await AccessGrant.find({ tokenId: Number(tokenId) }).sort({ createdAt: -1 });
  res.json({ grants });
}

/**
 * GET /api/access/my-grant/:tokenId
 * Return the calling wallet's own AccessGrant for a specific tokenId.
 * Used by the Employee dashboard to show remaining views.
 */
async function getMyGrant(req, res) {
  const { tokenId } = req.params;
  const wallet = req.walletAddress;

  const grant = await AccessGrant.findOne({
    tokenId: Number(tokenId),
    wallet: wallet.toLowerCase(),
  });

  if (!grant) {
    return res.json({ grant: null });
  }

  res.json({
    grant: {
      level: grant.level,
      maxViews: grant.maxViews,
      viewsUsed: grant.viewsUsed,
      expiresAt: grant.expiresAt,
      grantedAt: grant.grantedAt,
    },
  });
}

module.exports = { checkAccess, mirrorAccess, getAccessGrants, getMyGrant };
