require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function nukeUser() {
  const address = '0xd08Fb22319A3AFAE78f080982b6845A343c6e245'.toLowerCase();
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to DB.`);

  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    const name = collection.collectionName;
    const docs = await collection.find({}).toArray();
    for (let doc of docs) {
      if (JSON.stringify(doc).toLowerCase().includes(address)) {
        await collection.deleteOne({ _id: doc._id });
        console.log(`Deleted document from collection ${name} with _id: ${doc._id}`);
      }
    }
  }

  console.log('Nuke done.');
  process.exit(0);
}

nukeUser().catch(console.error);
