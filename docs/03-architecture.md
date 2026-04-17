# 03 — Protocol Architecture

## High-Level Overview

GOTT adalah three-layer protocol:

```
┌─────────────────────────────────────────────────────────┐
│                  LAYER 1: CLEANUP ENGINE                │
│           (Smart Contract + Web App Frontend)           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              LAYER 2: PROOF-OF-CLEANUP MINING           │
│         (Reward Distribution + Emission Schedule)       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                LAYER 3: LANDFILL DAO                    │
│      (Treasury + Governance + NFT Graveyard)            │
└─────────────────────────────────────────────────────────┘
```

## Layer 1 — Cleanup Engine

### Purpose
Execute actual wallet cleanup: scan, classify, swap, reward.

### Components

**On-chain:**
- `GarbageCollector.sol` — main cleanup contract
- `ScamRegistry.sol` — token status database

**Off-chain:**
- Backend API (Node.js + PostgreSQL)
- Scam classifier ML model
- Price oracle service
- Frontend web app (Next.js)

### User Flow

```
1. User → Connect wallet (frontend)
2. Frontend → Backend: /scan?wallet=0xabc
3. Backend → Fetch tokens, classify, return results
4. User → Select tokens to cleanup
5. Frontend → Request approval (batch)
6. User → Approve TX
7. Frontend → Call GarbageCollector.cleanupBatch()
8. Contract → Swap tokens via PancakeSwap
9. Contract → Emit CleanupExecuted event
10. Backend → Listen event, calculate GOTT reward
11. Contract → Mint GOTT reward to user
12. User → Receive BNB + GOTT
```

### Scalability Considerations

**Gas optimization:**
- Batch approve (up to 20 tokens per TX)
- Efficient swap via PancakeSwap v3 routing
- Minimize storage writes

**Throughput:**
- No artificial rate limit di contract level
- Backend API rate limit (100 req/min per IP)
- Database indexing untuk query cepat

**Cost per cleanup:**
- Gas: ~$0.5-2 depending on BSC gas price
- Backend cost: amortized, near-zero per user

## Layer 2 — Proof-of-Cleanup Mining

### Purpose
Distribute GOTT rewards secara fair dan anti-sybil untuk setiap legitimate cleanup.

### Components

**On-chain:**
- `CleanupMining.sol` — reward calculation & distribution
- `GuardiansToken.sol` — token with mint role granted to CleanupMining

**Off-chain:**
- Event indexer (listen ke CleanupExecuted events)
- Reward calculator service
- Oracle integration (price feeds)

### Reward Formula

```
reward = baseRate × cleanupValueUSD × tierMultiplier × epochMultiplier

Dimana:
- baseRate: 100 GOTT per $1 (adjustable via DAO)
- cleanupValueUSD: USD value of tokens cleaned
- tierMultiplier:
  * First cleanup per wallet: 2x
  * Cleanup > $1000: 1.25x
  * Cleanup > $100: 1.5x
  * Default: 1x
- epochMultiplier:
  * Epoch 1 (Month 1-6): 1.0
  * Epoch 2 (Month 7-12): 0.5
  * Epoch 3 (Month 13-18): 0.25
  * Epoch 4 (Month 19-24): 0.125
```

### Anti-Sybil Measures

**Layer 1 — Contract-level:**
- Min cleanup value threshold ($1 USD)
- Max cleanup per wallet per day (10)
- Signature verification (EIP-712)

**Layer 2 — Backend-level:**
- Wallet reputation scoring
- Behavior pattern detection (repeated same token patterns = sybil)
- IP rate limiting
- Captcha untuk suspicious patterns

**Layer 3 — Governance:**
- DAO bisa blacklist wallet jika detected sybil
- Community reporting mechanism

### Emission Schedule

```
Total Mining Pool: 500,000,000 GOTT (50% of supply)
Duration: 24 months
Emission per Epoch:

Month 1-6:   250,000,000 GOTT (50% of pool)
Month 7-12:  125,000,000 GOTT (25%)
Month 13-18:  62,500,000 GOTT (12.5%)
Month 19-24:  62,500,000 GOTT (12.5%)

Daily cap: ~1,400,000 GOTT (Month 1-6)
Gradually decrease per halving
```

## Layer 3 — Landfill DAO

### Purpose
Community governance atas treasury, protocol parameters, dan fate of collected tokens.

### Components

**On-chain:**
- `Governor.sol` — OpenZeppelin Governor contract
- `Timelock.sol` — execution delay
- `LandfillVault.sol` — treasury holder
- `NFTGraveyard.sol` — curated NFT marketplace

**Off-chain:**
- Snapshot (optional, untuk off-chain signaling vote)
- Discord/Telegram community
- Governance forum (Discourse atau similar)

### Proposal Lifecycle

```
1. Proposer create proposal (need 100k GOTT delegated)
2. Voting starts (7 days)
3. Community discuss & vote
4. If pass (quorum 4% + majority):
5.   Proposal queued di Timelock (48 hours delay)
6.   After delay, anyone can execute
7. Action performed on-chain
```

### Proposal Types

**Type A — Weekly Treasury Decision**
- Automatic trigger tiap minggu
- Vote: fate of newly collected tokens
- Options: Burn / Sell / Graveyard / Hold

**Type B — Protocol Parameters**
- Adjust mining reward rate
- Update scam threshold
- Whitelist/blacklist DEX

**Type C — Treasury Spending**
- Grants untuk contributors
- Marketing budget
- Audit/security expenses

**Type D — Emergency**
- Pause protocol (75% quorum)
- Upgrade contract (jika proxy)
- Blacklist address

### Progressive Decentralization

