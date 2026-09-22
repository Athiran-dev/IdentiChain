require('dotenv').config({ path: '../.env' });
const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');
const fs = require('fs');

async function main() {
  // Using the Super Admin's private key found in contract/.env
  const account = privateKeyToAccount(`0xafdad5d8e5dc4e1c95e4903e4b66e070ec505b8f9de4b25c24f1aebbe6ddb027`);
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  }).extend(publicActions);

  const abi = JSON.parse(fs.readFileSync('../rpc/IdentityRegistry.json', 'utf8')).abi;
  const address = process.env.IDENTITY_REGISTRY_ADDRESS;
  const walletToReactivate = '0xd08Fb22319A3AFAE78f080982b6845A343c6e245';

  console.log(`Setting role to NONE for wallet: ${walletToReactivate}`);
  
  const { request } = await client.simulateContract({
    address,
    abi,
    functionName: 'assignRole',
    args: [walletToReactivate, 0], // 0 is NONE
    account
  });

  const hash = await client.writeContract(request);
  console.log(`Transaction sent. Hash: ${hash}`);
  
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
}

main().catch(console.error);
