require('dotenv').config({ path: '../.env' });
const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');
const fs = require('fs');

async function main() {
  const account = privateKeyToAccount(`0x${process.env.BACKEND_WALLET_PRIVATE_KEY}`);
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  }).extend(publicActions);

  const abi = JSON.parse(fs.readFileSync('../rpc/IdentityRegistry.json', 'utf8')).abi;
  const address = process.env.IDENTITY_REGISTRY_ADDRESS;
  const walletToReactivate = '0xd08Fb22319A3AFAE78f080982b6845A343c6e245';

  console.log(`Reactivating wallet: ${walletToReactivate}`);
  
  const { request } = await client.simulateContract({
    address,
    abi,
    functionName: 'setActiveStatus',
    args: [walletToReactivate, true],
    account
  });

  const hash = await client.writeContract(request);
  console.log(`Transaction sent. Hash: ${hash}`);
  
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
}

main().catch(console.error);
