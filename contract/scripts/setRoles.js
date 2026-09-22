const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    const rpcUrl = "https://eth-sepolia.g.alchemy.com/v2/alch_j5o2unHPk6nzP-LCdwlKE";
    const privateKey = "afdad5d8e5dc4e1c95e4903e4b66e070ec505b8f9de4b25c24f1aebbe6ddb027";
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log("Super Admin wallet:", wallet.address);
    
    const abiPath = "c:/SIH/contract/artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json";
    const { abi } = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    
    const registryAddress = "0xE97f4e0A31E9F6b5E1629294183F2b7FeC01DD79";
    const registry = new ethers.Contract(registryAddress, abi, wallet);
    
    const managerWallet = "0xdd7B89E7b9df4e74CCF02E3fa45276301b865F4d";
    const auditorWallet = "0xc594b1F10ADf48fd8b6B5acE2703F36d757B6D26";
    
    // Process Manager
    console.log("Checking manager wallet...");
    const id1 = await registry.getIdentity(managerWallet);
    if (id1.registeredAt == 0n) {
        console.log("Registering manager...");
        const tx = await registry.registerIdentityFor(managerWallet, "did:ethr:" + managerWallet);
        await tx.wait();
    }
    
    if (id1.role == 4n) { // ADMIN
        console.log("Revoking admin role from manager wallet...");
        const txRevoke = await registry.revokeAdminRole(managerWallet);
        await txRevoke.wait();
    }
    
    console.log("Assigning MANAGER role...");
    const txManager = await registry.assignRole(managerWallet, 2); // 2 = MANAGER
    await txManager.wait();
    console.log("Manager role assigned successfully.");
    
    // Process Auditor
    console.log("Checking auditor wallet...");
    const id2 = await registry.getIdentity(auditorWallet);
    if (id2.registeredAt == 0n) {
        console.log("Registering auditor...");
        const tx2 = await registry.registerIdentityFor(auditorWallet, "did:ethr:" + auditorWallet);
        await tx2.wait();
    }
    
    console.log("Assigning AUDITOR role...");
    const txAuditor = await registry.assignRole(auditorWallet, 3); // 3 = AUDITOR
    await txAuditor.wait();
    console.log("Auditor role assigned successfully.");
}

main().catch(console.error);
