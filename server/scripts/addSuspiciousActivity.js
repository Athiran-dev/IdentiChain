const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const SecurityAlert = require('../src/models/SecurityAlert');

async function addSuspiciousActivity() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const wallet = "0xd08Fb22319A3AFAE78f080982b6845A343c6e245".toLowerCase();

  console.log(`Adding suspicious activity for ${wallet}...`);
  await SecurityAlert.create({
    type: 'ANOMALY_DETECTION',
    wallet,
    severity: 'HIGH',
    reason: 'Manual flag from backend',
    status: 'PENDING_AUDITOR',
    context: { manual: true, notes: "Flagged per user request" }
  });

  console.log("Done!");
  process.exit(0);
}

addSuspiciousActivity();
