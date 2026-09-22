const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    const rpcUrl = "https://eth-sepolia.g.alchemy.com/v2/alch_j5o2unHPk6nzP-LCdwlKE";
    const privateKey = "afdad5d8e5dc4e1c95e4903e4b66e070ec505b8f9de4b25c24f1aebbe6ddb027";
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log("Admin wallet:", wallet.address);
    
    const abiPath = "c:/SIH/contract/artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json";
    const { abi } = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    
    const registryAddress = "0xE97f4e0A31E9F6b5E1629294183F2b7FeC01DD79";
    const registry = new ethers.Contract(registryAddress, abi, wallet);
    
    const targetWallet = "0xdd7B89E7b9df4e74CCF02E3fa45276301b865F4d";
    
    console.log("Checking identity...");
    const id = await registry.getIdentity(targetWallet);
    console.log("Identity:", id);
    
    if (id.registeredAt == 0n) {
        console.log("Registering identity...");
        const tx = await registry.registerIdentityFor(targetWallet, "did:ethr:" + targetWallet);
        await tx.wait();
        console.log("Registered.");
    }
    
    console.log("Assigning admin role...");
    const tx2 = await registry.assignAdminRole(targetWallet);
    await tx2.wait();
    console.log("Done! Wallet", targetWallet, "is now an ADMIN.");
}

main().catch(console.error);
