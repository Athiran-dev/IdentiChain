const { Router } = require('express');
const walletAuth = require('../middleware/walletAuth');
const {
  register,
  getIdentity,
  createRoleApplication,
  listRoleApplications,
  getMyRoleApplication,
  updateRoleApplication,
  listUsers,
} = require('../controllers/identity.controller');

const router = Router();

// POST /api/identity/register — mirror on-chain registration to MongoDB
router.post('/register', register);

// GET /api/identity/users — ADMIN only
router.get('/users', walletAuth, listUsers);

// GET /api/identity/role-applications — ADMIN only (must come before /:wallet)
router.get('/role-applications', walletAuth, listRoleApplications);

// GET /api/identity/:wallet — live on-chain data + MongoDB profile
router.get('/:wallet', getIdentity);

// GET /api/identity/role-application/mine — get my role application
router.get('/role-application/mine', walletAuth, getMyRoleApplication);

// PATCH /api/identity/role-application/:id — update a role application
router.patch('/role-application/:id', walletAuth, updateRoleApplication);

// POST /api/identity/role-application — submit a role application
router.post('/role-application', walletAuth, createRoleApplication);

module.exports = router;
