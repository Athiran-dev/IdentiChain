const { Router } = require('express');
const multer = require('multer');
const walletAuth = require('../middleware/walletAuth');
const {
  createAsset,
  getAsset,
  listAssets,
  accessAsset,
  prepareUpdate,
  confirmUpdate,
  transferOwnership,
  getVersionHistory,
} = require('../controllers/asset.controller');
const {
  proposeChange,
  listChangeRequests,
  previewChangeRequest,
  approveChangeRequest,
  confirmApproval,
  rejectChangeRequest,
  myChangeRequests,
} = require('../controllers/changeRequest.controller');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// ─── STATIC / NON-PARAMETRIC ROUTES (must come before /:tokenId) ───

// POST /api/asset/create — full mint flow
router.post('/create', walletAuth, upload.single('file'), createAsset);

// GET /api/asset/list — dashboard listing (must come before /:tokenId)
router.get('/list', listAssets);

// GET /api/asset/my-change-requests — employee's own CRs (must come before /:tokenId)
router.get('/my-change-requests', walletAuth, myChangeRequests);

// ─── CHANGE REQUEST ROUTES (prefixed /change-request/:id — before /:tokenId) ───

// GET /api/asset/change-request/:id/preview — diff view data
router.get('/change-request/:id/preview', walletAuth, previewChangeRequest);

// POST /api/asset/change-request/:id/approve — returns metadataCID for on-chain tx
router.post('/change-request/:id/approve', walletAuth, approveChangeRequest);

// POST /api/asset/change-request/:id/confirm-approval — after on-chain tx
router.post('/change-request/:id/confirm-approval', walletAuth, confirmApproval);

// POST /api/asset/change-request/:id/reject — reject with optional note
router.post('/change-request/:id/reject', walletAuth, rejectChangeRequest);

// ─── PARAMETRIC ROUTES (/:tokenId) ───

// GET /api/asset/:tokenId — asset details + live access level
router.get('/:tokenId', getAsset);

// GET /api/asset/:tokenId/versions — get version history
router.get('/:tokenId/versions', walletAuth, getVersionHistory);

// GET /api/asset/:tokenId/access — decrypt-and-serve with integrity check
router.get('/:tokenId/access', walletAuth, accessAsset);

// GET /api/asset/:tokenId/change-requests — list pending CRs for an asset
router.get('/:tokenId/change-requests', walletAuth, listChangeRequests);

// POST /api/asset/:tokenId/propose-change — employee submits change for review
router.post('/:tokenId/propose-change', walletAuth, upload.single('file'), proposeChange);

// POST /api/asset/:tokenId/prepare-update — step 1: upload pipeline, returns metadataCID
router.post('/:tokenId/prepare-update', walletAuth, upload.single('file'), prepareUpdate);

// POST /api/asset/:tokenId/confirm-update — step 2: verify tx, decode event, mirror
router.post('/:tokenId/confirm-update', walletAuth, confirmUpdate);

// POST /api/asset/:tokenId/transfer-ownership — mirror confirmed reassignOwnership tx
router.post('/:tokenId/transfer-ownership', walletAuth, transferOwnership);

module.exports = router;