**Phase 1 (Month 1-6):**
- Multisig admin 3/5 (team + community)
- DAO advisory only
- Timelock 24 hours

**Phase 2 (Month 7-12):**
- DAO power untuk non-critical
- Multisig retained untuk emergency
- Timelock 48 hours

**Phase 3 (Month 13+):**
- Full DAO control
- Multisig renounced
- Only emergency pause retained

## Data Flow Diagrams

### Cleanup Execution Flow

```
User Wallet                Frontend              Backend             Smart Contract
    │                         │                     │                      │
    │──connect wallet────────▶│                     │                      │
    │                         │──GET /scan─────────▶│                      │
    │                         │                     │──classify tokens     │
    │                         │◀────results─────────│                      │
    │◀─display results────────│                     │                      │
    │──select tokens─────────▶│                     │                      │
    │                         │──build TX data─────▶│                      │
    │                         │◀────TX data─────────│                      │
    │◀─sign approval──────────│                     │                      │
    │──approve TX─────────────────────────────────────────────────────────▶│
    │──cleanup TX─────────────────────────────────────────────────────────▶│
    │                         │                     │           execute swap
    │                         │                     │           emit event
    │                         │                     │◀──event listener─────│
    │                         │                     │──calculate reward    │
    │                         │                     │──mint GOTT──────────▶│
    │◀─receive BNB + GOTT──────────────────────────────────────────────────│
```

### DAO Vote Flow

```
GOTT Holder               Governor              Timelock            LandfillVault
    │                         │                     │                      │
    │──delegate GOTT─────────▶│                     │                      │
    │──propose action─────────│                     │                      │
    │◀─proposal created───────│                     │                      │
    │                                                                       │
    │     [7 days voting period]                                            │
    │                                                                       │
    │──vote FOR──────────────▶│                     │                      │
    │                         │──queue proposal───▶│                      │
    │                                                                       │
    │     [48 hours timelock delay]                                         │
    │                                                                       │
    │──execute───────────────▶│                     │                      │
    │                         │                     │──execute action─────▶│
    │                         │                     │           (burn/sell/etc)
```

## Infrastructure

### Backend Stack

```
┌─────────────────────────────────────┐
│   Next.js Frontend (Vercel)         │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   API Gateway (Cloudflare)          │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   Node.js Backend (VPS/Fly.io)      │
│   - Express.js API                  │
│   - Event indexer                   │
│   - Scam classifier                 │
│   - Price oracle aggregator         │
└──────┬──────────────────┬───────────┘
       │                  │
┌──────▼──────┐    ┌──────▼──────┐
│ PostgreSQL  │    │ Redis Cache │
│ (primary)   │    │ (rate limit)│
└─────────────┘    └─────────────┘
```

### Blockchain Infrastructure

```
BSC Mainnet
    ├── GuardiansToken.sol (main token)
    ├── GarbageCollector.sol (cleanup)
    ├── CleanupMining.sol (rewards)
    ├── ScamRegistry.sol (database)
    ├── LandfillVault.sol (treasury)
    ├── NFTGraveyard.sol (NFT mp)
    ├── Governor.sol (DAO)
    └── Timelock.sol (delay)

External Dependencies:
    ├── PancakeSwap Router (swap)
    ├── Chainlink Price Feeds (oracle)
    ├── GoPlus API (scam check)
    └── TokenSniffer API (scam check)
```

## Security Architecture

### Defense in Depth

**Layer 1 — Contract Security:**
- OpenZeppelin battle-tested libraries
- Custom errors untuk transparency
- Reentrancy guards
- Pausable emergency
- Slither static analysis
- Foundry fuzzing

**Layer 2 — Backend Security:**
- API rate limiting
- Input validation
- SQL injection protection (parameterized queries)
- DDoS protection (Cloudflare)
- Secret management (environment variables, Vault)

**Layer 3 — Frontend Security:**
- Content Security Policy headers
- No localStorage untuk sensitive data
- Warning banner untuk suspicious approvals
- Clear TX simulation before signing

**Layer 4 — Operational Security:**
- Multi-sig untuk admin functions
- Hardware wallet untuk deployer
- 2FA untuk all team accounts
- Incident response plan

### Trust Assumptions

User assumption saat pakai GOTT:
1. User trust frontend (domain tidak di-hijack)
2. User trust smart contract (audited + verified)
3. User understand scope of approval
4. User review TX before signing

GOTT assumption saat operasi:
1. BSC chain reliable
2. PancakeSwap liquidity cukup
3. Oracle price feed akurat
4. Scam detection APIs responsive

## Performance Targets

**Cleanup TX:**
- Target: < 2 juta gas per cleanup (up to 20 tokens)
- Target: < 30 detik confirmation di BSC
- Target: > 95% success rate

**Scan API:**
- Target: < 5 detik response time (1 wallet)
- Target: 99.5% uptime
- Target: Handle 10,000 concurrent users

**Reward Distribution:**
- Target: < 5 menit dari cleanup ke reward mint
- Target: 100% accuracy (no missed rewards)
- Target: Zero false rewards (no over-payment)

## Future Extensions

### Cross-chain Support
- ETH mainnet (similar architecture)
- Polygon, Base, Arbitrum
- Unified dashboard view

### Advanced Features
- Auto-cleanup subscription (gasless via EIP-7702)
- Team/business wallet management
- Bulk wallet management (multiple wallet single interface)
- Mobile native app (iOS/Android)

### Integrations
- Wallet provider SDK (Trust Wallet, MetaMask partnerships)
- Portfolio manager embed (Zerion, Zapper)
- Exchange listing (CEX integration)
- DeFi aggregator (1inch, Odos)
