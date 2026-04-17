# 07 — Tokenomics

## Token Specification

| Item | Value |
|------|-------|
| Name | Guardians of The Token |
| Symbol | GOTT |
| Chain | BNB Smart Chain (BSC) |
| Standard | BEP-20 (ERC-20 compatible) |
| Max Supply | 1,000,000,000 (1 Billion) |
| Decimals | 18 |
| Initial Circulating | 75,000,000 (7.5%) |
| Type | Utility + Governance |

## Contract Features

- ✅ **ERC20** — Standard fungible token
- ✅ **ERC20Burnable** — Holder bisa burn tokens
- ✅ **ERC20Pausable** — Emergency pause all transfers
- ✅ **ERC20Permit** — Gasless approvals (EIP-2612)
- ✅ **ERC20Votes** — On-chain governance voting
- ✅ **AccessControl** — Role-based permissions
- ✅ **Mint Role** — Only CleanupMining contract bisa mint
- ✅ **Daily Cap** — Max mint per day (anti-exploit)
- ❌ **Anti-Whale** — REMOVED (distribution natural via mining)

## Supply Allocation

```
┌──────────────────────────────────────────────────────┐
│                  GOTT ALLOCATION                     │
│                 (1,000,000,000 Total)                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🧹 Cleanup Mining        500M  ████████████████ 50% │
│  💧 Liquidity Pool        200M  ████████         20% │
│  🏛️  DAO Treasury         150M  ██████           15% │
│  👥 Team & Advisors       100M  ████             10% │
│  📣 Marketing/Airdrop      50M  ██                5% │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Allocation Details

#### Cleanup Mining (500M, 50%)

**Purpose:** Reward pool untuk user yang cleanup wallet.

**Unlock schedule:**
- Epoch 1 (Month 1-6): 250M emission
- Epoch 2 (Month 7-12): 125M
- Epoch 3 (Month 13-18): 62.5M
- Epoch 4 (Month 19-24): 62.5M

**Mechanism:** Daily cap emission with halving per epoch.

**Who controls:** `CleanupMining.sol` contract (has `CLEANUP_MINER_ROLE`)

#### Liquidity Pool (200M, 20%)

**Purpose:** PancakeSwap liquidity untuk trading GOTT.

**Unlock:** Immediate at TGE (Token Generation Event)

**Lock:** LP tokens locked 12 months di Team.Finance atau Mudra

**Pairing:** GOTT/BNB (initial), later GOTT/USDT, GOTT/BUSD

**Initial pool value:** Target $100k BNB + 200M GOTT

#### DAO Treasury (150M, 15%)

**Purpose:** Long-term fund untuk ecosystem development.

**Unlock:** Immediate to DAO treasury contract

**Controlled by:** DAO governance vote

**Use cases:**
- Grants untuk contributors
- Ecosystem partnerships
- Emergency fund
- Future marketing
- Audit renewals

**Spend limits:**
- < 1M GOTT: simple majority vote
- 1M-5M GOTT: 60% + quorum 10%
- 5M+ GOTT: 75% + quorum 15%

#### Team & Advisors (100M, 10%)

**Purpose:** Core team compensation + advisor retention.

**Vesting:**
- Cliff: 12 months (no tokens released)
- Linear vesting: 24 months after cliff
- Total vesting period: 36 months

**Beneficiaries:**
- Core team: ~70M
- Advisors: ~15M
- Future hires reserve: ~15M

**Transparent:** All vesting contracts public on-chain.

#### Marketing/Airdrop (50M, 5%)

**Purpose:** Community acquisition + marketing campaigns.

**Unlock:**
- 50% immediate (25M)
- 50% over 6 months linear (25M)

**Use:**
- 25M: First 1000 users airdrop (25k GOTT each)
- 15M: Influencer + content creator allocation
- 5M: Events, meetups, contests
- 5M: Bug bounty + security rewards

## Initial Circulating Supply Breakdown

**TGE Day (Day 0):** 75,000,000 GOTT circulating

```
┌─────────────────────────────────────────────────┐
│         TGE Initial Circulating: 75M             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Liquidity Pool (PancakeSwap)   25M  ████  33%  │
│  Marketing Immediate            25M  ████  33%  │
│  Airdrop First 1000 Users       25M  ████  33%  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Supply Emission Over Time

