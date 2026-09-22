// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuditRegistry
 * @notice Standalone, append-only audit log. Only the AssetNFT contract can
 *         write here — kept as a separate contract so a bug in AssetNFT's
 *         business logic can never corrupt or block the audit trail itself.
 *         View functions are intentionally public/ungated: Solidity view
 *         functions are already externally readable, so a fake
 *         "AUDITOR_READ_PERMISSION" would add no real security — auditor
 *         read-only-ness is enforced by AssetNFT never letting AUDITOR call
 *         any state-changing function, not by hiding reads here.
 */
contract AuditRegistry is Ownable {
    address public assetNFTContract;

    struct AuditEntry {
        uint256 tokenId;
        string actionType; // DOCUMENT_MINTED, DOCUMENT_UPDATED, ACCESS_GRANTED,
                            // ACCESS_REVOKED, OWNERSHIP_TRANSFERRED, ...
        address actor;
        string details;
        uint256 timestamp;
    }

    AuditEntry[] private auditLog;

    event AuditLogged(
        uint256 indexed tokenId,
        string actionType,
        address indexed actor,
        string details,
        uint256 timestamp
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyAssetNFT() {
        require(msg.sender == assetNFTContract, "Only AssetNFT can log");
        _;
    }

    /// @notice One-time wiring, called right after AssetNFT is deployed.
    function setAssetNFTContract(address _assetNFT) external onlyOwner {
        require(assetNFTContract == address(0), "Already set");
        require(_assetNFT != address(0), "Invalid address");
        assetNFTContract = _assetNFT;
    }

    /// @notice Append-only — there is no update/delete function by design.
    function logAction(
        uint256 tokenId,
        string calldata actionType,
        address actor,
        string calldata details
    ) external onlyAssetNFT {
        auditLog.push(AuditEntry(tokenId, actionType, actor, details, block.timestamp));
        emit AuditLogged(tokenId, actionType, actor, details, block.timestamp);
    }

    function getAuditLogCount() external view returns (uint256) {
        return auditLog.length;
    }

    function getAuditEntry(uint256 index) external view returns (AuditEntry memory) {
        require(index < auditLog.length, "Index out of bounds");
        return auditLog[index];
    }

    /// @notice Convenience batch read for a UI/backend page-load.
    function getAuditEntries(uint256 start, uint256 count) external view returns (AuditEntry[] memory) {
        require(start < auditLog.length || auditLog.length == 0, "Start out of bounds");
        uint256 end = start + count;
        if (end > auditLog.length) {
            end = auditLog.length;
        }
        AuditEntry[] memory page = new AuditEntry[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = auditLog[i];
        }
        return page;
    }
}
