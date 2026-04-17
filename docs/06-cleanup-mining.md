# 06 — Cleanup Mining Mechanism

## Concept

**Proof-of-Cleanup Mining** adalah mekanisme distribusi GOTT tanpa IDO atau presale. Token hanya bisa di-earn dengan cara melakukan cleanup nyata di wallet BSC.

## Core Principles

### 1. No IDO, No Presale
GOTT tidak dijual. Semua distribusi lewat:
- Cleanup mining (50%)
- Liquidity pool (20% - immediate for trading)
- DAO treasury (15%)
- Team vesting (10%)
- Marketing/airdrop (5%)

### 2. Proportional to Value
Reward proporsional ke USD value yang dibersihkan. Bukan per TX, tapi per $ value.

### 3. Diminishing Returns
Emission halving tiap 6 bulan untuk reward early adopter.

### 4. Anti-Sybil
Multiple layers proteksi dari sybil farming (detailed below).

## Emission Schedule

### Total Pool
**500,000,000 GOTT** (50% of max supply 1B)

### Distribution per Epoch

```
Epoch 1 (Month 1-6):   250,000,000 GOTT (50.0%)
Epoch 2 (Month 7-12):  125,000,000 GOTT (25.0%)
Epoch 3 (Month 13-18):  62,500,000 GOTT (12.5%)
Epoch 4 (Month 19-24):  62,500,000 GOTT (12.5%)
                       ─────────────────
Total:                 500,000,000 GOTT
```

### Daily Cap
```
Epoch 1: ~1,400,000 GOTT per day
Epoch 2: ~700,000 GOTT per day
Epoch 3: ~350,000 GOTT per day
Epoch 4: ~350,000 GOTT per day (slower decay)
```

### Visual Emission Curve

```
GOTT/day
   │
1.4M ████████████████████████
   │ ████████████████████████
   │ ████████████████████████
   │ ████████████████████████
700k ████████████████████████ ████████████████
   │ ████████████████████████ ████████████████
350k ████████████████████████ ████████████████ ███████ ███████
   │ ████████████████████████ ████████████████ ███████ ███████
   └────────────────────────────────────────────────────────────→ time
     Month 1-6              Month 7-12       Month 13-18 Month 19-24
     (Epoch 1)              (Epoch 2)        (E3)        (E4)
```

## Reward Formula

### Base Formula

```
reward = baseRate × cleanupValueUSD × tierMultiplier × epochMultiplier
```

### Parameters

**baseRate:** 100 GOTT per $1 USD
- Adjustable via DAO governance (range: 50-500)
- Starting value chosen to balance attractive reward vs emission cap

**cleanupValueUSD:** Actual USD value of tokens cleaned
- Calculated by backend using Chainlink price feeds
- Signed commitment to prevent manipulation
- Minimum $1 threshold

**tierMultiplier:**
| Condition | Multiplier |
|-----------|------------|
| First cleanup per wallet | 2.0x |
| Cleanup value ≥ $1000 | 1.25x |
| Cleanup value ≥ $100 | 1.5x |
| Default | 1.0x |

**epochMultiplier:**
| Epoch | Period | Multiplier |
|-------|--------|------------|
| 1 | Month 1-6 | 1.0x |
| 2 | Month 7-12 | 0.5x |
| 3 | Month 13-18 | 0.25x |
| 4 | Month 19-24 | 0.125x |

## Example Calculations

### Example 1: Small Cleanup ($50, Epoch 1)

User cleanup 5 dust tokens totaling $50 USD value:
```
baseRate = 100 GOTT
cleanupValue = $50
tierMultiplier = 1.0 (below $100)
epochMultiplier = 1.0 (Epoch 1)

reward = 100 × 50 × 1.0 × 1.0 = 5,000 GOTT
```

**Asumsi harga GOTT $0.001:** Reward worth $5 USD (selain BNB dari swap)

### Example 2: First Cleanup Bonus ($10, Epoch 1)

First-time user cleanup $10 worth tokens:
```
baseRate = 100 GOTT
cleanupValue = $10
tierMultiplier = 2.0 (first cleanup)
epochMultiplier = 1.0

reward = 100 × 10 × 2.0 × 1.0 = 2,000 GOTT
```

### Example 3: Whale Cleanup ($2000, Epoch 1)

