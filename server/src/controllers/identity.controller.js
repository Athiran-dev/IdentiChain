const User = require('../models/User');
const RoleApplication = require('../models/RoleApplication');
const { publicClient, identityRegistryContract, identityRegistryABI } = require('../config/viemClient');
const { decodeEventLog } = require('viem');

const ROLE_MAP = { 0: 'NONE', 1: 'EMPLOYEE', 2: 'MANAGER', 3: 'AUDITOR', 4: 'ADMIN' };

/**
 * POST /api/identity/register
 * Mirror an already-confirmed on-chain registerSelf tx into MongoDB.
 */
async function register(req, res) {
  const { walletAddress, did, txHash } = req.body;

  if (!walletAddress || !txHash) {
    return res.status(400).json({ error: 'walletAddress and txHash are required' });
  }

  // Verify the transaction actually succeeded
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    return res.status(400).json({ error: 'Transaction did not succeed on-chain' });
  }

  // Fetch live on-chain data for cache sync
  const [roleRaw, isActive] = await Promise.all([
    identityRegistryContract.read.getRole([walletAddress]),
    identityRegistryContract.read.isVerified([walletAddress]),
  ]);

  const roleCache = ROLE_MAP[Number(roleRaw)] || 'NONE';

  const user = await User.findOneAndUpdate(
    { walletAddress: walletAddress.toLowerCase() },
    {
      walletAddress: walletAddress.toLowerCase(),
      did: did || undefined,
      roleCache,
      isActiveCache: isActive,
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, user });
}

/**
 * GET /api/identity/:wallet
 * Live on-chain role + isVerified + MongoDB profile data.
 */
async function getIdentity(req, res) {
  const { wallet } = req.params;

  // Always read live from the contract — NEVER trust cached values
  const [roleRaw, isActive, identityData] = await Promise.all([
    identityRegistryContract.read.getRole([wallet]),
    identityRegistryContract.read.isVerified([wallet]),
    identityRegistryContract.read.getIdentity([wallet]),
  ]);

  const role = ROLE_MAP[Number(roleRaw)] || 'NONE';

  // Opportunistically sync the cache
  const profile = await User.findOneAndUpdate(
    { walletAddress: wallet.toLowerCase() },
    { roleCache: role, isActiveCache: isActive },
    { new: true, upsert: true }
  );

  res.json({
    onChain: {
      role,
      isActive,
      did: identityData.did || identityData[0],
      registeredAt: Number(identityData.registeredAt || identityData[3]),
    },
    profile: {
      name: profile.name,
      employeeId: profile.employeeId,
      department: profile.department,
      designation: profile.designation,
      profilePhotoUrl: profile.profilePhotoUrl,
      email: profile.email,
      phone: profile.phone,
      walletAddress: profile.walletAddress,
    },
  });
}

/**
 * POST /api/identity/role-application
 * Create a role application (PENDING).
 */
async function createRoleApplication(req, res) {
  const { requestedRole } = req.body;
  const wallet = req.walletAddress; // from walletAuth middleware

  if (!['EMPLOYEE', 'MANAGER', 'AUDITOR', 'ADMIN'].includes(requestedRole)) {
    return res.status(400).json({ error: 'Invalid requestedRole' });
  }

  const application = await RoleApplication.create({
    wallet,
    requestedRole,
  });

  res.status(201).json({ success: true, application });
}

/**
 * GET /api/identity/role-applications
 * ADMIN only — list pending role applications.
 */
async function listRoleApplications(req, res) {
  const wallet = req.walletAddress; // from walletAuth middleware

  // Verify caller is ADMIN on-chain
  const roleRaw = await identityRegistryContract.read.getRole([wallet]);
  const role = ROLE_MAP[Number(roleRaw)] || 'NONE';

  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only ADMIN can view role applications' });
  }

  const applications = await RoleApplication.find({ status: 'PENDING' }).sort({ submittedAt: -1 });

  res.json({ applications });
}

