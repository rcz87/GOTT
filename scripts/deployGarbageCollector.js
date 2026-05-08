const { ethers, run, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("========================================");
  console.log("  GARBAGE COLLECTOR - DEPLOYMENT");
  console.log("========================================");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB`);
  console.log("----------------------------------------");

  // ============================================================
  //  DEPLOYMENT CONFIG — set via env vars before running
  // ============================================================
  const ADMIN = deployer.address;
  const ROUTER = process.env.PANCAKE_ROUTER;
  const WBNB = process.env.WBNB_ADDRESS;
  const SCAM_REGISTRY = process.env.SCAM_REGISTRY_ADDRESS;
  const MINING = process.env.CLEANUP_MINING_ADDRESS;
  const VAULT = process.env.LANDFILL_VAULT_ADDRESS;
  const ORACLE_SIGNER = process.env.ORACLE_SIGNER;
  for (const [name, value] of Object.entries({ ROUTER, WBNB, SCAM_REGISTRY, MINING, VAULT, ORACLE_SIGNER })) {
    if (!value) {
      const envName = name === "ROUTER" ? "PANCAKE_ROUTER" : name === "WBNB" ? "WBNB_ADDRESS" : name;
      throw new Error(`Set ${envName} env var.`);
    }
  }
  // ============================================================

  console.log("Deploying GarbageCollector with:");
  console.log(`  router        = ${ROUTER}`);
  console.log(`  wbnb          = ${WBNB}`);
  console.log(`  scamRegistry  = ${SCAM_REGISTRY}`);
  console.log(`  mining        = ${MINING}`);
  console.log(`  vault         = ${VAULT}`);
  console.log(`  oracleSigner  = ${ORACLE_SIGNER}\n`);

  const GarbageCollector = await ethers.getContractFactory("GarbageCollector");
  const gc = await GarbageCollector.deploy(ADMIN, ROUTER, WBNB, SCAM_REGISTRY, MINING, VAULT, ORACLE_SIGNER);
  await gc.waitForDeployment();

  const address = await gc.getAddress();
  console.log(`✅ GarbageCollector deployed to: ${address}`);
  console.log(`   admin:               ${ADMIN}`);
  console.log(`   maxTokensPerCleanup: ${await gc.maxTokensPerCleanup()}`);
  console.log(`   minCleanupValueUSD:  ${ethers.formatEther(await gc.minCleanupValueUSD())} (1e18-scaled)`);
  console.log(`   swapDeadlineBuffer:  ${await gc.swapDeadlineBuffer()}s`);
  console.log(`   paused:              ${await gc.paused()}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳ Waiting 15s for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [ADMIN, ROUTER, WBNB, SCAM_REGISTRY, MINING, VAULT, ORACLE_SIGNER],
      });
      console.log("✅ Contract verified on BscScan!");
    } catch (e) {
      console.log("⚠️  Verification failed:", e.message);
      console.log(`   Manual verify: npx hardhat verify --network ${network.name} ${address} ${ADMIN} ${ROUTER} ${WBNB} ${SCAM_REGISTRY} ${MINING} ${VAULT} ${ORACLE_SIGNER}`);
    }
  }

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Contract:    ${address}`);
  console.log(`BscScan:     https://bscscan.com/address/${address}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`1. Grant COLLECTOR_ROLE on CleanupMining to this contract:`);
  console.log(`     mining.grantRole(COLLECTOR_ROLE, ${address})`);
  console.log(`2. Optional: grant ORACLE_ROLE on ScamRegistry to backend signer (if not done)`);
  console.log(`3. Frontend: integrate cleanupBatch (swap path) and sendScamToLandfill (vault path)`);
  console.log(`4. Phase 3: rotate ADMIN_ROLE + DEFAULT_ADMIN_ROLE to Timelock`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