Power user cleanup $2000 worth:
```
baseRate = 100 GOTT
cleanupValue = $2000
tierMultiplier = 1.25 (above $1000)
epochMultiplier = 1.0

reward = 100 × 2000 × 1.25 × 1.0 = 250,000 GOTT
```

### Example 4: Late Adopter ($500, Epoch 3)

User cleanup Month 15 (Epoch 3):
```
baseRate = 100 GOTT
cleanupValue = $500
tierMultiplier = 1.5 (above $100)
epochMultiplier = 0.25 (Epoch 3)

reward = 100 × 500 × 1.5 × 0.25 = 18,750 GOTT
```

**Insight:** Late adopter dapat 13x less reward dari early adopter untuk cleanup value sama. Ini encourage early participation.

## Anti-Sybil Mechanisms

### Layer 1 — Smart Contract Level

**1. Minimum threshold**
```solidity
require(cleanupValueUSD >= 1e18, "Below min threshold");
```
Prevents spam cleanup of $0.01 tokens.

**2. Max cleanups per wallet per day**
```solidity
require(cleanupCountPerDay[user] < 10, "Daily limit exceeded");
```
Reasonable limit, allows real users flexibility.

**3. EIP-712 signature verification**
Cleanup request harus signed dengan wallet private key. Prevents replay attacks.

### Layer 2 — Backend Level

**1. Wallet reputation scoring**

Behavior factors:
- Wallet age (older = higher trust)
- Historical TX count
- Association dengan known bots
- IP consistency

Score range: 0-100
- 0-30: Suspicious, require captcha + manual review
- 30-70: Normal
- 70-100: Trusted, fast-track

**2. Pattern detection**

Flags:
- Repeated same token cleanup across different wallets (possible sybil farm)
- Consistent timing pattern (bot behavior)
- Wallets funded from single source within short time
- Matching cleanup amounts across wallets

**3. Captcha challenge**

For flagged wallets:
- hCaptcha untuk initial verification
- Progressive: harder challenge jika gagal multiple times

**4. Rate limiting**
- Per IP: 100 scan requests/hour
- Per wallet: 10 cleanups/day
- Per cluster (same funding source): shared limits

### Layer 3 — Economic Disincentive

**Gas cost:** Each cleanup cost real BNB gas
- $0.5-2 per cleanup
- Sybil farmer must spend real money
- Reduces economic viability of sybil

**BNB requirement:** Wallet must have BNB untuk gas
- Sybil must fund each wallet
- Traceable funding source

**Reward claim delay:** 1 hour cooldown
- Prevents rapid multi-cleanup exploit
- Gives backend time to detect patterns

### Layer 4 — Governance Response

**DAO-controlled blacklist:**
- Community bisa report suspected sybil
- DAO vote untuk blacklist specific wallet
- Blacklisted wallet nggak eligible reward (tapi masih bisa cleanup)

**Retroactive clawback (emergency only):**
- Jika detected massive sybil attack
- DAO vote 75% quorum
- Freeze wallet + recover GOTT

## Claim Mechanisms

### Instant Claim (Default)
```
User cleanup → Reward minted immediately → Sent to user wallet
```
- Gas: slightly higher (~5% overhead)
- UX: immediate gratification
- Recommended for small cleanups

### Batch Claim (Gas Saver)
```
User cleanup (week 1) → Reward accumulated in contract
User cleanup (week 2) → Reward accumulated
User cleanup (week 3) → Reward accumulated
User calls claim() → All accumulated rewards sent
```
- Gas: ~30% less overall
- UX: delayed gratification
- Recommended untuk power users

### Auto-Compound (Phase 2)
```
User enable auto-compound → Reward automatically staked
Staking reward = extra GOTT + voting power
```
- No manual claim needed
- Higher effective APY
- Locks GOTT for governance

## Reward Distribution Flow

```
1. User execute cleanup TX
   ↓
2. GarbageCollector.cleanupBatch() runs
   ↓
3. Swap tokens via PancakeSwap
   ↓
4. Transfer BNB to user
   ↓
5. Call CleanupMining.recordCleanup(user, valueUSD, count)
   ↓
6. CleanupMining calculate reward
   ↓
7. Call GuardiansToken.mintReward(user, rewardAmount)
   ↓
8. Check daily cap, check max supply
   ↓
9. Mint GOTT to user wallet
   ↓
10. Emit RewardCalculated + RewardMinted events
```

## User Dashboard

### Metrics Displayed