/**
 * GET /api/identity/role-application/mine
 * Get the current user's role application.
 */
async function getMyRoleApplication(req, res) {
  const wallet = req.walletAddress;

  const application = await RoleApplication.findOne({ wallet: wallet.toLowerCase() }).sort({ submittedAt: -1 });
  if (!application) {
    return res.json({ application: null });
  }

  res.json({ application });
}

/**
 * PATCH /api/identity/role-application/:id
 * Admin approves (requires txHash) or rejects a role application.
 */
async function updateRoleApplication(req, res) {
  const { id } = req.params;
  const { status, txHash } = req.body;
  const wallet = req.walletAddress; // ADMIN wallet

  // Verify caller is ADMIN on-chain
  const roleRaw = await identityRegistryContract.read.getRole([wallet]);
  const role = ROLE_MAP[Number(roleRaw)] || 'NONE';

  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only ADMIN can update role applications' });
  }

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
  }

  const application = await RoleApplication.findById(id);
  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  if (status === 'REJECTED') {
    application.status = 'REJECTED';
    await application.save();
    return res.json({ success: true, application });
  }

  // If APPROVED, we must verify the txHash and decode RoleAssigned event
  if (status === 'APPROVED') {
    if (!txHash) {
      return res.status(400).json({ error: 'txHash is required for approval' });
    }

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction did not succeed on-chain' });
    }

    if (receipt.to?.toLowerCase() !== process.env.IDENTITY_REGISTRY_ADDRESS.toLowerCase()) {
      return res.status(400).json({ error: 'Transaction was not sent to the IdentityRegistry contract' });
    }

    let roleAssignedEvent = null;
    let adminRoleGrantedEvent = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: identityRegistryABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'RoleAssigned') {
          roleAssignedEvent = decoded.args;
          break;
        } else if (decoded.eventName === 'AdminRoleGranted') {
          adminRoleGrantedEvent = decoded.args;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!roleAssignedEvent && !adminRoleGrantedEvent) {
      return res.status(400).json({ error: 'No RoleAssigned or AdminRoleGranted event found in transaction' });
    }

    // Verify the event matches the application
    let assignedRole;
    if (adminRoleGrantedEvent) {
      if (adminRoleGrantedEvent.wallet.toLowerCase() !== application.wallet.toLowerCase()) {
        return res.status(400).json({ error: 'AdminRoleGranted event wallet does not match application wallet' });
      }
      assignedRole = 'ADMIN';
    } else {
      if (roleAssignedEvent.wallet.toLowerCase() !== application.wallet.toLowerCase()) {
        return res.status(400).json({ error: 'RoleAssigned event wallet does not match application wallet' });
      }
      assignedRole = ROLE_MAP[Number(roleAssignedEvent.newRole)];
    }

    if (assignedRole !== application.requestedRole) {
      return res.status(400).json({ error: 'Assigned event role does not match requested role' });
    }

    application.status = 'APPROVED';
    await application.save();
    
    // Opportunistically sync the user's role in DB
    await User.findOneAndUpdate(
      { walletAddress: application.wallet.toLowerCase() },
      { roleCache: assignedRole },
      { new: true, upsert: true }
    );

    return res.json({ success: true, application });
  }
}

/**
 * GET /api/identity/users
 * ADMIN only — get all registered users
 */
async function listUsers(req, res) {
  const wallet = req.walletAddress;
  
  const roleRaw = await identityRegistryContract.read.getRole([wallet]);
  const role = ROLE_MAP[Number(roleRaw)] || 'NONE';
  
  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'ADMIN only' });
  }

  const users = await User.find({}).sort({ createdAt: -1 }).select('-__v');
  res.json({ users });
}

module.exports = {
  register,
  getIdentity,
  createRoleApplication,
  listRoleApplications,
  getMyRoleApplication,
  updateRoleApplication,
  listUsers,
};
