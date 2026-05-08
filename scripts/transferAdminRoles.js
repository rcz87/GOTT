/**
 * Phase 3 PR #2 — Transfer admin roles on the 5 protocol contracts to the Timelock,
 * then renounce the deployer's own admin holdings.
 *
 * Required env vars:
 *   TIMELOCK_ADDRESS, GOTT_ADDRESS, SCAM_REGISTRY_ADDRESS, LANDFILL_VAULT_ADDRESS,
 *   CLEANUP_MINING_ADDRESS, GARBAGE_COLLECTOR_ADDRESS
 *
 * Optional:
 *   EXECUTE=true                  — actually run grants + renounces (default: dry-run only)
 *   RENOUNCE_TIMELOCK_ADMIN=true  — final irreversible step: deployer renounces
 *                                   DEFAULT_ADMIN_ROLE on Timelock itself.
 *
 * Roles preserved (DO NOT TOUCH):
 *   - GuardiansToken.CLEANUP_MINER_ROLE  (held by CleanupMining contract)
 *   - CleanupMining.COLLECTOR_ROLE       (held by GarbageCollector contract)
 *   - ScamRegistry.ORACLE_ROLE           (held by backend signer)
 *   - Timelock.PROPOSER_ROLE / CANCELLER_ROLE (held by Governor)
 *   - Timelock.EXECUTOR_ROLE             (open: address(0))
 *
 * The script is idempotent: grantRole no-ops on already-granted, renounceRole no-ops
 * on already-renounced. Safe to re-run if interrupted.
 */
const { ethers, network } = require("hardhat");

// (factory name, env var, role names to transfer to Timelock)
const TARGETS = [
  { name: "GuardiansToken",  envVar: "GOTT_ADDRESS",            roles: ["DEFAULT_ADMIN_ROLE", "MINTER_ROLE", "PAUSER_ROLE"] },
  { name: "ScamRegistry",    envVar: "SCAM_REGISTRY_ADDRESS",   roles: ["DEFAULT_ADMIN_ROLE", "PAUSER_ROLE"] },
  { name: "LandfillVault",   envVar: "LANDFILL_VAULT_ADDRESS",  roles: ["DEFAULT_ADMIN_ROLE", "DAO_ROLE", "EMERGENCY_ROLE", "PAUSER_ROLE"] },
  { name: "CleanupMining",   envVar: "CLEANUP_MINING_ADDRESS",  roles: ["DEFAULT_ADMIN_ROLE", "ADMIN_ROLE", "PAUSER_ROLE"] },
  { name: "GarbageCollector",envVar: "GARBAGE_COLLECTOR_ADDRESS", roles: ["DEFAULT_ADMIN_ROLE", "ADMIN_ROLE", "PAUSER_ROLE"] },
];

async function resolveRoles(contract, roleNames) {
  // OZ AccessControl exposes each *_ROLE as a public constant getter; DEFAULT_ADMIN_ROLE is bytes32(0).
  const out = [];
  for (const name of roleNames) {
    const value = name === "DEFAULT_ADMIN_ROLE"
      ? ethers.ZeroHash
      : await contract[name]();
    out.push({ name, value });
  }
  return out;
}

/**
 * Core transfer logic — exported for use by tests too.
 */
