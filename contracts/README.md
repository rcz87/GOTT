# Smart Contracts

Folder ini akan berisi Solidity smart contracts untuk GOTT Protocol.

## Status: **Planning Phase**

Contracts akan di-implement di Phase 1 roadmap (Month 1-2).

## Planned Contracts

Sesuai [docs/04-smart-contracts.md](../docs/04-smart-contracts.md):

- `GuardiansToken.sol` — Main GOTT token (modified dari existing)
- `GarbageCollector.sol` — Main cleanup execution contract
- `CleanupMining.sol` — Reward distribution logic
- `ScamRegistry.sol` — On-chain scam token database
- `LandfillVault.sol` — Treasury holder for collected tokens
- `Governor.sol` — OpenZeppelin Governor untuk DAO
- `Timelock.sol` — Execution delay untuk governance
- `NFTGraveyard.sol` — Curated NFT marketplace (Phase 3)

## Technology Stack (Planned)

- **Language:** Solidity 0.8.24
- **Framework:** Hardhat + Foundry (hybrid)
- **Libraries:** OpenZeppelin Contracts 5.6.1
- **Testing:** Hardhat + Foundry fuzzing
- **Static Analysis:** Slither, Aderyn
- **Network:** BSC Mainnet (Chain ID 56)

## Directory Structure (Future)

```
contracts/
├── core/
│   ├── GuardiansToken.sol
│   ├── GarbageCollector.sol
│   └── CleanupMining.sol
├── registry/
│   └── ScamRegistry.sol
├── treasury/
│   ├── LandfillVault.sol
│   └── NFTGraveyard.sol
├── governance/
│   ├── GOTTGovernor.sol
│   └── GOTTTimelock.sol
├── interfaces/
│   ├── IPancakeRouter.sol
│   └── ...
└── test/
    └── ...
```

## Getting Started (When Development Starts)

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile
forge build

# Run tests
npx hardhat test
forge test

# Run fuzz tests
forge test --match-test testFuzz

# Static analysis
slither .

# Deploy (testnet)
npx hardhat run scripts/deploy.js --network bscTestnet
```

## Security

Lihat [SECURITY.md](../SECURITY.md) untuk security policy dan bug bounty info.

**Sebelum deployment:**
- [ ] Unit tests coverage > 90%
- [ ] Fuzz tests pass (10k+ runs)
- [ ] Slither clean (0 findings)
- [ ] Manual review checklist complete
- [ ] External audit (SolidProof/Hacken/QuillAudits)
- [ ] Bug bounty launched (Immunefi)
