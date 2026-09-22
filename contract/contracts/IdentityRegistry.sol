// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IdentityRegistry
 * @notice SINGLE authoritative on-chain source for "who is this wallet".
 *         AssetNFT must never maintain its own independent role system —
 *         it queries this contract for every identity/role decision.
 *
 *         Authority model (deliberately 3-tier to prevent self-promotion):
 *         - SUPER_ADMIN_ROLE (OZ) : set once at deploy time. Only this role
 *           can promote/demote a wallet to/from the business Role.ADMIN.
 *         - ADMIN_ROLE (OZ)       : granted automatically to any wallet that
 *           becomes business Role.ADMIN. Can register identities, assign
 *           EMPLOYEE/MANAGER/AUDITOR, and (de)activate identities — but
 *           CANNOT create new ADMINs. That is intentionally reserved for
 *           SUPER_ADMIN_ROLE only.
 *         - Role.ADMIN (data)     : the organizational role shown in the UI.
 *           Kept in sync with ADMIN_ROLE by assignAdminRole/revokeAdminRole.
 */
contract IdentityRegistry is AccessControl {
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum Role {
        NONE,       // registered, but no organizational role assigned yet
        EMPLOYEE,
        MANAGER,
        AUDITOR,
        ADMIN
    }

    struct Identity {
        string did;
        Role role;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => Identity) private identities;

    event IdentityRegistered(address indexed wallet, string did);
    event RoleAssigned(address indexed wallet, Role newRole, address indexed assignedBy);
    event AdminRoleGranted(address indexed wallet, address indexed grantedBy);
    event AdminRoleRevoked(address indexed wallet, address indexed revokedBy);
    event IdentityStatusChanged(address indexed wallet, bool isActive, address indexed changedBy);

    constructor(address superAdmin) {
        require(superAdmin != address(0), "Invalid super admin");
        _grantRole(DEFAULT_ADMIN_ROLE, superAdmin);
        _grantRole(SUPER_ADMIN_ROLE, superAdmin);
        // Only SUPER_ADMIN_ROLE can grant/revoke ADMIN_ROLE.
        _setRoleAdmin(ADMIN_ROLE, SUPER_ADMIN_ROLE);

        identities[superAdmin] = Identity({
            did: "did:ethr:superadmin",
            role: Role.ADMIN,
            isActive: true,
            registeredAt: block.timestamp
        });
        _grantRole(ADMIN_ROLE, superAdmin);

        emit IdentityRegistered(superAdmin, "did:ethr:superadmin");
        emit AdminRoleGranted(superAdmin, superAdmin);
    }

    // ---------------------------------------------------------------
    // Registration — self-service, always lands in Role.NONE.
    // NONE is a valid, active state: "identity exists, no org role yet".
    // ---------------------------------------------------------------
    function registerSelf(string calldata did) external {
        _register(msg.sender, did);
    }

    /// @notice Lets an ADMIN onboard a wallet on someone's behalf (e.g. bulk import).
    function registerIdentityFor(address wallet, string calldata did) external onlyRole(ADMIN_ROLE) {
        _register(wallet, did);
    }

    function _register(address wallet, string calldata did) internal {
        require(wallet != address(0), "Invalid wallet");
        require(identities[wallet].registeredAt == 0, "Identity already exists");

        identities[wallet] = Identity({
            did: did,
            role: Role.NONE,
            isActive: true,
            registeredAt: block.timestamp
        });

        emit IdentityRegistered(wallet, did);
    }

    // ---------------------------------------------------------------
    // Role assignment
    // ---------------------------------------------------------------

    /// @notice ADMIN_ROLE assigns EMPLOYEE / MANAGER / AUDITOR / NONE.
    ///         Cannot be used to grant ADMIN — see assignAdminRole().
    function assignRole(address wallet, Role newRole) external onlyRole(ADMIN_ROLE) {
        require(identities[wallet].registeredAt != 0, "Identity not found");
        require(newRole != Role.ADMIN, "Use assignAdminRole for ADMIN promotion");

        identities[wallet].role = newRole;
        emit RoleAssigned(wallet, newRole, msg.sender);
    }

    /// @notice ONLY SUPER_ADMIN_ROLE can create a new business ADMIN.
    ///         Keeps OZ ADMIN_ROLE and business Role.ADMIN in sync.
    function assignAdminRole(address wallet) external onlyRole(SUPER_ADMIN_ROLE) {
        require(identities[wallet].registeredAt != 0, "Identity not found");

        identities[wallet].role = Role.ADMIN;
        _grantRole(ADMIN_ROLE, wallet);

        emit AdminRoleGranted(wallet, msg.sender);
    }

    /// @notice ONLY SUPER_ADMIN_ROLE can demote an ADMIN. Falls back to EMPLOYEE.
    function revokeAdminRole(address wallet) external onlyRole(SUPER_ADMIN_ROLE) {
        require(identities[wallet].role == Role.ADMIN, "Wallet is not an ADMIN");

        identities[wallet].role = Role.EMPLOYEE;
        _revokeRole(ADMIN_ROLE, wallet);

        emit AdminRoleRevoked(wallet, msg.sender);
    }

    // ---------------------------------------------------------------
    // Activation
    // ---------------------------------------------------------------
    function setActiveStatus(address wallet, bool isActive) external {
        require(identities[wallet].registeredAt != 0, "Identity not found");
        
        if (!hasRole(ADMIN_ROLE, msg.sender)) {
            require(identities[msg.sender].role == Role.MANAGER, "Only Admin or Manager can deactivate");
            require(identities[wallet].role == Role.EMPLOYEE, "Manager can only manage Employees");
        }
        
        identities[wallet].isActive = isActive;
        emit IdentityStatusChanged(wallet, isActive, msg.sender);
    }

    // ---------------------------------------------------------------
    // Reads — used by AssetNFT for every identity/role decision
    // ---------------------------------------------------------------

    /// @notice True if the wallet is registered AND active. Role.NONE wallets
    ///         are still "verified" here — verification and organizational
    ///         privilege are deliberately separate concepts.
    function isVerified(address wallet) external view returns (bool) {
        Identity memory id = identities[wallet];
        return id.registeredAt != 0 && id.isActive;
    }

    function getRole(address wallet) external view returns (Role) {
        return identities[wallet].role;
    }

    function getIdentity(address wallet) external view returns (Identity memory) {
        return identities[wallet];
    }
}
