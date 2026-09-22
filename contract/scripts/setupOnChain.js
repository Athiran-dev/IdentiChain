const hre = require("hardhat");
require('dotenv').config({ path: '../server/.env' });

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting up Super Admin:", deployer.address);

  const identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
  const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = IdentityRegistry.attach(identityRegistryAddress);

  console.log("Registering SUPER_ADMIN on blockchain...");
  try {
    const tx1 = await identityRegistry.registerSelf("did:ethr:" + deployer.address);
    await tx1.wait();
    console.log("Registered.");
  } catch(e) {
    console.log("Already registered or error:", e.reason || e.message);
  }

  console.log("Assigning ADMIN role on blockchain...");
  try {
    const tx2 = await identityRegistry.assignAdminRole(deployer.address);
    await tx2.wait();
    console.log("Role assigned.");
  } catch(e) {
    console.log("Already admin or error:", e.reason || e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
