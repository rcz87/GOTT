# MIGRATION — v1 → v2

Dokumen ini menjelaskan transisi dari **GOTT v1 (single-contract BEP-20 token)** ke **GOTT v2 (full multi-contract protocol)**.

## TL;DR

- **v1** = Token BEP-20 standalone. Contract: `contracts/GuardiansToken.sol`. Status: Slither clean, Foundry fuzz pass, belum deploy mainnet.
- **v2** = Full protocol: token (modifikasi) + 6 contract baru + backend + frontend + DAO.
- Transisi = **incremental modification**, bukan rewrite. Existing tests preserved, contract v1 tetap jadi basis.

## State Snapshot (sebelum v0.3.0 implementation)

### Sudah ada di repo dan AMAN (jangan diubah tanpa izin)

| File | Status |
|------|--------|
| `contracts/GuardiansToken.sol` | v1, tested, Slither clean |
| `test/GuardiansToken.test.js` | Hardhat suite, passing |
| `test-foundry/GuardiansToken.t.sol` | Foundry fuzz, passing |
| `scripts/deploy.js` | Hardhat deploy + verify |
| `hardhat.config.js` | evmVersion=cancun, Solidity 0.8.24 |
| `foundry.toml` | Foundry config |
| `package.json` / `package-lock.json` | OZ v5.1+ |
| `CATATAN_BELAJAR.md` | Learning journal |

### Sudah ada di repo, ditambahkan v0.2.0

| File | Purpose |
|------|---------|
| `BLUEPRINT.md` | v2 full protocol blueprint |
| `docs/00-14-*.md` | Per-chapter detailed spec |
| `docs/archive/BLUEPRINT-v1.md` | v1 blueprint preserved |
| `MIGRATION.md` (this file) | Transition plan |
| `LICENSE`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md` | Standard project files |

## Contract Inventory

### v1 (existing)

```
GuardiansToken.sol — ERC20 + Votes + Permit + Burnable + Pausable + AccessControl
  ├── Anti-whale (maxWalletAmount, toggleable, with exempt mapping)
  ├── Roles: DEFAULT_ADMIN, MINTER, PAUSER
  ├── MAX_SUPPLY = 1B
  └── Constructor: (initialOwner, initialMintPercent)
```

### v2 target

```
GuardiansToken.sol — MODIFIED (incremental)
  ├── [KEEP]   ERC20 + Votes + Permit + Burnable + Pausable + AccessControl
  ├── [KEEP]   MAX_SUPPLY = 1B
  ├── [KEEP]   Roles: DEFAULT_ADMIN, MINTER, PAUSER
  ├── [REMOVE] Anti-whale mechanism (maxWalletAmount + exempt mapping + 3 setters)
  ├── [ADD]    CLEANUP_MINER_ROLE
  ├── [ADD]    MAX_MINT_PER_EPOCH constant + mintedPerEpoch mapping
  ├── [ADD]    mintReward(to, amount) function
  ├── [ADD]    currentEpochMinted() / remainingMintCapacity() views
  └── [CHANGE] Constructor signature — initial mint reduced to ~7.5% (75M)

NEW CONTRACTS (P0 = required for launch)
  ├── GarbageCollector.sol   (P0) — cleanup execution, PancakeSwap integration
  ├── CleanupMining.sol      (P0) — reward calculation, epoch multipliers
  ├── ScamRegistry.sol       (P1) — on-chain token status DB
  ├── LandfillVault.sol      (P1) — treasury holder
  ├── Governor.sol           (P2) — OZ Governor
  ├── Timelock.sol           (P2) — OZ TimelockController
  └── NFTGraveyard.sol       (P3) — curated dead-NFT marketplace (post-launch)
