const { ethers, run, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("========================================");
  console.log("  LANDFILL VAULT - DEPLOYMENT");
  console.log("========================================");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB`);
  console.log("----------------------------------------");

  // ============================================================
  //  DEPLOYMENT CONFIG — EDIT BEFORE MAINNET
  // ============================================================
  const ADMIN = deployer.address;
  // Pre-DAO: deployer also fills DAO_ROLE; rotate to Timelock once Phase 3 lands.
  const DAO = deployer.address;
  // ============================================================

  console.log("Deploying LandfillVault...\n");

  const LandfillVault = await ethers.getContractFactory("LandfillVault");
  const vault = await LandfillVault.deploy(ADMIN, DAO);
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  const DAO_ROLE = await vault.DAO_ROLE();
  const EMERGENCY_ROLE = await vault.EMERGENCY_ROLE();
  const PAUSER_ROLE = await vault.PAUSER_ROLE();
  const ADMIN_ROLE = await vault.DEFAULT_ADMIN_ROLE();

  console.log(`✅ LandfillVault deployed to: ${address}`);
  console.log(`   admin:        ${ADMIN}`);
  console.log(`   dao:          ${DAO}`);
  console.log(`   paused:       ${await vault.paused()}`);
  console.log(`   DAO_ROLE:     ${DAO_ROLE}`);
  console.log(`   EMERGENCY:    ${EMERGENCY_ROLE}`);
  console.log(`   PAUSER:       ${PAUSER_ROLE}`);
  console.log(`   ADMIN_ROLE:   ${ADMIN_ROLE}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳ Waiting 15s for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [ADMIN, DAO],
      });
      console.log("✅ Contract verified on BscScan!");
    } catch (e) {
      console.log("⚠️  Verification failed:", e.message);
      console.log(`   Manual verify: npx hardhat verify --network ${network.name} ${address} ${ADMIN} ${DAO}`);
    }
  }

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Contract:    ${address}`);
  console.log(`BscScan:     https://bscscan.com/address/${address}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`1. Phase 3: rotate DAO_ROLE to Timelock`);
  console.log(`     vault.grantRole(DAO_ROLE, <timelock-address>)`);
  console.log(`     vault.revokeRole(DAO_ROLE, deployer)`);
  console.log(`2. Optional: rotate PAUSER_ROLE / EMERGENCY_ROLE to dedicated multisigs`);
  console.log(`3. Wire GarbageCollector (Phase 2 next) to push tokens here via direct ERC20 transfer`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
