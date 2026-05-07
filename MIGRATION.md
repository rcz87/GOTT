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
  ├── [REMOVE] Anti-whale mechanism (maxWalletAmount + exempt mapping + 3 setters) — full delete, no slot reservation (immutable, no proxy)
  ├── [ADD]    CLEANUP_MINER_ROLE
  ├── [ADD]    MAX_MINT_PER_DAY constant (1.4M) + mintedPerDay mapping
  ├── [ADD]    mintReward(to, amount) function
  ├── [ADD]    currentDayMinted() / remainingMintCapacity() views
  ├── [ADD]    distributeInitial(recipients[], amounts[]) — one-shot, guarded by `initialized` flag
  └── [CHANGE] Constructor mints 0; initialMintPercent param dihapus (split distribution via distributeInitial)

NEW CONTRACTS (P0 = required for launch)
  ├── GarbageCollector.sol   (P0) — cleanup execution, PancakeSwap integration
  ├── CleanupMining.sol      (P0) — reward calculation, epoch multipliers
  ├── ScamRegistry.sol       (P1) — on-chain token status DB
  ├── LandfillVault.sol      (P1) — treasury holder
  ├── Governor.sol           (P2) — OZ Governor
  ├── Timelock.sol           (P2) — OZ TimelockController
  └── NFTGraveyard.sol       (P3) — curated dead-NFT marketplace (post-launch)
```

## Spec Inconsistencies — RESOLVED (2026-05-07)

### 1. Daily mint cap — FIXED at `1_400_000 ether`, renamed `MAX_MINT_PER_DAY`

Math: Mining pool Epoch 1 = 250M GOTT / 180 days = ~1.389M/day → 1.4M cap fits with ~1% buffer. 1M would block natural emission.

Renamed dari `MAX_MINT_PER_EPOCH` → `MAX_MINT_PER_DAY` (dan `mintedPerEpoch` → `mintedPerDay`) supaya tidak bertabrakan dengan istilah "epoch" 180-hari di `CleanupMining.sol` (halving). `EPOCH_DURATION = 1 days` constant juga di-drop dari token — pakai `1 days` inline. Updated di:
- `BLUEPRINT.md` §5.1
- `docs/04-smart-contracts.md` §1 (termasuk `IGuardiansToken` interface di §3)

### 2. Initial mint — FIXED: split distribution

Constructor mint 0. Tambah fungsi `distributeInitial(address[] recipients, uint256[] amounts)` yang one-shot (guarded by `bool initialized`) — split TGE allocation (LP 25M / Marketing 25M / Airdrop 25M = 75M total per `BLUEPRINT.md` §6.3) ke multiple recipient dalam single TX. Param `initialMintPercent` v1 dihapus dari constructor signature.

**Why:** v2 punya multi-bucket initial circulating (LP + Marketing + Airdrop), satu param percent gak fit. Split distribution juga easier di-audit (recipient & amount eksplisit di calldata, terverifikasi on-chain).

## Migration Path — Phased

### Phase 0 (current, v0.2.0) — DOCS ONLY
- [x] Consolidate blueprint (zip extracted, docs/ created)
- [x] Archive v1 blueprint
- [x] Write MIGRATION.md + CHANGELOG update
- [x] User review & approval for spec inconsistencies above (2026-05-07)
- [x] Resolve Q1–Q4 (see "Decisions" section below) (2026-05-07)

### Phase 1 (v0.3.0) — MODIFY `GuardiansToken.sol`
- [ ] Create working branch (jangan di main)
- [ ] Remove anti-whale code in full (`maxWalletAmount`, `isExemptFromMaxWallet`, 3 setters, modifier, related events) — no storage slot reserved (immutable)
- [ ] Drop `initialMintPercent` from constructor; constructor mints 0
- [ ] Add `CLEANUP_MINER_ROLE` + `MAX_MINT_PER_DAY` (1.4M) + `mintedPerDay` mapping
- [ ] Add `mintReward()` function with daily cap + MAX_SUPPLY check
- [ ] Add `currentDayMinted()` + `remainingMintCapacity()` views
- [ ] Add `distributeInitial(recipients[], amounts[])` one-shot guarded by `bool initialized`
- [ ] Update `scripts/deploy.js` — pass recipient/amount arrays for initial distribution (LP/Marketing/Airdrop)
- [ ] Update existing tests (anti-whale tests → remove, add mintReward + distributeInitial tests)
- [ ] Update Foundry fuzz (new invariants: daily cap never exceeded, initialized one-shot)
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

## Decisions (2026-05-07)

Empat keputusan yang sebelumnya block Phase 1 sudah di-resolve oleh user (rcz87):

### Q1 — Initial mint: **Split distribution**
Constructor mint 0. Tambah `distributeInitial(address[] recipients, uint256[] amounts)` one-shot yang split ke multiple recipient (LP/Marketing/Airdrop) sesuai blueprint §6.3. Param `initialMintPercent` v1 dihapus.

### Q2 — Anti-whale: **Remove totally**
Hapus storage slot, modifier, 3 setter, exempt mapping, dan related events — full delete. Konsisten dengan Q4 (immutable: gak butuh slot reservation buat future toggle).

### Q3 — Epoch definition: **Daily**
Token-side pakai `block.timestamp / 1 days`. Konstanta + mapping di-rename:
- `MAX_MINT_PER_EPOCH` → `MAX_MINT_PER_DAY`
- `mintedPerEpoch` → `mintedPerDay`
- `EPOCH_DURATION = 1 days` constant di token → dropped (pakai `1 days` inline)

Istilah "epoch" reserved untuk halving 180-hari di `CleanupMining.sol`. Zero ambiguity saat kedua contract co-exist.

### Q4 — Upgradability: **Immutable** (sama seperti v1)
Tidak ada proxy. Audit lebih simpel, gak ada admin-key risk, gak perlu storage layout discipline. Trade-off: bug post-launch = redeploy + migration. Mitigasi: Slither + Foundry fuzz coverage tinggi sebelum mainnet.

### Phase 1 entry criteria — UNBLOCKED
Phase 1 (v0.3.0) sekarang boleh dimulai. Workflow: working branch → diff plan review user → implement → tests → Slither → Foundry → user review → merge.
