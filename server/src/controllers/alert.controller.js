const SecurityAlert = require('../models/SecurityAlert');

async function listAlerts(req, res) {
  try {
    const { status, limit = 50 } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const alerts = await SecurityAlert.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateAlertStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['PENDING_AUDITOR', 'ESCALATED_MANAGER', 'ESCALATED_ADMIN', 'DISMISSED', 'RESOLVED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const alert = await SecurityAlert.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { listAlerts, updateAlertStatus };
