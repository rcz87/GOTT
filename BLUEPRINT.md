# GOTT Protocol — Full Blueprint

**Version:** 0.2.0
**Last Updated:** 2026-05-12
**Status:** Phase 1–4 Implemented; Pre-Audit (Phase 4 Audit Prep)

> **Drift note:** This blueprint was originally written at the pre-development stage (v0.1.0, April 2026). As of v0.2.0, §5 has been re-synced to match the contracts actually deployed in PRs #3–#10 on `main`, §10 reflects shipped state, and §13 cross-references the §10 Acknowledged Design Decisions catalog in `docs/INTERNAL_REVIEW.md`. For the authoritative audit-firm view of the protocol, read `docs/INTERNAL_REVIEW.md` — this blueprint is the marketing / vision document.

---

## Table of Contents

1. [Vision & Mission](#1-vision--mission)
2. [Market Problem](#2-market-problem)
3. [Competitive Analysis](#3-competitive-analysis)
4. [Protocol Architecture](#4-protocol-architecture)
5. [Smart Contract Design](#5-smart-contract-design)
6. [Tokenomics](#6-tokenomics)
7. [Cleanup Mining Mechanism](#7-cleanup-mining-mechanism)
8. [Scam Detection Engine](#8-scam-detection-engine)
9. [Landfill DAO](#9-landfill-dao)
10. [Roadmap](#10-roadmap)
11. [Launch Strategy](#11-launch-strategy)
12. [Marketing Playbook](#12-marketing-playbook)
13. [Risk Register](#13-risk-register)
14. [Legal Considerations](#14-legal-considerations)

---

## 1. Vision & Mission

### Vision
Menjadi protokol standar untuk pembersihan sampah blockchain di ekosistem EVM, dimulai dari BSC dan diekspansi ke chain lain.

### Mission
Mengubah sampah blockchain menjadi nilai nyata bagi user melalui:
- Cleanup tool yang aman dan mudah digunakan
- Reward token (GOTT) untuk setiap aksi pembersihan
- Tata kelola sampah kolektif via DAO

### Core Values
- **Kebersihan ekosistem** — Reduce on-chain bloat, tingkatkan efisiensi network
- **Keamanan user** — Lindungi user dari drainer trap & scam token
- **Komunitas lokal** — Indonesia-first, bahasa Indonesia primary
- **Transparansi** — Open source, open database, open governance

---

## 2. Market Problem

### Problem Statement

Setiap wallet crypto yang aktif > 6 bulan akan terkontaminasi oleh 4 tipe sampah:

**Tipe 1 — Dust Token**
- Token bernilai < $5 dari airdrop, swap sisa, fork project
- Nggak worth di-swap karena gas > value
- Contoh: 0.0003 CAKE, 0.5 BUSD dari sisa trade

**Tipe 2 — Scam/Drainer Token**
- Token yang di-airdrop paksa dengan metadata malicious
- Link ke phishing website saat user interact
- Bahaya security jika user coba swap

**Tipe 3 — Dead Token**
- Project yang sudah rug / abandoned
- Liquidity dicabut, tapi token masih di wallet
- Secara teknis ada, secara ekonomi = 0

**Tipe 4 — Spam NFT**
- NFT yang di-airdrop paksa (drainer trap)
- Metadata contains phishing link
- Nggak bisa di-sell, nyangkut di wallet

### Market Size

- **BSC active wallets:** ~500 juta (per BscScan 2026)
- **Estimate dust per wallet:** $2-$50 rata-rata
- **Total dust value on BSC:** potentially $1-25 miliar stranded
- **Audience Indonesia di BSC:** ~15-20% (estimate berdasar Pintu/Indodax volume)

### Why Now

1. BSC user ritel Asia terus bertambah (especially Indonesia)
2. Solana udah punya Sol Incinerator yang dominant — terbukti use case ini valid
3. EVM chains belum punya dominant player untuk cleanup
4. AI/LLM bikin scam detection lebih efektif
5. Regulasi crypto Indonesia makin jelas (Bappebti/OJK)

---

## 3. Competitive Analysis

### Direct Competitors

**Sol Incinerator (Solana)**
- ✅ Dominant di Solana, processed jutaan wallet sejak 2021
- ✅ Business model terbukti (fee % dari reclaim)
- ❌ Solana-only, nggak bisa expand ke EVM (architecture beda)
- ❌ Nggak ada token utility / governance

**Dust Sweeper Tool (EVM)**
- ✅ Multi-chain (22+ EVM networks)
- ✅ Powered by LI.FI Protocol
- ❌ Generic, nggak ada reward token
- ❌ Focus dust swap doang, nggak include scam detection

**DustSweeper (deprecated)**
- ⚠️ Sudah shutdown 2024
- Top hackathon ETHDenver 2022
- Celah pasar terbuka setelah mereka tutup

### Indirect Competitors

- Step Finance (Solana portfolio manager)
- DeBank (portfolio tracker, ada fitur hide dust)
- Zerion (portfolio dashboard)

### GOTT's Differentiation

| Fitur | Sol Incinerator | Dust Sweeper | **GOTT** |
|-------|----------------|--------------|----------|
| Chain | Solana only | EVM multi | BSC + EVM expansion |
| Token reward | ❌ | ❌ | ✅ GOTT mining |
| DAO governance | ❌ | ❌ | ✅ Landfill DAO |
| Scam database | Partial | ❌ | ✅ Open API |
| Bahasa Indonesia | ❌ | ❌ | ✅ Primary |
| NFT Graveyard | Burn only | ❌ | ✅ Curated collection |
| Open source | Partial | ❌ | ✅ Full |

---

## 4. Protocol Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────┐
│                  LAYER 1: CLEANUP ENGINE                │
├─────────────────────────────────────────────────────────┤
│  • Scan wallet untuk dust/scam/dead token + spam NFT    │
│  • Bulk approve + swap via PancakeSwap router           │
│  • Emit event untuk mining reward calculation           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              LAYER 2: PROOF-OF-CLEANUP MINING           │
├─────────────────────────────────────────────────────────┤
│  • Reward GOTT proporsional dengan cleanup volume       │
│  • Halving setiap 6 bulan (diminishing returns)         │
│  • Anti-sybil: min threshold, signature verification    │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                LAYER 3: LANDFILL DAO                    │
├─────────────────────────────────────────────────────────┤
│  • Token sampah terkumpul di Treasury                   │
│  • GOTT holder vote: burn / sell / graveyard / index    │
│  • Revenue dari graveyard NFT & API masuk treasury      │
└─────────────────────────────────────────────────────────┘
```

### Contract Components

```
GuardiansToken.sol (ERC20 + Votes + Pausable + AccessControl)
├── GarbageCollector.sol (main cleanup contract)
├── CleanupMining.sol (reward distribution)
├── LandfillVault.sol (treasury holder)
├── ScamRegistry.sol (on-chain scam token database)
├── NFTGraveyard.sol (curated dead NFT marketplace)
└── Governor.sol + Timelock.sol (DAO governance)
```

### Data Flow

1. **User Scan:** Frontend query wallet → backend classify tokens
2. **User Approve:** Batch approve semua token target ke `GarbageCollector`
3. **Execute:** Contract swap token via PancakeSwap, collect BNB
4. **Reward:** Emit event → `CleanupMining` calculate GOTT reward
5. **Treasury:** Non-swappable tokens masuk `LandfillVault`
6. **Distribute:** User dapet BNB + GOTT, DAO dapet ownership sampah

---

## 5. Smart Contract Design

### 5.1 GuardiansToken.sol (Shipped — PR #3)

Modifikasi dari contract existing:
- **Remove:** Anti-whale max wallet (biar distribution mining natural)
- **Keep:** ERC20Votes, ERC20Permit, Pausable, AccessControl, Burnable
- **Add:** `CLEANUP_MINER_ROLE` — role untuk CleanupMining contract bisa mint
- **Add:** Daily mint cap (anti-exploit). Naming `PER_DAY` dipilih supaya tidak bertabrakan dengan istilah "epoch" 180-hari di `CleanupMining.sol` (halving).

```solidity
bytes32 public constant CLEANUP_MINER_ROLE = keccak256("CLEANUP_MINER_ROLE");
uint256 public constant MAX_SUPPLY      = 1_000_000_000 ether;  // 1B hard cap
uint256 public constant MAX_MINT_PER_DAY = 1_400_000 ether;     // 1.4M/hari (~1.389M/day avg for Epoch 1)
mapping(uint256 => uint256) public mintedPerDay;                // key = block.timestamp / 1 days

error MaxSupplyExceeded();
error DailyCapExceeded();

function mintReward(address to, uint256 amount)
    external onlyRole(CLEANUP_MINER_ROLE)
{
    if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
    uint256 day = block.timestamp / 1 days;
    if (mintedPerDay[day] + amount > MAX_MINT_PER_DAY) revert DailyCapExceeded();
    mintedPerDay[day] += amount;
    _mint(to, amount);
}
```

**Implementation drift vs. original spec:** Switched to OZ v5.1.0 custom errors (no `require` strings) per Slither / gas hygiene. See `docs/INTERNAL_REVIEW.md` §4.1 for full audit-grade write-up.

### 5.2 GarbageCollector.sol (Shipped — PR #7, with EIP-712 added in PR #10)

Main contract untuk cleanup operation.

**Core Function (Phase 4 — EIP-712 signed authorization):**
```solidity
function cleanupBatch(
    address[] calldata tokens,
    uint256[] calldata amounts,
    uint256 minBnbOut,
    uint256 cleanupValueUSD,    // off-chain-computed, 1e18-scaled
    uint256 nonce,              // per-user, monotonic
    uint256 deadline,           // unix timestamp
    bytes   calldata signature  // EIP-712 signed by oracleSigner
) external nonReentrant whenNotPaused returns (uint256 totalBnbReceived);

function sendScamToLandfill(
    address[] calldata tokens,
    uint256[] calldata amounts
) external nonReentrant whenNotPaused;
```

**Why EIP-712 was added in Phase 4:** original v0.1 spec used a `bytes metadata` parameter for `cleanupValueUSD`, which would have let users self-report reward inputs and game the system. The Phase 4 redesign moves `cleanupValueUSD` into a backend-signed `CleanupAuthorization` struct with per-user nonce + deadline. See `docs/INTERNAL_REVIEW.md` §4.5 for the full security argument.

**Security Features:**
- Reentrancy guard (`nonReentrant` on every state-mutating external function)
- Pausable (emergency stop on both cleanup paths)
- Per-batch slippage protection (`minBnbOut` user-supplied)
- **Immutable** router + WBNB + ScamRegistry (set at deploy, cannot be re-pointed)
- Max tokens per cleanup (`maxTokensPerCleanup ≤ MAX_TOKENS_HARD_CAP = 50`, gas/DoS bound)
- EIP-712 signed `cleanupValueUSD` (single-use nonce + deadline)
- Swap-fail fallback → forward token to LandfillVault (see AD-08 in INTERNAL_REVIEW.md §10)

**Out of scope v0.3 (deferred from original spec):**
- `cleanupNFT(...)` — NFT cleanup not implemented; depends on `NFTGraveyard.sol` (§5.6 below, also deferred).
- `estimateCleanup(...)` view function — replaced by `hashCleanupAuth(...)` helper for off-chain digest reconstruction; full estimate logic lives in the backend signer service.

### 5.3 CleanupMining.sol (Shipped — PR #6)

Handle reward distribution logic.

**Emission model — halving multiplier (not a fixed pool):**

The shipped contract does **not** carve out a fixed 500M "mining pool" with absolute per-epoch caps. Instead, emission is governed by:

1. A **halving multiplier per epoch** (4 epochs of 180 days each, then zero):

| Epoch | Window (days from `LAUNCH_TIMESTAMP`) | `epochMultiplier` |
|---|---|---|
| 0 | 0–180 | `1.0e18` |
| 1 | 180–360 | `0.5e18` |
| 2 | 360–540 | `0.25e18` |
| 3 | 540–720 | `0.125e18` |
| 4+ | 720+ | `0` (mining ends) |

2. A **per-day mint cap** enforced *downstream* on the GOTT token (§5.1): `MAX_MINT_PER_DAY = 1.4M GOTT`.

Combined with the daily cap, total emission through the cleanup-mining path is bounded to **slightly under `MAX_SUPPLY` = 1B GOTT** across the full 720-day window. See `docs/INTERNAL_REVIEW.md` §4.4.10 for the full sanity check and Appendix C for the derivation.

**Reward Formula (shipped):**
```
reward = baseRate × cleanupValueUSD × tierMultiplier × epochMultiplier
```

Implemented as divide-before-multiply (see `docs/INTERNAL_REVIEW.md` §4.4.12 / AD-05 for the overflow rationale).

Where:
- `baseRate`: `100 ether` GOTT per $1 USD (mutable via `setBaseRate(uint256)` under `ADMIN_ROLE`, capped at `MAX_BASE_RATE = 1000 ether`)
- `cleanupValueUSD`: USD value of tokens cleaned (1e18-scaled, signed by oracle — see §5.2)
- `tierMultiplier`:
  - First cleanup: `2.0e18` (2× bonus)
  - `cleanupValueUSD ≥ tierSilver` ($1000 default): `1.25e18`
  - `cleanupValueUSD ≥ tierBronze` ($100 default): `1.5e18`
  - Default: `1.0e18`
  - **Order matters:** silver check happens *first* — at value ≥ $1000 the user gets `1.25×`, not `1.5×`. This is an intentional anti-whale gradient (see `docs/INTERNAL_REVIEW.md` §4.4.6).
- `epochMultiplier`: halving table above

Thresholds `tierBronze` and `tierSilver` are mutable via `setTierThresholds(uint256, uint256)` under `ADMIN_ROLE` (= Timelock post-B.5).

### 5.4 LandfillVault.sol (Shipped — PR #5)

Treasury holder untuk token sampah.

**Features:**
- Receive tokens dari `GarbageCollector` (explicit push via `sendScamToLandfill`, implicit push via swap-fail fallback in `cleanupBatch`)
- View balance per token (`balanceOf(token)`)
- DAO actions (`burnToken`, `transferToken`) gated by `DAO_ROLE` — held by Timelock post-Phase-B.5
- **`EMERGENCY_ROLE`** can `emergencyWithdraw(token, to)` **even while paused** — circuit breaker for a compromised vault. Currently held by Timelock; original intent was a separate multisig (see AD-04 in INTERNAL_REVIEW.md §10)
- Pausable (`PAUSER_ROLE`)

See `docs/INTERNAL_REVIEW.md` §4.3 for full role / behaviour walkthrough.

### 5.5 ScamRegistry.sol (Shipped — PR #4)

On-chain scam token database (hybrid).

**Structure (shipped — bundled into a single `TokenInfo` struct for storage efficiency):**
```solidity
enum TokenStatus {
    Unknown,
    Legit,
    Dust,        // low value
    Dead,        // no liquidity
    Scam,        // confirmed malicious
    Drainer,     // active threat
    Honeypot     // can buy, cant sell
}

struct TokenInfo {
    TokenStatus status;       // current classification
    uint64      lastUpdated;  // unix timestamp of last status change
    uint64      reportCount;  // monotonic counter of successful writes (per I-05)
    address     reportedBy;   // most recent writer
}

mapping(address => TokenInfo) public tokenInfo;
```

The original spec used three separate mappings; the shipped contract bundles them into one struct to halve cold-SLOAD cost on read paths (`GarbageCollector.cleanupBatch` reads `isScamOrDrainer` per token per batch — gas matters at `MAX_TOKENS_HARD_CAP = 50`).

**Update Mechanism:**
- Backend oracle (initial — `ORACLE_ROLE` held by off-chain key)
- DAO vote (medium-term — `ORACLE_ROLE` could be granted to a Governor proposal target)
- Reputation-based community reporting (long-term — not yet designed)

See `docs/INTERNAL_REVIEW.md` §4.2 for full role / behaviour walkthrough.

### 5.6 NFTGraveyard.sol — **deferred to v0.3+ (out of current scope)**

Originally specced as a curated marketplace untuk dead NFT (wrap → "Tombstone NFT" → sell as blockchain-archaeology collectible, revenue split 50% treasury / 30% burn / 20% curator).

**Status:** **Not implemented.** Removed from the Phase 1–5 scope because:

1. The ERC-20 cleanup engine has higher user-impact priority and a cleaner trust boundary (no per-NFT provenance / metadata curation problem).
2. Tombstone NFT economics depend on an active secondary market that does not yet exist around dead NFTs on BSC.
3. The legal positioning for selling "rug NFTs as collectibles" needs separate Indonesian regulatory review (§14).

May be revisited as a v0.3+ feature once the core cleanup-engine has steady-state usage. The blueprint slot is retained as a signal of long-term intent; **no contract code is shipped or planned for v0.2.x**.

---

## 6. Tokenomics

### 6.1 Token Specs

| Item | Value |
|------|-------|
| Name | Guardians of The Token |
| Symbol | GOTT |
| Chain | BSC (BEP-20) |
| Max Supply | 1,000,000,000 (1 Billion) |
| Decimals | 18 |
| Initial Circulating | 75,000,000 (7.5%) |

### 6.2 Allocation

```
┌────────────────────────────────────────────────────┐
│                  GOTT ALLOCATION                   │
├────────────────────────────────────────────────────┤
│  🧹 Cleanup Mining       ██████████████████  50%   │
│  💧 Liquidity Pool       ████████             20%  │
│  🏛️  DAO Treasury        ██████               15%  │
│  👥 Team & Advisors      ████                 10%  │
│  📣 Marketing/Airdrop    ██                    5%  │
└────────────────────────────────────────────────────┘
```

| Allocation | % | Amount | Unlock Schedule |
|------------|---|--------|-----------------|
| Cleanup Mining | 50% | 500M | Emission 24 months, halving per 6mo |
| Liquidity Pool | 20% | 200M | Immediate, LP locked 12 months |
| DAO Treasury | 15% | 150M | Unlock via governance vote |
| Team | 10% | 100M | 12mo cliff + 24mo linear vesting |
| Marketing/Airdrop | 5% | 50M | 50% immediate, 50% over 6 months |

### 6.3 Initial Circulating Supply

Saat deploy (TGE):
- Liquidity (PancakeSwap): 25M
- Marketing immediate: 25M
- Early airdrop (first 1000 users): 25M
- **Total initial circulating: 75M (7.5% of max)**

### 6.4 Emission Curve

```
GOTT Emission Timeline (24 months)

│                                                    
│  ████████████                                      
│  ████████████                                      
│  ████████████                                      
│  ████████████                                      
│  ████████████  ██████                              
│  ████████████  ██████  ███    ███                  
│  ████████████  ██████  ███    ███                  
└──────────────────────────────────────────────►
    Epoch 1     Epoch 2   E3     E4
    250M        125M     62.5M  62.5M
    (month 1-6) (7-12)   (13-18)(19-24)
```

### 6.5 Sink Mechanisms (Deflationary Pressure)

1. **Burn dari NFT Graveyard sales** — 30% of revenue burns GOTT
2. **Burn dari Scam Index API fees** — 50% of API revenue burns GOTT
3. **Voluntary burn** — holder bisa burn untuk boost voting power reputation
4. **Max supply cap** — hard cap 1B, no inflation post emission

---

## 7. Cleanup Mining Mechanism

### 7.1 Participation Flow

```
User Journey:
1. Connect wallet (MetaMask/Trust Wallet/SafePal)
2. Scan wallet — backend analyze 30-60 detik
3. Review hasil scan:
   - Dust tokens (estimated BNB value)
   - Scam tokens (warning icon)
   - Dead tokens (liquidity check failed)
   - Spam NFT (drainer risk score)
4. Select mana yang mau di-cleanup
5. Approve batch (1 atau 2 TX)
6. Execute cleanup
7. Receive: BNB (from swap) + GOTT reward
8. Optional: delegate GOTT untuk voting power
```

### 7.2 Reward Calculation Example

User cleanup 10 token dengan total value $50:
```
baseRate = 100 GOTT per $1
cleanupValue = $50
tierMultiplier = 1x (below $100)
epochMultiplier = 1.0 (Epoch 1)

reward = 100 × 50 × 1 × 1.0 = 5,000 GOTT
```

Whale cleanup 100 token dengan total value $2,000:
```
baseRate = 100 GOTT per $1
cleanupValue = $2,000
tierMultiplier = 1.25x (above $1000)
epochMultiplier = 1.0 (Epoch 1)

reward = 100 × 2000 × 1.25 × 1.0 = 250,000 GOTT
```

### 7.3 Anti-Sybil Mechanisms

1. **Min threshold:** Cleanup value harus > $1 untuk eligible reward
2. **Unique wallet check:** First 100 users dapet 2x bonus, subsequent diminishing
3. **Signature verification:** User sign EIP-712 message saat cleanup
4. **Rate limit:** Max 10 cleanups per wallet per 24 jam
5. **Cooldown:** Reward claim harus wait 1 jam setelah cleanup (anti front-run)

### 7.4 Reward Claim Mechanism

Dua mode:
- **Instant claim:** Reward langsung mint saat cleanup (gas higher)
- **Batch claim:** Accumulate rewards, claim weekly (gas lower, encouraged)

---

## 8. Scam Detection Engine

### 8.1 Detection Pipeline

```
Token Address Input
       ↓
┌─────────────────────┐
│  Off-chain Classifier│  ← ML model + rule-based
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  External API Cross │  ← GoPlus, TokenSniffer, DeFiLlama
│     Reference       │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Liquidity Check    │  ← PancakeSwap pool analysis
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Honeypot Simulator │  ← Fork test buy/sell
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  On-chain Registry  │  ← ScamRegistry.sol update
└─────────────────────┘
```

### 8.2 Classification Rules

**Dust Criteria:**
- Token value < $5 USD (via oracle)
- Not in top 500 tokens by market cap

**Dead Criteria:**
- Liquidity < $1,000 di PancakeSwap
- No swap activity dalam 30 hari terakhir
- LP ownership concentrated > 95% di satu wallet

**Scam Criteria:**
- Contract verified failure pada multiple scam databases
- Honeypot simulator gagal sell
- Contract owner renounce = false AND large mint function exists
- Metadata/name contains phishing URL pattern

**Drainer NFT Criteria:**
- Minted massively (>10k in single TX)
- Metadata contains external URL ke domain baru (<30 hari)
- Transfer gated ke specific wallet

### 8.3 External API Integration

**GoPlus Security:**
- Free tier: 30 req/min
- Endpoint: token security check
- Fallback ketika internal classifier uncertain

**TokenSniffer:**
- Free tier: 100 req/day
- Score-based system (0-100)
- Good untuk early-stage token evaluation

**DeFiLlama:**
- Free tier: unlimited
- Pool liquidity data
- Good untuk liquidity threshold check

### 8.4 Community Reporting

Long-term: enable user report scam token dengan stake GOTT:
- Report valid → reporter dapet reward + stake kembali
- Report invalid (false positive) → stake slashed 50%
- Verified via DAO vote + external API cross-check

---

## 9. Landfill DAO

### 9.1 Governance Structure

```
GOTT Holders
    ↓ (delegate)
Voting Power
    ↓ (propose)
Proposals
    ↓ (vote, 7 days)
Timelock (48 jam delay)
    ↓ (execute)
LandfillVault Actions
```

### 9.2 Proposal Types

**Type A — Fate of Collected Tokens**
- Weekly vote: pilih nasib dari token yang terkumpul minggu itu
- Options: Burn / Bulk Sell / Send to Graveyard / Hold

**Type B — Protocol Parameters**
- Adjust `baseRate` mining reward
- Update scam classifier threshold
- Whitelist/blacklist DEX router

**Type C — Treasury Allocation**
- Grant dari DAO treasury untuk contributors
- Marketing budget approval
- Audit/security expenses

**Type D — Emergency Actions**
- Pause protocol (requires 75% quorum)
- Update contract via proxy (jika pakai upgradeable)
- Blacklist malicious actor

### 9.3 Voting Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Proposal threshold | 100,000 GOTT | ~$500-1000 equivalent, prevent spam |
| Voting period | 7 days | Cukup untuk community awareness |
| Quorum | 4% of circulating | Standard for small DAOs |
| Timelock delay | 48 hours | Allow emergency exit |
| Execution window | 3 days | Force timely execution |

### 9.4 Progressive Decentralization

**Phase 1 (Month 1-6):** Multisig admin (3/5 team + community)
**Phase 2 (Month 7-12):** Hybrid — DAO untuk non-critical, multisig untuk emergency
**Phase 3 (Month 13+):** Full DAO, multisig only for emergency pause

---

## 10. Roadmap

### 10.1 Phase 0 — Blueprint (April 2026) — ✅ Complete
- [x] Market research & competitive analysis
- [x] Architecture design
- [x] Tokenomics modeling
- [ ] Legal consultation (Indonesia regulatory) — ongoing
- [ ] Community Discord/Telegram setup
- [ ] Brand identity (logo, colors, voice)

### 10.2 Phase 1 — Foundation (April–May 2026) — ✅ Complete
- [x] `GuardiansToken.sol` shipped (PR #3, 40+11 tests, Slither 0)
- [x] `ScamRegistry.sol` shipped (PR #4, 29+9 tests, Slither 0)
- [x] `LandfillVault.sol` shipped (PR #5, 27+10 tests, Slither 0)
- [x] `CleanupMining.sol` shipped (PR #6, 38+10 tests, Slither 0)
- [x] `GarbageCollector.sol` v1 shipped (PR #7, 27+6 tests, Slither 0)
- [x] Hardhat + Foundry testing environment configured
- [x] Slither static analysis (achieved: **0 findings across all contracts**)
- [x] Foundry fuzz (500 runs) + invariant tests (100 runs × 50 depth) — all contracts

### 10.3 Phase 2 — Governance + Hardening (May 2026) — ✅ Complete
- [x] `GuardiansTimelockController` + `GuardiansGovernor` shipped (PR #8, 15+5 tests)
- [x] Admin role transfer script + tests (PR #9, 13 tests)
- [x] EIP-712 signed `cleanupValueUSD` authorization (PR #10, 32+9 tests) — Phase 4 audit-blocker closed
- [ ] **Backend service untuk scam detection — pending (off-chain Phase)**
- [ ] **Integrate GoPlus + TokenSniffer APIs — pending**
- [ ] **ML classifier training — pending**
- [ ] **Honeypot simulator (fork-based testing) — pending**
- [ ] **Public API endpoint (rate-limited) — pending**

### 10.4 Phase 3 — Frontend (Month 3-4) — Not started
- [ ] Web app (Next.js + TypeScript + Wagmi)
- [ ] Wallet connect (RainbowKit / Web3Modal)
- [ ] Scan & review UI (Indonesian primary)
- [ ] Cleanup flow with slippage display + EIP-712 signature handshake to backend signer
- [ ] Rewards tracking dashboard
- [ ] Mobile responsive (PWA)
- [ ] Dark/light mode

### 10.5 Phase 4 — Audit & Testnet (May–June 2026) — 🔄 IN PROGRESS
- [x] Internal security review draft — **`docs/INTERNAL_REVIEW.md` v0.2 published (1781 lines, §4 Contract Inventory complete across 7 contracts; §5/§7-§16 pending)**
- [x] AD-01..AD-11 design-acceptance catalog drafted (see INTERNAL_REVIEW.md §10 forward-refs)
- [ ] Master testnet deploy script consolidation (`scripts/deployFull.js`)
- [ ] Audit vendor selection (SolidProof / Hacken / QuillAudits — quotes pending)
- [ ] Submit for audit ($3-15k budget)
- [ ] Fix audit findings
- [ ] Deploy BSC Testnet
- [ ] Public beta (100 invited wallets)
- [ ] Bug bounty launch (Immunefi, $10k pool)

### 10.6 Phase 5 — Mainnet Launch (target Month 5-6) — Not started
- [ ] BSC Mainnet deployment
- [ ] Contract verification on BscScan
- [ ] Initial liquidity add ($50k-$100k)
- [ ] LP lock 12 months (Team.Finance / Mudra)
- [ ] Marketing campaign activation
- [ ] Listing CoinGecko + CMC submission
- [ ] DAO governance activation (Phase B.6 — deployer renounces DEFAULT_ADMIN_ROLE on Timelock)

### 10.7 Phase 6 — Growth (Month 6-12)
- [ ] First DAO vote (dramatic PR stunt: burn 100 scam token)
- [ ] NFT Graveyard marketplace launch
- [ ] Scam Registry API (paid tier untuk wallet providers)
- [ ] Partnership outreach (Trust Wallet, SafePal, TokenPocket)
- [ ] Cross-chain expansion research (ETH, Polygon, Base)
- [ ] Hackathon sponsor (dorong ecosystem builders)

### 10.8 Phase 7 — Expansion (Year 2)
- [ ] ETH mainnet deployment
- [ ] Multi-chain unified dashboard
- [ ] Full DAO handover (renounce multisig admin)
- [ ] Mobile native app
- [ ] Advanced features: auto-cleanup subscription, team accounts, etc

---

## 11. Launch Strategy

### 11.1 Pre-Launch (Month 4-5)

**Community Building:**
- Telegram grup Indonesia (target: 5,000 member sebelum launch)
- Twitter account (target: 10,000 follower)
- Discord server (technical community)
- YouTube channel (tutorial bahasa Indonesia)

**Content Marketing:**
- Blog posts bilingual (ID/EN):
  - "Apa itu Sampah Blockchain?"
  - "Bahaya Drainer NFT yang Nyangkut di Wallet"
  - "Cara Bersihkan Wallet BSC yang Penuh Token Sampah"
- Video demo: "Gue bersihin wallet 3 tahun dan dapet $500"
- Infografis: statistik sampah blockchain di BSC

**Testimonial Program:**
- 100 early tester, personal onboarding
- Screen recording testimonials
- Before/after wallet snapshots

### 11.2 TGE (Token Generation Event)

**No IDO, No Presale** — ini differentiator penting.

Distribusi awal (75M initial circulating):
- 25M → PancakeSwap liquidity (paired dengan BNB)
- 25M → Airdrop ke first 1000 users (25,000 GOTT each)
- 25M → Marketing fund (influencer, content, partnerships)

**Alasan skip IDO:**
- Credibility: "Token yang nggak dijual, cuma di-earn dengan cleanup"
- Legal: reduce securities classification risk
- Narrative: community-first, bukan cash grab
- Organic growth: mining mechanism bring real users

### 11.3 Launch Day Tactics

**H-7 sebelum launch:**
- Whitelist announcement untuk airdrop
- Teaser video viral di TikTok Indonesia
- Influencer outreach (crypto Indonesia Twitter)

**H-Day:**
- Contract deploy + verify live-streamed
- Liquidity add transparent (hash TX di-publish)
- First cleanup event: team cleanup wallet mereka (screen record)
- AMA di Telegram (bahasa Indonesia)

**H+7:**
- Stats dashboard public: total wallets cleaned, total sampah burned
- First DAO proposal (simple: "what should we do with first 1000 collected tokens?")

### 11.4 Post-Launch (Month 6-12)

**PR Stunts:**
- Partnership dengan BSC Foundation (reduce state bloat narrative)
- Charity burn: 1000 scam token → tree planting equivalent
- University partnership (kampus Indonesia yang ada jurusan blockchain)

**User Acquisition:**
- Referral program (10% cleanup reward bonus untuk referrer)
- Content creator fund (pay konten kreator bikin tutorial)
- Telegram bot untuk quick cleanup check

---

## 12. Marketing Playbook

### 12.1 Positioning

**Primary:** "Blockchain garbage protocol — turn trash into value"
**Secondary:** "Indonesian-built, Asia-first crypto hygiene tool"
**Emotional:** "Wallet lu bersih, dompet lu penuh"

### 12.2 Target Audiences

**Tier 1 — Indonesia Crypto Retail (Primary)**
- Demografi: 20-35 tahun, urban, active di Twitter/Telegram
- Pain: wallet penuh scam token, takut drainer, bingung mau apa
- Channel: Twitter Indonesia, Telegram grup trading, YouTube tutorial
- Message: "Bersihin wallet lu sekali, dapet bayaran, aman dari scam"

**Tier 2 — Asia Tenggara Crypto (Secondary)**
- Demografi: Filipina, Vietnam, Thailand
- Channel: Reddit r/CryptoCurrency, local Telegram
- Message: English dengan regional touch

**Tier 3 — Global EVM Users (Future)**
- Demografi: degen traders, airdrop hunters
- Channel: Crypto Twitter, Farcaster, Reddit
- Message: "First multi-chain garbage protocol with native token"

### 12.3 Content Calendar (First 3 Months Post-Launch)

**Week 1-2: Educational**
- "Apa itu dust token?"
- "Cara detect scam token di BSC"
- "Kenapa wallet tua perlu di-cleanup?"

**Week 3-4: Product Demo**
- Video demo full flow
- Tutorial step-by-step
- FAQ compilation

**Month 2: Social Proof**
- User testimonials (Indonesia)
- Case study: "$X saved from Y wallets"
- Media coverage compilation

**Month 3: Community**
- DAO vote explainer
- Contest: "terbanyak cleanup menang GOTT"
- Meme contest (ringan, viral)

### 12.4 Influencer Strategy

**Tier A (Major Indonesia Crypto YouTubers):**
- Target: channel dengan 100k+ subscriber
- Budget: paid partnership + GOTT allocation
- Contoh: Akademi Crypto, CryptoIndonesia, etc

**Tier B (Twitter Indonesia Crypto):**
- Target: 10k-50k follower
- Budget: smaller paid + GOTT allocation
- Focus: authentic review, bukan shill

**Tier C (Community Advocates):**
- Grassroot approach
- Reward mechanism untuk community ambassador
- Monthly meetup (online/offline Jakarta)

### 12.5 Paid Ads Strategy

**Twitter Ads:**
- Target: crypto Indonesia interest
- Budget: $500-$2000/month
- A/B test bahasa Indonesia vs English

**Google Ads:**
- Keyword: "cara bersihkan wallet crypto", "scam token BSC"
- Budget: $300-$1000/month
- Landing page: tutorial + cleanup tool

**TikTok:**
- Focus: viral short content
- Budget: $200-$500/month
- Format: 30-60 detik, educational + demo

### 12.6 Budget Allocation (Month 1-6 Post-Launch)

| Category | Budget (USD) | % |
|----------|--------------|---|
| Influencer partnerships | $15,000 | 30% |
| Paid ads (Twitter/Google/TikTok) | $10,000 | 20% |
| Content production (video, design) | $8,000 | 16% |
| Community rewards/giveaway | $7,000 | 14% |
| Events/meetup | $5,000 | 10% |
| PR/media outreach | $3,000 | 6% |
| Tools & subscriptions | $2,000 | 4% |
| **Total** | **$50,000** | **100%** |

---

## 13. Risk Register

### 13.1 Technical Risks

> **Cross-reference:** As of Draft 0.2 of `docs/INTERNAL_REVIEW.md`, the technical risk surface has been formalised as the **AD-01..AD-11 Acknowledged Design Decisions catalog** (INTERNAL_REVIEW.md §10). Each AD entry carries a proposed severity, a §4 origin reference, and an acceptance rationale. The table below now mirrors that catalog rather than listing generic risks — for the audit-firm view, the INTERNAL_REVIEW.md catalog is authoritative.

| Risk | AD ref | Severity (proposed) | Mitigation |
|------|--------|---------------------|------------|
| `oracleSigner` private-key compromise → unlimited reward mint | AD-07 | 🟡 Med | Per-day cap (`MAX_MINT_PER_DAY = 1.4M`); Timelock rotates key via `setOracleSigner`. Bug-bounty key-comp scenario added to scope. |
| Swap-fail fallback: user loses token to landfill without BNB refund | AD-08 | 🟡 Low–Med | Batch-level `minBnbOut` aborts whole batch if mostly-failed; documented in UI, frontend should surface fallback events. |
| Per-token slippage = 0; sandwich-attack defense relies on user-supplied `minBnbOut` | AD-09 | 🟢 Info | Frontend computes `minBnbOut` from realistic per-block routing quote; future hardening = per-token slippage cap. |
| Timelock open executor (`executors = [address(0)]`) — anyone executes after delay | AD-10 | 🟢 Info | By design — removes liveness dependence on a single relayer. 48 h queue review window is the load-bearing protection. |
| BSC block-time variance (2.5–4 s) shifts effective Governor voting window | AD-11 | 🟢 Info | Voting periods denominated in blocks (`votingDelay = 28,800 blocks`); the wall-clock shift is hours, not days. |
| `ScamRegistry` pause response (48 h Timelock, no EMERGENCY backup; zero funds) | AD-02 | 🟢 Low | Worst-case = 48 h DoS on cleanup-gate for mis-flagged tokens; users hold tokens until Timelock executes. |
| `LandfillVault` FoT amount-vs-event drift (no balanceBefore/After diff) | AD-03 | 🟢 Low | Balance-of-reality design; emitted-amount may overstate actual for fee-on-transfer tokens. Coverage gap: no FoT-token fuzz fixtures (§4.3.13). |
| `LandfillVault` role separation collapse at deploy (all 4 roles → Timelock) | AD-04 | 🟢 Low | Original intent was separate multisig for `EMERGENCY_ROLE`; current single-Timelock design is documented and acceptable for v0.2. |
| `CleanupMining` divide-before-multiply pattern | AD-05 | 🟢 Info | Intentional overflow protection — derivation in INTERNAL_REVIEW.md Appendix C. Precision argued (all inputs 1e18-scaled). |
| `GuardiansToken` UTC mint bucket timestamp granularity | AD-06 | 🟢 Info | Bucket key = `block.timestamp / 1 days`; UTC boundary not validator-controllable beyond ~3 s. |
| Scam classifier false positive / negative (off-chain pipeline) | — (off-chain) | 🟡 Medium | Community reporting + override mechanism; multiple external API cross-reference (GoPlus, TokenSniffer). |
| Gas spike during cleanup | — (operational) | 🟢 Low | Off-peak execution recommendation; `MAX_TOKENS_HARD_CAP = 50` bounds per-tx gas. |

### 13.2 Market Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Kompetitor masuk BSC cleanup | 🟡 Medium | High | First-mover advantage, community lock |
| Token dumping by early miners | 🟡 Medium | High | Vesting cleanup reward claim, emission halving |
| Low initial liquidity attack | 🟡 Medium | Medium | $50k+ initial LP, lock 12 months |
| Bear market reduce user interest | 🟢 Low | Medium | Long-term utility beyond speculation |

### 13.3 Regulatory Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Bappebti classify as securities | 🔴 Critical | Low-Medium | Legal consultation pre-launch |
| OJK crypto regulation change | 🟡 Medium | Medium | Monitor, adapt jika perlu |
| Tax reporting Indonesia | 🟢 Low | High | Clear user disclosure |
| International sanctions | 🟢 Low | Low | KYC for large claims (future) |

### 13.4 Operational Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Team member burnout | 🟡 Medium | Medium | Distributed contributors, DAO handover |
| Backend infrastructure downtime | 🟡 Medium | Medium | Redundancy, decentralized indexer (future) |
| Domain/social hijack | 🟡 Medium | Low | 2FA, hardware key, dedicated admin accounts |
| Phishing clone (e.g. gott-protocol.tax) | 🟡 Medium | High | Monitor, trademark, educate users |

---

## 14. Legal Considerations

### 14.1 Indonesia Regulatory Landscape

**Bappebti** (Badan Pengawas Perdagangan Berjangka Komoditi):
- Regulates crypto as commodity (bukan mata uang)
- Daftar aset kripto boleh diperdagangkan diperbarui berkala
- Token baru harus submit untuk trading di exchange Indonesia

**OJK** (Otoritas Jasa Keuangan):
- Sejak 2025, OJK ambil alih regulasi crypto dari Bappebti
- Fokus: consumer protection, AML, tax compliance

**Kominfo:**
- Content moderation, anti-phishing
- Domain registration compliance

### 14.2 GOTT Legal Positioning

**Utility Token Classification:**
- Primary use: access to cleanup service
- Secondary use: governance voting
- NOT: investment contract, profit-sharing (untuk hindari securities classification)

**Key Disclaimers:**
- GOTT is not an investment
- No guaranteed return
- Users assume risk of smart contract
- Cleanup service is "best effort" basis

### 14.3 Pre-Launch Legal Checklist

- [ ] Konsultasi lawyer Indonesia specializing crypto
- [ ] Entity setup (PT di Indonesia atau offshore)
- [ ] Terms of Service & Privacy Policy (bilingual)
- [ ] Risk disclosure document
- [ ] User agreement dengan wallet approval warning
- [ ] Partnership agreement template (untuk audit, influencer, etc)
- [ ] Trademark registration "GOTT" + logo

### 14.4 Compliance Roadmap

**Phase 1 (Pre-launch):**
- Basic ToS + disclaimers
- Geo-block US/sanctioned countries (frontend level)

**Phase 2 (Post-launch):**
- KYC untuk large GOTT claims (>$10k threshold)
- Tax report helper (export user cleanup history untuk tax filing)

**Phase 3 (Scale):**
- Full legal entity dengan compliance officer
- Registered exchange listing (Indodax, Pintu, Tokocrypto)
- Audit reports public

---

## Appendix A — Technical Stack

**Smart Contracts:**
- Solidity 0.8.24
- OpenZeppelin Contracts 5.6.1
- Hardhat + Foundry hybrid testing
- Slither + Aderyn static analysis

**Backend:**
- Node.js + TypeScript
- PostgreSQL (scam registry cache)
- Redis (rate limiting)
- ethers.js v6 (blockchain interaction)

**Frontend:**
- Next.js 14 + TypeScript
- Tailwind CSS + shadcn/ui
- Wagmi + viem
- RainbowKit (wallet connect)

**Infrastructure:**
- VPS: DigitalOcean / Hetzner
- CDN: Cloudflare
- Monitoring: Grafana + Prometheus
- Error tracking: Sentry

## Appendix B — Cost Estimate (First 12 Months)

| Category | Cost (USD) |
|----------|-----------|
| Audit (SolidProof tier) | $5,000 |
| Bug bounty pool | $10,000 |
| Initial liquidity | $75,000 |
| Marketing budget | $50,000 |
| Infrastructure (12mo) | $6,000 |
| Legal consultation | $5,000 |
| Miscellaneous | $4,000 |
| **Total** | **$155,000** |

## Appendix C — Success Metrics

**Month 3 Post-Launch:**
- 5,000 unique wallets cleaned
- $100k+ dust processed
- 1,000 Telegram members
- 10 community contributor

**Month 6 Post-Launch:**
- 25,000 unique wallets
- $1M+ dust processed
- 10,000 Telegram members
- Listed on 2+ exchanges

**Month 12 Post-Launch:**
- 100,000+ unique wallets
- $10M+ dust processed
- DAO governance active
- Cross-chain expansion launched

---

**End of Blueprint v0.1.0**

*Built with 🇮🇩 for Asia Tenggara crypto community*
