const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, mine, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ONE = 10n ** 18n;

const PROP_STATE = {
  Pending: 0, Active: 1, Canceled: 2, Defeated: 3, Succeeded: 4,
  Queued: 5, Expired: 6, Executed: 7,
};
const SUPPORT = { Against: 0, For: 1, Abstain: 2 };

const VOTING_DELAY = 28_800n;
const VOTING_PERIOD = 201_600n;
const PROPOSAL_THRESHOLD = 100_000n * ONE;
const QUORUM_PCT = 4n;
const MIN_DELAY = 48n * 60n * 60n; // 48 hours in seconds

describe("Governance (Timelock + Governor)", function () {
  async function deployFixture() {
    const [deployer, proposer, voter1, voter2, smallHolder, recipient] = await ethers.getSigners();

    // 1. Deploy GOTT and distribute votes.
    const Token = await ethers.getContractFactory("GuardiansToken");
    const gott = await Token.deploy(deployer.address);
    await gott.waitForDeployment();

    // Mint enough to comfortably exceed quorum (4% of total supply).
    // Total = 10M; quorum = 400k. Distribute: 200k to proposer, 5M to voter1, 1M to voter2, 50k to smallHolder.
    await gott.connect(deployer).mint(proposer.address, 200_000n * ONE);
    await gott.connect(deployer).mint(voter1.address, 5_000_000n * ONE);
    await gott.connect(deployer).mint(voter2.address, 1_000_000n * ONE);
    await gott.connect(deployer).mint(smallHolder.address, 50_000n * ONE);

    // Each holder must self-delegate to activate voting power on ERC20Votes.
    await gott.connect(proposer).delegate(proposer.address);
    await gott.connect(voter1).delegate(voter1.address);
    await gott.connect(voter2).delegate(voter2.address);
    await gott.connect(smallHolder).delegate(smallHolder.address);

    // 2. Deploy Timelock with no proposers/executors yet (Governor wires after).
    const Timelock = await ethers.getContractFactory("GuardiansTimelockController");
    const timelock = await Timelock.deploy(MIN_DELAY, [], [ethers.ZeroAddress], deployer.address);
    await timelock.waitForDeployment();

    // 3. Deploy Governor and wire roles.
    const Governor = await ethers.getContractFactory("GuardiansGovernor");
    const governor = await Governor.deploy(await gott.getAddress(), await timelock.getAddress());
    await governor.waitForDeployment();

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
    const TL_ADMIN = await timelock.DEFAULT_ADMIN_ROLE();

    await timelock.connect(deployer).grantRole(PROPOSER_ROLE, await governor.getAddress());
    await timelock.connect(deployer).grantRole(CANCELLER_ROLE, await governor.getAddress());

    // 4. Transfer GOTT's DEFAULT_ADMIN_ROLE to timelock so Governor can act on it.
    const TOKEN_ADMIN = await gott.DEFAULT_ADMIN_ROLE();
    await gott.connect(deployer).grantRole(TOKEN_ADMIN, await timelock.getAddress());

    return {
      deployer, proposer, voter1, voter2, smallHolder, recipient,
      gott, timelock, governor,
      PROPOSER_ROLE, CANCELLER_ROLE, TL_ADMIN, TOKEN_ADMIN,
    };
  }

  async function buildGrantMinterProposal(governor, gott, recipient, description = "Grant MINTER_ROLE") {
    const targets = [await gott.getAddress()];
    const values = [0];
    const MINTER_ROLE = await gott.MINTER_ROLE();
    const calldatas = [
      gott.interface.encodeFunctionData("grantRole", [MINTER_ROLE, recipient.address]),
    ];
    const descHash = ethers.id(description);
    const proposalId = await governor.hashProposal(targets, values, calldatas, descHash);
    return { targets, values, calldatas, description, descHash, proposalId };
  }

  // ============================================================
  //                     DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("Timelock min delay = 48h", async function () {
      const { timelock } = await loadFixture(deployFixture);
      expect(await timelock.getMinDelay()).to.equal(MIN_DELAY);
    });

    it("Governor settings match docs/12 spec", async function () {
      const { governor } = await loadFixture(deployFixture);
      expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
      expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);
      expect(await governor.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
      expect(await governor.quorumNumerator()).to.equal(QUORUM_PCT);
      expect(await governor.name()).to.equal("GuardiansGovernor");
    });

    it("Governor wired to token + timelock", async function () {
      const { governor, gott, timelock } = await loadFixture(deployFixture);
      expect(await governor.token()).to.equal(await gott.getAddress());
      expect(await governor.timelock()).to.equal(await timelock.getAddress());
    });

    it("Governor holds PROPOSER + CANCELLER roles on timelock", async function () {
      const { timelock, governor, PROPOSER_ROLE, CANCELLER_ROLE } = await loadFixture(deployFixture);
      const gAddr = await governor.getAddress();
      expect(await timelock.hasRole(PROPOSER_ROLE, gAddr)).to.equal(true);
      expect(await timelock.hasRole(CANCELLER_ROLE, gAddr)).to.equal(true);
    });

    it("Open execution: address(0) holds EXECUTOR_ROLE", async function () {
      const { timelock } = await loadFixture(deployFixture);
      const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
      expect(await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress)).to.equal(true);
    });
  });

  // ============================================================
  //                     PROPOSAL THRESHOLD
  // ============================================================
  describe("Proposal threshold", function () {
    it("rejects proposer with < 100k delegated GOTT", async function () {
      const { governor, gott, smallHolder, recipient } = await loadFixture(deployFixture);
      // smallHolder has 50k delegated.
      const { targets, values, calldatas, description } =
        await buildGrantMinterProposal(governor, gott, recipient);

      await expect(governor.connect(smallHolder).propose(targets, values, calldatas, description))
        .to.be.revertedWithCustomError(governor, "GovernorInsufficientProposerVotes");
    });

    it("accepts proposer at threshold", async function () {
      const { governor, gott, proposer, recipient } = await loadFixture(deployFixture);
      // proposer has 200k delegated > 100k threshold.
      const { targets, values, calldatas, description, proposalId } =
        await buildGrantMinterProposal(governor, gott, recipient);

      await expect(governor.connect(proposer).propose(targets, values, calldatas, description))
        .to.emit(governor, "ProposalCreated");
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Pending);
    });
  });

  // ============================================================
  //                     HAPPY PATH FLOW
  // ============================================================
  describe("Propose → Vote → Queue → Execute", function () {
    it("full flow: governor grants MINTER_ROLE on token via timelock", async function () {
      const { governor, gott, timelock, proposer, voter1, recipient } = await loadFixture(deployFixture);
      const MINTER_ROLE = await gott.MINTER_ROLE();
      expect(await gott.hasRole(MINTER_ROLE, recipient.address)).to.equal(false);

      const { targets, values, calldatas, description, descHash, proposalId } =
        await buildGrantMinterProposal(governor, gott, recipient);

      // Propose
      await governor.connect(proposer).propose(targets, values, calldatas, description);
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Pending);

      // Mine past voting delay → Active
      await mine(VOTING_DELAY + 1n);
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Active);

      // Vote: voter1 has 5M, well above 4% quorum (= 252k of 6.25M total supply).
      await governor.connect(voter1).castVote(proposalId, SUPPORT.For);

      // Mine past voting period → Succeeded
      await mine(VOTING_PERIOD + 1n);
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Succeeded);

      // Queue
      await governor.queue(targets, values, calldatas, descHash);
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Queued);

      // Wait for timelock min delay
      await time.increase(MIN_DELAY + 1n);

      // Execute (open executor — anyone can call)
      await governor.execute(targets, values, calldatas, descHash);
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Executed);

      // Effect happened
      expect(await gott.hasRole(MINTER_ROLE, recipient.address)).to.equal(true);
    });

    it("cannot vote before voting delay elapses (Pending state)", async function () {
      const { governor, gott, proposer, voter1, recipient } = await loadFixture(deployFixture);
      const { targets, values, calldatas, description, proposalId } =
        await buildGrantMinterProposal(governor, gott, recipient);

      await governor.connect(proposer).propose(targets, values, calldatas, description);
      // Still Pending — no vote yet.
      await expect(governor.connect(voter1).castVote(proposalId, SUPPORT.For))
        .to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
    });

    it("cannot execute before voting period ends (Active state)", async function () {
      const { governor, gott, proposer, voter1, recipient } = await loadFixture(deployFixture);
      const { targets, values, calldatas, description, descHash } =
        await buildGrantMinterProposal(governor, gott, recipient);

      await governor.connect(proposer).propose(targets, values, calldatas, description);
      await mine(VOTING_DELAY + 1n);
      await governor.connect(voter1).castVote(proposalId = await governor.hashProposal(targets, values, calldatas, descHash), SUPPORT.For);
      // Voting still in progress.
      await expect(governor.queue(targets, values, calldatas, descHash))
        .to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
    });

    it("cannot execute before timelock min delay elapses", async function () {
      const { governor, gott, proposer, voter1, recipient } = await loadFixture(deployFixture);
      const { targets, values, calldatas, description, descHash } =
        await buildGrantMinterProposal(governor, gott, recipient);

      await governor.connect(proposer).propose(targets, values, calldatas, description);
      await mine(VOTING_DELAY + 1n);
      await governor.connect(voter1).castVote(await governor.hashProposal(targets, values, calldatas, descHash), SUPPORT.For);
      await mine(VOTING_PERIOD + 1n);
      await governor.queue(targets, values, calldatas, descHash);

      // Try execute immediately — timelock not ready.
      await expect(governor.execute(targets, values, calldatas, descHash))
        .to.be.reverted; // Timelock's "operation is not ready" custom error
    });
  });

  // ============================================================
  //                          QUORUM
  // ============================================================
  describe("Quorum", function () {
    it("4% quorum reflects total supply at proposal snapshot block", async function () {
      const { governor, gott } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();
      // Total supply = 200k + 5M + 1M + 50k = 6,250,000 GOTT. 4% = 250,000.
      const totalAtPrev = await gott.getPastTotalSupply(blockNumber - 1);
      const expectedQuorum = (totalAtPrev * QUORUM_PCT) / 100n;
      expect(await governor.quorum(blockNumber - 1)).to.equal(expectedQuorum);
    });

    it("proposal defeated if FOR votes below quorum", async function () {
      const { governor, gott, proposer, smallHolder, recipient } = await loadFixture(deployFixture);
      const { targets, values, calldatas, description, proposalId } =
        await buildGrantMinterProposal(governor, gott, recipient);

      await governor.connect(proposer).propose(targets, values, calldatas, description);
      await mine(VOTING_DELAY + 1n);
      // Only smallHolder (50k) and proposer (200k) vote FOR — 250k total. Quorum is 250k → exactly at quorum.
      // Drop smallHolder; only proposer votes (200k) → below quorum (250k).
      await governor.connect(proposer).castVote(proposalId, SUPPORT.For);
      await mine(VOTING_PERIOD + 1n);
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Defeated);
    });
  });

  // ============================================================
  //                          CANCEL
  // ============================================================
  describe("Cancel", function () {
    it("proposer can cancel before voting starts", async function () {
      const { governor, gott, proposer, recipient } = await loadFixture(deployFixture);
      const { targets, values, calldatas, description, descHash, proposalId } =
        await buildGrantMinterProposal(governor, gott, recipient);

      await governor.connect(proposer).propose(targets, values, calldatas, description);
      await governor.connect(proposer).cancel(targets, values, calldatas, descHash);
      expect(await governor.state(proposalId)).to.equal(PROP_STATE.Canceled);
    });
  });

  // ============================================================
  //                  ROLE TRANSFER VALIDATION
  // ============================================================
  describe("Role transfer to Timelock", function () {
    it("after transfer + renounce, deployer can no longer grant roles directly", async function () {
      const { gott, deployer, recipient, TOKEN_ADMIN } = await loadFixture(deployFixture);
      const MINTER_ROLE = await gott.MINTER_ROLE();
      // Deployer still has admin (we only added timelock; didn't renounce).
      // After renounce, only timelock can act.
      await gott.connect(deployer).renounceRole(TOKEN_ADMIN, deployer.address);
      await expect(gott.connect(deployer).grantRole(MINTER_ROLE, recipient.address))
        .to.be.revertedWithCustomError(gott, "AccessControlUnauthorizedAccount");
    });
  });
});