async function transferRolesToTimelock({ deployer, timelockAddress, targets, log = console.log }) {
  // 1. Grant all roles to Timelock.
  for (const t of targets) {
    log(`\n--- Grants on ${t.name} (${t.address}) ---`);
    for (const role of t.resolvedRoles) {
      const has = await t.contract.hasRole(role.value, timelockAddress);
      if (has) {
        log(`  ✓ Timelock already has ${role.name}`);
      } else {
        await (await t.contract.connect(deployer).grantRole(role.value, timelockAddress)).wait();
        log(`  + Granted ${role.name} to Timelock`);
      }
    }
  }

  // 2. Verify Timelock has every role.
  for (const t of targets) {
    for (const role of t.resolvedRoles) {
      const has = await t.contract.hasRole(role.value, timelockAddress);
      if (!has) throw new Error(`Verification failed: Timelock missing ${role.name} on ${t.name}`);
    }
  }
  log("\n✓ Timelock holds every listed role.");

  // 3. Deployer renounces every role on every target contract.
  for (const t of targets) {
    log(`\n--- Renounce by deployer on ${t.name} ---`);
    for (const role of t.resolvedRoles) {
      const has = await t.contract.hasRole(role.value, deployer.address);
      if (!has) {
        log(`  ✓ Deployer already without ${role.name}`);
      } else {
        await (await t.contract.connect(deployer).renounceRole(role.value, deployer.address)).wait();
        log(`  − Renounced ${role.name}`);
      }
    }
  }

  // 4. Verify deployer holds none of the listed roles.
  for (const t of targets) {
    for (const role of t.resolvedRoles) {
      const has = await t.contract.hasRole(role.value, deployer.address);
      if (has) throw new Error(`Verification failed: deployer still holds ${role.name} on ${t.name}`);
    }
  }
  log("\n✓ Deployer no longer holds any of the listed roles on any target contract.");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
  const EXECUTE = process.env.EXECUTE === "true";
  const RENOUNCE_TIMELOCK_ADMIN = process.env.RENOUNCE_TIMELOCK_ADMIN === "true";

  console.log("========================================");
  console.log("  ROLE TRANSFER → TIMELOCK");
  console.log("========================================");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Mode:     ${EXECUTE ? "EXECUTE (state-changing)" : "DRY-RUN (no transactions)"}`);
  console.log("----------------------------------------");

  if (!TIMELOCK_ADDRESS) throw new Error("Set TIMELOCK_ADDRESS env var.");
  console.log(`Timelock: ${TIMELOCK_ADDRESS}`);

  // Resolve each target contract + its role bytes32 values.
  const targets = [];
  for (const t of TARGETS) {
    const addr = process.env[t.envVar];
    if (!addr) throw new Error(`Set ${t.envVar} env var.`);
    const contract = await ethers.getContractAt(t.name, addr);
    const resolvedRoles = await resolveRoles(contract, t.roles);
    targets.push({ ...t, address: addr, contract, resolvedRoles });
  }

  // Print plan.
  console.log("\nPlan:");
  for (const t of targets) {
    console.log(`  ${t.name} @ ${t.address}`);
    for (const role of t.resolvedRoles) {
      console.log(`    grant   ${role.name.padEnd(22)} → Timelock`);
      console.log(`    renounce ${role.name.padEnd(21)} ← deployer`);
    }
  }
  if (RENOUNCE_TIMELOCK_ADMIN) {
    console.log(`  Timelock @ ${TIMELOCK_ADDRESS}`);
    console.log(`    renounce DEFAULT_ADMIN_ROLE  ← deployer  (IRREVERSIBLE)`);
  }

  if (!EXECUTE) {
    console.log("\nDry-run only. Re-run with EXECUTE=true to perform the transfer.");
    return;
  }

  // Execute transfer.
  await transferRolesToTimelock({ deployer, timelockAddress: TIMELOCK_ADDRESS, targets });

  // Optional final lock-down.
  if (RENOUNCE_TIMELOCK_ADMIN) {
    console.log("\n--- Renouncing deployer's DEFAULT_ADMIN_ROLE on Timelock (IRREVERSIBLE) ---");
    const timelock = await ethers.getContractAt("GuardiansTimelockController", TIMELOCK_ADDRESS);
    const adminRole = ethers.ZeroHash;
    const has = await timelock.hasRole(adminRole, deployer.address);
    if (!has) {
      console.log("  ✓ Deployer already without DEFAULT_ADMIN_ROLE on Timelock");
    } else {
      await (await timelock.connect(deployer).renounceRole(adminRole, deployer.address)).wait();
      console.log("  − Renounced. Timelock is now self-governing (only Governor can propose).");
    }
  } else {
    console.log("\nNote: deployer still holds DEFAULT_ADMIN_ROLE on Timelock itself.");
    console.log("To complete lock-down, re-run with RENOUNCE_TIMELOCK_ADMIN=true once verified.");
  }

  console.log("\n========================================");
  console.log("  TRANSFER COMPLETE");
  console.log("========================================");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { transferRolesToTimelock, TARGETS, resolveRoles };
