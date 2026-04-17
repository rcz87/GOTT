# 12 — DAO Governance

## Philosophy

**Progressive Decentralization.**

Start centralized untuk safety dan speed, gradually transfer power ke komunitas saat maturity tercapai. Goal: Full DAO ownership by Year 2.

## Governance Structure

```
┌─────────────────────────────────────────────┐
│              GOTT HOLDERS                   │
│       (delegated voting power)              │
└───────────────────┬─────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────┐
│                GOVERNOR                     │
│       (OpenZeppelin Governor contract)      │
│       - Create proposals                    │
│       - Cast votes                          │
│       - Queue for execution                 │
└───────────────────┬─────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────┐
│              TIMELOCK                       │
│       (Execution delay, 48 hours)           │
└───────────────────┬─────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────┐
│           EXECUTION TARGETS                 │
│  - LandfillVault (burn/sell/transfer)       │
│  - CleanupMining (parameters)               │
│  - ScamRegistry (updates)                   │
│  - DAO Treasury (spending)                  │
│  - GuardiansToken (emergency only)          │
└─────────────────────────────────────────────┘
```

## Voting Power

### Source of Power
- 1 GOTT = 1 vote (when delegated)
- Must call `delegate(address)` untuk activate voting power
- Self-delegate or delegate to expert

### Snapshot-based
- Voting power captured at proposal creation block
- Transfers after snapshot don't affect vote
- Historical voting power immutable

### Delegation
- Delegate anytime, takes effect immediately
- No lock-up required
- Change delegate freely
- One delegate per wallet at a time

### Bonus Multipliers (Phase 2 - Future)
- Burn-for-reputation: 1.1x multiplier (time-limited)
- Staking bonus: 1.2x (untuk locked GOTT)
- Participation streak: up to 1.25x

## Proposal Lifecycle

```
┌──────────────────────────────────────────────────────┐
│  1. DISCUSSION (Informal)                            │
│  Forum/Discord discussion (3-7 days)                 │
│  Refine idea, gather feedback                        │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│  2. SUBMISSION (On-chain)                            │
│  Proposer submits to Governor                        │
│  Requires 100,000 GOTT delegated                     │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│  3. VOTING PERIOD (7 days)                           │
│  Holders vote: FOR / AGAINST / ABSTAIN               │
│  Real-time tally visible                             │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│  4. QUORUM CHECK                                     │
│  Total votes ≥ 4% of circulating supply?             │
│  If no → proposal defeated                           │
└────────────────────┬─────────────────────────────────┘
                     ↓ Yes
┌──────────────────────────────────────────────────────┐
│  5. MAJORITY CHECK                                   │
│  FOR > AGAINST?                                      │
│  If no → proposal defeated                           │
└────────────────────┬─────────────────────────────────┘
                     ↓ Yes
┌──────────────────────────────────────────────────────┐
│  6. QUEUED IN TIMELOCK                               │
│  48-hour delay before execution                      │
│  Time for emergency exit jika ada masalah            │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│  7. EXECUTION                                        │
│  Anyone can trigger execute()                        │
│  On-chain action performed                           │
└──────────────────────────────────────────────────────┘
```

## Proposal Types

### Type A — Weekly Treasury Decision

**Frequency:** Weekly (automatic trigger)

**Purpose:** Decide fate of token sampah yang terkumpul minggu itu

**Options:**
- 🔥 Burn all
- 💰 Bulk sell (jika ada liquidity)
- ⚰️ Send to NFT Graveyard
- 📦 Hold untuk index

**Parameters:**
- Voting period: 7 days
- Quorum: 4%
- Approval: Simple majority
- Timelock: 48 hours

**Example:**
```
Proposal #42: Fate of 500 scam tokens collected April 15-22

Tokens: [list of 500 token addresses]
Total fake market cap: $50,000
Actual tradeable value: $3.50

Options:
- Burn all (reduce on-chain clutter)
- Send to Graveyard (NFT archaeology)
- Try bulk sell (likely $0-5 recovery)

Discussion: [link to forum]
```

### Type B — Protocol Parameter Adjustment

**Frequency:** As-needed

**Purpose:** Fine-tune protocol mechanics

**Examples:**
- Adjust `baseRate` cleanup reward (50-500 GOTT per $1)
- Adjust tier thresholds ($100, $1000)
- Update ScamRegistry classification rules
- Whitelist/blacklist DEX router
- Adjust daily mint cap

