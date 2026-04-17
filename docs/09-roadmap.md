# 09 — Roadmap 6 Bulan + Long-term

## Philosophy

**Bangun pelan-pelan, tapi konsisten.** GOTT adalah marathon, bukan sprint. Lebih baik ship quality setiap 2 minggu daripada rush dan rug kemudian.

## Timeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOTT 6-MONTH ROADMAP                         │
├─────────────────────────────────────────────────────────────────┤
│ Month 1-2  │ Foundation     │ Contract + Backend Core           │
│ Month 2-3  │ Detection      │ Scam Engine + API                 │
│ Month 3-4  │ Frontend       │ Web App MVP                       │
│ Month 4-5  │ Audit & Testnet│ Security + Beta                   │
│ Month 5-6  │ Launch         │ Mainnet + Marketing               │
│ Month 6+   │ Growth         │ DAO + Expansion                   │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 0 — Blueprint & Planning (Current, April 2026)

### Goals
Finalize blueprint, setup foundations, prepare execution.

### Tasks

**Week 1:**
- [x] Competitive research
- [x] Market analysis
- [x] Architecture design
- [x] Tokenomics modeling
- [x] Blueprint documentation

**Week 2:**
- [ ] Legal consultation (Indonesia lawyer)
- [ ] Entity structure decision (PT Indonesia vs offshore)
- [ ] Brand identity brief
- [ ] Domain acquisition (gott.finance, guardiansofthetoken.xyz, etc)
- [ ] Social media handles reservation

**Week 3-4:**
- [ ] Community channels setup (Telegram, Discord, Twitter)
- [ ] Landing page teaser (pre-launch signup)
- [ ] Logo + brand design
- [ ] Initial content calendar
- [ ] Team alignment meeting

**Deliverable:** GitHub repo live, community channels ready, first 100 Telegram members.

## Phase 1 — Foundation (Month 1-2)

### Goals
Build core smart contracts + backend skeleton.

### Tasks

**Smart Contracts:**
- [ ] Modify `GuardiansToken.sol` per spec baru
- [ ] Remove anti-whale, add CLEANUP_MINER_ROLE
- [ ] Add daily mint cap + epoch tracking
- [ ] Develop `ScamRegistry.sol`
- [ ] Develop `CleanupMining.sol`
- [ ] Develop `GarbageCollector.sol` MVP
- [ ] Develop `LandfillVault.sol`

**Testing:**
- [ ] Hardhat unit test suite (target 90%+ coverage)
- [ ] Foundry fuzz tests (2500+ runs per property)
- [ ] BSC fork integration tests
- [ ] Slither + Aderyn static analysis (0 findings target)
- [ ] Gas optimization review

**Backend:**
- [ ] Node.js + TypeScript project setup
- [ ] PostgreSQL schema + migrations
- [ ] Redis setup untuk rate limiting
- [ ] Event indexer (listen BSC events)
- [ ] Basic API skeleton (Express.js)

**Infrastructure:**
- [ ] VPS provisioning (Hetzner atau Fly.io)
- [ ] GitHub Actions CI/CD setup
- [ ] Cloudflare DNS + CDN
- [ ] Monitoring stack (Grafana + Prometheus)

**Deliverable:** All P0 contracts tested, backend skeleton running, CI/CD green.

## Phase 2 — Detection Engine (Month 2-3)

### Goals
Build sophisticated scam detection system.

### Tasks

**Classifier:**
- [ ] Gather historical scam token dataset
- [ ] Feature engineering (30+ features)
- [ ] Train XGBoost baseline model
- [ ] Cross-validate, target accuracy > 90%
- [ ] Deploy model as service

**External Integrations:**
- [ ] GoPlus API integration + caching
- [ ] TokenSniffer API integration
- [ ] DeFiLlama data ingestion
- [ ] Chainlink price feed integration
- [ ] Fallback oracle (PancakeSwap pool price)

**Honeypot Simulator:**
- [ ] Hardhat fork infrastructure
- [ ] Automated buy/sell test
- [ ] Dedicated BSC node for simulation
- [ ] Queue system untuk batch processing

**API:**
- [ ] Public endpoint `/api/v1/token/:address`
- [ ] Rate limiting (100 req/hour free tier)
- [ ] Response caching (24h TTL)
- [ ] Documentation (OpenAPI spec)

**Deliverable:** Detection pipeline operational, API public, 10k+ tokens classified.

## Phase 3 — Frontend (Month 3-4)

### Goals
Ship user-facing web app yang polished dan Indonesia-first.

### Tasks

