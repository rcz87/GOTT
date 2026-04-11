const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GuardiansToken (GOTT)", function () {
  async function deployFixture() {
    const [owner, user1, user2, minter, pauser] = await ethers.getSigners();
    const GuardiansToken = await ethers.getContractFactory("GuardiansToken");
    const token = await GuardiansToken.deploy(owner.address, 40); // 40% initial mint
    await token.waitForDeployment();

    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

    return { token, owner, user1, user2, minter, pauser, MINTER_ROLE, PAUSER_ROLE, ADMIN_ROLE };
  }

  // ==================== DEPLOYMENT ====================
  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("Guardians Token");
      expect(await token.symbol()).to.equal("GOTT");
    });

    it("Should mint 40% of MAX_SUPPLY to owner", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      const expected = ethers.parseEther("400000000"); // 40% of 1B
      expect(await token.balanceOf(owner.address)).to.equal(expected);
      expect(await token.totalSupply()).to.equal(expected);
    });

    it("Should set max wallet to 2% of supply", async function () {
      const { token } = await loadFixture(deployFixture);
      const expected = ethers.parseEther("20000000"); // 2% of 1B
      expect(await token.maxWalletAmount()).to.equal(expected);
    });

    it("Should report correct mintable supply", async function () {
      const { token } = await loadFixture(deployFixture);
      const expected = ethers.parseEther("600000000"); // 60% remaining
      expect(await token.mintableSupply()).to.equal(expected);
    });

    it("Should grant all roles to owner", async function () {
      const { token, owner, MINTER_ROLE, PAUSER_ROLE, ADMIN_ROLE } = await loadFixture(deployFixture);
      expect(await token.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("Should reject zero address as owner", async function () {
      const GuardiansToken = await ethers.getContractFactory("GuardiansToken");
      await expect(GuardiansToken.deploy(ethers.ZeroAddress, 40)).to.be.revertedWithCustomError(
        GuardiansToken, "ZeroAddress"
      );
    });

    it("Should reject invalid mint percent", async function () {
      const GuardiansToken = await ethers.getContractFactory("GuardiansToken");
      const [owner] = await ethers.getSigners();
      await expect(GuardiansToken.deploy(owner.address, 0)).to.be.revertedWith("Invalid mint %");
      await expect(GuardiansToken.deploy(owner.address, 101)).to.be.revertedWith("Invalid mint %");
    });
  });

  // ==================== MINTING ====================
  describe("Minting", function () {
    it("Should allow MINTER_ROLE to mint", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000000");
      await token.mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should reject mint exceeding MAX_SUPPLY", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      const tooMuch = ethers.parseEther("700000000"); // > 600M remaining
      await expect(token.mint(user1.address, tooMuch)).to.be.revertedWithCustomError(
        token, "ExceedsMaxSupply"
      );
    });

    it("Should reject mint from non-MINTER", async function () {
      const { token, user1, user2 } = await loadFixture(deployFixture);
      await expect(
        token.connect(user1).mint(user2.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });
  });

  // ==================== ANTI-WHALE ====================
  describe("Anti-Whale", function () {
    it("Should block transfer exceeding max wallet", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      const tooMuch = ethers.parseEther("25000000"); // > 20M max wallet
      await expect(token.transfer(user1.address, tooMuch)).to.be.revertedWithCustomError(
        token, "ExceedsMaxWallet"
      );
    });

    it("Should allow transfer within max wallet", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      const ok = ethers.parseEther("19000000"); // < 20M
      await token.transfer(user1.address, ok);
      expect(await token.balanceOf(user1.address)).to.equal(ok);
    });

    it("Should exempt addresses from max wallet", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      await token.setExemptFromMaxWallet(user1.address, true);
      const big = ethers.parseEther("25000000");
      await token.transfer(user1.address, big);
      expect(await token.balanceOf(user1.address)).to.equal(big);
    });

    it("Should allow admin to update max wallet amount", async function () {
      const { token } = await loadFixture(deployFixture);
      const newMax = ethers.parseEther("50000000"); // 5%
      await token.setMaxWalletAmount(newMax);
      expect(await token.maxWalletAmount()).to.equal(newMax);
    });

    it("Should allow admin to disable max wallet", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      await token.toggleMaxWallet(false);
      const big = ethers.parseEther("100000000");
      await token.transfer(user1.address, big); // should pass
      expect(await token.balanceOf(user1.address)).to.equal(big);
    });
  });

  // ==================== PAUSE ====================
  describe("Pause", function () {
    it("Should pause and block transfers", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      await token.pause();
      await expect(
        token.transfer(user1.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("Should unpause and allow transfers", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      await token.pause();
      await token.unpause();
      await token.transfer(user1.address, ethers.parseEther("100"));
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
    });
  });

  // ==================== BURN ====================
  describe("Burn", function () {
    it("Should allow holder to burn own tokens", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      const burnAmount = ethers.parseEther("1000000");
      const before = await token.totalSupply();
      await token.burn(burnAmount);
      expect(await token.totalSupply()).to.equal(before - burnAmount);
    });
  });

  // ==================== GOVERNANCE (VOTES) ====================
  describe("Governance / Votes", function () {
    it("Should have zero voting power before delegation", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.getVotes(owner.address)).to.equal(0);
    });

    it("Should activate voting power after self-delegation", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      await token.delegate(owner.address);
      expect(await token.getVotes(owner.address)).to.equal(await token.balanceOf(owner.address));
    });

    it("Should allow delegation to another address", async function () {
      const { token, owner, user1 } = await loadFixture(deployFixture);
      await token.transfer(user1.address, ethers.parseEther("1000000"));
      await token.connect(user1).delegate(owner.address);
      expect(await token.getVotes(owner.address)).to.equal(ethers.parseEther("1000000"));
    });
  });
});
