require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
  const address = '0xd08Fb22319A3AFAE78f080982b6845A343c6e245'.toLowerCase();
  console.log(`Connecting to DB...`);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected.`);

  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    const name = collection.collectionName;
    console.log(`Checking ${name}...`);
    // Delete documents where any relevant field matches the address
    const result1 = await collection.deleteMany({ walletAddress: address });
    const result2 = await collection.deleteMany({ owner: address });
    const result3 = await collection.deleteMany({ uploader: address });
    const result4 = await collection.deleteMany({ grantee: address });
    const result5 = await collection.deleteMany({ actor: address });
    
    let total = result1.deletedCount + result2.deletedCount + result3.deletedCount + result4.deletedCount + result5.deletedCount;
    if (total > 0) {
      console.log(`Deleted ${total} documents from ${name}`);
    }
  }

  console.log('Cleanup done.');
  process.exit(0);
}

cleanup().catch(console.error);