```
Circulating Supply Growth Projection

1B │                                         ▁▁▁▁▁▁▁▁▁▁▁ ← Max supply
   │                              ▁▁▁▁▁▁▁▁▁▁
   │                    ▁▁▁▁▁▁▁▁▁▁
   │           ▁▁▁▁▁▁▁▁▁
   │      ▁▁▁▁▁
500M │   ▁▁▁
   │ ▁▁
   │▁
75M ├─
   │
   0────────────────────────────────────────────────────────→
      TGE    M6    M12   M18   M24   M30   M36 (team vesting end)
```

**Key milestones:**
- TGE: 75M circulating (7.5%)
- Month 6: ~325M (32.5%) — mining Epoch 1 + liquidity + marketing
- Month 12: ~450M (45%) — Epoch 2 added
- Month 24: ~700M (70%) — all mining epochs done
- Month 36: ~850-900M (85-90%) — team vesting done
- Long-term: up to 1B if DAO unlocks full treasury

## Sink Mechanisms (Deflationary Pressure)

### 1. NFT Graveyard Burn (30% of revenue)

Dead NFT sold sebagai "Tombstone NFT" curated collection.
- 50% revenue → Treasury
- 30% burn GOTT dari market (buyback & burn)
- 20% curator reward

### 2. Scam Registry API Fees Burn (50% of revenue)

API tier paid by wallet providers/exchanges.
- 50% burn GOTT (buyback from market)
- 30% Treasury
- 20% Development fund

### 3. Voluntary Burn

Holder bisa burn untuk boost reputation score dalam governance.
- 1 GOTT burned = 1.1x voting power multiplier (time-limited)
- Encourage long-term alignment

### 4. Deflationary Cap

Max supply 1B hard-capped. No inflation post-mining end (Month 24).

### Projected Burn (Year 2-3)

Estimate (conservative):
- NFT Graveyard revenue: $5k/month
- API revenue: $10k/month
- Total burn: $3.5k/month GOTT buyback
- Annual burn: ~$42k → ~10-20M GOTT depending on price

## Price Dynamics

### Demand Drivers

1. **Cleanup users** — need GOTT untuk participate in DAO jika mau voting
2. **DAO participants** — need GOTT untuk propose (100k threshold) atau vote
3. **Speculators** — buy jika believe in long-term protocol
4. **NFT Graveyard buyers** — need GOTT kalau marketplace accept GOTT pair
5. **API customers** — need GOTT untuk premium tier (future)

### Supply Release

**Inflationary periods (Month 1-24):**
- Daily emission 350k-1.4M GOTT
- Sell pressure dari miners yang cash out
- Managed via epoch halving

**Neutral period (Month 25-36):**
- Team vesting continuing
- Marketing emission slowing
- Mining ended
- Supply growth mainly from team

**Potentially deflationary (Month 37+):**
- All allocations fully distributed
- Burn mechanisms continuing
- Treasury gradual unlock via DAO

### Fair Price Discovery

**Target ranges (speculative, not guaranteed):**

Conservative scenario (moderate adoption):
- TGE: $0.001 ($750k MC on 75M circulating)
- Month 6: $0.005 ($1.6M MC at 325M circulating)
- Month 12: $0.01 ($4.5M MC at 450M)
- Month 24: $0.02 ($14M MC at 700M)

Optimistic scenario (viral adoption):
- TGE: $0.001
- Month 6: $0.02 ($6.5M MC)
- Month 12: $0.05 ($22M MC)
- Month 24: $0.10 ($70M MC)

**Disclaimer:** Price projection adalah ilustrasi kasar, bukan prediction atau investment advice.

