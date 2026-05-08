const { ethers, run, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("========================================");
  console.log("  CLEANUP MINING - DEPLOYMENT");
  console.log("========================================");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB`);
  console.log("----------------------------------------");

  // ============================================================
  //  DEPLOYMENT CONFIG — EDIT BEFORE MAINNET
  // ============================================================
  const ADMIN = deployer.address;
  const GOTT_ADDRESS = process.env.GOTT_ADDRESS;
  if (!GOTT_ADDRESS) {
    throw new Error("Set GOTT_ADDRESS env var to the deployed GuardiansToken address.");
  }
  // ============================================================

  console.log(`Deploying CleanupMining (gott=${GOTT_ADDRESS})...\n`);

  const CleanupMining = await ethers.getContractFactory("CleanupMining");
  const mining = await CleanupMining.deploy(ADMIN, GOTT_ADDRESS);
  await mining.waitForDeployment();

  const address = await mining.getAddress();
  const COLLECTOR_ROLE = await mining.COLLECTOR_ROLE();
  const ADMIN_ROLE = await mining.ADMIN_ROLE();
  const PAUSER_ROLE = await mining.PAUSER_ROLE();
  const DEFAULT_ADMIN_ROLE = await mining.DEFAULT_ADMIN_ROLE();

  console.log(`✅ CleanupMining deployed to: ${address}`);
  console.log(`   admin:               ${ADMIN}`);
  console.log(`   gott:                ${GOTT_ADDRESS}`);
  console.log(`   LAUNCH_TIMESTAMP:    ${await mining.LAUNCH_TIMESTAMP()}`);
  console.log(`   EPOCH_DURATION:      ${await mining.EPOCH_DURATION()}s (180 days)`);
  console.log(`   baseRate:            ${ethers.formatEther(await mining.baseRate())} GOTT/$1`);
  console.log(`   tierBronze / Silver: $${ethers.formatEther(await mining.tierBronze())} / $${ethers.formatEther(await mining.tierSilver())}`);
  console.log(`   paused:              ${await mining.paused()}`);
  console.log(`   COLLECTOR_ROLE:      ${COLLECTOR_ROLE}`);
  console.log(`   ADMIN_ROLE:          ${ADMIN_ROLE}`);
  console.log(`   PAUSER_ROLE:         ${PAUSER_ROLE}`);
  console.log(`   DEFAULT_ADMIN_ROLE:  ${DEFAULT_ADMIN_ROLE}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳ Waiting 15s for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [ADMIN, GOTT_ADDRESS],
      });
      console.log("✅ Contract verified on BscScan!");
    } catch (e) {
      console.log("⚠️  Verification failed:", e.message);
      console.log(`   Manual verify: npx hardhat verify --network ${network.name} ${address} ${ADMIN} ${GOTT_ADDRESS}`);
    }
  }

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Contract:    ${address}`);
  console.log(`BscScan:     https://bscscan.com/address/${address}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`1. Grant CLEANUP_MINER_ROLE on the token to this contract:`);
  console.log(`     gott.grantRole(CLEANUP_MINER_ROLE, ${address})`);
  console.log(`2. Deploy GarbageCollector (Phase 2 next), then:`);
  console.log(`     mining.grantRole(COLLECTOR_ROLE, <garbageCollector-address>)`);
  console.log(`3. Phase 3: rotate ADMIN_ROLE + DEFAULT_ADMIN_ROLE to Timelock`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
