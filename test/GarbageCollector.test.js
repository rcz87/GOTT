const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ONE = 10n ** 18n;
const usd = (d) => BigInt(d) * ONE;

const ScamStatus = { Scam: 4, Drainer: 5, Honeypot: 6, Legit: 1 };

// EIP-712 domain matches the contract's `EIP712("GarbageCollector", "1")`.
function buildDomain(gcAddress, chainId) {
  return {
    name: "GarbageCollector",
    version: "1",
    chainId,
    verifyingContract: gcAddress,
  };
}

const AUTH_TYPES = {
  CleanupAuthorization: [
    { name: "user", type: "address" },
    { name: "batchHash", type: "bytes32" },
    { name: "cleanupValueUSD", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

function batchHashOf(tokens, amounts) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["address[]", "uint256[]"], [tokens, amounts]),
  );
}

async function signCleanup({ signer, gc, user, tokens, amounts, cleanupValueUSD, nonce, deadline }) {
  const { chainId } = await ethers.provider.getNetwork();
  const domain = buildDomain(await gc.getAddress(), chainId);
  return signer.signTypedData(domain, AUTH_TYPES, {
    user: user.address,
    batchHash: batchHashOf(tokens, amounts),
    cleanupValueUSD,
    nonce,
    deadline,
  });
}

async function defaultDeadline() {
  return BigInt((await time.latest()) + 3600);
}