**Design:**
- [ ] UX wireframes (all flows)
- [ ] UI design (Figma)
- [ ] Design system (colors, typography, components)
- [ ] Mobile-first responsive
- [ ] Dark/light mode

**Development:**
- [ ] Next.js 14 project setup
- [ ] Tailwind + shadcn/ui
- [ ] Wagmi + viem (ethers alternative)
- [ ] RainbowKit wallet connect
- [ ] i18n setup (ID primary, EN secondary)

**Key Pages:**
- [ ] Landing page (hero, features, how-it-works, CTA)
- [ ] Scan page (connect wallet → results)
- [ ] Cleanup page (select + execute)
- [ ] Dashboard (history, rewards, stats)
- [ ] DAO page (proposals, voting)
- [ ] Docs page (tutorial, FAQ)

**Features:**
- [ ] Wallet connection
- [ ] Token scanning + classification display
- [ ] Batch approval flow
- [ ] Cleanup execution with slippage display
- [ ] Transaction tracking
- [ ] Reward display + claim
- [ ] Scam warning system
- [ ] Leaderboard
- [ ] Language switcher

**Deliverable:** Frontend deployed to staging, internal team testing.

## Phase 4 — Audit & Testnet (Month 4-5)

### Goals
Harden security, public beta, bug bounty.

### Tasks

**Internal Review:**
- [ ] Full codebase security checklist review
- [ ] Gas profiling
- [ ] Documentation review
- [ ] Access control audit

**External Audit:**
- [ ] Vendor selection (SolidProof, Hacken, QuillAudits)
- [ ] Submit for audit ($3-15k budget)
- [ ] Fix findings (iterate until clean)
- [ ] Publish audit report

**Testnet Deployment:**
- [ ] Deploy semua contracts ke BSC Testnet
- [ ] Verify di BscScan Testnet
- [ ] Seed testnet dengan dummy scam tokens
- [ ] Internal testing (team)

**Public Beta:**
- [ ] Invite 100 early testers (whitelist)
- [ ] 10x bonus GOTT untuk testnet cleanup
- [ ] Collect feedback + iterate
- [ ] Bug bounty announcement

**Bug Bounty:**
- [ ] Immunefi program setup ($10k pool)
- [ ] Severity classification + payout matrix
- [ ] Response SLA commitment (48h)

**Deliverable:** Audit clean, beta feedback incorporated, mainnet-ready.

## Phase 5 — Mainnet Launch (Month 5-6)

### Goals
Public launch dengan strong liquidity + marketing push.

### Tasks

**Deployment:**
- [ ] Final contract deployment BSC Mainnet
- [ ] Contract verification BscScan
- [ ] Role transfer to proper addresses
- [ ] Emergency multisig setup (3/5)

**Liquidity:**
- [ ] Initial LP add (target $100k: $50k BNB + 200M GOTT)
- [ ] LP lock 12 months (Team.Finance)
- [ ] Public TX hash announcement
- [ ] LP monitoring dashboard

**Airdrop:**
- [ ] First 1000 users airdrop (25k GOTT each)
- [ ] Airdrop claim portal
- [ ] Sybil check before distribution

**Marketing:**
- [ ] Launch announcement (Twitter, Telegram, YouTube)
- [ ] Influencer outreach activation
- [ ] Press release Indonesia crypto media
- [ ] AMA series (Telegram Indonesia)

**Listings:**
- [ ] CoinGecko submission
- [ ] CoinMarketCap submission
- [ ] PancakeSwap default list application
- [ ] Trust Wallet default list application

**DAO Activation:**
- [ ] Deploy Governor + Timelock
- [ ] First proposal (simple, educational)
- [ ] Voting rights activation
- [ ] Forum setup

**Deliverable:** Mainnet live, trading active, community growing.

## Phase 6 — Growth (Month 6-12)

### Goals
Scale user base, activate DAO, expand partnerships.

### Tasks

**User Acquisition:**
- [ ] Referral program launch (10% bonus untuk referrer)
- [ ] Content creator fund activation
- [ ] Partnership dengan wallet providers
- [ ] Regional expansion (Vietnam, Philippines, Thailand)

**Feature Expansion:**
- [ ] NFT Graveyard marketplace launch
- [ ] Scam Registry paid API tier
- [ ] Batch cleanup (gas optimization v2)
- [ ] Mobile PWA optimization

**DAO Maturation:**
- [ ] Weekly proposal cadence (Type A - token fate)
- [ ] Parameter adjustments based on data
- [ ] Community grant program launch
- [ ] First significant treasury spend

