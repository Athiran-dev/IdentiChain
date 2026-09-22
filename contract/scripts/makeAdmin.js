const hre = require("hardhat");

async function main() {
    const registryAddress = "0xE97f4e0A31E9F6b5E1629294183F2b7FeC01DD79";
    const userWallet = "0xdd7B89E7b9df4e74CCF02E3fa45276301b865F4d";
    
    console.log(`Connecting to IdentityRegistry at ${registryAddress}`);
    const IdentityRegistry = await hre.ethers.getContractAt("IdentityRegistry", registryAddress);
    
    const id = await IdentityRegistry.getIdentity(userWallet);
    console.log("Current Identity state:", id);
    
    if (id.registeredAt == 0n) {
        console.log("Registering identity for user...");
        const tx1 = await IdentityRegistry.registerIdentityFor(userWallet, "did:ethr:" + userWallet);
        await tx1.wait();
        console.log("Registered.");
    } else {
        console.log("User already registered.");
    }
    
    console.log("Assigning ADMIN role...");
    try {
        const tx2 = await IdentityRegistry.assignAdminRole(userWallet);
        await tx2.wait();
        console.log("ADMIN role assigned successfully to", userWallet);
    } catch(e) {
        console.error("Error assigning admin role:", e);
    }
}

main().catch(console.error);
