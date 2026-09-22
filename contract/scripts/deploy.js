const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. IdentityRegistry — deployer becomes SUPER_ADMIN_ROLE
  const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(deployer.address);
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("IdentityRegistry deployed at:", identityRegistryAddress);

  // 2. AuditRegistry — deployer is Ownable owner (only used to wire AssetNFT once)
  const AuditRegistry = await hre.ethers.getContractFactory("AuditRegistry");
  const auditRegistry = await AuditRegistry.deploy(deployer.address);
  await auditRegistry.waitForDeployment();
  const auditRegistryAddress = await auditRegistry.getAddress();
  console.log("AuditRegistry deployed at:", auditRegistryAddress);

  // 3. AssetNFT — takes the other two addresses, no local RBAC of its own
  const AssetNFT = await hre.ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFT.deploy(identityRegistryAddress, auditRegistryAddress);
  await assetNFT.waitForDeployment();
  const assetNFTAddress = await assetNFT.getAddress();
  console.log("AssetNFT deployed at:", assetNFTAddress);

  // 4. Wire AuditRegistry -> AssetNFT (one-time, irreversible)
  const wireTx = await auditRegistry.setAssetNFTContract(assetNFTAddress);
  await wireTx.wait();
  console.log("AuditRegistry wired to AssetNFT");

  console.log("\n--- Deployment summary ---");
  console.log("IdentityRegistry:", identityRegistryAddress);
  console.log("AuditRegistry:   ", auditRegistryAddress);
  console.log("AssetNFT:        ", assetNFTAddress);
  console.log("SUPER_ADMIN:     ", deployer.address);
  console.log("\nNext steps (post-deploy, one-time, from SUPER_ADMIN wallet):");
  console.log("1. identityRegistry.registerSelf(did)               // super admin registers own identity");
  console.log("2. identityRegistry.assignAdminRole(superAdminAddr)  // promotes self to business ADMIN");
  console.log("   (only after this can the SUPER_ADMIN also call ADMIN_ROLE-gated functions like assignRole)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});