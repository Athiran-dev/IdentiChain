require('dotenv').config();
const mongoose = require('mongoose');

async function searchDB() {
  const address = '0xd08Fb22319A3AFAE78f080982b6845A343c6e245'.toLowerCase();
  const addressRegex = new RegExp(address, 'i');
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to DB.`);

  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    const name = collection.collectionName;
    const docs = await collection.find({}).toArray();
    let found = 0;
    for (let doc of docs) {
      if (JSON.stringify(doc).toLowerCase().includes(address)) {
        found++;
      }
    }
    if (found > 0) {
      console.log(`Found address ${found} times in collection ${name}`);
    }
  }

  console.log('Search done.');
  process.exit(0);
}

searchDB().catch(console.error);
