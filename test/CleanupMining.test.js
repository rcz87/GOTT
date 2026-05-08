const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const EPOCH = 180 * 24 * 60 * 60; // 180 days in seconds
const ONE = 10n ** 18n;

// Convert "$X" → 1e18-scaled USD (per CleanupMining calling convention).
function usd(dollars) {
  return BigInt(dollars) * ONE;
}

describe("CleanupMining", function () {
  async function deployFixture() {
    const [admin, collector, user, user2, attacker, dao] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("GuardiansToken");
    const token = await Token.deploy(admin.address);
    await token.waitForDeployment();

    const Mining = await ethers.getContractFactory("CleanupMining");
    const mining = await Mining.deploy(admin.address, await token.getAddress());
    await mining.waitForDeployment();

    // Wire up: grant CLEANUP_MINER_ROLE on token to mining contract.
    const CLEANUP_MINER_ROLE = await token.CLEANUP_MINER_ROLE();
    await token.connect(admin).grantRole(CLEANUP_MINER_ROLE, await mining.getAddress());

    // Wire up: grant COLLECTOR_ROLE on mining to a test collector signer.
    const COLLECTOR_ROLE = await mining.COLLECTOR_ROLE();
    await mining.connect(admin).grantRole(COLLECTOR_ROLE, collector.address);

    const ADMIN_ROLE = await mining.ADMIN_ROLE();
    const PAUSER_ROLE = await mining.PAUSER_ROLE();
    const DEFAULT_ADMIN_ROLE = await mining.DEFAULT_ADMIN_ROLE();

    return {
      token, mining, admin, collector, user, user2, attacker, dao,
      CLEANUP_MINER_ROLE, COLLECTOR_ROLE, ADMIN_ROLE, PAUSER_ROLE, DEFAULT_ADMIN_ROLE,
    };
  }

  // ============================================================
  //                       DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("reverts on admin == address(0)", async function () {
      const Mining = await ethers.getContractFactory("CleanupMining");
      const [, , , , , , someAddr] = await ethers.getSigners();
      await expect(Mining.deploy(ethers.ZeroAddress, someAddr.address))
        .to.be.revertedWithCustomError(Mining, "ZeroAddress");
    });

    it("reverts on gott == address(0)", async function () {
      const Mining = await ethers.getContractFactory("CleanupMining");
      const [admin] = await ethers.getSigners();
      await expect(Mining.deploy(admin.address, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Mining, "ZeroAddress");
    });

    it("grants ADMIN, DEFAULT_ADMIN, PAUSER to admin", async function () {
      const { mining, admin, ADMIN_ROLE, PAUSER_ROLE, DEFAULT_ADMIN_ROLE } = await loadFixture(deployFixture);
      expect(await mining.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await mining.hasRole(PAUSER_ROLE, admin.address)).to.equal(true);
      expect(await mining.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it("does not grant COLLECTOR_ROLE to admin", async function () {
      const { mining, admin, COLLECTOR_ROLE } = await loadFixture(deployFixture);
      expect(await mining.hasRole(COLLECTOR_ROLE, admin.address)).to.equal(false);
    });

    it("LAUNCH_TIMESTAMP set to deploy block, EPOCH_DURATION = 180 days", async function () {
      const { mining } = await loadFixture(deployFixture);
      const launchTs = await mining.LAUNCH_TIMESTAMP();
      const block = await ethers.provider.getBlock("latest");
      // Within ~5 second tolerance of deploy block.
      expect(Number(launchTs)).to.be.closeTo(block.timestamp, 5);
      expect(await mining.EPOCH_DURATION()).to.equal(EPOCH);
    });

    it("initial baseRate, tier thresholds, MAX_BASE_RATE", async function () {
      const { mining } = await loadFixture(deployFixture);
      expect(await mining.baseRate()).to.equal(ethers.parseEther("100"));
      expect(await mining.tierBronze()).to.equal(ethers.parseEther("100"));
      expect(await mining.tierSilver()).to.equal(ethers.parseEther("1000"));
      expect(await mining.MAX_BASE_RATE()).to.equal(ethers.parseEther("1000"));
    });

    it("starts unpaused; getCurrentEpoch == 0", async function () {
      const { mining } = await loadFixture(deployFixture);
      expect(await mining.paused()).to.equal(false);
      expect(await mining.getCurrentEpoch()).to.equal(0n);
    });
  });

  // ============================================================
  //                      EPOCH MULTIPLIER
  // ============================================================
  describe("Epoch progression and multipliers", function () {
    it("epoch 0 → 1.0x", async function () {
      const { mining } = await loadFixture(deployFixture);
      expect(await mining.getEpochMultiplier()).to.equal(ethers.parseEther("1"));
    });

    it("epoch 1 → 0.5x after 180 days", async function () {
      const { mining } = await loadFixture(deployFixture);
      await time.increase(EPOCH);
      expect(await mining.getCurrentEpoch()).to.equal(1n);
      expect(await mining.getEpochMultiplier()).to.equal(ethers.parseEther("0.5"));
    });

    it("epoch 2 → 0.25x after 360 days", async function () {
      const { mining } = await loadFixture(deployFixture);
      await time.increase(2 * EPOCH);
      expect(await mining.getCurrentEpoch()).to.equal(2n);
      expect(await mining.getEpochMultiplier()).to.equal(ethers.parseEther("0.25"));
    });

    it("epoch 3 → 0.125x after 540 days", async function () {
      const { mining } = await loadFixture(deployFixture);
      await time.increase(3 * EPOCH);
      expect(await mining.getCurrentEpoch()).to.equal(3n);
      expect(await mining.getEpochMultiplier()).to.equal(ethers.parseEther("0.125"));
    });

    it("epoch 4+ → 0 (mining ended)", async function () {
      const { mining } = await loadFixture(deployFixture);
      await time.increase(4 * EPOCH);
      expect(await mining.getCurrentEpoch()).to.equal(4n);
      expect(await mining.getEpochMultiplier()).to.equal(0n);
    });
  });

  // ============================================================
  //                       TIER MULTIPLIER
  // ============================================================
  describe("Tier multipliers", function () {
    it("first-cleanup user → 2.0x regardless of value", async function () {
      const { mining, user } = await loadFixture(deployFixture);
      expect(await mining.getTierMultiplier(user.address, usd(1))).to.equal(ethers.parseEther("2"));
      expect(await mining.getTierMultiplier(user.address, usd(50000))).to.equal(ethers.parseEther("2"));
    });

    it("after first cleanup: <$100 → 1.0x", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      await mining.connect(collector).recordCleanup(user.address, usd(50), 1);
      expect(await mining.getTierMultiplier(user.address, usd(50))).to.equal(ethers.parseEther("1"));
    });

    it("after first cleanup: $100–$999 → 1.5x (bronze)", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      await mining.connect(collector).recordCleanup(user.address, usd(50), 1);
      expect(await mining.getTierMultiplier(user.address, usd(100))).to.equal(ethers.parseEther("1.5"));
      expect(await mining.getTierMultiplier(user.address, usd(999))).to.equal(ethers.parseEther("1.5"));
    });

    it("after first cleanup: ≥$1000 → 1.25x (silver)", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      await mining.connect(collector).recordCleanup(user.address, usd(50), 1);
      expect(await mining.getTierMultiplier(user.address, usd(1000))).to.equal(ethers.parseEther("1.25"));
      expect(await mining.getTierMultiplier(user.address, usd(50000))).to.equal(ethers.parseEther("1.25"));
    });
  });

  // ============================================================
  //                  REWARD FORMULA EXAMPLES
  // ============================================================
  describe("Reward formula (matches docs/06-cleanup-mining.md examples)", function () {
    // Each example uses a fresh fixture so user is "first-cleanup" or controlled.

    it("Example 1: $50 in epoch 0, repeat user → 5,000 GOTT", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      // Burn the first-cleanup bonus first.
      await mining.connect(collector).recordCleanup(user.address, usd(1), 1);
      const reward = await mining.calculateReward(user.address, usd(50));
      // baseRate × value × tier × epoch / 1e54 = 100e18 × 50e18 × 1e18 × 1e18 / 1e54 = 5000e18
      expect(reward).to.equal(ethers.parseEther("5000"));
    });

    it("Example 2: $10 first cleanup, epoch 0 → 2,000 GOTT", async function () {
      const { mining, user } = await loadFixture(deployFixture);
      const reward = await mining.calculateReward(user.address, usd(10));
      // 100e18 × 10e18 × 2e18 × 1e18 / 1e54 = 2000e18
      expect(reward).to.equal(ethers.parseEther("2000"));
    });

    it("Example 3: $2000 silver-tier repeat user, epoch 0 → 250,000 GOTT", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      await mining.connect(collector).recordCleanup(user.address, usd(1), 1);
      const reward = await mining.calculateReward(user.address, usd(2000));
      // 100e18 × 2000e18 × 1.25e18 × 1e18 / 1e54 = 250_000e18
      expect(reward).to.equal(ethers.parseEther("250000"));
    });

    it("$500 bronze-tier repeat user, epoch 2 → 18,750 GOTT", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      await mining.connect(collector).recordCleanup(user.address, usd(1), 1);
      await time.increase(2 * EPOCH);
      const reward = await mining.calculateReward(user.address, usd(500));
      // 100e18 × 500e18 × 1.5e18 × 0.25e18 / 1e54 = 18_750e18
      expect(reward).to.equal(ethers.parseEther("18750"));
    });

    it("epoch 4+ yields 0 reward regardless of value", async function () {
      const { mining, user } = await loadFixture(deployFixture);
      await time.increase(4 * EPOCH);
      expect(await mining.calculateReward(user.address, usd(10000))).to.equal(0n);
    });
  });

  // ============================================================
  //                       recordCleanup
  // ============================================================
  describe("recordCleanup", function () {
    it("only COLLECTOR_ROLE can call", async function () {
      const { mining, attacker, user } = await loadFixture(deployFixture);
      await expect(mining.connect(attacker).recordCleanup(user.address, usd(100), 1))
        .to.be.revertedWithCustomError(mining, "AccessControlUnauthorizedAccount");
    });

    it("reverts on user == address(0)", async function () {
      const { mining, collector } = await loadFixture(deployFixture);
      await expect(mining.connect(collector).recordCleanup(ethers.ZeroAddress, usd(100), 1))
        .to.be.revertedWithCustomError(mining, "ZeroAddress");
    });

    it("mints reward to user via GuardiansToken.mintReward", async function () {
      const { mining, token, collector, user } = await loadFixture(deployFixture);
      const reward = await mining.calculateReward(user.address, usd(50)); // first-cleanup → 10000 GOTT

      await expect(mining.connect(collector).recordCleanup(user.address, usd(50), 3))
        .to.emit(token, "RewardMinted");

      expect(await token.balanceOf(user.address)).to.equal(reward);
    });

    it("emits RewardCalculated with cleanupValue, tokenCount, reward, epoch", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      const value = usd(50);
      const tokenCount = 7;
      const reward = await mining.calculateReward(user.address, value);

      await expect(mining.connect(collector).recordCleanup(user.address, value, tokenCount))
        .to.emit(mining, "RewardCalculated")
        .withArgs(user.address, value, tokenCount, reward, 0n);
    });

    it("flips hasCleanedBefore + updates per-user state", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      expect(await mining.hasCleanedBefore(user.address)).to.equal(false);

      await mining.connect(collector).recordCleanup(user.address, usd(123), 2);

      expect(await mining.hasCleanedBefore(user.address)).to.equal(true);
      expect(await mining.totalCleanupValue(user.address)).to.equal(usd(123));
      const reward = (100n * 123n * 2n * 1n) * ONE; // first-cleanup tier 2x, epoch 0 (1x), but result already absorbs scale; explicit calc:
      // baseRate(100e18) × value(123e18) × tier(2e18) × epoch(1e18) / 1e54 = 24600e18
      expect(await mining.totalRewardsEarned(user.address)).to.equal(ethers.parseEther("24600"));
    });

    it("updates global counters", async function () {
      const { mining, collector, user, user2 } = await loadFixture(deployFixture);
      await mining.connect(collector).recordCleanup(user.address, usd(100), 1);
      await mining.connect(collector).recordCleanup(user2.address, usd(200), 4);
      expect(await mining.totalCleanupsExecuted()).to.equal(2n);
      expect(await mining.totalValueCleaned()).to.equal(usd(300));
    });

    it("cleanupCountPerEpoch keyed per-epoch, not cumulative", async function () {
      const { mining, collector, user } = await loadFixture(deployFixture);
      await mining.connect(collector).recordCleanup(user.address, usd(10), 1);
      await mining.connect(collector).recordCleanup(user.address, usd(10), 1);
      expect(await mining.cleanupCountPerEpoch(user.address, 0)).to.equal(2n);

      await time.increase(EPOCH);
      await mining.connect(collector).recordCleanup(user.address, usd(10), 1);
      expect(await mining.cleanupCountPerEpoch(user.address, 0)).to.equal(2n); // unchanged
      expect(await mining.cleanupCountPerEpoch(user.address, 1)).to.equal(1n);
    });

    it("post-mining cleanup still recorded but mints 0 reward", async function () {
      const { mining, token, collector, user } = await loadFixture(deployFixture);
      await time.increase(4 * EPOCH);
      await mining.connect(collector).recordCleanup(user.address, usd(100), 1);

      expect(await token.balanceOf(user.address)).to.equal(0n);
      expect(await mining.totalRewardsEarned(user.address)).to.equal(0n);
      expect(await mining.totalCleanupsExecuted()).to.equal(1n);
      expect(await mining.totalValueCleaned()).to.equal(usd(100));
      expect(await mining.hasCleanedBefore(user.address)).to.equal(true);
    });

    it("reverts when reward exceeds GuardiansToken daily cap", async function () {
      const { mining, token, collector, user } = await loadFixture(deployFixture);
      // First cleanup tier-2x, epoch-1x, baseRate 100. To exceed 1.4M GOTT cap:
      // reward = 100 × value × 2 = 1_400_001 → value > 7000.005 USD
      await expect(mining.connect(collector).recordCleanup(user.address, usd(7001), 1))
        .to.be.revertedWithCustomError(token, "DailyMintCapExceeded");
    });
  });

  // ============================================================
  //                       PAUSE
  // ============================================================
  describe("Pause", function () {
    it("only PAUSER_ROLE can pause/unpause", async function () {
      const { mining, attacker } = await loadFixture(deployFixture);
      await expect(mining.connect(attacker).pause())
        .to.be.revertedWithCustomError(mining, "AccessControlUnauthorizedAccount");
    });

    it("blocks recordCleanup when paused", async function () {
      const { mining, admin, collector, user } = await loadFixture(deployFixture);
      await mining.connect(admin).pause();
      await expect(mining.connect(collector).recordCleanup(user.address, usd(100), 1))
        .to.be.revertedWithCustomError(mining, "EnforcedPause");
    });

    it("view functions still work while paused", async function () {
      const { mining, admin, user } = await loadFixture(deployFixture);
      await mining.connect(admin).pause();
      expect(await mining.calculateReward(user.address, usd(100))).to.equal(ethers.parseEther("20000"));
      expect(await mining.getCurrentEpoch()).to.equal(0n);
    });

    it("resumes after unpause", async function () {
      const { mining, admin, collector, user } = await loadFixture(deployFixture);
      await mining.connect(admin).pause();
      await mining.connect(admin).unpause();
      await expect(mining.connect(collector).recordCleanup(user.address, usd(50), 1))
        .to.emit(mining, "RewardCalculated");
    });
  });

  // ============================================================
  //                     ADMIN SETTERS
  // ============================================================
  describe("Admin setters", function () {
    it("setBaseRate: only ADMIN_ROLE; emits BaseRateChanged", async function () {
      const { mining, admin, attacker } = await loadFixture(deployFixture);
      await expect(mining.connect(attacker).setBaseRate(ethers.parseEther("50")))
        .to.be.revertedWithCustomError(mining, "AccessControlUnauthorizedAccount");

      await expect(mining.connect(admin).setBaseRate(ethers.parseEther("200")))
        .to.emit(mining, "BaseRateChanged").withArgs(ethers.parseEther("100"), ethers.parseEther("200"));
      expect(await mining.baseRate()).to.equal(ethers.parseEther("200"));
    });

    it("setBaseRate: rejects zero and over MAX_BASE_RATE", async function () {
      const { mining, admin } = await loadFixture(deployFixture);
      await expect(mining.connect(admin).setBaseRate(0))
        .to.be.revertedWithCustomError(mining, "InvalidBaseRate");
      await expect(mining.connect(admin).setBaseRate(ethers.parseEther("1001")))
        .to.be.revertedWithCustomError(mining, "InvalidBaseRate");
    });

    it("setTierThresholds: only ADMIN_ROLE; emits TierThresholdsChanged", async function () {
      const { mining, admin, attacker } = await loadFixture(deployFixture);
      await expect(mining.connect(attacker).setTierThresholds(usd(50), usd(500)))
        .to.be.revertedWithCustomError(mining, "AccessControlUnauthorizedAccount");

      await expect(mining.connect(admin).setTierThresholds(usd(50), usd(500)))
        .to.emit(mining, "TierThresholdsChanged").withArgs(usd(100), usd(1000), usd(50), usd(500));
      expect(await mining.tierBronze()).to.equal(usd(50));
      expect(await mining.tierSilver()).to.equal(usd(500));
    });

    it("setTierThresholds: rejects zero bronze, bronze >= silver", async function () {
      const { mining, admin } = await loadFixture(deployFixture);
      await expect(mining.connect(admin).setTierThresholds(0, usd(500)))
        .to.be.revertedWithCustomError(mining, "InvalidTierThresholds");
      await expect(mining.connect(admin).setTierThresholds(usd(100), usd(100)))
        .to.be.revertedWithCustomError(mining, "InvalidTierThresholds");
      await expect(mining.connect(admin).setTierThresholds(usd(500), usd(100)))
        .to.be.revertedWithCustomError(mining, "InvalidTierThresholds");
    });
  });
});
