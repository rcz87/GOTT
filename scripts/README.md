# Scripts

Folder ini akan berisi deployment, utility, dan automation scripts.

## Status: **Planning Phase**

Scripts akan di-implement bersama contract development.

## Planned Scripts

### Deployment
- `deploy-testnet.ts` — BSC Testnet deployment
- `deploy-mainnet.ts` — BSC Mainnet deployment (with safety checks)
- `setup-roles.ts` — Grant roles between contracts
- `verify-contracts.ts` — BscScan verification

### Utilities
- `generate-airdrop-merkle.ts` — Merkle tree untuk airdrop
- `snapshot-holders.ts` — Snapshot untuk governance
- `backfill-rewards.ts` — Historical reward calculation

### Analytics
- `fetch-cleanup-stats.ts` — Aggregate cleanup data
- `compute-treasury-report.ts` — Monthly treasury report
- `analyze-scam-patterns.ts` — ML training data prep

### Maintenance
- `emergency-pause.ts` — Emergency pause all contracts
- `rotate-signers.ts` — Multisig signer rotation
- `update-classifier.ts` — Deploy new scam classifier

## Safety Principles

For mainnet deployment scripts:
- **Multi-step confirmation** (require typing "CONFIRM" twice)
- **Dry run mode** default
- **Gas estimation** before execution
- **Transaction simulation** via Tenderly atau Hardhat fork
- **Rollback plan** documented

## Usage (When Scripts Exist)

```bash
# Dry run
npx hardhat run scripts/deploy-testnet.ts --network bscTestnet --dry-run

# Actual deployment
npx hardhat run scripts/deploy-testnet.ts --network bscTestnet

# Mainnet (extra caution)
npx hardhat run scripts/deploy-mainnet.ts --network bscMainnet --multi-sig
```

## Documentation

Each script will have:
- Purpose description
- Required parameters
- Example usage
- Safety notes
- Expected gas usage