## Governance Voting Power

### Vote Weight
- 1 GOTT = 1 vote (when delegated)
- Must delegate (self-delegate) untuk activate voting power
- Historical voting power immutable (snapshot-based)

### Proposal Threshold
- Propose: 100,000 GOTT delegated (~$100-1000 depending on price)
- Vote: any amount (encourage participation)
- Quorum: 4% of total voting power

### Delegation
- Delegate to self: standard
- Delegate to expert: encouraged for passive holders
- Delegation fluid: can change anytime

## Taxation Consideration

### Indonesia (Based on 2026 framework)

**For users:**
- Crypto gains taxable (PPh)
- GOTT from cleanup = income (potentially taxed at source)
- Burden on user to report

**GOTT protocol level:**
- No direct tax collection
- Provide export tool untuk user tax reporting
- No sale of GOTT by protocol (avoid securities classification)

## Legal Positioning

### Classification

**GOTT is utility token:**
- Primary use: access to DAO governance
- Secondary use: reward for platform usage
- NOT: profit-sharing, dividend-bearing, investment contract

**Howey Test Application:**
- ❌ Investment of money (GOTT nggak dijual, di-earn)
- ❌ Common enterprise (distributed mining, no central pool)
- ❌ Expectation of profit from others (user mine sendiri)
- ❌ Efforts of others (protocol is autonomous)

**Conclusion:** Low likelihood of securities classification.

### Disclaimers

**In all documentation:**
- GOTT is not an investment
- No guaranteed returns
- Users assume smart contract risk
- Cleanup service "best effort" basis
- No warranty of token value

## Comparison with Other Models

### GOTT vs Meme Coin (e.g. PEPE, SHIB)

| Aspect | Meme Coin | GOTT |
|--------|-----------|------|
| Distribution | Large airdrop + team | Mining only |
| Utility | None (speculation) | Cleanup + governance |
| Revenue | None | API + NFT marketplace |
| Value accrual | Hype-driven | Utility-driven |

### GOTT vs Governance Token (e.g. UNI, AAVE)

| Aspect | UNI/AAVE | GOTT |
|--------|----------|------|
| Distribution | Large airdrop | Gradual mining |
| Protocol revenue | Large (DEX/lending) | Small (niche tool) |
| Fully diluted MC | $1B+ | $100k-10M target |
| Moat | Network effect | First-mover + scam DB |

### GOTT vs Stablecoin/Wrapped Token

Not comparable — GOTT adalah protocol token, bukan synthetic asset.

## Red Flags We Avoid

Anti-patterns yang kita hindari:

- ❌ **Fair launch rug** — team allocation transparent, vested
- ❌ **Unlimited mint** — hard cap 1B enforced
- ❌ **Honeypot mechanism** — no sell fee, freely transferable
- ❌ **Anti-whale extremism** — dihapus, mining natural distribution
- ❌ **Proxy contract without timelock** — no proxy in v1 (can add in v2 with timelock)
- ❌ **Hidden mint function** — mint only via CleanupMining (audited)
- ❌ **Team dumping** — 12 month cliff + 24 month linear vesting

## Key Metrics to Track

**Supply metrics:**
- Total circulating supply
- Daily emission rate
- Burn rate (from sinks)
- Liquidity pool depth
- % of supply staked/delegated

**Economic metrics:**
- Average reward per cleanup
- Total value cleaned
- Market cap
- Fully diluted valuation
- Trading volume

**Governance metrics:**
- Active proposals
- Voter participation rate
- Delegation distribution
- Treasury balance

## Summary

GOTT tokenomics dirancang untuk:
- **Fair distribution** via mining, no presale
- **Long-term sustainability** dengan sink mechanisms
- **Community ownership** via DAO governance
- **Real utility** beyond speculation
- **Regulatory-friendly** utility token positioning

Supply schedule aggressive untuk early adoption (50% emission Year 1), tapi balanced dengan lock (team), governance control (treasury), dan sink mechanisms (burn).
