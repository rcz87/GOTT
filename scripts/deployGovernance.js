const { ethers, run, network } = require("hardhat");

const MIN_DELAY = 48 * 60 * 60; // 48 hours

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("========================================");
  console.log("  GOVERNANCE - DEPLOYMENT");
  console.log("========================================");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB`);
  console.log("----------------------------------------");

  const GOTT_ADDRESS = process.env.GOTT_ADDRESS;
  if (!GOTT_ADDRESS) throw new Error("Set GOTT_ADDRESS env var.");

  // ============================================================
  //  Step 1 — Deploy Timelock
  //  - proposers:  []                  (granted to Governor next)
  //  - executors:  [address(0)]        (open execution)
  //  - admin:      deployer            (renounce after Governor wires)
  // ============================================================
  console.log("Deploying GuardiansTimelockController...");
  const Timelock = await ethers.getContractFactory("GuardiansTimelockController");
  const timelock = await Timelock.deploy(MIN_DELAY, [], [ethers.ZeroAddress], deployer.address);
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();
  console.log(`✅ Timelock deployed: ${timelockAddr}`);
  console.log(`   minDelay:  ${MIN_DELAY}s (48h)`);

  // ============================================================
  //  Step 2 — Deploy Governor
  // ============================================================
  console.log("\nDeploying GuardiansGovernor...");
  const Governor = await ethers.getContractFactory("GuardiansGovernor");
  const governor = await Governor.deploy(GOTT_ADDRESS, timelockAddr);
  await governor.waitForDeployment();
  const govAddr = await governor.getAddress();
  console.log(`✅ Governor deployed: ${govAddr}`);
  console.log(`   votingDelay:        ${await governor.votingDelay()} blocks (~1 day)`);
  console.log(`   votingPeriod:       ${await governor.votingPeriod()} blocks (~7 days)`);
  console.log(`   proposalThreshold:  ${ethers.formatEther(await governor.proposalThreshold())} GOTT`);
  console.log(`   quorum:             ${await governor.quorumNumerator()}% of total supply`);

  // ============================================================
  //  Step 3 — Wire roles: Governor gets PROPOSER + CANCELLER on Timelock
  // ============================================================
  console.log("\nGranting PROPOSER + CANCELLER roles on Timelock to Governor...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  await (await timelock.grantRole(PROPOSER_ROLE, govAddr)).wait();
  await (await timelock.grantRole(CANCELLER_ROLE, govAddr)).wait();
  console.log("✅ Roles wired.");

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳ Waiting 15s before verification...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address: timelockAddr,
        constructorArguments: [MIN_DELAY, [], [ethers.ZeroAddress], deployer.address],
      });
      await run("verify:verify", {
        address: govAddr,
        constructorArguments: [GOTT_ADDRESS, timelockAddr],
      });
      console.log("✅ Contracts verified on BscScan!");
    } catch (e) {
      console.log("⚠️  Verification failed:", e.message);
    }
  }

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Timelock: ${timelockAddr}`);
  console.log(`Governor: ${govAddr}`);
  console.log(`\nNEXT STEPS (Phase 3 follow-up PR — role transfer):`);
  console.log(`  Transfer admin roles on the 5 protocol contracts to ${timelockAddr}:`);
  console.log(`    1. GuardiansToken: DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE`);
  console.log(`    2. ScamRegistry:   DEFAULT_ADMIN_ROLE, PAUSER_ROLE`);
  console.log(`    3. LandfillVault:  DAO_ROLE, EMERGENCY_ROLE, PAUSER_ROLE, DEFAULT_ADMIN_ROLE`);
  console.log(`    4. CleanupMining:  ADMIN_ROLE, PAUSER_ROLE, DEFAULT_ADMIN_ROLE`);
  console.log(`    5. GarbageCollector: ADMIN_ROLE, PAUSER_ROLE, DEFAULT_ADMIN_ROLE`);
  console.log(`  After grants, deployer should renounce its own roles.`);
  console.log(`  Finally: timelock.renounceRole(DEFAULT_ADMIN_ROLE, deployer)`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
