const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');


async function setupAdminDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const walletAddress = "0x86b060CbdBc68276a62f892DDa12B231805A64fd".toLowerCase();

  console.log("Seeding MongoDB...");
  await User.create({
    walletAddress,
    name: 'Super Admin',
    email: 'admin@identichain.com',
    department: 'Executive',
    designation: 'System Administrator',
    did: "did:ethr:" + walletAddress,
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

setupAdminDB();
