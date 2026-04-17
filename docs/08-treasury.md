# 08 — Treasury Management

## Treasury Structure

GOTT protocol mengelola **4 jenis treasury** terpisah:

```
┌─────────────────────────────────────────────────────┐
│              GOTT TREASURY STRUCTURE                │
└─────────────────────────────────────────────────────┘
              │
              ├─── 1. LandfillVault
              │    └─ Collected scam/dead tokens
              │
              ├─── 2. DAO Treasury
              │    └─ 150M GOTT (15% allocation)
              │
              ├─── 3. Protocol Fee Vault
              │    └─ Revenue from fees & APIs
              │
              └─── 4. BNB Reserve Vault
                   └─ Operating expenses (audit, infra)
```

## 1. LandfillVault

### Purpose
Menyimpan token sampah yang terkumpul dari cleanup activity.

### Contents
- Scam tokens (yang tidak swap-able)
- Dead tokens (liquidity cabut)
- Spam NFTs
- Honeypot tokens

### Access Control
- Write: `GarbageCollector.sol` only
- Read: Public
- Actions (burn/sell/transfer): `Timelock.sol` only (via DAO)

### Governance Actions

**Weekly Proposal Type A — Token Fate Decision**

Setiap minggu, DAO vote nasib token yang terkumpul:

```
Proposal: "What to do with 500 scam tokens collected this week?"

Options:
A) 🔥 Burn all — PR narrative, reduce on-chain clutter
B) 💰 Try bulk sell — if any liquidity exists
C) ⚰️ Send to Graveyard — curated collection
D) 📦 Hold for index — include in Scam Registry public data
```

**Quorum:** 4% of circulating voting power
**Duration:** 7 days
**Execution:** Via Timelock (48h delay)

### Expected Revenue

**Conservative (Year 1):**
- 80% tokens burnable: $0 revenue
- 15% tokens saleable: ~$200-500/month dari aggregator bulk sell
- 5% NFT graveyard: ~$100-300/month

**Total:** ~$3,000-10,000 per year from LandfillVault operations

## 2. DAO Treasury

### Initial Balance
**150,000,000 GOTT** (15% of supply)

Immediate to DAO treasury contract at TGE.

### Purpose
Long-term fund untuk:
- Ecosystem grants
- Development continuation
- Marketing campaigns
- Partnership deals
- Audit renewal
- Emergency reserves

### Access Control
- Controlled by DAO vote via Timelock
- No admin bypass (after multisig renounce phase 3)

### Spending Tiers

**Tier 1: Micro Grants (< 1M GOTT)**
- Quorum: 4%
- Approval: Simple majority (>50%)
- Use case: content creator rewards, small bug fixes, community events

**Tier 2: Medium Spending (1M - 5M GOTT)**
- Quorum: 10%
- Approval: 60% supermajority
- Use case: marketing campaigns, developer grants, audit funding

**Tier 3: Large Spending (5M+ GOTT)**
- Quorum: 15%
- Approval: 75% supermajority
- Use case: major partnerships, multi-chain expansion, treasury diversification

### Projected Spending (Year 1)

| Category | Budget (GOTT) | Rationale |
|----------|---------------|-----------|
| Development bounties | 10M | Community devs extend protocol |
| Marketing grants | 15M | Content creators, translators |
| Audit & security | 5M | Renewal audits, bug bounty top-up |
| Emergency fund | 10M | Reserved, untouched unless critical |
| Operational (infra) | 5M | VPS, services, tools |
| Community events | 3M | Hackathons, meetups, conferences |
| **Total Year 1** | **48M** | **32% of treasury** |

Remaining 102M (68%) untuk Year 2+ operations.

### Diversification Strategy

DAO bisa vote untuk diversify treasury:
- Convert sebagian GOTT ke stablecoin (USDT, BUSD)
- Hold sebagian BNB untuk gas reserve
- LP di PancakeSwap untuk yield

**Target allocation (Year 2):**
- 60% GOTT (governance alignment)
- 25% Stablecoin (operational stability)
- 10% BNB (gas reserve)
- 5% LP tokens (yield)

## 3. Protocol Fee Vault

### Purpose
Accumulate revenue dari protocol operations.

### Revenue Streams

**Stream 1 — Cleanup Service Fee**
- 1% of BNB output dari cleanup goes to vault
- Example: $50 cleanup → $0.50 to vault
- Transparent, disclosed in UI

**Stream 2 — NFT Graveyard Sales**
- Curator sells Tombstone NFT
- 50% to Protocol Fee Vault
- 30% burn GOTT (buyback)
- 20% curator reward

**Stream 3 — Scam Registry API (Phase 2)**
- Paid tier untuk wallet providers
- Subscription: $99-$499/month
- 50% burn GOTT, 30% treasury, 20% dev

**Stream 4 — Enterprise Integrations (Phase 3)**
- White-label cleanup tool
- Custom branding for wallet providers
- Revenue share 30/70 (GOTT/Partner)

### Revenue Projection

**Year 1 (Conservative):**
- Cleanup fees: 10,000 cleanups × $50 avg × 1% = $5,000
- NFT Graveyard: $3,000
- API: $10,000 (starting Month 6)
- **Total Year 1:** ~$18,000

