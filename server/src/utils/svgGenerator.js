/**
 * Generate a certificate-style SVG for an NFT image.
 * Uses the SHA-256 hash to derive a unique color grid pattern.
 *
 * @param {object} opts
 * @param {string} opts.name - Document name
 * @param {string} opts.hash - SHA-256 hex hash of the original file
 * @param {string} opts.owner - Owner wallet address
 * @param {number} opts.version - Document version number
 * @returns {string} SVG markup as a string
 */
function generateCertificateSVG({ name, hash, owner, version }) {
  const shortOwner = `${owner.slice(0, 6)}...${owner.slice(-4)}`;
  const shortHash = `${hash.slice(0, 8)}...${hash.slice(-8)}`;

  // Derive 16 colors from the hash (each 2-char chunk → one color)
  const colors = [];
  for (let i = 0; i < 32; i += 2) {
    const r = parseInt(hash.slice(i, i + 2), 16);
    const g = parseInt(hash.slice(i + 16, i + 18) || hash.slice(i, i + 2), 16);
    const b = parseInt(hash.slice(i + 32, i + 34) || hash.slice(63 - i, 65 - i), 16);
    colors.push(`rgb(${r},${g},${b})`);
  }

  // Build the 4×4 color grid rectangles
  const cellSize = 28;
  const gridX = 146;
  const gridY = 145;
  const gridRects = colors.map((color, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = gridX + col * (cellSize + 4);
    const y = gridY + row * (cellSize + 4);
    return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="4" fill="${color}" opacity="0.85"/>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0f1a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>

  <!-- Card background -->
  <rect width="400" height="500" rx="16" fill="url(#bg)"/>
  <rect x="1" y="1" width="398" height="498" rx="15" fill="none" stroke="url(#accent)" stroke-width="1.5" opacity="0.4"/>

  <!-- Branding -->
  <text x="200" y="40" text-anchor="middle" fill="#8b5cf6" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="3">IDENTICHAIN</text>
  <line x1="50" y1="52" x2="350" y2="52" stroke="#8b5cf6" stroke-width="0.5" opacity="0.5"/>

  <!-- Document name -->
  <text x="200" y="80" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="16" font-weight="bold">${escapeXml(name.length > 30 ? name.slice(0, 27) + '...' : name)}</text>

  <!-- Label -->
  <text x="200" y="110" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">DOCUMENT INTEGRITY CERTIFICATE</text>

  <!-- Hash-derived color grid label -->
  <text x="200" y="135" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="9">HASH FINGERPRINT</text>

  <!-- Color grid -->
  <g>
    ${gridRects}
  </g>

  <!-- Hash -->
  <text x="200" y="290" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="9">SHA-256</text>
  <text x="200" y="308" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="11">${shortHash}</text>

  <!-- Divider -->
  <line x1="50" y1="330" x2="350" y2="330" stroke="#334155" stroke-width="0.5"/>

  <!-- Owner -->
  <text x="60" y="360" fill="#64748b" font-family="monospace" font-size="9">OWNER</text>
  <text x="60" y="378" fill="#e2e8f0" font-family="monospace" font-size="12">${shortOwner}</text>

  <!-- Version -->
  <text x="340" y="360" text-anchor="end" fill="#64748b" font-family="monospace" font-size="9">VERSION</text>
  <text x="340" y="378" text-anchor="end" fill="#e2e8f0" font-family="monospace" font-size="14" font-weight="bold">v${version}</text>

  <!-- Divider -->
  <line x1="50" y1="400" x2="350" y2="400" stroke="#334155" stroke-width="0.5"/>

  <!-- Verified badge -->
  <circle cx="170" cy="440" r="10" fill="#22c55e" opacity="0.9"/>
  <text x="170" y="444" text-anchor="middle" fill="white" font-size="12" font-weight="bold">✓</text>
  <text x="190" y="444" fill="#22c55e" font-family="sans-serif" font-size="13" font-weight="bold">Verified on Blockchain</text>

  <!-- Footer -->
  <text x="200" y="480" text-anchor="middle" fill="#475569" font-family="monospace" font-size="8">Ethereum Sepolia • ERC-721</text>
</svg>`;
}

/** Escape special XML characters in text content */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { generateCertificateSVG };
