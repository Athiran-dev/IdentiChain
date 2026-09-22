require('dotenv').config({ path: '../.env' });
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const fs = require('fs');

async function main() {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  });

  const abi = JSON.parse(fs.readFileSync('../rpc/IdentityRegistry.json', 'utf8')).abi;
  const address = process.env.IDENTITY_REGISTRY_ADDRESS;
  const walletToReactivate = '0xd08Fb22319A3AFAE78f080982b6845A343c6e245';

  const isVerified = await client.readContract({
    address,
    abi,
    functionName: 'isVerified',
    args: [walletToReactivate]
  });

  const identity = await client.readContract({
    address,
    abi,
    functionName: 'getIdentity',
    args: [walletToReactivate]
  });

  const role = await client.readContract({
    address,
    abi,
    functionName: 'getRole',
    args: [walletToReactivate]
  });

  console.log('isVerified:', isVerified);
  console.log('identity:', identity);
  console.log('role:', role);
}

main().catch(console.error);
