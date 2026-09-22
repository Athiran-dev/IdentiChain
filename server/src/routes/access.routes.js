const { Router } = require('express');
const walletAuth = require('../middleware/walletAuth');
const { checkAccess, mirrorAccess, getAccessGrants, getMyGrant } = require('../controllers/access.controller');

const router = Router();

// GET /api/access/my-grant/:tokenId — calling wallet's own grant (view limit info)
router.get('/my-grant/:tokenId', walletAuth, getMyGrant);

// GET /api/access/asset/:tokenId — list all active access grants
router.get('/asset/:tokenId', walletAuth, getAccessGrants);

// GET /api/access/:tokenId/:wallet — live on-chain access level check
router.get('/:tokenId/:wallet', checkAccess);

// POST /api/access/mirror — mirror confirmed grantAccess/revokeAccess tx (event-first scanning)
router.post('/mirror', walletAuth, mirrorAccess);

module.exports = router;
