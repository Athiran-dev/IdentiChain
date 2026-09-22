const { createPublicClient, createWalletClient, http, getContract } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');
const path = require('path');
const fs = require('fs');

// --- Public client (always available — read-only) ---

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

// --- Wallet client (lazy — only created when first accessed) ---
// This lets the server boot for read-only routes even when the private key is missing.

let _backendAccount;
let _walletClient;

function getBackendAccount() {
  if (!_backendAccount) {
    const raw = process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!raw) throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set in .env');
    // Handle keys with or without the 0x prefix
    const hex = raw.startsWith('0x') ? raw : `0x${raw}`;
    _backendAccount = privateKeyToAccount(hex);
  }
  return _backendAccount;
}

function getWalletClient() {
  if (!_walletClient) {
    _walletClient = createWalletClient({
      account: getBackendAccount(),
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL),
    });
  }
  return _walletClient;
}

// --- ABIs (loaded from Hardhat artifact files) ---

const rpcDir = path.resolve(__dirname, '..', '..', 'rpc');

const identityRegistryABI = JSON.parse(
  fs.readFileSync(path.join(rpcDir, 'IdentityRegistry.json'), 'utf8')
).abi;

const auditRegistryABI = JSON.parse(
  fs.readFileSync(path.join(rpcDir, 'AuditRegistry.json'), 'utf8')
).abi;

const assetNFTABI = JSON.parse(
  fs.readFileSync(path.join(rpcDir, 'AssetNFT.json'), 'utf8')
).abi;

// --- Contract instances ---
// Read operations use publicClient; write operations use the lazy walletClient.

const identityRegistryContract = getContract({
  address: process.env.IDENTITY_REGISTRY_ADDRESS,
  abi: identityRegistryABI,
  client: publicClient,
});

const auditRegistryContract = getContract({
  address: process.env.AUDIT_REGISTRY_ADDRESS,
  abi: auditRegistryABI,
  client: publicClient,
});

const assetNFTContract = getContract({
  address: process.env.ASSET_NFT_ADDRESS,
  abi: assetNFTABI,
  client: publicClient,
});

module.exports = {
  publicClient,
  get walletClient() { return getWalletClient(); },
  get backendAccount() { return getBackendAccount(); },
  identityRegistryContract,
  auditRegistryContract,
  assetNFTContract,
  identityRegistryABI,
  auditRegistryABI,
  assetNFTABI,
};