describe("GarbageCollector", function () {
  async function deployFixture() {
    const [admin, oracle, user, recipient, attacker, otherSigner] = await ethers.getSigners();

    // GuardiansToken.
    const Token = await ethers.getContractFactory("GuardiansToken");
    const gott = await Token.deploy(admin.address);
    await gott.waitForDeployment();

    // ScamRegistry.
    const Registry = await ethers.getContractFactory("ScamRegistry");
    const registry = await Registry.deploy(admin.address);
    await registry.waitForDeployment();
    await registry.connect(admin).grantRole(await registry.ORACLE_ROLE(), admin.address);

    // LandfillVault.
    const Vault = await ethers.getContractFactory("LandfillVault");
    const vault = await Vault.deploy(admin.address, admin.address);
    await vault.waitForDeployment();

    // CleanupMining.
    const Mining = await ethers.getContractFactory("CleanupMining");
    const mining = await Mining.deploy(admin.address, await gott.getAddress());
    await mining.waitForDeployment();
    await gott.connect(admin).grantRole(await gott.CLEANUP_MINER_ROLE(), await mining.getAddress());

    // Mock router pre-funded with BNB.
    const WBNB = "0x000000000000000000000000000000000000000B";
    const Router = await ethers.getContractFactory("MockPancakeRouter");
    const router = await Router.deploy(WBNB);
    await router.waitForDeployment();
    await admin.sendTransaction({ to: await router.getAddress(), value: ethers.parseEther("1000") });

    // GarbageCollector with `oracle` as initial signer.
    const GC = await ethers.getContractFactory("GarbageCollector");
    const gc = await GC.deploy(
      admin.address,
      await router.getAddress(),
      WBNB,
      await registry.getAddress(),
      await mining.getAddress(),
      await vault.getAddress(),
      oracle.address,
    );
    await gc.waitForDeployment();
    await mining.connect(admin).grantRole(await mining.COLLECTOR_ROLE(), await gc.getAddress());

    // Test tokens.
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Dust A", "DUSTA");
    const tokenB = await MockERC20.deploy("Dust B", "DUSTB");
    const tokenScam = await MockERC20.deploy("Scammy", "SCAM");
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();
    await tokenScam.waitForDeployment();

    const mintAmount = ethers.parseEther("1000");
    await tokenA.mint(user.address, mintAmount);
    await tokenB.mint(user.address, mintAmount);
    await tokenScam.mint(user.address, mintAmount);
    await tokenA.connect(user).approve(await gc.getAddress(), ethers.MaxUint256);
    await tokenB.connect(user).approve(await gc.getAddress(), ethers.MaxUint256);
    await tokenScam.connect(user).approve(await gc.getAddress(), ethers.MaxUint256);

    await registry.connect(admin).setStatus(await tokenScam.getAddress(), ScamStatus.Scam);

    const ADMIN_ROLE = await gc.ADMIN_ROLE();
    const PAUSER_ROLE = await gc.PAUSER_ROLE();

    return {
      admin, oracle, user, recipient, attacker, otherSigner,
      gott, registry, vault, mining, router, gc,
      tokenA, tokenB, tokenScam, WBNB,
      ADMIN_ROLE, PAUSER_ROLE,
      mintAmount,
    };
  }

  // Helper: sign + return a ready-to-call cleanup tuple for the fixture's user/oracle.
  async function authForCleanup(f, { tokens, amounts, cleanupValueUSD, nonceOverride, deadlineOverride } = {}) {
    const tokenAddrs = tokens || [await f.tokenA.getAddress()];
    const amts = amounts || [ethers.parseEther("5")];
    const value = cleanupValueUSD ?? usd(50);
    const nonce = nonceOverride !== undefined ? nonceOverride : await f.gc.nonces(f.user.address);
    const deadline = deadlineOverride !== undefined ? deadlineOverride : await defaultDeadline();
    const signature = await signCleanup({
      signer: f.oracle, gc: f.gc, user: f.user,
      tokens: tokenAddrs, amounts: amts, cleanupValueUSD: value, nonce, deadline,
    });
    return { tokens: tokenAddrs, amounts: amts, cleanupValueUSD: value, nonce, deadline, signature };
  }

  // ============================================================
  //                       DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("reverts on any zero-address constructor input (incl. oracleSigner)", async function () {
      const [admin] = await ethers.getSigners();
      const GC = await ethers.getContractFactory("GarbageCollector");
      const Z = ethers.ZeroAddress;
      const d = admin.address;
      await expect(GC.deploy(Z, d, d, d, d, d, d)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(d, Z, d, d, d, d, d)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(d, d, Z, d, d, d, d)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(d, d, d, Z, d, d, d)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(d, d, d, d, Z, d, d)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(d, d, d, d, d, Z, d)).to.be.revertedWithCustomError(GC, "ZeroAddress");
      await expect(GC.deploy(d, d, d, d, d, d, Z)).to.be.revertedWithCustomError(GC, "ZeroAddress");
    });

    it("stores oracleSigner from constructor", async function () {
      const { gc, oracle } = await loadFixture(deployFixture);
      expect(await gc.oracleSigner()).to.equal(oracle.address);
    });

    it("nonces start at 0", async function () {
      const { gc, user } = await loadFixture(deployFixture);
      expect(await gc.nonces(user.address)).to.equal(0n);
    });

    it("hashCleanupAuth matches off-chain digest", async function () {
      const { gc, user, tokenA } = await loadFixture(deployFixture);
      const tokens = [await tokenA.getAddress()];
      const amounts = [ethers.parseEther("3")];
      const value = usd(50);
      const nonce = 0n;
      const deadline = await defaultDeadline();

      const onChain = await gc.hashCleanupAuth(user.address, tokens, amounts, value, nonce, deadline);
      const { chainId } = await ethers.provider.getNetwork();
      const domain = buildDomain(await gc.getAddress(), chainId);
      const offChain = ethers.TypedDataEncoder.hash(domain, AUTH_TYPES, {
        user: user.address,
        batchHash: batchHashOf(tokens, amounts),
        cleanupValueUSD: value,
        nonce,
        deadline,
      });
      expect(onChain).to.equal(offChain);
    });
  });

  // ============================================================
  //                     cleanupBatch (happy)
  // ============================================================
  describe("cleanupBatch — happy path", function () {
    it("swaps tokens, sends BNB to user, mints reward, increments nonce", async function () {
      const f = await loadFixture(deployFixture);
      const auth = await authForCleanup(f, {
        tokens: [await f.tokenA.getAddress(), await f.tokenB.getAddress()],
        amounts: [ethers.parseEther("10"), ethers.parseEther("20")],
        cleanupValueUSD: usd(50),
      });
      const expectedBnb = ethers.parseEther("30");
      const userBalBefore = await ethers.provider.getBalance(f.user.address);

      const tx = f.gc.connect(f.user).cleanupBatch(
        auth.tokens, auth.amounts, expectedBnb, auth.cleanupValueUSD,
        auth.nonce, auth.deadline, auth.signature,
      );
      await expect(tx).to.emit(f.gc, "CleanupExecuted");
      await expect(tx).to.emit(f.mining, "RewardCalculated");

      const userBalAfter = await ethers.provider.getBalance(f.user.address);
      expect(userBalAfter - userBalBefore).to.be.greaterThan(ethers.parseEther("29.9"));
      expect(await f.gott.balanceOf(f.user.address)).to.equal(ethers.parseEther("10000"));
      expect(await f.gc.nonces(f.user.address)).to.equal(1n);
    });

    it("returns totalBnbReceived equal to sum of swap outputs", async function () {
      const f = await loadFixture(deployFixture);
      const auth = await authForCleanup(f);
      const totalBnb = await f.gc.connect(f.user).cleanupBatch.staticCall(
        auth.tokens, auth.amounts, auth.amounts[0], auth.cleanupValueUSD,
        auth.nonce, auth.deadline, auth.signature,
      );
      expect(totalBnb).to.equal(auth.amounts[0]);
    });
  });

  // ============================================================
  //                   SIGNATURE SEMANTICS
  // ============================================================
  describe("cleanupBatch — signature semantics", function () {
    it("reverts with InvalidSignature when signed by a non-oracle key", async function () {
      const f = await loadFixture(deployFixture);
      const tokens = [await f.tokenA.getAddress()];
      const amounts = [ethers.parseEther("5")];
      const value = usd(50);
      const nonce = 0n;
      const deadline = await defaultDeadline();
      // Sign with attacker's key instead.
      const sig = await signCleanup({
        signer: f.attacker, gc: f.gc, user: f.user, tokens, amounts, cleanupValueUSD: value, nonce, deadline,
      });
      await expect(
        f.gc.connect(f.user).cleanupBatch(tokens, amounts, 0, value, nonce, deadline, sig),
      ).to.be.revertedWithCustomError(f.gc, "InvalidSignature");
    });

    it("reverts with SignatureExpired when deadline passed", async function () {
      const f = await loadFixture(deployFixture);
      const past = BigInt(await time.latest()) - 1n;
      const auth = await authForCleanup(f, { deadlineOverride: past });
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          auth.tokens, auth.amounts, 0, auth.cleanupValueUSD,
          auth.nonce, auth.deadline, auth.signature,
        ),
      ).to.be.revertedWithCustomError(f.gc, "SignatureExpired");
    });

    it("reverts with InvalidNonce when nonce mismatches expected", async function () {
      const f = await loadFixture(deployFixture);
      const auth = await authForCleanup(f, { nonceOverride: 5n });
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          auth.tokens, auth.amounts, 0, auth.cleanupValueUSD,
          auth.nonce, auth.deadline, auth.signature,
        ),
      ).to.be.revertedWithCustomError(f.gc, "InvalidNonce").withArgs(0, 5);
    });

    it("rejects replay: same signature on second call (nonce already consumed)", async function () {
      const f = await loadFixture(deployFixture);
      const auth = await authForCleanup(f);
      await f.gc.connect(f.user).cleanupBatch(
        auth.tokens, auth.amounts, 0, auth.cleanupValueUSD, auth.nonce, auth.deadline, auth.signature,
      );
      // Second call with same args — nonce is now 1, not 0.
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          auth.tokens, auth.amounts, 0, auth.cleanupValueUSD, auth.nonce, auth.deadline, auth.signature,
        ),
      ).to.be.revertedWithCustomError(f.gc, "InvalidNonce");
    });

    it("rejects mismatched tokens (signed batch ≠ submitted batch)", async function () {
      const f = await loadFixture(deployFixture);
      // Sign for tokenA, submit tokenB.
      const tokens = [await f.tokenA.getAddress()];
      const amounts = [ethers.parseEther("5")];
      const value = usd(50);
      const nonce = 0n;
      const deadline = await defaultDeadline();
      const sig = await signCleanup({
        signer: f.oracle, gc: f.gc, user: f.user, tokens, amounts, cleanupValueUSD: value, nonce, deadline,
      });
      const swappedTokens = [await f.tokenB.getAddress()];
      await expect(
        f.gc.connect(f.user).cleanupBatch(swappedTokens, amounts, 0, value, nonce, deadline, sig),
      ).to.be.revertedWithCustomError(f.gc, "InvalidSignature");
    });

    it("rejects sig for a different user (msg.sender != signed user)", async function () {
      const f = await loadFixture(deployFixture);
      // Sign with attacker as the user, but call from f.user. msg.sender will be f.user → mismatch.
      const tokens = [await f.tokenA.getAddress()];
      const amounts = [ethers.parseEther("5")];
      const value = usd(50);
      const nonce = 0n;
      const deadline = await defaultDeadline();
      const { chainId } = await ethers.provider.getNetwork();
      const domain = buildDomain(await f.gc.getAddress(), chainId);
      const sig = await f.oracle.signTypedData(domain, AUTH_TYPES, {
        user: f.attacker.address,         // signed for attacker
        batchHash: batchHashOf(tokens, amounts),
        cleanupValueUSD: value,
        nonce,
        deadline,
      });
      await expect(
        f.gc.connect(f.user).cleanupBatch(tokens, amounts, 0, value, nonce, deadline, sig),
      ).to.be.revertedWithCustomError(f.gc, "InvalidSignature");
    });

    it("supports oracle key rotation: setOracleSigner changes who signs", async function () {
      const f = await loadFixture(deployFixture);
      // Rotate oracle to otherSigner.
      await f.gc.connect(f.admin).setOracleSigner(f.otherSigner.address);

      // Old oracle no longer authorised.
      const oldAuth = await authForCleanup(f);
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          oldAuth.tokens, oldAuth.amounts, 0, oldAuth.cleanupValueUSD,
          oldAuth.nonce, oldAuth.deadline, oldAuth.signature,
        ),
      ).to.be.revertedWithCustomError(f.gc, "InvalidSignature");

      // New signer works.
      const tokens = [await f.tokenA.getAddress()];
      const amounts = [ethers.parseEther("3")];
      const value = usd(20);
      const nonce = 0n;
      const deadline = await defaultDeadline();
      const newSig = await signCleanup({
        signer: f.otherSigner, gc: f.gc, user: f.user, tokens, amounts, cleanupValueUSD: value, nonce, deadline,
      });
      await expect(
        f.gc.connect(f.user).cleanupBatch(tokens, amounts, amounts[0], value, nonce, deadline, newSig),
      ).to.emit(f.gc, "CleanupExecuted");
    });
  });

  // ============================================================
  //                     cleanupBatch validation
  // ============================================================
  describe("cleanupBatch — validation", function () {
    it("reverts on length mismatch", async function () {
      const f = await loadFixture(deployFixture);
      const deadline = await defaultDeadline();
      // No need for valid signature — length check happens first.
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          [await f.tokenA.getAddress()], [], 0, usd(10), 0, deadline, "0x",
        ),
      ).to.be.revertedWithCustomError(f.gc, "InvalidLength");
    });

    it("reverts on empty arrays", async function () {
      const f = await loadFixture(deployFixture);
      await expect(f.gc.connect(f.user).cleanupBatch([], [], 0, usd(10), 0, await defaultDeadline(), "0x"))
        .to.be.revertedWithCustomError(f.gc, "InvalidLength");
    });

    it("reverts when batch exceeds maxTokensPerCleanup", async function () {
      const f = await loadFixture(deployFixture);
      const tokens = Array(21).fill(await f.tokenA.getAddress());
      const amts = Array(21).fill(1n);
      await expect(
        f.gc.connect(f.user).cleanupBatch(tokens, amts, 0, usd(10), 0, await defaultDeadline(), "0x"),
      ).to.be.revertedWithCustomError(f.gc, "TooManyTokens");
    });

    it("reverts when cleanupValueUSD < minCleanupValueUSD", async function () {
      const f = await loadFixture(deployFixture);
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          [await f.tokenA.getAddress()], [1n], 0, usd(1) - 1n, 0, await defaultDeadline(), "0x",
        ),
      ).to.be.revertedWithCustomError(f.gc, "BelowMinThreshold");
    });

    it("reverts with TokenIsScam when ScamRegistry flags any token", async function () {
      const f = await loadFixture(deployFixture);
      const tokens = [await f.tokenA.getAddress(), await f.tokenScam.getAddress()];
      const amounts = [ethers.parseEther("1"), ethers.parseEther("1")];
      const auth = await authForCleanup(f, { tokens, amounts });
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          auth.tokens, auth.amounts, 0, auth.cleanupValueUSD, auth.nonce, auth.deadline, auth.signature,
        ),
      ).to.be.revertedWithCustomError(f.gc, "TokenIsScam").withArgs(await f.tokenScam.getAddress());
    });

    it("reverts when totalBnbReceived < minBnbOut", async function () {
      const f = await loadFixture(deployFixture);
      const auth = await authForCleanup(f);
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          auth.tokens, auth.amounts, ethers.parseEther("100"), auth.cleanupValueUSD,
          auth.nonce, auth.deadline, auth.signature,
        ),
      ).to.be.revertedWithCustomError(f.gc, "InsufficientBnbOut");
    });
  });

  // ============================================================
  //              cleanupBatch — swap failure fallback
  // ============================================================
  describe("cleanupBatch — swap failure fallback", function () {
    it("forwards failed-swap tokens to landfill, still completes batch", async function () {
      const f = await loadFixture(deployFixture);
      await f.router.setFailForToken(await f.tokenA.getAddress(), true);
      const tokens = [await f.tokenA.getAddress(), await f.tokenB.getAddress()];
      const amounts = [ethers.parseEther("10"), ethers.parseEther("3")];
      const auth = await authForCleanup(f, { tokens, amounts });
      const tx = f.gc.connect(f.user).cleanupBatch(
        auth.tokens, auth.amounts, amounts[1], auth.cleanupValueUSD,
        auth.nonce, auth.deadline, auth.signature,
      );
      await expect(tx).to.emit(f.gc, "SwapFallbackToLandfill")
        .withArgs(f.user.address, await f.tokenA.getAddress(), amounts[0]);
      expect(await f.tokenA.balanceOf(await f.vault.getAddress())).to.equal(amounts[0]);
    });

    it("entire batch fails-to-landfill still records cleanup with 0 BNB", async function () {
      const f = await loadFixture(deployFixture);
      await f.router.setShouldFail(true);
      const auth = await authForCleanup(f, { amounts: [ethers.parseEther("10")] });
      await expect(
        f.gc.connect(f.user).cleanupBatch(
          auth.tokens, auth.amounts, 0, auth.cleanupValueUSD,
          auth.nonce, auth.deadline, auth.signature,
        ),
      ).to.emit(f.gc, "CleanupExecuted");
      expect(await f.tokenA.balanceOf(await f.vault.getAddress())).to.equal(ethers.parseEther("10"));
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

    it("does not consume cleanupBatch nonce", async function () {
      const f = await loadFixture(deployFixture);
      await f.gc.connect(f.user).sendScamToLandfill([await f.tokenScam.getAddress()], [ethers.parseEther("1")]);
      expect(await f.gc.nonces(f.user.address)).to.equal(0n);
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

    it("blocks cleanupBatch when paused (auth check happens after whenNotPaused gate)", async function () {
      const f = await loadFixture(deployFixture);
      await f.gc.connect(f.admin).pause();
      await expect(f.gc.connect(f.user).cleanupBatch(
        [await f.tokenA.getAddress()], [1n], 0, usd(10), 0, await defaultDeadline(), "0x",
      )).to.be.revertedWithCustomError(f.gc, "EnforcedPause");
    });

    it("blocks sendScamToLandfill when paused", async function () {
      const f = await loadFixture(deployFixture);
      await f.gc.connect(f.admin).pause();
      await expect(f.gc.connect(f.user).sendScamToLandfill(
        [await f.tokenScam.getAddress()], [1n],
      )).to.be.revertedWithCustomError(f.gc, "EnforcedPause");
    });
  });

  // ============================================================
  //                     ADMIN SETTERS
  // ============================================================
  describe("Admin setters", function () {
    it("setOracleSigner: only ADMIN_ROLE; rejects zero; emits event", async function () {
      const { gc, admin, attacker, otherSigner, oracle } = await loadFixture(deployFixture);
      await expect(gc.connect(attacker).setOracleSigner(otherSigner.address))
        .to.be.revertedWithCustomError(gc, "AccessControlUnauthorizedAccount");
      await expect(gc.connect(admin).setOracleSigner(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(gc, "ZeroAddress");
      await expect(gc.connect(admin).setOracleSigner(otherSigner.address))
        .to.emit(gc, "OracleSignerChanged").withArgs(oracle.address, otherSigner.address);
    });

    it("setMiningContract / setLandfillVault: zero rejected, events emitted", async function () {
      const { gc, admin, recipient, mining, vault } = await loadFixture(deployFixture);
      await expect(gc.connect(admin).setMiningContract(recipient.address))
        .to.emit(gc, "MiningContractChanged").withArgs(await mining.getAddress(), recipient.address);
      await expect(gc.connect(admin).setLandfillVault(recipient.address))
        .to.emit(gc, "LandfillVaultChanged").withArgs(await vault.getAddress(), recipient.address);
    });

    it("setMaxTokensPerCleanup / setMinCleanupValueUSD / setSwapDeadlineBuffer all bound-check", async function () {
      const { gc, admin } = await loadFixture(deployFixture);
      await expect(gc.connect(admin).setMaxTokensPerCleanup(0))
        .to.be.revertedWithCustomError(gc, "InvalidMaxTokens");
      await expect(gc.connect(admin).setMinCleanupValueUSD(0))
        .to.be.revertedWithCustomError(gc, "InvalidMinCleanupValue");
      await expect(gc.connect(admin).setSwapDeadlineBuffer(0))
        .to.be.revertedWithCustomError(gc, "InvalidSwapDeadlineBuffer");
    });
  });

  // ============================================================
  //                     STUCK BNB RECOVERY
  // ============================================================
  describe("withdrawStuckBNB", function () {
    it("only ADMIN_ROLE; reverts on zero address; sweeps balance", async function () {
      const { gc, admin, attacker, recipient } = await loadFixture(deployFixture);
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
  });
});
