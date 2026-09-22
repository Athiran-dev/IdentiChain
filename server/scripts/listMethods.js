const fs = require('fs');

async function main() {
  const abi = JSON.parse(fs.readFileSync('../rpc/IdentityRegistry.json', 'utf8')).abi;
  abi.forEach(item => {
    if (item.type === 'function') {
      console.log(`Function: ${item.name}`);
      console.log(`  Inputs: ${item.inputs.map(i => `${i.type} ${i.name}`).join(', ')}`);
      console.log(`  Outputs: ${item.outputs ? item.outputs.map(o => `${o.type} ${o.name}`).join(', ') : 'none'}`);
    }
  });
}

main().catch(console.error);