**Per-user:**
- Total cleanups executed
- Total USD value cleaned
- Total GOTT earned
- Current tier status
- Days since last cleanup
- Cleanup rank (leaderboard)

**Global:**
- Total users joined mining
- Total cleanups executed
- Total USD value cleaned
- Remaining mining pool
- Current epoch + epoch progress
- Average reward per $1 value

### Leaderboard

**Categories:**
- All-time top cleaners
- Monthly top cleaners
- Weekly top cleaners
- By country (Indonesia, Philippines, Vietnam, etc)
- By cleanup type (most scam burned, most dust swept, etc)

**Rewards for leaderboard:**
- Top 10 monthly: bonus GOTT airdrop
- Top 100 all-time: exclusive NFT badge
- Top 1: featured on landing page + special ambassador role

## Economic Modeling

### Scenario: Moderate Adoption (Month 1-6)

**Assumptions:**
- 10,000 unique users
- Average cleanup value: $25/user
- Average cleanups per user: 3
- Total value cleaned: $750,000

**Reward calculation:**
- Average reward multiplier: 1.4x (mix tiers)
- Epoch multiplier: 1.0
- Total GOTT distributed: 100 × 750,000 × 1.4 × 1.0 = 105,000,000 GOTT

**Against pool:**
- Epoch 1 pool: 250,000,000
- Distributed: 105,000,000 (42%)
- Remaining: 145,000,000 (available for Month 4-6)

**Economics check:** ✅ Within cap, healthy distribution.

### Scenario: Viral Growth (Month 7-12)

**Assumptions:**
- 50,000 unique users
- Average cleanup value: $30/user
- Average cleanups per user: 4
- Total value cleaned: $6,000,000

**Reward calculation:**
- Average reward multiplier: 1.3x
- Epoch multiplier: 0.5
- Total GOTT distributed: 100 × 6,000,000 × 1.3 × 0.5 = 390,000,000 GOTT

**Against pool:**
- Epoch 2 pool: 125,000,000
- Distributed demand: 390,000,000 (3x over pool!)
- Reality: DAO akan adjust baseRate turun, OR daily cap kick in

**Adjustment mechanism:**
- Daily cap: 700,000 GOTT/day × 180 days = 126,000,000 ≈ pool size
- Organic self-regulation via cap
- DAO bisa adjust baseRate tepat waktu jika demand melampaui

**Economics check:** ⚠️ Need active DAO governance untuk rebalance.

## Monitoring & Adjustments

### Metrics to Track (Dashboard)

**Health indicators:**
- Emission rate vs cap utilization
- Unique active miners per day
- Average cleanup value
- Reward per active miner
- Sybil detection flags

**Alert thresholds:**
- Daily cap hit: escalate to DAO
- Sybil flags > 10%: investigate
- Active miners declining > 20% week-over-week: marketing boost
- Average reward per user < 100 GOTT: increase baseRate

### Adjustment Levers

DAO dapat adjust:
- `baseRate` (reward per $1)
- Tier thresholds ($100, $1000)
- Tier multipliers (1.0x, 1.5x, 1.25x, 2.0x)
- Daily cap per user
- Epoch duration (in exceptional cases)

Cannot adjust (hard-coded):
- Max supply (1B)
- Total mining pool (500M)
- Epoch halving schedule

## Integration with TELEGLAS Ecosystem

~~(Removed per user request)~~

*Note: Blueprint ini standalone. Tidak ada integrasi dengan platform lain.*

## Future Enhancements

### v2 — Staking Multiplier
Lock GOTT untuk multiply future cleanup rewards:
- 30 days lock: 1.1x
- 90 days lock: 1.25x
- 365 days lock: 1.5x

### v3 — Referral System
Refer new user, get % of their cleanup rewards:
- 10% of referred user's rewards for first 30 days
- Capped at 10k GOTT per referrer per user
- Anti-sybil: referrer must be active cleaner

### v4 — Streak Bonus
Consecutive weekly cleanups earn bonus:
- Week 1-4: 1.0x
- Week 5-12: 1.1x
- Week 13-26: 1.2x
- Week 27+: 1.25x

### v5 — Achievement Badges (NFT)
- "First Clean" — first cleanup ever
- "Dust Slayer" — 100 dust tokens removed
- "Scam Hunter" — 50 scam tokens identified
- "Whale Cleanup" — single cleanup > $10k
- Badges grant voting power bonus in DAO
