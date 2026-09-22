const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    did: String,
    name: String,
    employeeId: String,
    department: String,
    designation: String,
    profilePhotoUrl: String, // Cloudinary URL
    email: String,
    phone: String,
    // DISPLAY-ONLY caches — never gate actions on these.
    // Always re-check on-chain (getRole / isVerified) for enforcement.
    roleCache: {
      type: String,
      enum: ['NONE', 'EMPLOYEE', 'MANAGER', 'AUDITOR', 'ADMIN'],
      default: 'NONE',
    },
    isActiveCache: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
