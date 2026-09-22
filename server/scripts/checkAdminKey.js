const { privateKeyToAccount } = require('viem/accounts');
const account = privateKeyToAccount('0xafdad5d8e5dc4e1c95e4903e4b66e070ec505b8f9de4b25c24f1aebbe6ddb027');
console.log(account.address);
