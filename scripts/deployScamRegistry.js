const { ethers, run, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("========================================");
  console.log("  SCAM REGISTRY - DEPLOYMENT");
  console.log("========================================");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB`);
  console.log("----------------------------------------");

  // ============================================================
  //  DEPLOYMENT CONFIG — EDIT BEFORE MAINNET
  // ============================================================
  const ADMIN = deployer.address;
  // ORACLE_ROLE is granted post-deploy to the Guardians backend signer.
  // ============================================================

  console.log("Deploying ScamRegistry...\n");

  const ScamRegistry = await ethers.getContractFactory("ScamRegistry");
  const registry = await ScamRegistry.deploy(ADMIN);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const ORACLE_ROLE = await registry.ORACLE_ROLE();
  const PAUSER_ROLE = await registry.PAUSER_ROLE();
  const ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();

  console.log(`✅ ScamRegistry deployed to: ${address}`);
  console.log(`   admin:        ${ADMIN}`);
  console.log(`   paused:       ${await registry.paused()}`);
  console.log(`   ORACLE_ROLE:  ${ORACLE_ROLE}`);
  console.log(`   PAUSER_ROLE:  ${PAUSER_ROLE}`);
  console.log(`   ADMIN_ROLE:   ${ADMIN_ROLE}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳ Waiting 15s for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [ADMIN],
      });
      console.log("✅ Contract verified on BscScan!");
    } catch (e) {
      console.log("⚠️  Verification failed:", e.message);
      console.log(`   Manual verify: npx hardhat verify --network ${network.name} ${address} ${ADMIN}`);
    }
  }

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Contract:    ${address}`);
  console.log(`BscScan:     https://bscscan.com/address/${address}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`1. Grant ORACLE_ROLE to the Guardians backend signer:`);
  console.log(`     registry.grantRole(ORACLE_ROLE, <oracle-signer-address>)`);
  console.log(`2. Optional: grant PAUSER_ROLE to a multisig for emergency pause`);
  console.log(`3. Push initial classifications via setStatusBatch (ScamSniffer / GoPlus seed list)`);
  console.log(`4. Wire GarbageCollector.sol (Phase 2 next) → reads isScamOrDrainer()`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
