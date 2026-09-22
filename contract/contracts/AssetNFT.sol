// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IdentityRegistry.sol";
import "./AuditRegistry.sol";

/**
 * @title AssetNFT
 * @notice One ERC-721 token = one document/asset, for its entire lifetime.
 *         Editing a document bumps its version and re-points tokenURI —
 *         it never mints a new token. Ownership (ERC-721 owner) and access
 *         (VIEW/EDIT grants) are deliberately separate concepts.
 *
 *         NO local role storage: every identity/role decision is delegated
 *         to IdentityRegistry, so there is exactly one place role state can
 *         live and drift is structurally impossible.
 *
 *         Standard ERC-721 transferFrom/safeTransferFrom are disabled.
 *         Confidential government documents should not be freely tradeable
 *         like collectibles — ownership changes go through
 *         reassignOwnership(), which enforces that the new owner is a
 *         verified, active, organizationally-roled identity and logs an
 *         OWNERSHIP_TRANSFERRED audit entry. Existing VIEW/EDIT grants are
 *         intentionally NOT cleared on transfer (access is asset-specific,
 *         not ownership-specific) — the new owner/an ADMIN can review and
 *         revoke them if needed.
 */
contract AssetNFT is ERC721URIStorage {
    IdentityRegistry public immutable identityRegistry;
    AuditRegistry public immutable auditRegistry;

    uint256 private _nextTokenId;

    enum AccessLevel { NONE, VIEW, EDIT }

    struct AccessGrant {
        AccessLevel level;
        uint256 expiresAt; // 0 = no expiry
    }

    mapping(uint256 => uint256) public currentVersion;
    mapping(uint256 => mapping(address => AccessGrant)) private accessGrants;

    event DocumentMinted(uint256 indexed tokenId, address indexed owner, string metadataCID);
    event DocumentUpdated(uint256 indexed tokenId, uint256 newVersion, string newMetadataCID, address indexed editor);
    event AccessGranted(uint256 indexed tokenId, address indexed user, AccessLevel level, uint256 expiresAt, address indexed grantedBy);
    event AccessRevoked(uint256 indexed tokenId, address indexed user, address indexed revokedBy);
    event OwnershipTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    constructor(address _identityRegistry, address _auditRegistry)
        ERC721("IdentiChain Document", "IDCD")
    {
        require(_identityRegistry != address(0), "Invalid IdentityRegistry");
        require(_auditRegistry != address(0), "Invalid AuditRegistry");
        identityRegistry = IdentityRegistry(_identityRegistry);
        auditRegistry = AuditRegistry(_auditRegistry);
    }

    // ---------------------------------------------------------------
    // Minting — only MANAGER or ADMIN (checked live against IdentityRegistry)
    // ---------------------------------------------------------------
    function mintDocument(address owner_, string calldata metadataCID) external returns (uint256) {
        IdentityRegistry.Role callerRole = identityRegistry.getRole(msg.sender);
        require(
            callerRole == IdentityRegistry.Role.MANAGER || callerRole == IdentityRegistry.Role.ADMIN,
            "Only MANAGER or ADMIN can mint"
        );
        require(identityRegistry.isVerified(msg.sender), "Caller not active");
        require(identityRegistry.isVerified(owner_), "Owner not verified/active");

        IdentityRegistry.Role ownerRole = identityRegistry.getRole(owner_);
        require(
            ownerRole == IdentityRegistry.Role.EMPLOYEE ||
            ownerRole == IdentityRegistry.Role.MANAGER ||
            ownerRole == IdentityRegistry.Role.ADMIN,
            "Owner must hold an organizational role"
        );

        uint256 tokenId = _nextTokenId++;
        _safeMint(owner_, tokenId);
        _setTokenURI(tokenId, metadataCID);
        currentVersion[tokenId] = 1;

        auditRegistry.logAction(tokenId, "DOCUMENT_MINTED", msg.sender, metadataCID);
        emit DocumentMinted(tokenId, owner_, metadataCID);
        return tokenId;
    }

    // ---------------------------------------------------------------
    // Versioning — same tokenId forever, only tokenURI + version change
    // ---------------------------------------------------------------
    function updateDocument(uint256 tokenId, string calldata newMetadataCID) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(getAccessLevel(tokenId, msg.sender) == AccessLevel.EDIT, "EDIT access required");

        currentVersion[tokenId] += 1;
        _setTokenURI(tokenId, newMetadataCID);

        auditRegistry.logAction(tokenId, "DOCUMENT_UPDATED", msg.sender, newMetadataCID);
        emit DocumentUpdated(tokenId, currentVersion[tokenId], newMetadataCID, msg.sender);
    }

    // ---------------------------------------------------------------
    // Access control — VIEW / EDIT grants, independent of ownership
    // ---------------------------------------------------------------
    function grantAccess(
        uint256 tokenId,
        address user,
        AccessLevel level,
        uint256 expiresAt
    ) external {
        address owner_ = ownerOf(tokenId);
        bool isOwner = msg.sender == owner_;
        IdentityRegistry.Role senderRole = identityRegistry.getRole(msg.sender);
        bool isAdminOrManager = senderRole == IdentityRegistry.Role.ADMIN || senderRole == IdentityRegistry.Role.MANAGER;
        require(isOwner || isAdminOrManager, "Not authorized to grant access");
        require(level != AccessLevel.NONE, "Use revokeAccess to remove access");
        require(identityRegistry.isVerified(user), "Grantee not verified/active");

        IdentityRegistry.Role granteeRole = identityRegistry.getRole(user);
        require(granteeRole != IdentityRegistry.Role.NONE, "Grantee has no organizational role yet");
        if (level == AccessLevel.EDIT) {
            require(granteeRole != IdentityRegistry.Role.AUDITOR, "Auditors cannot receive EDIT access");
        }
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiry");

        accessGrants[tokenId][user] = AccessGrant(level, expiresAt);

        auditRegistry.logAction(
            tokenId,
            "ACCESS_GRANTED",
            msg.sender,
            string.concat("level:", Strings.toString(uint256(level)), ",user:", Strings.toHexString(uint160(user), 20))
        );
        emit AccessGranted(tokenId, user, level, expiresAt, msg.sender);
    }

    function revokeAccess(uint256 tokenId, address user) external {
        address owner_ = ownerOf(tokenId);
        bool isOwner = msg.sender == owner_;
        IdentityRegistry.Role senderRole = identityRegistry.getRole(msg.sender);
        bool isAdminOrManager = senderRole == IdentityRegistry.Role.ADMIN || senderRole == IdentityRegistry.Role.MANAGER;
        require(isOwner || isAdminOrManager, "Not authorized to revoke access");

        delete accessGrants[tokenId][user];

        auditRegistry.logAction(tokenId, "ACCESS_REVOKED", msg.sender, Strings.toHexString(uint160(user), 20));
        emit AccessRevoked(tokenId, user, msg.sender);
    }

    /// @notice Single source of truth for "can this wallet VIEW/EDIT this document".
    ///         Owner always resolves to EDIT. Inactive/deactivated identities
    ///         always resolve to NONE, regardless of any stored grant.
    ///         Expired grants resolve to NONE.
    function getAccessLevel(uint256 tokenId, address user) public view returns (AccessLevel) {
        if (!identityRegistry.isVerified(user)) {
            return AccessLevel.NONE;
        }
        if (ownerOf(tokenId) == user) {
            return AccessLevel.EDIT;
        }

        AccessGrant memory grant = accessGrants[tokenId][user];
        if (grant.expiresAt != 0 && block.timestamp > grant.expiresAt) {
            return AccessLevel.NONE;
        }
        return grant.level;
    }

    // ---------------------------------------------------------------
    // Ownership transfer — deliberately NOT the standard ERC-721 flow
    // ---------------------------------------------------------------
    function reassignOwnership(uint256 tokenId, address newOwner) external {
        address currentOwner = ownerOf(tokenId);
        bool isCurrentOwner = msg.sender == currentOwner;
        bool isAdmin = identityRegistry.getRole(msg.sender) == IdentityRegistry.Role.ADMIN;
        require(isCurrentOwner || isAdmin, "Not authorized to reassign ownership");
        require(identityRegistry.isVerified(newOwner), "New owner not verified/active");

        IdentityRegistry.Role newOwnerRole = identityRegistry.getRole(newOwner);
        require(
            newOwnerRole == IdentityRegistry.Role.EMPLOYEE ||
            newOwnerRole == IdentityRegistry.Role.MANAGER ||
            newOwnerRole == IdentityRegistry.Role.ADMIN,
            "New owner must hold an organizational role"
        );

        _transfer(currentOwner, newOwner, tokenId);

        auditRegistry.logAction(
            tokenId,
            "OWNERSHIP_TRANSFERRED",
            msg.sender,
            string.concat("to:", Strings.toHexString(uint160(newOwner), 20))
        );
        emit OwnershipTransferred(tokenId, currentOwner, newOwner);
    }

    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert("Direct transfers disabled - use reassignOwnership()");
    }

    // Note: the 3-arg safeTransferFrom() is NOT virtual in OZ's ERC721 (it just
    // calls the 4-arg version internally), so it cannot be overridden directly.
    // Blocking the 4-arg version below is sufficient to block both call forms.
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721, IERC721) {
        revert("Direct transfers disabled - use reassignOwnership()");
    }
}
