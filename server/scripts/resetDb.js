const mongoose = require('mongoose');
require('dotenv').config();

async function resetDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped successfully');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

resetDb();