**Parameters:**
- Voting period: 7 days
- Quorum: 10%
- Approval: 60% supermajority
- Timelock: 48 hours

**Example:**
```
Proposal #55: Reduce baseRate from 100 to 75 GOTT/$1

Rationale:
- Emission accelerating faster than expected
- Epoch 1 pool will deplete 2 months early
- Reduction slows emission, extends mining period

Impact:
- Rewards 25% lower
- Mining period extends to cover full 6 months
- Long-term token health improved

Analysis: [link to forum]
```

### Type C — Treasury Spending

**Frequency:** As-needed

**Purpose:** Allocate DAO treasury funds

**Tiers:**

**Tier 1: < 1M GOTT (micro grants)**
- Quorum: 4%
- Approval: Simple majority
- Examples: content creator rewards, small bug fixes

**Tier 2: 1M - 5M GOTT (medium)**
- Quorum: 10%
- Approval: 60%
- Examples: marketing campaigns, developer grants

**Tier 3: 5M+ GOTT (large)**
- Quorum: 15%
- Approval: 75%
- Examples: partnerships, multi-chain expansion, audit renewals

**Example:**
```
Proposal #78: Fund ETH Mainnet Deployment (8M GOTT)

Breakdown:
- Audit (ETH contracts): 3M GOTT ($15k equiv)
- Development bounty: 3M GOTT
- ETH liquidity seed: 2M GOTT (swapped to ETH)

Timeline: 3 months
ROI projection: 100k ETH users Year 1

Analysis: [link]
```

### Type D — Emergency Action

**Frequency:** Rare (only if critical)

**Purpose:** Respond to urgent threats

**Examples:**
- Pause protocol (critical vulnerability)
- Blacklist malicious actor
- Upgrade contract (if proxy used)

**Parameters:**
- Voting period: 3 days (accelerated)
- Quorum: 15%
- Approval: 75%
- Timelock: 12 hours (accelerated)

**Alternative: Multisig bypass** (Phase 1-2 only)
- 3/5 multisig can pause in genuine emergency
- Must publicly justify within 24 hours
- DAO must ratify within 7 days or auto-unpause

## Proposal Threshold

### Initial (Phase 1-2)
- **100,000 GOTT** delegated to proposer
- Prevents spam
- Ensures proposer has skin in game

### Adjustable via governance
- DAO can raise/lower based on activity
- If too high → low participation
- If too low → spam proposals

### Exception: Weekly Treasury Decisions
- Auto-triggered by protocol
- No proposer threshold needed
- Default options auto-generated

## Quorum Requirements

### Base Quorum: 4%
- For simple proposals
- Balance: low enough untuk participation, high enough untuk safety

### Scaled Quorum: 10% (Medium)
- For parameter changes
- Ensures broader consensus

### High Quorum: 15% (Critical)
- For emergency actions
- For large treasury spending

### Rationale
- Too low: minority attack risk
- Too high: inability to act (dead DAO)
- 4-15% range mirroring proven DAOs (Uniswap, Compound)

## Voting Mechanisms

### Simple Vote
- FOR / AGAINST / ABSTAIN
- Standard OpenZeppelin Governor
- Most proposal types

### Ranked Choice (Future)
- Untuk multi-option proposals
- Example: Type A (burn vs sell vs graveyard)
- Not in v1, add Phase 2

### Quadratic Voting (Future)
- Consider for Type C (treasury spending)
- Reduces whale dominance
- Complex implementation, Phase 3

## Progressive Decentralization Phases

### Phase 1 — Guided Launch (Month 1-6)

**Admin:** Multisig 3/5 (team + community)

**Multisig signers:**
- 2 core team members
- 2 community advisors (trusted early supporters)
- 1 security advisor

**Multisig Powers:**
- Emergency pause (any contract)
- Role assignments
- Parameter adjustments (non-critical)
- Direct treasury spending (limited)

**DAO Powers:**
- Advisory votes (non-binding)
- Type A proposals (weekly)
- Small treasury grants (<1M GOTT)

**Goal:** Operate safely while community grows.

### Phase 2 — Hybrid Governance (Month 7-12)

**Admin:** Multisig 3/5 (reduced scope)

**Multisig Powers:**
- Emergency pause only
- Emergency blacklist
- No parameter adjustments

