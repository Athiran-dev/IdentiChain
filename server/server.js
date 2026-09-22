require('dotenv').config();

const connectDB = require('./src/config/db');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    
    // Start background jobs
    const { startSecurityCronJobs } = require('./src/cron/securityCron');
    startSecurityCronJobs();

    app.listen(PORT, () => {
      console.log(`[IdentiChain] Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (error) {
    console.error('[IdentiChain] Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
