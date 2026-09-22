const { Router } = require('express');
const multer = require('multer');
const walletAuth = require('../middleware/walletAuth');
const { uploadPhoto, updateProfile } = require('../controllers/profile.controller');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// POST /api/profile/photo — upload profile photo to Cloudinary
router.post('/photo', walletAuth, upload.single('photo'), uploadPhoto);

// PUT /api/profile/:wallet — update profile fields
router.put('/:wallet', walletAuth, updateProfile);

module.exports = router;
