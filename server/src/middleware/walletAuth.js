const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

/**
 * Wallet-based authentication middleware using JWT.
 *
 * Expected headers:
 *   Authorization: Bearer <token>
 */
async function walletAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach authenticated wallet address
    req.walletAddress = decoded.walletAddress;
    next();
  } catch (error) {
    console.error('[walletAuth] Error:', error.message);
    return res.status(401).json({ error: 'Authentication failed: Invalid or expired token' });
  }
}

module.exports = walletAuth;
