# Changelog

All notable changes to GOTT Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-04-17 — Pivot to Full Protocol

### Scope Change
Repository pivot dari **single-contract BEP-20 token** menjadi **full multi-contract protocol** (Cleanup Engine + Proof-of-Cleanup Mining + Landfill DAO).

### Added
- `BLUEPRINT.md` v2 — full protocol blueprint (14 chapters)
- `docs/00-14` — detailed per-chapter specs
- `MIGRATION.md` — v1 → v2 transition plan
- `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`
- Placeholder READMEs: `contracts/`, `scripts/`, `frontend/`
- `docs/archive/BLUEPRINT-v1.md` — preserved v1 blueprint for historical reference

### Changed
- `BLUEPRINT.md` replaced with v2 (v1 archived at `docs/archive/BLUEPRINT-v1.md`)

### Preserved (unchanged in this commit)
- `contracts/GuardiansToken.sol` — v1 contract, Slither clean, Foundry fuzz pass
- `CATATAN_BELAJAR.md` — learning journal (8 phases)
- `test/GuardiansToken.test.js`, `test-foundry/GuardiansToken.t.sol`
- `scripts/deploy.js`, `hardhat.config.js`, `foundry.toml`, `package.json`

### Planned for v0.3.0 (pending user confirmation)
- `GuardiansToken.sol` modifications: remove anti-whale, add `CLEANUP_MINER_ROLE` + `MAX_MINT_PER_EPOCH`
- New contracts: `GarbageCollector`, `CleanupMining`, `ScamRegistry`, `LandfillVault`, `Governor`, `Timelock`
- Audit engagement (SolidProof / Hacken tier)

### Known Spec Inconsistencies (resolve before implementation)
- `MAX_MINT_PER_EPOCH`: `BLUEPRINT.md` §5.1 says 1M, `docs/04-smart-contracts.md` says 1.4M. Math check (Epoch 1 avg ≈ 1.39M/day) → 1.4M is correct, 1M stale.
- Constructor signature: v1 uses `initialMintPercent` (tested with 40%). v2 tokenomics targets 75M initial circulating (7.5%) — constructor signature change needed.

## [0.1.0] - Initial Token Implementation

### Added
- `GuardiansToken.sol` — ERC20 + Votes + Permit + Burnable + Pausable + AccessControl + anti-whale
- Hardhat test suite (`test/GuardiansToken.test.js`)
- Foundry fuzz test suite (`test-foundry/GuardiansToken.t.sol`)
- Deploy script (`scripts/deploy.js`) dengan auto-verify BscScan
- Hardhat + Foundry configs
- `CATATAN_BELAJAR.md` — learning journal (Tahap 1-8: console, Permit, Fork BSC, Slither, Foundry fuzz)
- Initial `BLUEPRINT.md` — token-focused spec (now archived at `docs/archive/BLUEPRINT-v1.md`)

### Security
- Slither static analysis: 0 findings
- Foundry fuzz: all invariants pass
- Test coverage: `nonces()` and `supportsInterface()` overrides covered
