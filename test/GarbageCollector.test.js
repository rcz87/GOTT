const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ONE = 10n ** 18n;
const usd = (d) => BigInt(d) * ONE;

const ScamStatus = { Scam: 4, Drainer: 5, Honeypot: 6, Legit: 1 };

describe("GarbageCollector", function () {
  async function deployFixture() {
    const [admin, user, recipient, attacker] = await ethers.getSigners();

    // Token (real GuardiansToken).
    const Token = await ethers.getContractFactory("GuardiansToken");
    const gott = await Token.deploy(admin.address);
    await gott.waitForDeployment();

    // ScamRegistry.
    const Registry = await ethers.getContractFactory("ScamRegistry");
    const registry = await Registry.deploy(admin.address);
    await registry.waitForDeployment();
    await registry.connect(admin).grantRole(await registry.ORACLE_ROLE(), admin.address);

    // LandfillVault (admin == dao for simplicity).
    const Vault = await ethers.getContractFactory("LandfillVault");
    const vault = await Vault.deploy(admin.address, admin.address);
    await vault.waitForDeployment();

    // CleanupMining.
    const Mining = await ethers.getContractFactory("CleanupMining");
    const mining = await Mining.deploy(admin.address, await gott.getAddress());
    await mining.waitForDeployment();
    await gott.connect(admin).grantRole(await gott.CLEANUP_MINER_ROLE(), await mining.getAddress());

    // Mock router (uses a placeholder WBNB address — only checked for path).
    const WBNB = "0x000000000000000000000000000000000000000B";
    const Router = await ethers.getContractFactory("MockPancakeRouter");
    const router = await Router.deploy(WBNB);
    await router.waitForDeployment();
    // Pre-fund router with 1000 BNB so it can pay swaps.
    await admin.sendTransaction({ to: await router.getAddress(), value: ethers.parseEther("1000") });

    // GarbageCollector.
    const GC = await ethers.getContractFactory("GarbageCollector");
    const gc = await GC.deploy(
      admin.address,
      await router.getAddress(),
      WBNB,
      await registry.getAddress(),
      await mining.getAddress(),
      await vault.getAddress(),
    );
    await gc.waitForDeployment();
    // Wire COLLECTOR_ROLE on mining → gc.
    await mining.connect(admin).grantRole(await mining.COLLECTOR_ROLE(), await gc.getAddress());

    // Two test tokens.
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Dust A", "DUSTA");
    const tokenB = await MockERC20.deploy("Dust B", "DUSTB");
    const tokenScam = await MockERC20.deploy("Scammy", "SCAM");
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();
    await tokenScam.waitForDeployment();

    // Mint to user and pre-approve gc.
    const mintAmount = ethers.parseEther("1000");
    await tokenA.mint(user.address, mintAmount);
    await tokenB.mint(user.address, mintAmount);
    await tokenScam.mint(user.address, mintAmount);
    await tokenA.connect(user).approve(await gc.getAddress(), ethers.MaxUint256);
    await tokenB.connect(user).approve(await gc.getAddress(), ethers.MaxUint256);
    await tokenScam.connect(user).approve(await gc.getAddress(), ethers.MaxUint256);

    // Mark scam token in registry.
    await registry.connect(admin).setStatus(await tokenScam.getAddress(), ScamStatus.Scam);

    const ADMIN_ROLE = await gc.ADMIN_ROLE();
    const PAUSER_ROLE = await gc.PAUSER_ROLE();

    return {
      admin, user, recipient, attacker,
      gott, registry, vault, mining, router, gc,
      tokenA, tokenB, tokenScam, WBNB,
      ADMIN_ROLE, PAUSER_ROLE,
      mintAmount,
    };
  }

  // ============================================================
  //                       DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("reverts on any zero-address constructor input", async function () {
      const [admin] = await ethers.getSigners();
      const GC = await ethers.getContractFactory("GarbageCollector");
      const Z = ethers.ZeroAddress;
      const dummy = admin.address;
      // Cycle each slot through ZeroAddress.
      await expect(GC.deploy(Z, dummy, dummy, dummy, dummy, dummy)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(dummy, Z, dummy, dummy, dummy, dummy)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(dummy, dummy, Z, dummy, dummy, dummy)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(dummy, dummy, dummy, Z, dummy, dummy)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(dummy, dummy, dummy, dummy, Z, dummy)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(dummy, dummy, dummy, dummy, dummy, Z)).to.be.revertedWithCustomError(GC, "ZeroAddress");
    });

    it("grants ADMIN, PAUSER, DEFAULT_ADMIN to admin", async function () {
      const { gc, admin, ADMIN_ROLE, PAUSER_ROLE } = await loadFixture(deployFixture);
      expect(await gc.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await gc.hasRole(PAUSER_ROLE, admin.address)).to.equal(true);
      expect(await gc.hasRole(await gc.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
    });

    it("initial config + immutables", async function () {
      const { gc, router, registry, mining, vault, WBNB } = await loadFixture(deployFixture);
      expect(await gc.maxTokensPerCleanup()).to.equal(20n);
      expect(await gc.swapDeadlineBuffer()).to.equal(600n);
      expect(await gc.minCleanupValueUSD()).to.equal(usd(1));
      expect(await gc.MAX_TOKENS_HARD_CAP()).to.equal(50n);
      expect(await gc.router()).to.equal(await router.getAddress());
      expect(await gc.scamRegistry()).to.equal(await registry.getAddress());
      expect(await gc.miningContract()).to.equal(await mining.getAddress());
      expect(await gc.landfillVault()).to.equal(await vault.getAddress());
      expect(await gc.WBNB()).to.equal(ethers.getAddress(WBNB));
    });
  });

  // ============================================================
  //                     cleanupBatch (happy)
  // ============================================================
  describe("cleanupBatch — happy path", function () {
    it("swaps tokens, sends BNB to user, emits CleanupExecuted, mints reward via mining", async function () {
      const { gc, gott, mining, user, tokenA, tokenB } = await loadFixture(deployFixture);
      const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];
      const expectedBnb = ethers.parseEther("30"); // 1:1 rate
      const cleanupValueUSD = usd(50);

      const userBalBefore = await ethers.provider.getBalance(user.address);

      const tx = gc.connect(user).cleanupBatch(
        [await tokenA.getAddress(), await tokenB.getAddress()],
        amounts,
        expectedBnb,
        cleanupValueUSD,
      );

      await expect(tx).to.emit(gc, "CleanupExecuted");
      await expect(tx).to.emit(mining, "RewardCalculated");

      const userBalAfter = await ethers.provider.getBalance(user.address);
      // User receives 30 BNB minus gas — should be ≥ ~29.99 BNB delta.
      expect(userBalAfter - userBalBefore).to.be.greaterThan(ethers.parseEther("29.9"));

      // Mining should have minted reward to user (first cleanup, $50, tier 2x, epoch 1x):
      // 100 × 50 × 2 × 1 = 10,000 GOTT.
      expect(await gott.balanceOf(user.address)).to.equal(ethers.parseEther("10000"));
    });

    it("returns totalBnbReceived equal to sum of swap outputs", async function () {
      const { gc, user, tokenA } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("5");
      const totalBnb = await gc.connect(user).cleanupBatch.staticCall(
        [await tokenA.getAddress()], [amount], amount, usd(10),
      );
      expect(totalBnb).to.equal(amount);
    });
  });

  // ============================================================
  //                     cleanupBatch validation
  // ============================================================
  describe("cleanupBatch — validation", function () {
    it("reverts on length mismatch", async function () {
      const { gc, user, tokenA } = await loadFixture(deployFixture);
      await expect(
        gc.connect(user).cleanupBatch([await tokenA.getAddress()], [], 0, usd(10)),
      ).to.be.revertedWithCustomError(gc, "InvalidLength");
    });

    it("reverts on empty arrays", async function () {
      const { gc, user } = await loadFixture(deployFixture);
      await expect(gc.connect(user).cleanupBatch([], [], 0, usd(10)))
        .to.be.revertedWithCustomError(gc, "InvalidLength");
    });

    it("reverts when batch exceeds maxTokensPerCleanup", async function () {
      const { gc, user, tokenA } = await loadFixture(deployFixture);
      const tokens = Array(21).fill(await tokenA.getAddress());
      const amts = Array(21).fill(1n);
      await expect(gc.connect(user).cleanupBatch(tokens, amts, 0, usd(10)))
        .to.be.revertedWithCustomError(gc, "TooManyTokens");
    });

    it("reverts when cleanupValueUSD < minCleanupValueUSD", async function () {
      const { gc, user, tokenA } = await loadFixture(deployFixture);
      await expect(gc.connect(user).cleanupBatch([await tokenA.getAddress()], [1n], 0, usd(1) - 1n))
        .to.be.revertedWithCustomError(gc, "BelowMinThreshold");
    });

    it("reverts with TokenIsScam when ScamRegistry flags any token", async function () {
      const { gc, user, tokenA, tokenScam } = await loadFixture(deployFixture);
      await expect(
        gc.connect(user).cleanupBatch(
          [await tokenA.getAddress(), await tokenScam.getAddress()],
          [ethers.parseEther("1"), ethers.parseEther("1")],
          0, usd(10),
        ),
      ).to.be.revertedWithCustomError(gc, "TokenIsScam").withArgs(await tokenScam.getAddress());
    });

    it("reverts when totalBnbReceived < minBnbOut", async function () {
      const { gc, user, tokenA } = await loadFixture(deployFixture);
      await expect(
        gc.connect(user).cleanupBatch(
          [await tokenA.getAddress()],
          [ethers.parseEther("5")],
          ethers.parseEther("100"), // way more than 5 BNB output
          usd(10),
        ),
      ).to.be.revertedWithCustomError(gc, "InsufficientBnbOut");
    });
  });

  // ============================================================
  //              cleanupBatch — swap failure fallback
  // ============================================================
  describe("cleanupBatch — swap failure fallback", function () {
    it("forwards failed-swap tokens to landfill, still completes batch", async function () {
      const { gc, vault, router, user, tokenA, tokenB } = await loadFixture(deployFixture);
      // Make tokenA's swap fail; tokenB still swaps normally.
      await router.setFailForToken(await tokenA.getAddress(), true);

      const amtA = ethers.parseEther("10");
      const amtB = ethers.parseEther("3");

      const tx = gc.connect(user).cleanupBatch(
        [await tokenA.getAddress(), await tokenB.getAddress()],
        [amtA, amtB],
        amtB, // only B's output expected
        usd(50),
      );

      await expect(tx).to.emit(gc, "SwapFallbackToLandfill").withArgs(user.address, await tokenA.getAddress(), amtA);

      // tokenA ended up in vault.
      expect(await tokenA.balanceOf(await vault.getAddress())).to.equal(amtA);
      // gc holds none of tokenA.
      expect(await tokenA.balanceOf(await gc.getAddress())).to.equal(0n);
    });

    it("entire batch fails-to-landfill still records cleanup with 0 BNB", async function () {
      const { gc, vault, router, user, tokenA } = await loadFixture(deployFixture);
      await router.setShouldFail(true);

      const tx = gc.connect(user).cleanupBatch(
        [await tokenA.getAddress()],
        [ethers.parseEther("10")],
        0, // no BNB expected
        usd(10),
      );
      await expect(tx).to.emit(gc, "CleanupExecuted");
      expect(await tokenA.balanceOf(await vault.getAddress())).to.equal(ethers.parseEther("10"));
    });
  });

  // ============================================================
  //                  sendScamToLandfill
  // ============================================================
  describe("sendScamToLandfill", function () {
    it("transfers tokens to vault and emits ScamTokenSent", async function () {
      const { gc, vault, user, tokenScam } = await loadFixture(deployFixture);
      const amt = ethers.parseEther("100");
      const tx = gc.connect(user).sendScamToLandfill([await tokenScam.getAddress()], [amt]);
      await expect(tx).to.emit(gc, "ScamTokenSent").withArgs(user.address, await tokenScam.getAddress(), amt);
      expect(await tokenScam.balanceOf(await vault.getAddress())).to.equal(amt);
    });

    it("does NOT trigger reward (no recordCleanup)", async function () {
      const { gc, gott, mining, user, tokenScam } = await loadFixture(deployFixture);
      await gc.connect(user).sendScamToLandfill([await tokenScam.getAddress()], [ethers.parseEther("10")]);
      expect(await gott.balanceOf(user.address)).to.equal(0n);
      expect(await mining.totalCleanupsExecuted()).to.equal(0n);
    });

    it("reverts on length mismatch / empty", async function () {
      const { gc, user, tokenScam } = await loadFixture(deployFixture);
      await expect(gc.connect(user).sendScamToLandfill([await tokenScam.getAddress()], []))
        .to.be.revertedWithCustomError(gc, "InvalidLength");
      await expect(gc.connect(user).sendScamToLandfill([], []))
        .to.be.revertedWithCustomError(gc, "InvalidLength");
    });

    it("accepts non-scam tokens too (no registry check on this path)", async function () {
      // Per design: this path doesn't validate against ScamRegistry — caller's choice.
      const { gc, vault, user, tokenA } = await loadFixture(deployFixture);
      await gc.connect(user).sendScamToLandfill([await tokenA.getAddress()], [ethers.parseEther("5")]);
      expect(await tokenA.balanceOf(await vault.getAddress())).to.equal(ethers.parseEther("5"));
    });
  });

  // ============================================================
  //                          PAUSE
  // ============================================================
  describe("Pause", function () {
    it("only PAUSER_ROLE can pause/unpause", async function () {
      const { gc, attacker } = await loadFixture(deployFixture);
      await expect(gc.connect(attacker).pause())
        .to.be.revertedWithCustomError(gc, "AccessControlUnauthorizedAccount");
    });

    it("blocks cleanupBatch and sendScamToLandfill when paused", async function () {
      const { gc, admin, user, tokenA, tokenScam } = await loadFixture(deployFixture);
      await gc.connect(admin).pause();
      await expect(gc.connect(user).cleanupBatch([await tokenA.getAddress()], [1n], 0, usd(10)))
        .to.be.revertedWithCustomError(gc, "EnforcedPause");
      await expect(gc.connect(user).sendScamToLandfill([await tokenScam.getAddress()], [1n]))
        .to.be.revertedWithCustomError(gc, "EnforcedPause");
    });

    it("resumes after unpause", async function () {
      const { gc, admin, user, tokenA } = await loadFixture(deployFixture);
      await gc.connect(admin).pause();
      await gc.connect(admin).unpause();
      await expect(gc.connect(user).cleanupBatch(
        [await tokenA.getAddress()], [ethers.parseEther("1")], ethers.parseEther("1"), usd(10),
      )).to.emit(gc, "CleanupExecuted");
    });
  });

  // ============================================================
  //                     ADMIN SETTERS
  // ============================================================
  describe("Admin setters", function () {
    it("setMiningContract: only ADMIN_ROLE; rejects zero; emits event", async function () {
      const { gc, admin, attacker, recipient, mining } = await loadFixture(deployFixture);
      await expect(gc.connect(attacker).setMiningContract(recipient.address))
        .to.be.revertedWithCustomError(gc, "AccessControlUnauthorizedAccount");
      await expect(gc.connect(admin).setMiningContract(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(gc, "ZeroAddress");
      await expect(gc.connect(admin).setMiningContract(recipient.address))
        .to.emit(gc, "MiningContractChanged").withArgs(await mining.getAddress(), recipient.address);
    });

    it("setLandfillVault: same pattern", async function () {
      const { gc, admin, recipient, vault } = await loadFixture(deployFixture);
      await expect(gc.connect(admin).setLandfillVault(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(gc, "ZeroAddress");
      await expect(gc.connect(admin).setLandfillVault(recipient.address))
        .to.emit(gc, "LandfillVaultChanged").withArgs(await vault.getAddress(), recipient.address);
    });

    it("setMaxTokensPerCleanup: validates range (1..50)", async function () {
      const { gc, admin } = await loadFixture(deployFixture);
      await expect(gc.connect(admin).setMaxTokensPerCleanup(0))
        .to.be.revertedWithCustomError(gc, "InvalidMaxTokens");
      await expect(gc.connect(admin).setMaxTokensPerCleanup(51))
        .to.be.revertedWithCustomError(gc, "InvalidMaxTokens");
      await expect(gc.connect(admin).setMaxTokensPerCleanup(35))
        .to.emit(gc, "MaxTokensChanged").withArgs(20, 35);
    });

    it("setMinCleanupValueUSD: rejects 0, emits event", async function () {
      const { gc, admin } = await loadFixture(deployFixture);
      await expect(gc.connect(admin).setMinCleanupValueUSD(0))
        .to.be.revertedWithCustomError(gc, "InvalidMinCleanupValue");
      await expect(gc.connect(admin).setMinCleanupValueUSD(usd(5)))
        .to.emit(gc, "MinCleanupValueChanged");
    });

    it("setSwapDeadlineBuffer: rejects 0 and > 1 day", async function () {
      const { gc, admin } = await loadFixture(deployFixture);
      await expect(gc.connect(admin).setSwapDeadlineBuffer(0))
        .to.be.revertedWithCustomError(gc, "InvalidSwapDeadlineBuffer");
      await expect(gc.connect(admin).setSwapDeadlineBuffer(86401))
        .to.be.revertedWithCustomError(gc, "InvalidSwapDeadlineBuffer");
      await expect(gc.connect(admin).setSwapDeadlineBuffer(3600))
        .to.emit(gc, "SwapDeadlineBufferChanged");
    });
  });

  // ============================================================
  //                     STUCK BNB RECOVERY
  // ============================================================
  describe("withdrawStuckBNB", function () {
    it("only ADMIN_ROLE; reverts on zero address; sweeps balance", async function () {
      const { gc, admin, attacker, recipient } = await loadFixture(deployFixture);
      // Donate BNB to gc.
      await admin.sendTransaction({ to: await gc.getAddress(), value: ethers.parseEther("2") });

      await expect(gc.connect(attacker).withdrawStuckBNB(recipient.address))
        .to.be.revertedWithCustomError(gc, "AccessControlUnauthorizedAccount");
      await expect(gc.connect(admin).withdrawStuckBNB(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(gc, "ZeroAddress");

      const before = await ethers.provider.getBalance(recipient.address);
      await expect(gc.connect(admin).withdrawStuckBNB(recipient.address))
        .to.emit(gc, "StuckBNBWithdrawn").withArgs(recipient.address, ethers.parseEther("2"));
      expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + ethers.parseEther("2"));
    });

    it("no-op when balance is zero", async function () {
      const { gc, admin, recipient } = await loadFixture(deployFixture);
      // gc starts with 0 BNB.
      await expect(gc.connect(admin).withdrawStuckBNB(recipient.address)).to.not.be.reverted;
    });
  });
});
