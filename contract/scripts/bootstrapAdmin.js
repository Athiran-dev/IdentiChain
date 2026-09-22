const { ethers } = require("ethers");
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

const IdentityRegistryABI = require('../../client/src/abi/IdentityRegistry.json').abi;

async function setupAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.BACKEND_WALLET_PRIVATE_KEY, provider);

  const identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
  const identityRegistry = new ethers.Contract(identityRegistryAddress, IdentityRegistryABI, wallet);

  console.log("Registering SUPER_ADMIN on blockchain...");
  try {
    const tx1 = await identityRegistry.registerSelf("did:ethr:" + wallet.address);
    await tx1.wait();
    console.log("Registered.");
  } catch(e) {
    console.log("Already registered or error:", e.message);
  }

  console.log("Assigning ADMIN role on blockchain...");
  try {
    const tx2 = await identityRegistry.assignAdminRole(wallet.address);
    await tx2.wait();
    console.log("Role assigned.");
  } catch(e) {
    console.log("Already admin or error:", e.message);
  }

  console.log("Seeding MongoDB...");
  await User.create({
    walletAddress: wallet.address.toLowerCase(),
    name: 'Super Admin',
    email: 'admin@identichain.com',
    department: 'Executive',
    designation: 'System Administrator',
    did: "did:ethr:" + wallet.address,
    roleCache: 'ADMIN',
    isActiveCache: true,
    onChain: {
      isRegistered: true,
      registeredAt: Date.now(),
      roleAssignedAt: Date.now()
    }
  });

  console.log("Done!");
  process.exit(0);
}

setupAdmin();
