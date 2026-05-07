const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GuardiansToken (GOTT) — v2", function () {
  // ============================================================
  //                      FIXTURES
  // ============================================================

  async function deployFixture() {
    const [owner, lp, marketing, airdrop, user1, user2, miner, attacker] = await ethers.getSigners();
    const GuardiansToken = await ethers.getContractFactory("GuardiansToken");
    const token = await GuardiansToken.deploy(owner.address);
    await token.waitForDeployment();

    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const CLEANUP_MINER_ROLE = await token.CLEANUP_MINER_ROLE();
    const ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

    return {
      token, owner, lp, marketing, airdrop, user1, user2, miner, attacker,
      MINTER_ROLE, PAUSER_ROLE, CLEANUP_MINER_ROLE, ADMIN_ROLE,
    };
  }

  // Distributes 75M according to BLUEPRINT §6.3 split: 25M LP + 25M Marketing + 25M Airdrop.
  async function deployedAndDistributedFixture() {
    const f = await deployFixture();
    const amounts = [
      ethers.parseEther("25000000"),
      ethers.parseEther("25000000"),
      ethers.parseEther("25000000"),
    ];
    await f.token.distributeInitial(
      [f.lp.address, f.marketing.address, f.airdrop.address],
      amounts
    );
    return { ...f, distributedAmounts: amounts };
  }

  async function deployedWithMinerFixture() {
    const f = await deployFixture();
    await f.token.grantRole(f.CLEANUP_MINER_ROLE, f.miner.address);
    return f;
  }

  // ============================================================
  //                     DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("sets correct name and symbol", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("Guardians Token");
      expect(await token.symbol()).to.equal("GOTT");
    });

    it("starts with totalSupply == 0 (constructor mints nothing)", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(0n);
    });

    it("starts with initialized == false", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.initialized()).to.equal(false);
    });

    it("reports full MAX_SUPPLY as mintable", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.mintableSupply()).to.equal(await token.MAX_SUPPLY());
    });

    it("MAX_MINT_PER_DAY equals 1.4M ether", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.MAX_MINT_PER_DAY()).to.equal(ethers.parseEther("1400000"));
    });

    it("grants ADMIN, MINTER, PAUSER roles to initial owner", async function () {
      const { token, owner, MINTER_ROLE, PAUSER_ROLE, ADMIN_ROLE } = await loadFixture(deployFixture);
      expect(await token.hasRole(ADMIN_ROLE, owner.address)).to.equal(true);
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.equal(true);
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.equal(true);
    });

    it("does NOT grant CLEANUP_MINER_ROLE to anyone at deploy", async function () {
      const { token, owner, CLEANUP_MINER_ROLE } = await loadFixture(deployFixture);
      expect(await token.hasRole(CLEANUP_MINER_ROLE, owner.address)).to.equal(false);
    });

    it("reverts when initialOwner is zero address", async function () {
      const GuardiansToken = await ethers.getContractFactory("GuardiansToken");
      await expect(GuardiansToken.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(GuardiansToken, "ZeroAddress");
    });
  });

  // ============================================================
  //                  distributeInitial
  // ============================================================
  describe("distributeInitial", function () {
    it("distributes to multiple recipients in a single TX and flips initialized", async function () {
      const { token, lp, marketing, airdrop } = await loadFixture(deployFixture);
      const amounts = [
        ethers.parseEther("25000000"),
        ethers.parseEther("25000000"),
        ethers.parseEther("25000000"),
      ];
      await token.distributeInitial([lp.address, marketing.address, airdrop.address], amounts);

      expect(await token.balanceOf(lp.address)).to.equal(amounts[0]);
      expect(await token.balanceOf(marketing.address)).to.equal(amounts[1]);
      expect(await token.balanceOf(airdrop.address)).to.equal(amounts[2]);
      expect(await token.totalSupply()).to.equal(ethers.parseEther("75000000"));
      expect(await token.initialized()).to.equal(true);
    });

    it("emits InitialDistributed event", async function () {
      const { token, lp } = await loadFixture(deployFixture);
      const amounts = [ethers.parseEther("100")];
      await expect(token.distributeInitial([lp.address], amounts))
        .to.emit(token, "InitialDistributed");
    });

    it("reverts on second call with AlreadyInitialized", async function () {
      const { token, lp } = await loadFixture(deployedAndDistributedFixture);
      await expect(
        token.distributeInitial([lp.address], [ethers.parseEther("1")])
      ).to.be.revertedWithCustomError(token, "AlreadyInitialized");
    });

    it("reverts on empty arrays with EmptyDistribution", async function () {
      const { token } = await loadFixture(deployFixture);
      await expect(token.distributeInitial([], []))
        .to.be.revertedWithCustomError(token, "EmptyDistribution");
    });

    it("reverts on length mismatch with LengthMismatch", async function () {
      const { token, lp, marketing } = await loadFixture(deployFixture);
      await expect(
        token.distributeInitial([lp.address, marketing.address], [ethers.parseEther("100")])
      ).to.be.revertedWithCustomError(token, "LengthMismatch");
    });

    it("reverts on zero address recipient with ZeroAddress", async function () {
      const { token, lp } = await loadFixture(deployFixture);
      await expect(
        token.distributeInitial(
          [lp.address, ethers.ZeroAddress],
          [ethers.parseEther("1"), ethers.parseEther("1")]
        )
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("reverts when total == 0 (all amounts zero) with ZeroDistributionAmount", async function () {
      const { token, lp, marketing } = await loadFixture(deployFixture);
      await expect(
        token.distributeInitial([lp.address, marketing.address], [0n, 0n])
      ).to.be.revertedWithCustomError(token, "ZeroDistributionAmount");
    });

    it("reverts when total exceeds MAX_SUPPLY with ExceedsMaxSupply", async function () {
      const { token, lp } = await loadFixture(deployFixture);
      const tooMuch = ethers.parseEther("1000000001"); // > 1B
      await expect(token.distributeInitial([lp.address], [tooMuch]))
        .to.be.revertedWithCustomError(token, "ExceedsMaxSupply");
    });

    it("does NOT flip initialized if validation fails", async function () {
      const { token, lp } = await loadFixture(deployFixture);
      await expect(token.distributeInitial([lp.address], [0n]))
        .to.be.revertedWithCustomError(token, "ZeroDistributionAmount");
      expect(await token.initialized()).to.equal(false);
      // Retry with valid input still works
      await token.distributeInitial([lp.address], [ethers.parseEther("100")]);
      expect(await token.initialized()).to.equal(true);
    });

    it("only DEFAULT_ADMIN_ROLE can call", async function () {
      const { token, attacker, lp } = await loadFixture(deployFixture);
      await expect(
        token.connect(attacker).distributeInitial([lp.address], [ethers.parseEther("100")])
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("reverts when paused (mint blocked by Pausable._update)", async function () {
      const { token, lp } = await loadFixture(deployFixture);
      await token.pause();
      await expect(
        token.distributeInitial([lp.address], [ethers.parseEther("100")])
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      // initialized stays false because the whole TX reverts
      expect(await token.initialized()).to.equal(false);
    });
  });

  // ============================================================
  //                MINTING (general MINTER_ROLE)
  // ============================================================
  describe("mint (general)", function () {
    it("MINTER_ROLE can mint within MAX_SUPPLY", async function () {
      const { token, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000000");
      await token.mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("rejects mint exceeding MAX_SUPPLY", async function () {
      const { token, user1 } = await loadFixture(deployFixture);
      const tooMuch = ethers.parseEther("1000000001"); // > 1B
      await expect(token.mint(user1.address, tooMuch))
        .to.be.revertedWithCustomError(token, "ExceedsMaxSupply");
    });

    it("rejects mint from non-MINTER", async function () {
      const { token, attacker, user1 } = await loadFixture(deployFixture);
      await expect(
        token.connect(attacker).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  // ============================================================
  //                CLEANUP_MINER_ROLE: mintReward
  // ============================================================
  describe("mintReward (cleanup mining)", function () {
    it("only CLEANUP_MINER_ROLE can mint rewards", async function () {
      const { token, attacker, user1 } = await loadFixture(deployedWithMinerFixture);
      await expect(
        token.connect(attacker).mintReward(user1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("happy path: mints + updates mintedPerDay + emits RewardMinted", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      const amount = ethers.parseEther("1000");
      const day = BigInt(await time.latest()) / 86400n;

      await expect(token.connect(miner).mintReward(user1.address, amount))
        .to.emit(token, "RewardMinted")
        .withArgs(user1.address, amount, day);

      expect(await token.balanceOf(user1.address)).to.equal(amount);
      expect(await token.currentDayMinted()).to.equal(amount);
    });

    it("reverts on zero address recipient with ZeroAddress", async function () {
      const { token, miner } = await loadFixture(deployedWithMinerFixture);
      await expect(
        token.connect(miner).mintReward(ethers.ZeroAddress, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("reverts on zero amount with ZeroAmount", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      await expect(token.connect(miner).mintReward(user1.address, 0n))
        .to.be.revertedWithCustomError(token, "ZeroAmount");
    });

    it("mints up to exact daily cap (1.4M)", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      const cap = await token.MAX_MINT_PER_DAY();
      await token.connect(miner).mintReward(user1.address, cap);
      expect(await token.balanceOf(user1.address)).to.equal(cap);
      expect(await token.remainingDailyMintCapacity()).to.equal(0n);
    });

    it("reverts single-call exceeding daily cap with DailyMintCapExceeded", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      const tooMuch = (await token.MAX_MINT_PER_DAY()) + 1n;
      await expect(token.connect(miner).mintReward(user1.address, tooMuch))
        .to.be.revertedWithCustomError(token, "DailyMintCapExceeded");
    });

    it("reverts cumulative-call exceeding daily cap", async function () {
      const { token, miner, user1, user2 } = await loadFixture(deployedWithMinerFixture);
      const cap = await token.MAX_MINT_PER_DAY();
      await token.connect(miner).mintReward(user1.address, cap - 100n);
      await expect(
        token.connect(miner).mintReward(user2.address, 101n)
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded");
      // The 100 wei still fits
      await token.connect(miner).mintReward(user2.address, 100n);
    });

    it("daily cap resets after warping 1 day forward", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      const cap = await token.MAX_MINT_PER_DAY();
      await token.connect(miner).mintReward(user1.address, cap);
      expect(await token.remainingDailyMintCapacity()).to.equal(0n);

      await time.increase(86400); // +1 day

      expect(await token.remainingDailyMintCapacity()).to.equal(cap);
      await token.connect(miner).mintReward(user1.address, cap);
      expect(await token.balanceOf(user1.address)).to.equal(cap * 2n);
    });

    it("mintedPerDay tracks each day independently", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      const day1Amount = ethers.parseEther("1000");
      await token.connect(miner).mintReward(user1.address, day1Amount);
      const day1 = BigInt(await time.latest()) / 86400n;

      await time.increase(86400);
      const day2Amount = ethers.parseEther("2000");
      await token.connect(miner).mintReward(user1.address, day2Amount);
      const day2 = BigInt(await time.latest()) / 86400n;

      expect(await token.mintedPerDay(day1)).to.equal(day1Amount);
      expect(await token.mintedPerDay(day2)).to.equal(day2Amount);
      expect(day2).to.be.greaterThan(day1);
    });

    it("currentDayMinted view tracks today's bucket", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      expect(await token.currentDayMinted()).to.equal(0n);
      await token.connect(miner).mintReward(user1.address, ethers.parseEther("500"));
      expect(await token.currentDayMinted()).to.equal(ethers.parseEther("500"));
    });

    it("reverts when paused with EnforcedPause", async function () {
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      await token.pause();
      await expect(
        token.connect(miner).mintReward(user1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("respects MAX_SUPPLY hard cap (re-checked even under daily cap)", async function () {
      // Pre-mint via MINTER_ROLE close to MAX_SUPPLY, then mintReward overflow.
      const { token, miner, user1 } = await loadFixture(deployedWithMinerFixture);
      const max = await token.MAX_SUPPLY();
      const initial = max - ethers.parseEther("100");
      await token.mint(user1.address, initial);
      // Daily cap (1.4M) > 100 ether remaining; mintReward of 101 would breach MAX_SUPPLY first
      await expect(
        token.connect(miner).mintReward(user1.address, ethers.parseEther("101"))
      ).to.be.revertedWithCustomError(token, "ExceedsMaxSupply");
      // 100 ether exact still fits
      await token.connect(miner).mintReward(user1.address, ethers.parseEther("100"));
      expect(await token.totalSupply()).to.equal(max);
    });
  });

  // ============================================================
  //                       PAUSE
  // ============================================================
  describe("Pause", function () {
    it("pause + transfer reverts; unpause + transfer succeeds", async function () {
      const { token, lp, user1 } = await loadFixture(deployedAndDistributedFixture);
      await token.pause();
      await expect(
        token.connect(lp).transfer(user1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      await token.unpause();
      await token.connect(lp).transfer(user1.address, ethers.parseEther("1"));
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });
  });

  // ============================================================
  //                       BURN
  // ============================================================
  describe("Burn", function () {
    it("holder can burn own tokens", async function () {
      const { token, lp } = await loadFixture(deployedAndDistributedFixture);
      const burnAmount = ethers.parseEther("1000000");
      const before = await token.totalSupply();
      await token.connect(lp).burn(burnAmount);
      expect(await token.totalSupply()).to.equal(before - burnAmount);
    });
  });

  // ============================================================
  //                     GOVERNANCE / VOTES
  // ============================================================
  describe("Governance / Votes", function () {
    it("self-delegation activates voting power = balance", async function () {
      const { token, lp } = await loadFixture(deployedAndDistributedFixture);
      await token.connect(lp).delegate(lp.address);
      expect(await token.getVotes(lp.address)).to.equal(await token.balanceOf(lp.address));
    });

    it("delegation to another address transfers voting power", async function () {
      const { token, lp, user1 } = await loadFixture(deployedAndDistributedFixture);
      await token.connect(lp).delegate(user1.address);
      expect(await token.getVotes(user1.address)).to.equal(await token.balanceOf(lp.address));
    });
  });

  // ============================================================
  //                  REQUIRED OVERRIDES
  // ============================================================
  describe("Required Overrides", function () {
    it("nonces() returns 0 for fresh address", async function () {
      const { token, user1 } = await loadFixture(deployFixture);
      expect(await token.nonces(user1.address)).to.equal(0n);
    });

    it("supportsInterface respects AccessControl + ERC165", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.supportsInterface("0x7965db0b")).to.equal(true); // IAccessControl
      expect(await token.supportsInterface("0x01ffc9a7")).to.equal(true); // IERC165
      expect(await token.supportsInterface("0xdeadbeef")).to.equal(false);
    });
  });
});
