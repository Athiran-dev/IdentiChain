const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * POST /api/profile/photo
 * Upload a profile photo to Cloudinary (NOT IPFS — profile photos are mutable, non-security-critical).
 */
async function uploadPhoto(req, res) {
  const wallet = req.walletAddress; // from walletAuth
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Upload to Cloudinary
  const photoUrl = await uploadToCloudinary(file.buffer, 'identichain/profiles');

  // Save URL to user profile
  const user = await User.findOneAndUpdate(
    { walletAddress: wallet },
    { profilePhotoUrl: photoUrl },
    { new: true, upsert: true }
  );

  res.json({ success: true, profilePhotoUrl: photoUrl, user });
}

/**
 * PUT /api/profile/:wallet
 * Update profile fields (name, department, designation, etc.) in MongoDB.
 */
async function updateProfile(req, res) {
  const { wallet } = req.params;
  const authenticatedWallet = req.walletAddress; // from walletAuth

  // Only allow updating your own profile
  if (wallet.toLowerCase() !== authenticatedWallet) {
    return res.status(403).json({ error: 'Cannot update another user\'s profile' });
  }

  const allowedFields = ['name', 'employeeId', 'department', 'designation', 'email', 'phone'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const user = await User.findOneAndUpdate(
    { walletAddress: wallet.toLowerCase() },
    updates,
    { new: true, upsert: true }
  );

  res.json({ success: true, user });
}

module.exports = { uploadPhoto, updateProfile };
