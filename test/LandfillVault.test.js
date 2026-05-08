const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const DEAD = "0x000000000000000000000000000000000000dEaD";

describe("LandfillVault", function () {
  async function deployFixture() {
    const [admin, dao, emergency, recipient, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const scam = await MockERC20.deploy("ScamToken", "SCAM");
    await scam.waitForDeployment();
    const dust = await MockERC20.deploy("DustToken", "DUST");
    await dust.waitForDeployment();

    const Vault = await ethers.getContractFactory("LandfillVault");
    const vault = await Vault.deploy(admin.address, dao.address);
    await vault.waitForDeployment();

    const DAO_ROLE = await vault.DAO_ROLE();
    const EMERGENCY_ROLE = await vault.EMERGENCY_ROLE();
    const PAUSER_ROLE = await vault.PAUSER_ROLE();
    const ADMIN_ROLE = await vault.DEFAULT_ADMIN_ROLE();

    // Pre-fund vault with 1000 SCAM + 500 DUST.
    await scam.mint(await vault.getAddress(), ethers.parseEther("1000"));
    await dust.mint(await vault.getAddress(), ethers.parseEther("500"));

    return {
      vault, scam, dust, admin, dao, emergency, recipient, attacker,
      DAO_ROLE, EMERGENCY_ROLE, PAUSER_ROLE, ADMIN_ROLE,
    };
  }

  // ============================================================
  //                       DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("reverts on admin == address(0)", async function () {
      const [, dao] = await ethers.getSigners();
      const Vault = await ethers.getContractFactory("LandfillVault");
      await expect(Vault.deploy(ethers.ZeroAddress, dao.address))
        .to.be.revertedWithCustomError(Vault, "ZeroAddress");
    });

    it("reverts on dao == address(0)", async function () {
      const [admin] = await ethers.getSigners();
      const Vault = await ethers.getContractFactory("LandfillVault");
      await expect(Vault.deploy(admin.address, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Vault, "ZeroAddress");
    });

    it("grants ADMIN, PAUSER, EMERGENCY to admin", async function () {
      const { vault, admin, ADMIN_ROLE, PAUSER_ROLE, EMERGENCY_ROLE } = await loadFixture(deployFixture);
      expect(await vault.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await vault.hasRole(PAUSER_ROLE, admin.address)).to.equal(true);
      expect(await vault.hasRole(EMERGENCY_ROLE, admin.address)).to.equal(true);
    });

    it("grants DAO_ROLE only to dao param (not admin)", async function () {
      const { vault, admin, dao, DAO_ROLE } = await loadFixture(deployFixture);
      expect(await vault.hasRole(DAO_ROLE, dao.address)).to.equal(true);
      expect(await vault.hasRole(DAO_ROLE, admin.address)).to.equal(false);
    });

    it("starts unpaused", async function () {
      const { vault } = await loadFixture(deployFixture);
      expect(await vault.paused()).to.equal(false);
    });

    it("getBalance reflects ERC20 balanceOf", async function () {
      const { vault, scam } = await loadFixture(deployFixture);
      expect(await vault.getBalance(await scam.getAddress())).to.equal(ethers.parseEther("1000"));
    });
  });

  // ============================================================
  //                        burnToken
  // ============================================================
  describe("burnToken", function () {
    it("reverts when caller lacks DAO_ROLE", async function () {
      const { vault, scam, attacker } = await loadFixture(deployFixture);
      await expect(
        vault.connect(attacker).burnToken(await scam.getAddress(), ethers.parseEther("10")),
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("reverts when token == address(0)", async function () {
      const { vault, dao } = await loadFixture(deployFixture);
      await expect(vault.connect(dao).burnToken(ethers.ZeroAddress, 1n))
        .to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("reverts when amount == 0", async function () {
      const { vault, dao, scam } = await loadFixture(deployFixture);
      await expect(vault.connect(dao).burnToken(await scam.getAddress(), 0n))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("transfers tokens to 0xdEaD and emits TokenBurned", async function () {
      const { vault, dao, scam } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");
      const scamAddr = await scam.getAddress();
      const vaultAddr = await vault.getAddress();
      const balBefore = await scam.balanceOf(vaultAddr);

      await expect(vault.connect(dao).burnToken(scamAddr, amount))
        .to.emit(vault, "TokenBurned").withArgs(scamAddr, amount);

      expect(await scam.balanceOf(vaultAddr)).to.equal(balBefore - amount);
      expect(await scam.balanceOf(DEAD)).to.equal(amount);
    });

    it("reverts if amount exceeds vault balance (ERC20 underflow)", async function () {
      const { vault, dao, scam } = await loadFixture(deployFixture);
      const tooMuch = ethers.parseEther("9999");
      await expect(vault.connect(dao).burnToken(await scam.getAddress(), tooMuch))
        .to.be.reverted; // OZ ERC20InsufficientBalance custom error
    });
  });

  // ============================================================
  //                      transferToken
  // ============================================================
  describe("transferToken", function () {
    it("reverts when caller lacks DAO_ROLE", async function () {
      const { vault, scam, recipient, attacker } = await loadFixture(deployFixture);
      await expect(
        vault.connect(attacker).transferToken(await scam.getAddress(), recipient.address, 1n),
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("reverts when token, to == address(0)", async function () {
      const { vault, dao, scam, recipient } = await loadFixture(deployFixture);
      await expect(vault.connect(dao).transferToken(ethers.ZeroAddress, recipient.address, 1n))
        .to.be.revertedWithCustomError(vault, "ZeroAddress");
      await expect(vault.connect(dao).transferToken(await scam.getAddress(), ethers.ZeroAddress, 1n))
        .to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("reverts when amount == 0", async function () {
      const { vault, dao, scam, recipient } = await loadFixture(deployFixture);
      await expect(vault.connect(dao).transferToken(await scam.getAddress(), recipient.address, 0n))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("transfers tokens to recipient and emits TokenTransferred", async function () {
      const { vault, dao, scam, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("250");
      const scamAddr = await scam.getAddress();

      await expect(vault.connect(dao).transferToken(scamAddr, recipient.address, amount))
        .to.emit(vault, "TokenTransferred").withArgs(scamAddr, recipient.address, amount);

      expect(await scam.balanceOf(recipient.address)).to.equal(amount);
      expect(await scam.balanceOf(await vault.getAddress())).to.equal(ethers.parseEther("750"));
    });
  });

  // ============================================================
  //                      emergencyWithdraw
  // ============================================================
  describe("emergencyWithdraw", function () {
    it("reverts when caller lacks EMERGENCY_ROLE", async function () {
      const { vault, scam, recipient, dao } = await loadFixture(deployFixture);
      // Even DAO_ROLE doesn't unlock emergency.
      await expect(
        vault.connect(dao).emergencyWithdraw(await scam.getAddress(), recipient.address),
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("reverts when token, to == address(0)", async function () {
      const { vault, admin, scam, recipient } = await loadFixture(deployFixture);
      await expect(vault.connect(admin).emergencyWithdraw(ethers.ZeroAddress, recipient.address))
        .to.be.revertedWithCustomError(vault, "ZeroAddress");
      await expect(vault.connect(admin).emergencyWithdraw(await scam.getAddress(), ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("reverts when balance is zero", async function () {
      const { vault, admin, recipient } = await loadFixture(deployFixture);
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const empty = await MockERC20.deploy("Empty", "EMP");
      await empty.waitForDeployment();
      await expect(vault.connect(admin).emergencyWithdraw(await empty.getAddress(), recipient.address))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("withdraws full balance to recipient and emits EmergencyWithdrawn", async function () {
      const { vault, admin, scam, recipient } = await loadFixture(deployFixture);
      const scamAddr = await scam.getAddress();
      const vaultAddr = await vault.getAddress();
      const fullBalance = await scam.balanceOf(vaultAddr);

      await expect(vault.connect(admin).emergencyWithdraw(scamAddr, recipient.address))
        .to.emit(vault, "EmergencyWithdrawn").withArgs(scamAddr, recipient.address, fullBalance);

      expect(await scam.balanceOf(vaultAddr)).to.equal(0n);
      expect(await scam.balanceOf(recipient.address)).to.equal(fullBalance);
    });

    it("works while paused (bypasses pause)", async function () {
      const { vault, admin, scam, recipient } = await loadFixture(deployFixture);
      await vault.connect(admin).pause();
      expect(await vault.paused()).to.equal(true);
      const scamAddr = await scam.getAddress();
      const fullBalance = await scam.balanceOf(await vault.getAddress());

      await expect(vault.connect(admin).emergencyWithdraw(scamAddr, recipient.address))
        .to.emit(vault, "EmergencyWithdrawn").withArgs(scamAddr, recipient.address, fullBalance);
    });
  });

  // ============================================================
  //                          PAUSE
  // ============================================================
  describe("Pause", function () {
    it("only PAUSER_ROLE can pause / unpause", async function () {
      const { vault, attacker } = await loadFixture(deployFixture);
      await expect(vault.connect(attacker).pause())
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
      await expect(vault.connect(attacker).unpause())
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("blocks burnToken when paused", async function () {
      const { vault, admin, dao, scam } = await loadFixture(deployFixture);
      await vault.connect(admin).pause();
      await expect(vault.connect(dao).burnToken(await scam.getAddress(), 1n))
        .to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("blocks transferToken when paused", async function () {
      const { vault, admin, dao, scam, recipient } = await loadFixture(deployFixture);
      await vault.connect(admin).pause();
      await expect(vault.connect(dao).transferToken(await scam.getAddress(), recipient.address, 1n))
        .to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("getBalance still works while paused", async function () {
      const { vault, admin, scam } = await loadFixture(deployFixture);
      await vault.connect(admin).pause();
      expect(await vault.getBalance(await scam.getAddress())).to.equal(ethers.parseEther("1000"));
    });

    it("resumes operations after unpause", async function () {
      const { vault, admin, dao, scam } = await loadFixture(deployFixture);
      await vault.connect(admin).pause();
      await vault.connect(admin).unpause();
      await expect(vault.connect(dao).burnToken(await scam.getAddress(), ethers.parseEther("1")))
        .to.emit(vault, "TokenBurned");
    });
  });

  // ============================================================
  //                     ROLE MANAGEMENT
  // ============================================================
  describe("Role management", function () {
    it("admin can grant DAO_ROLE", async function () {
      const { vault, admin, attacker, DAO_ROLE } = await loadFixture(deployFixture);
      await vault.connect(admin).grantRole(DAO_ROLE, attacker.address);
      expect(await vault.hasRole(DAO_ROLE, attacker.address)).to.equal(true);
    });

    it("admin can revoke DAO_ROLE", async function () {
      const { vault, admin, dao, scam, DAO_ROLE } = await loadFixture(deployFixture);
      await vault.connect(admin).revokeRole(DAO_ROLE, dao.address);
      await expect(vault.connect(dao).burnToken(await scam.getAddress(), 1n))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });
});