**DAO Powers:**
- All Type B proposals (parameters)
- All Type C up to 5M GOTT
- Type A proposals
- Scam Registry updates

**Shared Powers:**
- Large treasury spending (>5M GOTT): requires DAO + multisig co-sign
- Contract upgrades: multisig propose, DAO approve

**Goal:** Balance speed dengan community control.

### Phase 3 — Full DAO (Year 2+)

**Admin:** None (renounced)

**DAO Powers:**
- All governance actions
- Emergency pause (via Governor)
- Parameter adjustments
- Treasury spending (all tiers)
- Contract upgrades (if proxy)

**Multisig:** Dissolved atau repurposed as community Treasury assistant

**Goal:** Fully community-owned protocol.

## DAO Infrastructure

### Forum (Discourse atau similar)
- Proposal discussion
- Long-form deliberation
- Archive of decisions
- Searchable history

### Snapshot (Optional, Off-chain signaling)
- Gasless votes
- Sentiment gauge before on-chain vote
- Non-binding

### On-chain Governance (Governor contract)
- Final binding votes
- Execution via Timelock
- Transparent on BscScan

### Notification System
- Twitter bot announce new proposals
- Telegram bot notify voting periods
- Email opt-in for engaged voters

## Voter Participation Tactics

### Gamification
- Voting streak badges (NFT)
- Leaderboard of active voters
- Monthly reward untuk top participants

### Incentives
- Small GOTT reward untuk voting (funded from Treasury)
- Cap to prevent sybil farming

### Education
- Proposal summaries (TL;DR)
- Video explainers untuk complex proposals
- Community calls discussing upcoming votes

### Delegation Marketplace
- List of delegates with profiles
- Voting history + alignment
- Easy one-click delegate

## Anti-Governance Attack

### Sybil Resistance
- Vote weight based on delegated GOTT
- Sybil needs real GOTT (costly)
- Anti-sybil on delegation side (Phase 2)

### Flash Loan Protection
- Voting power snapshot at proposal creation
- Flash loan can't influence past snapshot
- Standard ERC20Votes protection

### Whale Mitigation
- Quorum requirements prevent single whale dominance
- Future: quadratic voting, reputation weighting
- Transparency of large voters (on-chain)

### Proposal Spam
- 100k GOTT threshold
- Rate limit per proposer (3 active proposals max)
- Community can flag spam

## Transparency Requirements

### Proposal Requirements
- Clear title
- Rationale paragraph
- Specific action (smart contract call)
- Expected outcome
- Links to discussion

### Voting Transparency
- All votes public on-chain
- Voter addresses visible
- Delegate relationships visible
- Historical voting record searchable

### Execution Transparency
- Timelock queue public
- Execution TX hash published
- Outcome verification

### Reporting
- Weekly: active proposals summary
- Monthly: governance participation stats
- Quarterly: DAO performance review

## Emergency Procedures

### Critical Vulnerability Detected
1. Multisig emergency pause
2. Public disclosure (responsible)
3. Patch development
4. Audit of patch
5. DAO vote on resume
6. Post-mortem published

### Governance Attack Attempt
1. Community alert
2. Emergency vote to defeat malicious proposal
3. Blacklist attacker addresses
4. Update security parameters
5. Post-mortem

### External Regulatory Action
1. Legal team engages regulator
2. Community informed
3. DAO votes on compliance actions
4. Adjust protocol if needed
5. Transparency throughout

## Success Metrics

### Year 1 Targets
- **Participation rate:** > 10% of circulating supply voting
- **Proposal count:** 50+ proposals processed
- **Quorum achievement:** > 80% proposals meet quorum
- **Voter diversity:** Top 10 voters < 40% of voting power
- **Delegation:** > 50 unique delegates

### Year 2 Targets
- **Participation rate:** > 20%
- **Proposal count:** 200+
- **Voter diversity:** Top 10 < 30%
- **Delegation:** > 200 unique delegates
- **Full DAO transition:** Complete

## Conclusion

GOTT governance dirancang untuk **evolve dari safe launch ke full community ownership**. Key principles:

1. **Safety first:** Multisig during infancy, DAO during maturity
2. **Transparent:** Everything on-chain, everything public
3. **Accessible:** Low barrier to participate, clear proposals
4. **Resilient:** Multiple safeguards against attacks
5. **Progressive:** Gradual power transfer, measured by milestones

**"Governance is a journey, not a destination."**
