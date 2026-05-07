const { ethers, run, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("========================================");
  console.log("  GUARDIANS TOKEN (GOTT) - DEPLOYMENT");
  console.log("========================================");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB`);
  console.log("----------------------------------------");

  // ============================================================
  //  DEPLOYMENT CONFIG — EDIT THESE VALUES
  // ============================================================
  const INITIAL_OWNER = deployer.address;
  // v2: constructor mints 0. TGE allocation happens via distributeInitial()
  // post-deploy — see "NEXT STEPS" output for the recipient/amount template.
  // ============================================================

  console.log("Constructor mints 0 — TGE distribution via distributeInitial()");
  console.log("Deploying...\n");

  const GuardiansToken = await ethers.getContractFactory("GuardiansToken");
  const token = await GuardiansToken.deploy(INITIAL_OWNER);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(`✅ GOTT deployed to: ${address}`);
  console.log(`   Total supply:        ${ethers.formatEther(await token.totalSupply())} GOTT`);
  console.log(`   Mintable remain:     ${ethers.formatEther(await token.mintableSupply())} GOTT`);
  console.log(`   MAX_MINT_PER_DAY:    ${ethers.formatEther(await token.MAX_MINT_PER_DAY())} GOTT`);
  console.log(`   initialized:         ${await token.initialized()}`);

  // Verify on BscScan (skip for local/testnet if no API key)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳ Waiting 15s for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [INITIAL_OWNER],
      });
      console.log("✅ Contract verified on BscScan!");
    } catch (e) {
      console.log("⚠️  Verification failed:", e.message);
      console.log(`   Manual verify: npx hardhat verify --network ${network.name} ${address} ${INITIAL_OWNER}`);
    }
  }

  // Summary
  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Contract:    ${address}`);
  console.log(`BscScan:     https://bscscan.com/token/${address}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`1. Set TGE recipient addresses (per BLUEPRINT.md §6.3):`);
  console.log(`     LP        = <PancakeSwap LP recipient>`);
  console.log(`     MARKETING = <multisig / marketing wallet>`);
  console.log(`     AIRDROP   = <airdrop distributor / merkle root contract>`);
  console.log(`2. Call distributeInitial — one-shot, ADMIN-gated:`);
  console.log(`     token.distributeInitial(`);
  console.log(`       [LP, MARKETING, AIRDROP],`);
  console.log(`       [`);
  console.log(`         ethers.parseEther("25000000"), // 25M LP`);
  console.log(`         ethers.parseEther("25000000"), // 25M Marketing`);
  console.log(`         ethers.parseEther("25000000"), // 25M Airdrop`);
  console.log(`       ]`);
  console.log(`     )`);
  console.log(`3. Add liquidity on PancakeSwap (LP recipient → pair)`);
  console.log(`4. Lock LP tokens (mudra.website / Team.Finance, 12 months)`);
  console.log(`5. Deploy CleanupMining.sol → grantRole(CLEANUP_MINER_ROLE, mining)`);
  console.log(`6. Submit to CoinGecko & CoinMarketCap`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
