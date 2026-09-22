const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const identityRoutes = require('./routes/identity.routes');
const assetRoutes = require('./routes/asset.routes');
const accessRoutes = require('./routes/access.routes');
const profileRoutes = require('./routes/profile.routes');
const webhookRoutes = require('./routes/webhook.routes');
const auditRoutes = require('./routes/audit.routes');
const statsRoutes = require('./routes/stats.routes');
const alertRoutes = require('./routes/alert.routes');

const app = express();

// --- Middleware ---
app.use(cors({
  exposedHeaders: ['X-Integrity-Verified', 'X-Document-Hash', 'X-Access-Level', 'Content-Type', 'Content-Disposition'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/asset', assetRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertRoutes);

// --- Global error handler ---
app.use(errorHandler);

module.exports = app;
