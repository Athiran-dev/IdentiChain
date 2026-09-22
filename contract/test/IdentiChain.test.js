const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const Role = { NONE: 0, EMPLOYEE: 1, MANAGER: 2, AUDITOR: 3, ADMIN: 4 };
const AccessLevel = { NONE: 0, VIEW: 1, EDIT: 2 };

describe("IdentiChain", function () {
  async function deployAll() {
    const [superAdmin, manager, employeeA, employeeB, auditor, outsider] =
      await ethers.getSigners();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identityRegistry = await IdentityRegistry.deploy(superAdmin.address);

    const AuditRegistry = await ethers.getContractFactory("AuditRegistry");
    const auditRegistry = await AuditRegistry.deploy(superAdmin.address);

    const AssetNFT = await ethers.getContractFactory("AssetNFT");
    const assetNFT = await AssetNFT.deploy(
      await identityRegistry.getAddress(),
      await auditRegistry.getAddress()
    );

    await auditRegistry.setAssetNFTContract(await assetNFT.getAddress());

    // Bootstrap: super admin registers self and promotes self to business ADMIN
    await identityRegistry.connect(superAdmin).registerSelf("did:identichain:superadmin");
    await identityRegistry.connect(superAdmin).assignAdminRole(superAdmin.address);

    // Register + role the rest of the cast
    for (const [signer, did] of [
      [manager, "did:identichain:manager"],
      [employeeA, "did:identichain:empA"],
      [employeeB, "did:identichain:empB"],
      [auditor, "did:identichain:auditor"],
    ]) {
      await identityRegistry.connect(signer).registerSelf(did);
    }
    await identityRegistry.connect(superAdmin).assignRole(manager.address, Role.MANAGER);
    await identityRegistry.connect(superAdmin).assignRole(employeeA.address, Role.EMPLOYEE);
    await identityRegistry.connect(superAdmin).assignRole(employeeB.address, Role.EMPLOYEE);
    await identityRegistry.connect(superAdmin).assignRole(auditor.address, Role.AUDITOR);

    return { identityRegistry, auditRegistry, assetNFT, superAdmin, manager, employeeA, employeeB, auditor, outsider };
  }

  describe("Identity", function () {
    it("registers a new identity as NONE", async function () {
      const { identityRegistry, outsider } = await deployAll();
      await identityRegistry.connect(outsider).registerSelf("did:identichain:outsider");
      expect(await identityRegistry.getRole(outsider.address)).to.equal(Role.NONE);
      expect(await identityRegistry.isVerified(outsider.address)).to.equal(true);
    });

    it("rejects duplicate registration", async function () {
      const { identityRegistry, manager } = await deployAll();
      await expect(
        identityRegistry.connect(manager).registerSelf("did:duplicate")
      ).to.be.revertedWith("Identity already exists");
    });

    it("lets ADMIN assign roles, but not to ADMIN", async function () {
      const { identityRegistry, superAdmin, employeeA } = await deployAll();
      await expect(
        identityRegistry.connect(superAdmin).assignRole(employeeA.address, Role.ADMIN)
      ).to.be.revertedWith("Use assignAdminRole for ADMIN promotion");
    });

    it("prevents a non-super-admin from creating an ADMIN", async function () {
      const { identityRegistry, manager, employeeA } = await deployAll();
      await expect(
        identityRegistry.connect(manager).assignAdminRole(employeeA.address)
      ).to.be.reverted; // manager lacks SUPER_ADMIN_ROLE
    });

    it("prevents self-promotion to ADMIN", async function () {
      const { identityRegistry, employeeA } = await deployAll();
      await expect(
        identityRegistry.connect(employeeA).assignAdminRole(employeeA.address)
      ).to.be.reverted;
    });

    it("deactivated identity fails isVerified", async function () {
      const { identityRegistry, superAdmin, employeeA } = await deployAll();
      await identityRegistry.connect(superAdmin).setActiveStatus(employeeA.address, false);
      expect(await identityRegistry.isVerified(employeeA.address)).to.equal(false);
    });

    it("reactivation restores isVerified", async function () {
      const { identityRegistry, superAdmin, employeeA } = await deployAll();
      await identityRegistry.connect(superAdmin).setActiveStatus(employeeA.address, false);
      await identityRegistry.connect(superAdmin).setActiveStatus(employeeA.address, true);
      expect(await identityRegistry.isVerified(employeeA.address)).to.equal(true);
    });
  });

  describe("Minting", function () {
    it("MANAGER can mint to a verified EMPLOYEE", async function () {
      const { assetNFT, manager, employeeA } = await deployAll();
      await expect(assetNFT.connect(manager).mintDocument(employeeA.address, "metadataCID-1"))
        .to.emit(assetNFT, "DocumentMinted");
      expect(await assetNFT.ownerOf(0)).to.equal(employeeA.address);
      expect(await assetNFT.currentVersion(0)).to.equal(1);
      expect(await assetNFT.tokenURI(0)).to.equal("metadataCID-1");
    });

    it("EMPLOYEE cannot mint", async function () {
      const { assetNFT, employeeA, employeeB } = await deployAll();
      await expect(
        assetNFT.connect(employeeA).mintDocument(employeeB.address, "cid")
      ).to.be.revertedWith("Only MANAGER or ADMIN can mint");
    });

    it("AUDITOR cannot mint", async function () {
      const { assetNFT, auditor, employeeA } = await deployAll();
      await expect(
        assetNFT.connect(auditor).mintDocument(employeeA.address, "cid")
      ).to.be.revertedWith("Only MANAGER or ADMIN can mint");
    });

    it("cannot mint to an inactive owner", async function () {
      const { assetNFT, identityRegistry, superAdmin, manager, employeeA } = await deployAll();
      await identityRegistry.connect(superAdmin).setActiveStatus(employeeA.address, false);
      await expect(
        assetNFT.connect(manager).mintDocument(employeeA.address, "cid")
      ).to.be.revertedWith("Owner not verified/active");
    });

    it("cannot mint to a NONE-role wallet", async function () {
      const { assetNFT, manager, outsider, identityRegistry } = await deployAll();
      await identityRegistry.connect(outsider).registerSelf("did:none-guy");
      await expect(
        assetNFT.connect(manager).mintDocument(outsider.address, "cid")
      ).to.be.revertedWith("Owner must hold an organizational role");
    });
  });

  describe("Access grants", function () {
    async function mintOne() {
      const ctx = await deployAll();
      await ctx.assetNFT.connect(ctx.manager).mintDocument(ctx.employeeA.address, "metadataCID-1");
      return ctx;
    }

    it("owner can grant VIEW", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.VIEW, 0);
      expect(await assetNFT.getAccessLevel(0, employeeB.address)).to.equal(AccessLevel.VIEW);
    });

    it("owner can grant EDIT", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.EDIT, 0);
      expect(await assetNFT.getAccessLevel(0, employeeB.address)).to.equal(AccessLevel.EDIT);
    });

    it("AUDITOR can receive VIEW but never EDIT", async function () {
      const { assetNFT, employeeA, auditor } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, auditor.address, AccessLevel.VIEW, 0);
      expect(await assetNFT.getAccessLevel(0, auditor.address)).to.equal(AccessLevel.VIEW);

      await expect(
        assetNFT.connect(employeeA).grantAccess(0, auditor.address, AccessLevel.EDIT, 0)
      ).to.be.revertedWith("Auditors cannot receive EDIT access");
    });

    it("revoke immediately removes access", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.VIEW, 0);
      await assetNFT.connect(employeeA).revokeAccess(0, employeeB.address);
      expect(await assetNFT.getAccessLevel(0, employeeB.address)).to.equal(AccessLevel.NONE);
    });

    it("expired access resolves to NONE", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      const expiry = (await time.latest()) + 60;
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.VIEW, expiry);
      expect(await assetNFT.getAccessLevel(0, employeeB.address)).to.equal(AccessLevel.VIEW);

      await time.increase(120);
      expect(await assetNFT.getAccessLevel(0, employeeB.address)).to.equal(AccessLevel.NONE);
    });

    it("deactivated grantee resolves to NONE regardless of stored grant", async function () {
      const { assetNFT, identityRegistry, superAdmin, employeeA, employeeB } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.EDIT, 0);
      await identityRegistry.connect(superAdmin).setActiveStatus(employeeB.address, false);
      expect(await assetNFT.getAccessLevel(0, employeeB.address)).to.equal(AccessLevel.NONE);
    });

    it("non-owner, non-admin cannot grant access", async function () {
      const { assetNFT, employeeB, outsider } = await mintOne();
      await expect(
        assetNFT.connect(outsider).grantAccess(0, employeeB.address, AccessLevel.VIEW, 0)
      ).to.be.reverted;
    });
  });

  describe("Versioning / updates", function () {
    async function mintOne() {
      const ctx = await deployAll();
      await ctx.assetNFT.connect(ctx.manager).mintDocument(ctx.employeeA.address, "metadataCID-1");
      return ctx;
    }

    it("owner (implicit EDIT) can update; version increments; same tokenId", async function () {
      const { assetNFT, employeeA } = await mintOne();
      await assetNFT.connect(employeeA).updateDocument(0, "metadataCID-2");
      expect(await assetNFT.currentVersion(0)).to.equal(2);
      expect(await assetNFT.tokenURI(0)).to.equal("metadataCID-2");
      expect(await assetNFT.ownerOf(0)).to.equal(employeeA.address); // still same NFT
    });

    it("VIEW-only grantee cannot update", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.VIEW, 0);
      await expect(
        assetNFT.connect(employeeB).updateDocument(0, "metadataCID-2")
      ).to.be.revertedWith("EDIT access required");
    });

    it("EDIT grantee can update", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.EDIT, 0);
      await assetNFT.connect(employeeB).updateDocument(0, "metadataCID-2");
      expect(await assetNFT.currentVersion(0)).to.equal(2);
    });

    it("unauthorized wallet cannot update", async function () {
      const { assetNFT, outsider } = await mintOne();
      await expect(
        assetNFT.connect(outsider).updateDocument(0, "metadataCID-2")
      ).to.be.revertedWith("EDIT access required");
    });
  });

  describe("Audit trail", function () {
    it("mint / update / grant / revoke each create an audit entry", async function () {
      const { assetNFT, auditRegistry, manager, employeeA, employeeB } = await deployAll();
      await assetNFT.connect(manager).mintDocument(employeeA.address, "cid-1");
      await assetNFT.connect(employeeA).grantAccess(0, employeeB.address, AccessLevel.EDIT, 0);
      await assetNFT.connect(employeeB).updateDocument(0, "cid-2");
      await assetNFT.connect(employeeA).revokeAccess(0, employeeB.address);

      expect(await auditRegistry.getAuditLogCount()).to.equal(4);
      const entries = await auditRegistry.getAuditEntries(0, 4);
      expect(entries[0].actionType).to.equal("DOCUMENT_MINTED");
      expect(entries[1].actionType).to.equal("ACCESS_GRANTED");
      expect(entries[2].actionType).to.equal("DOCUMENT_UPDATED");
      expect(entries[3].actionType).to.equal("ACCESS_REVOKED");
    });

    it("only AssetNFT can write to AuditRegistry directly", async function () {
      const { auditRegistry, outsider } = await deployAll();
      await expect(
        auditRegistry.connect(outsider).logAction(0, "FAKE", outsider.address, "x")
      ).to.be.revertedWith("Only AssetNFT can log");
    });
  });

  describe("Ownership transfer", function () {
    async function mintOne() {
      const ctx = await deployAll();
      await ctx.assetNFT.connect(ctx.manager).mintDocument(ctx.employeeA.address, "cid-1");
      return ctx;
    }

    it("standard ERC-721 transferFrom is disabled", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      await expect(
        assetNFT.connect(employeeA).transferFrom(employeeA.address, employeeB.address, 0)
      ).to.be.revertedWith("Direct transfers disabled - use reassignOwnership()");
    });

    it("reassignOwnership works for the current owner and updates ownerOf", async function () {
      const { assetNFT, employeeA, employeeB } = await mintOne();
      await assetNFT.connect(employeeA).reassignOwnership(0, employeeB.address);
      expect(await assetNFT.ownerOf(0)).to.equal(employeeB.address);
    });

    it("access grants survive an ownership transfer (not auto-cleared)", async function () {
      const { assetNFT, employeeA, employeeB, auditor } = await mintOne();
      await assetNFT.connect(employeeA).grantAccess(0, auditor.address, AccessLevel.VIEW, 0);
      await assetNFT.connect(employeeA).reassignOwnership(0, employeeB.address);
      expect(await assetNFT.getAccessLevel(0, auditor.address)).to.equal(AccessLevel.VIEW);
    });

    it("cannot reassign to an unverified/no-role wallet", async function () {
      const { assetNFT, employeeA, outsider } = await mintOne();
      await expect(
        assetNFT.connect(employeeA).reassignOwnership(0, outsider.address)
      ).to.be.revertedWith("New owner not verified/active");
    });

    it("non-owner, non-admin cannot reassign", async function () {
      const { assetNFT, employeeB, outsider } = await mintOne();
      await expect(
        assetNFT.connect(outsider).reassignOwnership(0, employeeB.address)
      ).to.be.revertedWith("Not authorized to reassign ownership");
    });
  });
});