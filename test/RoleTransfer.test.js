const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, mine, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const { transferRolesToTimelock, TARGETS, resolveRoles } = require("../scripts/transferAdminRoles");

const ONE = 10n ** 18n;
const VOTING_DELAY = 28_800n;
const VOTING_PERIOD = 201_600n;
const MIN_DELAY = 48n * 60n * 60n;
const SUPPORT_FOR = 1;

describe("Phase 3 PR #2 — Role transfer to Timelock", function () {
  async function fullSystemFixture() {
    const [deployer, voter, recipient] = await ethers.getSigners();

    // ---- Phase 1: Token ----
    const Token = await ethers.getContractFactory("GuardiansToken");
    const gott = await Token.deploy(deployer.address);
    await gott.waitForDeployment();
    // Mint enough for governance: voter holds majority for quick quorum.
    await gott.mint(voter.address, 10_000_000n * ONE);
    await gott.connect(voter).delegate(voter.address);

    // ---- Phase 2: ScamRegistry, LandfillVault, CleanupMining, GarbageCollector ----
    const Registry = await ethers.getContractFactory("ScamRegistry");
    const registry = await Registry.deploy(deployer.address);
    await registry.waitForDeployment();

    const Vault = await ethers.getContractFactory("LandfillVault");
    // Use deployer for both admin AND dao slot, mirroring deploy script defaults pre-DAO.
    const vault = await Vault.deploy(deployer.address, deployer.address);
    await vault.waitForDeployment();

    const Mining = await ethers.getContractFactory("CleanupMining");
    const mining = await Mining.deploy(deployer.address, await gott.getAddress());
    await mining.waitForDeployment();
    await gott.grantRole(await gott.CLEANUP_MINER_ROLE(), await mining.getAddress());

    const Router = await ethers.getContractFactory("MockPancakeRouter");
    const WBNB = "0x000000000000000000000000000000000000000B";
    const router = await Router.deploy(WBNB);
    await router.waitForDeployment();

    const GC = await ethers.getContractFactory("GarbageCollector");
    const gc = await GC.deploy(
      deployer.address,
      await router.getAddress(),
      WBNB,
      await registry.getAddress(),
      await mining.getAddress(),
      await vault.getAddress(),
    );
    await gc.waitForDeployment();
    await mining.grantRole(await mining.COLLECTOR_ROLE(), await gc.getAddress());

    // ---- Phase 3 PR #1: Timelock + Governor ----
    const Timelock = await ethers.getContractFactory("GuardiansTimelockController");
    const timelock = await Timelock.deploy(MIN_DELAY, [], [ethers.ZeroAddress], deployer.address);
    await timelock.waitForDeployment();

    const Governor = await ethers.getContractFactory("GuardiansGovernor");
    const governor = await Governor.deploy(await gott.getAddress(), await timelock.getAddress());
    await governor.waitForDeployment();

    await timelock.grantRole(await timelock.PROPOSER_ROLE(), await governor.getAddress());
    await timelock.grantRole(await timelock.CANCELLER_ROLE(), await governor.getAddress());

    // Build the same `targets` array the script uses, but with already-instantiated contracts.
    const contractByName = { GuardiansToken: gott, ScamRegistry: registry, LandfillVault: vault, CleanupMining: mining, GarbageCollector: gc };
    const targets = [];
    for (const t of TARGETS) {
      const contract = contractByName[t.name];
      const resolvedRoles = await resolveRoles(contract, t.roles);
      targets.push({ ...t, address: await contract.getAddress(), contract, resolvedRoles });
    }

    return {
      deployer, voter, recipient,
      gott, registry, vault, mining, gc, router, timelock, governor,
      targets,
    };
  }

  // ============================================================
  //                   PRE-TRANSFER SANITY
  // ============================================================
  describe("Pre-transfer state", function () {
    it("deployer holds all listed roles, Timelock holds none", async function () {
      const { deployer, timelock, targets } = await loadFixture(fullSystemFixture);
      const tlAddr = await timelock.getAddress();
      for (const t of targets) {
        for (const role of t.resolvedRoles) {
          expect(await t.contract.hasRole(role.value, deployer.address))
            .to.equal(true, `deployer should hold ${role.name} on ${t.name}`);
          expect(await t.contract.hasRole(role.value, tlAddr))
            .to.equal(false, `Timelock should not hold ${role.name} on ${t.name} yet`);
        }
      }
    });
  });

  // ============================================================
  //                       TRANSFER FLOW
  // ============================================================
  describe("transferRolesToTimelock", function () {
    it("grants every listed role to Timelock and renounces them from deployer", async function () {
      const { deployer, timelock, targets } = await loadFixture(fullSystemFixture);
      const tlAddr = await timelock.getAddress();

      await transferRolesToTimelock({ deployer, timelockAddress: tlAddr, targets, log: () => {} });

      for (const t of targets) {
        for (const role of t.resolvedRoles) {
          expect(await t.contract.hasRole(role.value, tlAddr))
            .to.equal(true, `Timelock should hold ${role.name} on ${t.name}`);
          expect(await t.contract.hasRole(role.value, deployer.address))
            .to.equal(false, `deployer should not hold ${role.name} on ${t.name}`);
        }
      }
    });

    it("is idempotent: re-running is a no-op", async function () {
      const { deployer, timelock, targets } = await loadFixture(fullSystemFixture);
      const tlAddr = await timelock.getAddress();
      await transferRolesToTimelock({ deployer, timelockAddress: tlAddr, targets, log: () => {} });
      // Second run must complete without error and verify cleanly.
      await transferRolesToTimelock({ deployer, timelockAddress: tlAddr, targets, log: () => {} });
    });

    it("preserves CLEANUP_MINER_ROLE on token (CleanupMining keeps it)", async function () {
      const { deployer, gott, mining, timelock, targets } = await loadFixture(fullSystemFixture);
      const role = await gott.CLEANUP_MINER_ROLE();
      const before = await gott.hasRole(role, await mining.getAddress());

      await transferRolesToTimelock({
        deployer, timelockAddress: await timelock.getAddress(), targets, log: () => {},
      });

      expect(await gott.hasRole(role, await mining.getAddress())).to.equal(before).and.to.equal(true);
    });

    it("preserves COLLECTOR_ROLE on mining (GarbageCollector keeps it)", async function () {
      const { deployer, mining, gc, timelock, targets } = await loadFixture(fullSystemFixture);
      const role = await mining.COLLECTOR_ROLE();
      await transferRolesToTimelock({
        deployer, timelockAddress: await timelock.getAddress(), targets, log: () => {},
      });
      expect(await mining.hasRole(role, await gc.getAddress())).to.equal(true);
    });
  });

  // ============================================================
  //                    POST-TRANSFER LOCK-OUT
  // ============================================================
  describe("Post-transfer: deployer is locked out", function () {
    async function transferredFixture() {
      const f = await fullSystemFixture();
      await transferRolesToTimelock({
        deployer: f.deployer, timelockAddress: await f.timelock.getAddress(),
        targets: f.targets, log: () => {},
      });
      return f;
    }

    it("deployer cannot mint via token directly", async function () {
      const { deployer, gott, recipient } = await loadFixture(transferredFixture);
      await expect(gott.connect(deployer).mint(recipient.address, ONE))
        .to.be.revertedWithCustomError(gott, "AccessControlUnauthorizedAccount");
    });

    it("deployer cannot setBaseRate on CleanupMining", async function () {
      const { deployer, mining } = await loadFixture(transferredFixture);
      await expect(mining.connect(deployer).setBaseRate(ethers.parseEther("50")))
        .to.be.revertedWithCustomError(mining, "AccessControlUnauthorizedAccount");
    });

    it("deployer cannot pause GarbageCollector", async function () {
      const { deployer, gc } = await loadFixture(transferredFixture);
      await expect(gc.connect(deployer).pause())
        .to.be.revertedWithCustomError(gc, "AccessControlUnauthorizedAccount");
    });

    it("deployer cannot grant ScamRegistry roles", async function () {
      const { deployer, registry, recipient } = await loadFixture(transferredFixture);
      const role = await registry.ORACLE_ROLE();
      await expect(registry.connect(deployer).grantRole(role, recipient.address))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("deployer cannot burn via LandfillVault DAO_ROLE anymore", async function () {
      const { deployer, vault } = await loadFixture(transferredFixture);
      // Use any token address — the role check fails before any state read.
      await expect(vault.connect(deployer).burnToken(ethers.ZeroAddress, 1n))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });

  // ============================================================
  //              END-TO-END: GOVERNOR DRIVES MINING
  // ============================================================
  describe("End-to-end Governor flow against transferred contract", function () {
    it("Governor proposal can change CleanupMining.baseRate via Timelock", async function () {
      const f = await loadFixture(fullSystemFixture);
      await transferRolesToTimelock({
        deployer: f.deployer, timelockAddress: await f.timelock.getAddress(),
        targets: f.targets, log: () => {},
      });

      const oldRate = await f.mining.baseRate();
      const newRate = ethers.parseEther("75");

      const targets = [await f.mining.getAddress()];
      const values = [0];
      const calldatas = [f.mining.interface.encodeFunctionData("setBaseRate", [newRate])];
      const description = "Reduce baseRate to 75 GOTT/$1";
      const descHash = ethers.id(description);

      // Voter holds enough GOTT to be both proposer (>100k) and vote majority.
      await f.governor.connect(f.voter).propose(targets, values, calldatas, description);

      const proposalId = await f.governor.hashProposal(targets, values, calldatas, descHash);
      await mine(VOTING_DELAY + 1n);
      await f.governor.connect(f.voter).castVote(proposalId, SUPPORT_FOR);
      await mine(VOTING_PERIOD + 1n);

      await f.governor.queue(targets, values, calldatas, descHash);
      await time.increase(MIN_DELAY + 1n);
      await f.governor.execute(targets, values, calldatas, descHash);

      expect(await f.mining.baseRate()).to.equal(newRate);
      expect(await f.mining.baseRate()).to.not.equal(oldRate);
    });
  });

  // ============================================================
  //              TIMELOCK SELF-LOCK (RENOUNCE_TIMELOCK_ADMIN)
  // ============================================================
  describe("Timelock self-lock", function () {
    it("after deployer renounces Timelock DEFAULT_ADMIN, deployer cannot grant new proposers", async function () {
      const f = await loadFixture(fullSystemFixture);
      const tlAddr = await f.timelock.getAddress();
      await transferRolesToTimelock({
        deployer: f.deployer, timelockAddress: tlAddr, targets: f.targets, log: () => {},
      });

      // Deployer voluntarily renounces own DEFAULT_ADMIN_ROLE on Timelock.
      await f.timelock.connect(f.deployer).renounceRole(ethers.ZeroHash, f.deployer.address);

      // Now deployer cannot manage Timelock roles directly.
      const PROPOSER_ROLE = await f.timelock.PROPOSER_ROLE();
      await expect(f.timelock.connect(f.deployer).grantRole(PROPOSER_ROLE, f.recipient.address))
        .to.be.revertedWithCustomError(f.timelock, "AccessControlUnauthorizedAccount");
    });
  });
});
