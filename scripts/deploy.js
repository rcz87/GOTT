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
  const INITIAL_MINT_PERCENT = 40; // 40% = 400,000,000 GOTT minted at deploy
  // Remaining 60% can be minted later by MINTER_ROLE for:
  //   - Staking rewards
  //   - Ecosystem fund
  //   - Team vesting
  //   - Community airdrops
  // ============================================================

  console.log(`Initial mint: ${INITIAL_MINT_PERCENT}% of 1B = ${(1_000_000_000 * INITIAL_MINT_PERCENT) / 100} GOTT`);
  console.log("Deploying...\n");

  const GuardiansToken = await ethers.getContractFactory("GuardiansToken");
  const token = await GuardiansToken.deploy(INITIAL_OWNER, INITIAL_MINT_PERCENT);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(`✅ GOTT deployed to: ${address}`);
  console.log(`   Total supply:     ${ethers.formatEther(await token.totalSupply())} GOTT`);
  console.log(`   Max wallet:       ${ethers.formatEther(await token.maxWalletAmount())} GOTT`);
  console.log(`   Mintable remain:  ${ethers.formatEther(await token.mintableSupply())} GOTT`);

  // Verify on BscScan (skip for local/testnet if no API key)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳ Waiting 15s for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [INITIAL_OWNER, INITIAL_MINT_PERCENT],
      });
      console.log("✅ Contract verified on BscScan!");
    } catch (e) {
      console.log("⚠️  Verification failed:", e.message);
      console.log("   Manual verify: npx hardhat verify --network", network.name, address, INITIAL_OWNER, INITIAL_MINT_PERCENT);
    }
  }

  // Summary
  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`Contract:    ${address}`);
  console.log(`BscScan:     https://bscscan.com/token/${address}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`1. Add liquidity on PancakeSwap`);
  console.log(`2. Lock LP tokens (mudra.website)`);
  console.log(`3. Submit to CoinGecko & CoinMarketCap`);
  console.log(`4. Set exempt for PancakeSwap pair:`);
  console.log(`   token.setExemptFromMaxWallet(PAIR_ADDRESS, true)`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
