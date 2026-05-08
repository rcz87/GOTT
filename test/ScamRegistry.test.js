const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Mirrors the on-chain enum order in ScamRegistry.TokenStatus.
const Status = {
  Unknown: 0,
  Legit: 1,
  Dust: 2,
  Dead: 3,
  Scam: 4,
  Drainer: 5,
  Honeypot: 6,
};

describe("ScamRegistry", function () {
  async function deployFixture() {
    const [admin, oracle, pauser, alice, bob, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScamRegistry");
    const registry = await Factory.deploy(admin.address);
    await registry.waitForDeployment();

    const ORACLE_ROLE = await registry.ORACLE_ROLE();
    const PAUSER_ROLE = await registry.PAUSER_ROLE();
    const ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();

    return {
      registry, admin, oracle, pauser, alice, bob, attacker,
      ORACLE_ROLE, PAUSER_ROLE, ADMIN_ROLE,
    };
  }

  async function deployedWithOracleFixture() {
    const f = await deployFixture();
    await f.registry.grantRole(f.ORACLE_ROLE, f.oracle.address);
    return f;
  }

  // Pseudo-random EOA-looking address derived from a uint seed (non-zero).
  function makeToken(seed) {
    return ethers.getAddress(ethers.zeroPadValue(ethers.toBeHex(seed), 20));
  }

  // ============================================================
  //                       DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("reverts when admin == address(0)", async function () {
      const Factory = await ethers.getContractFactory("ScamRegistry");
      await expect(Factory.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Factory, "ZeroAddress");
    });

    it("grants DEFAULT_ADMIN_ROLE and PAUSER_ROLE to admin", async function () {
      const { registry, admin, ADMIN_ROLE, PAUSER_ROLE } = await loadFixture(deployFixture);
      expect(await registry.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await registry.hasRole(PAUSER_ROLE, admin.address)).to.equal(true);
    });

    it("does not grant ORACLE_ROLE to admin (must be granted explicitly)", async function () {
      const { registry, admin, ORACLE_ROLE } = await loadFixture(deployFixture);
      expect(await registry.hasRole(ORACLE_ROLE, admin.address)).to.equal(false);
    });

    it("starts unpaused", async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.paused()).to.equal(false);
    });

    it("returns Unknown for never-reported tokens", async function () {
      const { registry, alice } = await loadFixture(deployFixture);
      expect(await registry.getStatus(alice.address)).to.equal(Status.Unknown);
    });
  });

  // ============================================================
  //                      setStatus (single)
  // ============================================================
  describe("setStatus", function () {
    it("reverts when caller lacks ORACLE_ROLE", async function () {
      const { registry, attacker, alice } = await loadFixture(deployedWithOracleFixture);
      await expect(registry.connect(attacker).setStatus(alice.address, Status.Scam))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("reverts when token == address(0)", async function () {
      const { registry, oracle } = await loadFixture(deployedWithOracleFixture);
      await expect(registry.connect(oracle).setStatus(ethers.ZeroAddress, Status.Scam))
        .to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects out-of-range enum values (Solidity panic)", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await expect(registry.connect(oracle).setStatus(alice.address, 7))
        .to.be.reverted; // panic 0x21 — invalid enum
    });

    it("writes status, timestamp, reporter, and reportCount=1 on first report", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      const tx = await registry.connect(oracle).setStatus(alice.address, Status.Scam);
      const receipt = await tx.wait();
      const blockTs = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      const info = await registry.tokenInfo(alice.address);
      expect(info.status).to.equal(Status.Scam);
      expect(info.lastUpdated).to.equal(blockTs);
      expect(info.reportedBy).to.equal(oracle.address);
      expect(info.reportCount).to.equal(1n);
    });

    it("emits StatusUpdated with correct old/new status and reporter", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await expect(registry.connect(oracle).setStatus(alice.address, Status.Legit))
        .to.emit(registry, "StatusUpdated")
        .withArgs(alice.address, Status.Unknown, Status.Legit, oracle.address);
    });

    it("captures oldStatus from previous write on subsequent updates", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(oracle).setStatus(alice.address, Status.Legit);
      await expect(registry.connect(oracle).setStatus(alice.address, Status.Scam))
        .to.emit(registry, "StatusUpdated")
        .withArgs(alice.address, Status.Legit, Status.Scam, oracle.address);
    });

    it("increments reportCount on every call (not only on status change)", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(oracle).setStatus(alice.address, Status.Scam);
      await registry.connect(oracle).setStatus(alice.address, Status.Scam);
      await registry.connect(oracle).setStatus(alice.address, Status.Drainer);
      const info = await registry.tokenInfo(alice.address);
      expect(info.reportCount).to.equal(3n);
    });

    it("getStatus reflects the latest write", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(oracle).setStatus(alice.address, Status.Dead);
      expect(await registry.getStatus(alice.address)).to.equal(Status.Dead);
      await registry.connect(oracle).setStatus(alice.address, Status.Drainer);
      expect(await registry.getStatus(alice.address)).to.equal(Status.Drainer);
    });
  });

  // ============================================================
  //                     setStatusBatch
  // ============================================================
  describe("setStatusBatch", function () {
    it("reverts when caller lacks ORACLE_ROLE", async function () {
      const { registry, attacker, alice } = await loadFixture(deployedWithOracleFixture);
      await expect(
        registry.connect(attacker).setStatusBatch([alice.address], [Status.Scam])
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("reverts on empty arrays", async function () {
      const { registry, oracle } = await loadFixture(deployedWithOracleFixture);
      await expect(registry.connect(oracle).setStatusBatch([], []))
        .to.be.revertedWithCustomError(registry, "EmptyBatch");
    });

    it("reverts on length mismatch", async function () {
      const { registry, oracle, alice, bob } = await loadFixture(deployedWithOracleFixture);
      await expect(
        registry.connect(oracle).setStatusBatch(
          [alice.address, bob.address],
          [Status.Scam],
        ),
      ).to.be.revertedWithCustomError(registry, "LengthMismatch");
    });

    it("reverts when any token in batch is address(0)", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await expect(
        registry.connect(oracle).setStatusBatch(
          [alice.address, ethers.ZeroAddress],
          [Status.Legit, Status.Scam],
        ),
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("applies all statuses in order and emits per token", async function () {
      const { registry, oracle, alice, bob } = await loadFixture(deployedWithOracleFixture);
      const tx = registry.connect(oracle).setStatusBatch(
        [alice.address, bob.address],
        [Status.Scam, Status.Honeypot],
      );
      await expect(tx)
        .to.emit(registry, "StatusUpdated").withArgs(alice.address, Status.Unknown, Status.Scam, oracle.address)
        .and.to.emit(registry, "StatusUpdated").withArgs(bob.address, Status.Unknown, Status.Honeypot, oracle.address);

      expect(await registry.getStatus(alice.address)).to.equal(Status.Scam);
      expect(await registry.getStatus(bob.address)).to.equal(Status.Honeypot);
    });

    it("batch result equals sequential setStatus calls (state equivalence)", async function () {
      // Run batch on registry A.
      const a = await loadFixture(deployedWithOracleFixture);
      const tokens = [makeToken(0xA1), makeToken(0xB2), makeToken(0xC3)];
      const statuses = [Status.Legit, Status.Scam, Status.Dust];
      await a.registry.connect(a.oracle).setStatusBatch(tokens, statuses);

      // Run sequential on registry B.
      const b = await deployFixture();
      await b.registry.grantRole(b.ORACLE_ROLE, b.oracle.address);
      for (let i = 0; i < tokens.length; ++i) {
        await b.registry.connect(b.oracle).setStatus(tokens[i], statuses[i]);
      }

      for (const t of tokens) {
        const ai = await a.registry.tokenInfo(t);
        const bi = await b.registry.tokenInfo(t);
        expect(ai.status).to.equal(bi.status);
        expect(ai.reportedBy).to.equal(bi.reportedBy);
        expect(ai.reportCount).to.equal(bi.reportCount);
      }
    });
  });

  // ============================================================
  //                     isScamOrDrainer
  // ============================================================
  describe("isScamOrDrainer", function () {
    it("returns true for Scam, Drainer, Honeypot", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      for (const s of [Status.Scam, Status.Drainer, Status.Honeypot]) {
        await registry.connect(oracle).setStatus(alice.address, s);
        expect(await registry.isScamOrDrainer(alice.address)).to.equal(true);
      }
    });

    it("returns false for Unknown, Legit, Dust, Dead", async function () {
      const { registry, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      // Unknown — never reported.
      expect(await registry.isScamOrDrainer(alice.address)).to.equal(false);
      for (const s of [Status.Legit, Status.Dust, Status.Dead]) {
        await registry.connect(oracle).setStatus(alice.address, s);
        expect(await registry.isScamOrDrainer(alice.address)).to.equal(false);
      }
    });
  });

  // ============================================================
  //                          PAUSE
  // ============================================================
  describe("Pause", function () {
    it("only PAUSER_ROLE can pause / unpause", async function () {
      const { registry, attacker } = await loadFixture(deployFixture);
      await expect(registry.connect(attacker).pause())
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
      await expect(registry.connect(attacker).unpause())
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("blocks setStatus when paused", async function () {
      const { registry, admin, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(admin).pause();
      await expect(registry.connect(oracle).setStatus(alice.address, Status.Scam))
        .to.be.revertedWithCustomError(registry, "EnforcedPause");
    });

    it("blocks setStatusBatch when paused", async function () {
      const { registry, admin, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(admin).pause();
      await expect(registry.connect(oracle).setStatusBatch([alice.address], [Status.Scam]))
        .to.be.revertedWithCustomError(registry, "EnforcedPause");
    });

    it("view functions remain accessible while paused", async function () {
      const { registry, admin, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(oracle).setStatus(alice.address, Status.Scam);
      await registry.connect(admin).pause();
      expect(await registry.getStatus(alice.address)).to.equal(Status.Scam);
      expect(await registry.isScamOrDrainer(alice.address)).to.equal(true);
    });

    it("resumes write operations after unpause", async function () {
      const { registry, admin, oracle, alice } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(admin).pause();
      await registry.connect(admin).unpause();
      await expect(registry.connect(oracle).setStatus(alice.address, Status.Legit))
        .to.emit(registry, "StatusUpdated");
    });
  });

  // ============================================================
  //                     ROLE MANAGEMENT
  // ============================================================
  describe("Role management", function () {
    it("admin can grant ORACLE_ROLE", async function () {
      const { registry, admin, oracle, ORACLE_ROLE } = await loadFixture(deployFixture);
      await registry.connect(admin).grantRole(ORACLE_ROLE, oracle.address);
      expect(await registry.hasRole(ORACLE_ROLE, oracle.address)).to.equal(true);
    });

    it("admin can revoke ORACLE_ROLE — revoked oracle can no longer write", async function () {
      const { registry, admin, oracle, alice, ORACLE_ROLE } = await loadFixture(deployedWithOracleFixture);
      await registry.connect(admin).revokeRole(ORACLE_ROLE, oracle.address);
      await expect(registry.connect(oracle).setStatus(alice.address, Status.Scam))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("non-admin cannot grant roles", async function () {
      const { registry, attacker, alice, ORACLE_ROLE } = await loadFixture(deployFixture);
      await expect(registry.connect(attacker).grantRole(ORACLE_ROLE, alice.address))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
  });
});