```

## Spec Inconsistencies to Resolve FIRST

Sebelum sentuh kode, dua angka berikut konflik antar dokumen v2 — pilih final value dulu:

### 1. `MAX_MINT_PER_EPOCH`

| Dokumen | Value |
|---------|-------|
| `BLUEPRINT.md` §5.1 | `1_000_000 ether` (1M/day) |
| `docs/04-smart-contracts.md` §1 | `1_400_000 ether` (1.4M/day) |

**Math check:**
- Mining pool Epoch 1 = 250M GOTT over 180 days → average **1.389M/day**
- 1M cap → akan block emisi natural Epoch 1 hari-hari peak cleanup
- 1.4M cap → fits dengan ~1% buffer

**Rekomendasi:** `1_400_000 ether`. Update `BLUEPRINT.md` §5.1 untuk match `docs/04`.

### 2. Initial mint

| Dokumen | Value |
|---------|-------|
| v1 constructor | `initialMintPercent` param (tested 40% = 400M) |
| `BLUEPRINT.md` §6.3 | 75M initial circulating (7.5%) |

**Rekomendasi:** Constructor tetap parameterized, tapi deploy script pakai `7.5` (atau mint 0 di constructor dan distribusi via separate functions untuk LP/airdrop/marketing). Decision point sebelum coding.

## Migration Path — Phased

### Phase 0 (current, v0.2.0) — DOCS ONLY
- [x] Consolidate blueprint (zip extracted, docs/ created)
- [x] Archive v1 blueprint
- [x] Write MIGRATION.md + CHANGELOG update
- [ ] User review & approval for spec inconsistencies above

### Phase 1 (v0.3.0) — MODIFY `GuardiansToken.sol`
- [ ] Create working branch (jangan di main)
- [ ] Remove anti-whale code
- [ ] Add `CLEANUP_MINER_ROLE` + `MAX_MINT_PER_EPOCH` logic
- [ ] Add `mintReward()` function
- [ ] Update existing tests (anti-whale tests → remove, add mintReward tests)
- [ ] Update Foundry fuzz (new invariants)
- [ ] Re-run Slither → target 0 findings
- [ ] Re-run Foundry fuzz → all pass

### Phase 2 (v0.4.0) — Deploy new contracts
- [ ] `ScamRegistry.sol` (simplest, independent)
- [ ] `LandfillVault.sol`
- [ ] `CleanupMining.sol`
- [ ] `GarbageCollector.sol`
- [ ] Integration tests (Hardhat fork BSC)
- [ ] Grant `CLEANUP_MINER_ROLE` to CleanupMining
- [ ] Grant `COLLECTOR_ROLE` to GarbageCollector

### Phase 3 (v0.5.0) — Governance
- [ ] `TimelockController` (OZ standard)
- [ ] `Governor` (OZ Governor + GovernorVotes)
- [ ] Transfer admin roles to Timelock

### Phase 4 (v0.6.0) — Audit & Testnet
- [ ] Internal review checklist
- [ ] Audit vendor quote (SolidProof / Hacken)
- [ ] Submit audit
- [ ] Fix findings
- [ ] BSC testnet deploy
- [ ] Bug bounty (Immunefi)

### Phase 5 (v1.0.0) — Mainnet
- [ ] BSC mainnet deploy
- [ ] Verify on BscScan
- [ ] Initial liquidity (paired BNB)
- [ ] LP lock 12 months
- [ ] Listings (CoinGecko, CMC)

## Non-Breaking Guarantees

Selama migrasi, yang tidak akan pernah berubah tanpa diskusi:
- `CATATAN_BELAJAR.md` — dokumen pembelajaran personal
- `MAX_SUPPLY = 1_000_000_000 ether` — hard cap
- Token name / symbol: `Guardians Token` / `GOTT`
- Solidity version: `0.8.24`
- OpenZeppelin version: current (v5.1+)
- EVM version: `cancun` (required by OZ v5.1+ Bytes.sol `mcopy`)

## Questions Before Coding

1. **Initial mint policy**: Keep `initialMintPercent` param, atau switch ke distribusi split (mint 0 di constructor, separate `distributeInitial()` calls)?
2. **Anti-whale removal**: Apakah benar-benar remove total atau kept sebagai toggle-off default (keeps storage slot untuk upgradability)?
3. **Epoch definition**: `mintedPerEpoch` key pakai `block.timestamp / 1 days` (daily), atau `/ EPOCH_DURATION` (6-month mining epoch)? Dua konsep "epoch" bertabrakan di spec.
4. **Upgradability**: Token upgradable (UUPS/Transparent proxy) atau immutable? v1 immutable; v2 spec tidak eksplisit.

Jawaban 4 pertanyaan di atas harus fix sebelum mulai Phase 1 coding.