**Year 2 (Moderate growth):**
- Cleanup fees: 100,000 cleanups × $75 avg × 1% = $75,000
- NFT Graveyard: $15,000
- API: $100,000
- **Total Year 2:** ~$190,000

**Year 3 (Viral):**
- Cleanup fees: 500,000 cleanups × $100 avg × 1% = $500,000
- NFT Graveyard: $50,000
- API: $500,000
- Enterprise: $200,000
- **Total Year 3:** ~$1,250,000

### Use of Revenue

```
Protocol Fee Vault Revenue Distribution

50% → Burn GOTT (buyback from market) [Deflationary]
30% → DAO Treasury (long-term)
20% → Development & Operations (immediate)
```

### Buyback & Burn Mechanism

**Process:**
1. Vault accumulate BNB from fees
2. Every 30 days, automatic buyback trigger
3. Use 50% of accumulated BNB to buy GOTT from PancakeSwap
4. Send purchased GOTT to burn address (0xdead)
5. Public announcement + TX hash publication

**Impact:**
- Creates GOTT demand (buy pressure)
- Reduces circulating supply
- Aligns protocol success dengan token value

## 4. BNB Reserve Vault

### Purpose
Operating expense buffer dalam BNB untuk immediate needs.

### Initial Funding
From seed investment / team allocation (non-GOTT funds).

### Ongoing Funding
- 20% of Protocol Fee Vault revenue
- Target balance: $50,000 - $100,000 BNB

### Use Cases
- Gas for admin operations
- Subscription renewals (GoPlus, TokenSniffer, RPC)
- Infrastructure (VPS, Cloudflare, etc)
- Legal consultation
- Audit renewals
- Emergency expenses

### Access Control
- Multisig 3/5 required
- Transparent balance on-chain
- Monthly spending report to DAO

## Treasury Transparency

### Public Dashboard

Real-time dashboard menampilkan:

**LandfillVault:**
- Total tokens held
- Token categories breakdown
- Recent deposits (last 30 days)
- Pending vote proposals
- Historical actions (burn/sell/transfer)

**DAO Treasury:**
- GOTT balance
- Spending history
- Active proposals
- Voter participation stats

**Protocol Fee Vault:**
- Accumulated BNB
- Revenue per stream
- Upcoming buyback date
- Historical buybacks + burn amount

**BNB Reserve:**
- Current balance
- Monthly spending breakdown
- Alert if < $20,000 (refill trigger)

### Audit Trail

All treasury actions:
- On-chain events
- Indexed by backend
- Searchable dashboard
- Monthly report published

## Governance Process for Treasury

### Proposal Workflow

```
1. Community member drafts proposal (forum or Discord)
   ↓
2. Discussion period (informal, 3-7 days)
   ↓
3. Refined proposal submitted on-chain
   (requires 100k GOTT delegated)
   ↓
4. Voting period (7 days)
   ↓
5. If pass: Queue di Timelock
   ↓
6. Timelock delay (48 hours)
   ↓
7. Anyone can execute
   ↓
8. Treasury action performed
   ↓
9. Public announcement + report
```

### Emergency Procedures

**Emergency Pause:**
- 3/5 multisig can pause protocol (Phase 1-2)
- Used only untuk critical security issue
- DAO must ratify within 7 days, else auto-unpause

**Emergency Treasury Freeze:**
- DAO can freeze treasury if compromised
- 75% quorum required
- Lasts 7 days atau until DAO votes unfreeze

## Reporting Cadence

### Weekly
- LandfillVault activity report
- DAO proposal summary

### Monthly
- Full treasury report
- Revenue breakdown
- Spending analysis
- Buyback & burn confirmation

### Quarterly
- Strategic review
- Budget adjustment proposals
- Partnership updates

### Annually
- Audit of treasury contracts
- Tokenomics review
- Long-term roadmap update

## Risk Management

### Treasury Risks

**Risk 1: Single point of failure (multisig)**
- Mitigation: 3/5 signers, geographically distributed, hardware wallets
- Long-term: Renounce to DAO Phase 3

**Risk 2: Governance attack (voter apathy)**
- Mitigation: Low proposal threshold, active community, regular proposals
- Mitigation: Quorum requirements scale with spending size

**Risk 3: Smart contract exploit**
- Mitigation: Audit all treasury contracts
- Mitigation: Time-locked withdrawals
- Mitigation: Emergency pause mechanism

**Risk 4: Market risk (GOTT price crash)**
- Mitigation: Diversification strategy (25% stablecoin)
- Mitigation: Buyback mechanism provides floor
- Mitigation: Long operational runway

**Risk 5: Regulatory freeze**
- Mitigation: On-chain treasury (censorship resistant)
- Mitigation: Geographic diversification of signers
- Mitigation: Legal entity structure research

## Success Metrics

**Year 1 targets:**
- Treasury balance stable/growing
- Zero security incidents
- > 10 successful DAO votes executed
- Revenue > $15,000

**Year 2 targets:**
- 2-3x Year 1 revenue
- Treasury diversification active
- Community grants funded (5+ projects)
- Buyback & burn active monthly

**Year 3 targets:**
- Full DAO handover complete
- $1M+ annual revenue
- Multi-chain treasury (BSC + ETH)
- Sustainable operational flywheel
