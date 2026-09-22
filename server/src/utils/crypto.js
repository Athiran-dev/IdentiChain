const crypto = require('crypto');

/**
 * Compute SHA-256 hex hash of a buffer.
 */
function computeHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate a random 32-byte AES-256 key.
 */
function generateKey() {
  return crypto.randomBytes(32);
}

/**
 * Encrypt a buffer with AES-256-GCM.
 * Output format: [12-byte IV][16-byte authTag][ciphertext]
 */
function encryptFile(buffer, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt an AES-256-GCM encrypted buffer.
 * Expects format: [12-byte IV][16-byte authTag][ciphertext]
 */
function decryptFile(encryptedBuffer, key) {
  const iv = encryptedBuffer.subarray(0, 12);
  const authTag = encryptedBuffer.subarray(12, 28);
  const data = encryptedBuffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Wrap a per-document AES key with MASTER_KEY_SECRET before storing in MongoDB.
 * Output: hex string of [12-byte IV][16-byte authTag][wrapped key]
 */
function wrapKey(rawKeyBuffer) {
  const masterKey = crypto.createHash('sha256').update(process.env.MASTER_KEY_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(rawKeyBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

/**
 * Unwrap a per-document AES key from its hex-encoded wrapped form.
 * Returns the raw 32-byte key buffer.
 */
function unwrapKey(wrappedHex) {
  const masterKey = crypto.createHash('sha256').update(process.env.MASTER_KEY_SECRET).digest();
  const buf = Buffer.from(wrappedHex, 'hex');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

module.exports = { computeHash, generateKey, encryptFile, decryptFile, wrapKey, unwrapKey };
