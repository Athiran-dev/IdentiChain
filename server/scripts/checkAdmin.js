require('dotenv').config({ path: '../.env' });
const { createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');
const fs = require('fs');

async function main() {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  });

  const account = privateKeyToAccount(`0x${process.env.BACKEND_WALLET_PRIVATE_KEY}`);
  const abi = JSON.parse(fs.readFileSync('../rpc/IdentityRegistry.json', 'utf8')).abi;
  const address = process.env.IDENTITY_REGISTRY_ADDRESS;

  const role = await client.readContract({
    address,
    abi,
    functionName: 'getRole',
    args: [account.address]
  });

  console.log(`Backend wallet address: ${account.address}`);
  console.log(`Role: ${role}`);
}

main().catch(console.error);
