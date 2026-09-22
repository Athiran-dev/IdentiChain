const { Router } = require('express');
const { verifyMessage } = require('viem');
const jwt = require('jsonwebtoken');
const Nonce = require('../models/Nonce');

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

/**
 * GET /api/auth/nonce/:wallet
 * Generate a single-use nonce for wallet auth.
 * The frontend signs a message containing this nonce, then sends it in walletAuth headers.
 */
router.get('/nonce/:wallet', async (req, res) => {
  const { wallet } = req.params;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  const { nonce, issuedAt } = await Nonce.generateForWallet(wallet);

  res.json({
    nonce,
    issuedAt,
    message: `Sign in to IdentiChain\nNonce: ${nonce}\nIssued At: ${issuedAt}`,
  });
});

/**
 * POST /api/auth/verify
 * Verifies the signed nonce and issues a JWT.
 */
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature, message: rawMessage } = req.body;
    
    if (!walletAddress || !signature || !rawMessage) {
      return res.status(401).json({ error: 'Missing authentication details (walletAddress, signature, message)' });
    }

    // message arrives from JSON body with real newlines already — no transform needed
    const message = rawMessage;
    const normalizedWallet = walletAddress.toLowerCase();

    // 1. Verify the signature
    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    // 2. Parse nonce from the signed message
    const nonceMatch = message.match(/Nonce:\s*(.+)/);
    if (!nonceMatch) {
      return res.status(401).json({ error: 'Signed message does not contain a nonce' });
    }
    const messageNonce = nonceMatch[1].trim();

    // 3. Find and delete the nonce atomically (single-use)
    const nonceDoc = await Nonce.findOneAndDelete({
      wallet: normalizedWallet,
      nonce: messageNonce,
    });

    if (!nonceDoc) {
      return res.status(401).json({
        error: 'Nonce not found or already used. Request a new nonce from /api/auth/nonce/:wallet',
      });
    }

    // 4. Check if the nonce has expired
    const nonceAge = Date.now() - new Date(nonceDoc.issuedAt).getTime();
    if (nonceAge > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Nonce expired. Request a new one.' });
    }

    // 5. Issue JWT
    const token = jwt.sign({ walletAddress: normalizedWallet }, JWT_SECRET, { expiresIn: '45m' });

    res.json({ token, walletAddress: normalizedWallet });
  } catch (error) {
    console.error('[auth/verify] Error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
