/**
 * tamper-detection-test.js
 *
 * Proves the tamper-detection path works, not just the happy path.
 *
 * Prerequisites:
 *   - Server running (npm run dev in /server)
 *   - At least one minted asset whose tokenId you know
 *   - A valid JWT obtained from POST /api/auth/verify
 *   - MONGODB_URI set in server/.env (or passed via env here)
 *
 * Usage:
 *   node scripts/tamper-detection-test.js <tokenId> <jwt>
 *
 * The script:
 *   1. Calls GET /api/asset/:tokenId/access — expects 200 + X-Integrity-Verified: true
 *   2. Corrupts currentHash in MongoDB for that tokenId
 *   3. Calls the same endpoint again — expects 409 + INTEGRITY_VERIFICATION_FAILED
 *   4. Restores the original hash so the asset is usable again
 */

require('dotenv').config();

const mongoose = require('mongoose');
// Node 22 has native fetch built-in — no node-fetch needed

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI;

const tokenId = Number(process.argv[2]);
const jwt = process.argv[3];

if (!tokenId || !jwt) {
  console.error('Usage: node scripts/tamper-detection-test.js <tokenId> <jwt>');
  process.exit(1);
}

// Minimal inline Asset schema — mirrors the real one, strict:false handles extra fields
const AssetSchema = new mongoose.Schema({ tokenId: Number, currentHash: String }, { strict: false });
const Asset = mongoose.models.Asset || mongoose.model('Asset', AssetSchema, 'assets');

const authHeaders = { 'Authorization': `Bearer ${jwt}` };

async function callAccess() {
  const res = await fetch(`${API_BASE}/api/asset/${tokenId}/access`, { headers: authHeaders });
  return { status: res.status, headers: res.headers, body: res.ok ? null : await res.json() };
}

function pass(msg) { console.log(`  \u2705  PASS \u2014 ${msg}`); }
function fail(msg) { console.error(`  \u274c  FAIL \u2014 ${msg}`); process.exitCode = 1; }

async function run() {
  console.log(`\n=== Tamper-Detection Test for tokenId ${tokenId} ===\n`);

  // -- Step 1: Happy path -------------------------------------------------------
  console.log('Step 1: Calling /access on clean asset...');
  const clean = await callAccess();

  if (clean.status !== 200) {
    fail(`Expected 200, got ${clean.status}. Body: ${JSON.stringify(clean.body)}`);
    console.log('  Cannot continue \u2014 ensure the wallet has VIEW access and the asset exists.');
    return;
  }

  const integrityHeader = clean.headers.get('x-integrity-verified');
  const hashHeader = clean.headers.get('x-document-hash');

  if (integrityHeader !== 'true') {
    fail(`X-Integrity-Verified is "${integrityHeader}" (expected "true"). Check CORS exposedHeaders.`);
  } else {
    pass(`X-Integrity-Verified: ${integrityHeader}`);
  }

  if (!hashHeader || hashHeader.length < 10) {
    fail(`X-Document-Hash is "${hashHeader}" (expected a SHA-256 hex string).`);
  } else {
    pass(`X-Document-Hash: ${hashHeader}`);
  }

  // -- Step 2: Corrupt the hash in MongoDB -------------------------------------
  console.log('\nStep 2: Connecting to MongoDB and corrupting currentHash...');
  await mongoose.connect(MONGODB_URI);

  const doc = await Asset.findOne({ tokenId });
  if (!doc) {
    fail(`Asset with tokenId ${tokenId} not found in MongoDB.`);
    await mongoose.disconnect();
    return;
  }

  const originalHash = doc.currentHash;
  const corruptedHash = 'deadbeef'.repeat(8); // 64-char hex, clearly wrong

  await Asset.updateOne({ tokenId }, { currentHash: corruptedHash });
  console.log(`  Corrupted hash: ${originalHash} => ${corruptedHash}`);

  // -- Step 3: Tamper-detected path --------------------------------------------
  console.log('\nStep 3: Calling /access with corrupted hash...');
  const tampered = await callAccess();

  if (tampered.status === 409) {
    pass(`Server returned 409 (tamper detected)`);
    if (tampered.body?.error === 'INTEGRITY_VERIFICATION_FAILED') {
      pass(`error code is INTEGRITY_VERIFICATION_FAILED`);
    } else {
      fail(`Expected error "INTEGRITY_VERIFICATION_FAILED", got: ${JSON.stringify(tampered.body)}`);
    }
    if (tampered.body?.expected === corruptedHash && tampered.body?.actual) {
      pass(`Response contains expected/actual hashes for forensics`);
    }
  } else {
    fail(`Expected 409, got ${tampered.status}. Tamper detection did NOT trigger! Body: ${JSON.stringify(tampered.body)}`);
  }

  // -- Step 4: Restore original hash -------------------------------------------
  console.log('\nStep 4: Restoring original hash...');
  await Asset.updateOne({ tokenId }, { currentHash: originalHash });
  await mongoose.disconnect();
  console.log(`  Restored: ${originalHash}`);

  // -- Step 5: Verify restored --------------------------------------------------
  console.log('\nStep 5: Confirming /access works again after restore...');
  const restored = await callAccess();
  if (restored.status === 200) {
    pass(`Asset accessible again after hash restore`);
  } else {
    fail(`Asset still broken after restore: status ${restored.status}`);
  }

  console.log('\n=== Test complete ===\n');
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