**Partnerships:**
- [ ] BSC Foundation outreach
- [ ] Trust Wallet, SafePal, TokenPocket integration talks
- [ ] Portfolio manager embed (Zerion, DeBank)
- [ ] University partnership (kampus Indonesia blockchain dept)

**PR Stunts:**
- [ ] "Million Scam Token Burn" event
- [ ] Charity burn (tie to environmental cause)
- [ ] Hackathon sponsor
- [ ] Community ambassador program

**Deliverable:** 50k+ unique users, $1M+ cleaned, active DAO, 2+ partnerships.

## Phase 7 — Expansion (Year 2)

### Goals
Multi-chain, full DAO, enterprise tier.

### Milestones

**Q1 Year 2:**
- [ ] ETH mainnet deployment
- [ ] Cross-chain dashboard
- [ ] Advanced analytics dashboard

**Q2 Year 2:**
- [ ] Polygon + Base deployment
- [ ] Mobile native app (iOS + Android)
- [ ] Enterprise tier launch

**Q3 Year 2:**
- [ ] Full DAO handover (renounce multisig)
- [ ] ML classifier v2 (GNN-based)
- [ ] White-label SDK untuk partners

**Q4 Year 2:**
- [ ] Arbitrum + Optimism
- [ ] Auto-cleanup subscription (EIP-7702)
- [ ] Global marketing push

**Deliverable:** 500k+ users, multi-chain, sustainable protocol, thriving ecosystem.

## Critical Path & Dependencies

```
Legal Consultation ─────┐
                        ↓
Entity Setup ───────┐   │
                    ↓   │
Contract Dev ──────┬┼───┤
                   ↓│   │
Audit Vendor ──────┘│   │
                    ↓   │
Audit + Fix ────────┤   │
                    ↓   │
Testnet Deploy ─────┤   │
                    ↓   │
Beta Testing ───────┤   │
                    ↓   │
Mainnet Deploy ─────┼───┤
                    ↓   │
LP Add + Lock ──────┤   │
                    ↓   │
Marketing Launch ───┘   │
                        ↓
                  Community Growth
```

**Blockers:**
1. Legal clarity → cannot launch tanpa ini
2. Audit clean → cannot mainnet tanpa ini
3. Initial liquidity funds → cannot launch tanpa ini
4. Community momentum → slow growth tanpa ini

## Risk-Adjusted Timeline

**Best case:** 5 months ke mainnet
**Expected case:** 6 months ke mainnet
**Worst case:** 8-9 months ke mainnet

**Factors yang bisa extend:**
- Audit findings critical (add 1-2 weeks fix + re-audit)
- Legal complications (add 1+ month)
- Team capacity constraints (variable)
- Market conditions (bear market = delay launch untuk better timing)

## Success Checkpoints

**Month 2 Checkpoint:** All P0 contracts written, tested, reviewed internally.
- **If behind:** Cut scope (defer NFT Graveyard to Phase 7)
- **If ahead:** Start Phase 3 earlier

**Month 4 Checkpoint:** Audit submitted, frontend feature-complete.
- **If behind:** Extend testnet period, delay launch 2-4 weeks
- **If ahead:** Longer beta period untuk quality

**Month 6 Checkpoint:** Mainnet live, marketing active, 1000+ users.
- **If behind:** More aggressive marketing push
- **If ahead:** Start Phase 7 planning

## Resources Required

**Team:**
- 1x Solidity Dev (core protocol)
- 1x Backend Dev (API + indexer)
- 1x Frontend Dev (Next.js)
- 1x Designer (part-time)
- 1x Community Manager (part-time, scale up post-launch)
- 1x Founder/Product (Ricoz, all-rounder)

**Budget (first 6 months):**
- Development tools & infra: $6,000
- Audit: $5,000-15,000
- Initial liquidity: $50,000-100,000
- Marketing pre-launch: $10,000
- Legal: $3,000-5,000
- Miscellaneous: $5,000
- **Total:** $79,000 - $141,000

## Communication Cadence

**Weekly:**
- Team standup
- Community update (Telegram, Discord)

**Bi-weekly:**
- Dev progress blog post
- Twitter thread update

**Monthly:**
- Full newsletter
- Roadmap review + adjustment

**Quarterly:**
- Big picture progress report
- Community AMA

## Conclusion

Roadmap ini **ambitious but realistic**. Key adalah:
1. **Quality over speed** — ship clean, not first
2. **Community first** — build audience sebelum launch
3. **Iterate based on data** — adjust plan dengan metrics
4. **Stay focused** — don't chase every shiny feature

"Pelan-pelan asal selamat, asal konsisten." — Ricoz Philosophy
