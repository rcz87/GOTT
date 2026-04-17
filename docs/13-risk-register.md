# 13 — Risk Register

## Risk Assessment Methodology

**Severity:**
- 🔴 Critical — Existential threat, immediate action required
- 🟡 High — Major impact, mitigation priority
- 🟢 Medium — Notable impact, planned mitigation
- ⚪ Low — Minor impact, monitor

**Probability:**
- Very High (>75%)
- High (50-75%)
- Medium (25-50%)
- Low (10-25%)
- Very Low (<10%)

## Technical Risks

### T1 — Smart Contract Exploit

**Severity:** 🔴 Critical
**Probability:** Medium

**Description:** Bug di smart contract yang bisa di-exploit untuk drain funds, mint unauthorized tokens, atau disrupt protocol.

**Potential Impact:**
- Loss of user funds
- GOTT supply inflation attack
- Protocol reputation destruction
- Legal liability

**Mitigation:**
- Professional audit (2+ firms ideally)
- Bug bounty via Immunefi ($10k+ pool)
- Foundry fuzzing (10k+ runs per property)
- Formal verification untuk critical functions
- Multi-phase deployment (testnet → limited mainnet → full)
- Emergency pause mechanism
- Insurance exploration (Nexus Mutual, InsurAce)

**Monitoring:**
- Continuous monitoring via Forta/OpenZeppelin Defender
- Anomaly detection alerts
- Post-deployment review schedule

**Response Plan:**
1. Immediate pause (multisig)
2. Internal investigation
3. Disclosure protocol activated
4. Patch development
5. Re-audit of patch
6. Community vote on resume
7. Post-mortem publication

### T2 — Scam Classifier False Positive

**Severity:** 🟡 High
**Probability:** High

**Description:** Legitimate token classified as scam, causing user to send to Landfill unnecessarily.

**Potential Impact:**
- User loses legitimate value
- Protocol liability
- Trust erosion
- Legal challenge from project affected

**Mitigation:**
- Multi-source classification (GoPlus + TokenSniffer + internal)
- High confidence threshold (>90%)
- Flag-and-review process untuk borderline cases
- Manual override option untuk user
- Appeals process untuk affected projects
- Insurance fund untuk false positive compensation

**Monitoring:**
- Community reporting mechanism
- Monthly classification audit
- Affected project outreach

### T3 — Scam Classifier False Negative

**Severity:** 🟡 High
**Probability:** Medium

**Description:** Scam token passes classification, user swap dan kehilangan funds.

**Potential Impact:**
- User financial loss
- Protocol reputation damage
- Perceived ineffectiveness

**Mitigation:**
- Conservative classification default
- Warning banner untuk "Uncertain" status
- Community crowdsourced reporting
- Real-time classification updates
- External oracle cross-reference

**Monitoring:**
- Weekly review of cleanups flagged problematic
- User-reported losses tracking
- Post-incident analysis

### T4 — Gas Spike Attack

**Severity:** 🟢 Medium
**Probability:** Medium

**Description:** Attacker inflate BSC gas price, making cleanup economically unviable atau failing mid-transaction.

**Potential Impact:**
- Failed transactions (partial funds stuck)
- Increased cost burden
- User frustration

**Mitigation:**
- Gas price cap di frontend
- Retry logic untuk failed TX
- Recommend off-peak cleanup
- Batch size optimization
- Gas-efficient contract design

**Monitoring:**
- BSC gas price alerts
- Failed TX rate tracking
- User complaint correlation

### T5 — Oracle Manipulation

**Severity:** 🟡 High
**Probability:** Low

**Description:** Manipulated price feed cause incorrect cleanup value calculation, leading to wrong reward amounts.

**Potential Impact:**
- Under/over-rewarding
- GOTT emission unexpected
- Economic manipulation

**Mitigation:**
- Multiple oracle sources (Chainlink primary, PancakeSwap fallback)
- TWAP (Time-Weighted Average Price) protection
- Sanity checks in contract
- Signed commitment dari backend
- Maximum deviation thresholds

**Monitoring:**
- Oracle price divergence alerts
- Unexpected reward spikes
- Post-TX value validation

### T6 — Backend Service Compromise

**Severity:** 🟡 High
**Probability:** Low

**Description:** Backend API compromised, serving malicious classification atau manipulating data.

**Potential Impact:**
- False classifications injected
- User trust damaged
- Potential financial loss

**Mitigation:**
- Defense in depth (WAF, DDoS protection)
- Secret management (Vault, not environment vars)
- 2FA for all team accounts
- SSH key-only access
- Regular security audits
- Code signing untuk deployments
- Monitoring + intrusion detection

**Monitoring:**
- Log analysis (anomaly detection)
- API response validation
- User-reported issues

## Market Risks

### M1 — Competitor Enters BSC

**Severity:** 🟡 High
**Probability:** High

**Description:** Kompetitor (Sol Incinerator clone atau new player) launches BSC cleanup, possibly with better features atau marketing.

**Potential Impact:**
- Market share loss
- Price competition
- User fragmentation
- Growth slowdown

**Mitigation:**
- First-mover advantage (launch cepat)
- Community lock-in (mining + governance)
- Defensible moat (scam database)
- Continuous innovation
- Partnership moat (wallet providers)
- Brand loyalty Indonesia

**Monitoring:**
- Competitor tracking (monthly)
- User churn analysis
- Feature gap analysis

### M2 — Token Dumping by Early Miners

**Severity:** 🟡 High
**Probability:** High

**Description:** Early miners farm massive GOTT and dump, crashing price.

**Potential Impact:**
- GOTT price crash
- Community sentiment negative
- Liquidity crisis
- Self-reinforcing dump spiral

**Mitigation:**
- Emission halving (disincentive late dumps)
- Optional staking untuk additional rewards
- Buyback & burn from treasury revenue
- Community governance participation rewards
- Healthy initial liquidity ($100k+)
- Gradual marketing ramp (not pump-dump)

**Monitoring:**
- Large sell pressure alerts
- Wallet concentration analysis
- Trading volume anomaly

### M3 — Low Initial Liquidity Attack

**Severity:** 🟢 Medium
**Probability:** Medium

**Description:** Attacker exploit thin liquidity pool untuk manipulate GOTT price.

**Potential Impact:**
- Flash crash event
- Arbitrage extraction
- Market maker panic
- Trust erosion

**Mitigation:**
- Substantial initial LP ($100k+)
- LP lock 12 months minimum
- TWAP oracles for internal calcs
- Circuit breaker mechanisms (optional)

**Monitoring:**
- Pool depth monitoring
- Unusual trade pattern detection
- Price impact alerts

### M4 — Bear Market Reduce Activity

**Severity:** 🟢 Medium
**Probability:** Medium

**Description:** Broader crypto bear market reduce overall wallet activity, reducing cleanup demand.

**Potential Impact:**
- User growth stall
- Revenue reduction
- Morale impact

**Mitigation:**
- Long operational runway (18+ months)
- Diverse revenue streams (API, NFT, cleanup)
- Sustainable tokenomics
- Focus on security angle (always relevant)
- Lean operations during downturn

**Monitoring:**
- Market conditions tracking
- User activity trends
- Revenue pipeline

### M5 — Wallet Provider Native Integration

**Severity:** 🟡 High
**Probability:** Medium (12-18 months)

**Description:** Trust Wallet, MetaMask, dll build cleanup native, cannibalizing GOTT use case.

**Potential Impact:**
- User base erosion
- Differentiation challenge
- Potential obsolescence

**Mitigation:**
- Partnership strategy (white-label offer)
- Superior scam database (hard to replicate)
- Token economy + governance angle
- Multi-chain ecosystem (enterprise play)
- Continuous feature innovation

**Monitoring:**
- Wallet provider announcements
- Feature release tracking
- Partnership opportunity scouting

## Regulatory Risks

### R1 — Indonesia Bappebti/OJK Classification

**Severity:** 🔴 Critical
**Probability:** Low-Medium

**Description:** Regulator classify GOTT sebagai securities atau restrict cleanup tool as "unauthorized financial service."

**Potential Impact:**
- Operational prohibition Indonesia
- Legal liability founder
- Token delisting di Indonesia exchange
- User backlash

**Mitigation:**
- Pre-launch legal consultation
- Utility token positioning (detailed legal docs)
- No profit promise, no dividend
- Geo-compliance (jika diperlukan)
- Active engagement dengan regulator
- Entity structure (PT Indonesia atau offshore)

**Monitoring:**
- Regulation updates weekly
- Bappebti/OJK announcement tracking
- Legal counsel retained on call

**Response Plan:**
1. Legal analysis of action
2. Community communication
3. Compliance implementation
4. Operational adjustment
5. Ongoing dialogue dengan regulator

### R2 — OJK Crypto Regulation Change

**Severity:** 🟡 High
**Probability:** Medium

**Description:** Post-2025, OJK mengambil alih crypto regulation. New rules might require licensing, reporting, atau restrict certain operations.

**Potential Impact:**
- Compliance burden
- Operational slowdown
- Potential licensing costs

**Mitigation:**
- Stay ahead of regulation
- Active industry engagement
- Compliance-first design
- Budget untuk legal/compliance

**Monitoring:**
- OJK publication tracking
- Industry association membership
- Legal counsel updates

### R3 — International Sanctions / OFAC

**Severity:** 🟢 Medium
**Probability:** Very Low

**Description:** GOTT address identified as sanctions violator (unlikely given BSC Asia focus, but possible if used by sanctioned parties).

**Potential Impact:**
- US blocked users
- Exchange listing issues
- Reputation damage

**Mitigation:**
- Geo-block US users (frontend)
- KYC for large GOTT claims (>$10k)
- Sanctions list screening
- Compliance documentation

**Monitoring:**
- OFAC list updates
- User geographic distribution
- Suspicious activity detection

### R4 — Tax Reporting Complexity

**Severity:** 🟢 Medium
**Probability:** High

**Description:** Users unable to properly report GOTT income, creating compliance burden.

**Potential Impact:**
- User frustration
- Indirect regulatory scrutiny
- Adoption barrier

**Mitigation:**
- Tax reporting tool (export cleanup history)
- Indonesian tax guide
- Partnership dengan crypto tax service (Koinly, CoinTracker)

**Monitoring:**
- User support inquiries
- Tax season feedback

## Operational Risks

### O1 — Team Burnout / Key Person Dependency

**Severity:** 🟡 High
**Probability:** Medium

**Description:** Small team, founder burnout, knowledge concentration.

**Potential Impact:**
- Development slowdown
- Quality issues
- Succession risk

**Mitigation:**
- Distributed knowledge (documentation)
- Progressive DAO handover
- Contributor recruitment
- Reasonable work pace
- Mental health prioritization

**Monitoring:**
- Team health check-ins
- Workload assessments
- Contributor activity

### O2 — Infrastructure Downtime

**Severity:** 🟢 Medium
**Probability:** Medium

**Description:** Backend service outage, database failure, RPC provider issues.

**Potential Impact:**
- Service disruption
- User frustration
- Revenue loss

**Mitigation:**
- Multi-region deployment
- Redundant RPC providers
- Database backups (daily + real-time)
- Status page + communication
- Decentralized indexer (future - TheGraph)

**Monitoring:**
- Uptime monitoring (Pingdom, Uptime Robot)
- Error rate alerts
- Performance metrics

### O3 — Domain / Social Account Hijack

**Severity:** 🟡 High
**Probability:** Low

**Description:** Attacker gain control of domain, Twitter, Telegram, direct users to phishing.

**Potential Impact:**
- User fund loss (phishing)
- Reputation damage
- Communication breakdown

**Mitigation:**
- Registrar lock (preventing transfer)
- 2FA everywhere (hardware key preferred)
- Dedicated admin accounts (not personal)
- Multi-admin access (no single point)
- Domain monitoring services

**Monitoring:**
- DNS change alerts
- Social media login alerts
- Unauthorized post detection

### O4 — Phishing Clone Sites

**Severity:** 🟡 High
**Probability:** Very High

**Description:** Attacker clone GOTT website at similar domain (gott-protocol.tax, guardians-token.cash), fool users.

**Potential Impact:**
- User fund loss
- Protocol reputation damage
- Legal burden

**Mitigation:**
- Trademark registration
- Monitor service (PhishFort, similar)
- Community education (official URL emphasis)
- Browser security reports submission
- Takedown capability (DMCA, etc)

**Monitoring:**
- Domain similarity scanning
- Community reports
- Search engine results

### O5 — Multisig Signer Compromise

**Severity:** 🔴 Critical
**Probability:** Low

**Description:** Attacker compromise multisig signer, potentially gaining unauthorized control.

**Potential Impact:**
- Protocol parameter changes
- Treasury manipulation
- Emergency abuse

**Mitigation:**
- Hardware wallets mandatory
- Geographically distributed signers
- Multi-factor authentication
- 3/5 threshold (need 3 compromised)
- Regular signer reviews
- Signer rotation schedule

**Monitoring:**
- Suspicious multisig TX alerts
- Signer activity monitoring
- Incident response procedures

## Reputational Risks

### RP1 — Community Backlash

**Severity:** 🟡 High
**Probability:** Medium

**Description:** Community perceive protocol as unfair, scam-like, atau abandonment.

**Causes:**
- Major bug
- Communication failure
- Unpopular governance decision
- Competitor FUD

**Mitigation:**
- Transparent communication
- Active community management
- Responsive support
- Clear explanation of decisions
- Community representation in governance

**Monitoring:**
- Social sentiment analysis
- Community feedback loops
- Early warning indicators

### RP2 — Negative Media Coverage

**Severity:** 🟢 Medium
**Probability:** Low

**Description:** Unflattering media story (real issue atau FUD).

**Mitigation:**
- PR strategy
- Pre-built media relationships
- Transparency response
- Professional communication

**Monitoring:**
- Media mention tracking
- Sentiment analysis
- Key journalist relationships

### RP3 — Association with Bad Actors

**Severity:** 🟢 Medium
**Probability:** Low

**Description:** User of GOTT turns out to be scam/criminal, negative association.

**Mitigation:**
- KYC for large claims
- Community moderation
- Anti-association policies
- Quick disassociation if needed

## Overall Risk Matrix

```
                   Severity
              Low    Med   High   Critical
Very High   │ O4   │ M1   │ M2   │      │
High        │      │ M4   │ T2   │      │
Medium      │ M5   │ T4   │ T3   │ T1,O5│
Low         │ R3   │ R2   │ T5,T6│ R1   │
Very Low    │      │      │      │      │
```

## Risk Treatment Priorities

### Must Address (Pre-Launch)
1. T1: Smart Contract Exploit → Audit
2. R1: Regulatory → Legal consultation
3. O5: Multisig Compromise → Hardware wallets + distributed
4. O3: Domain Hijack → Registrar lock + 2FA

### Should Address (Phase 1)
1. T2/T3: Scam Classifier → Multi-source validation
2. M1: Competitor → Launch speed + community
3. O1: Team Burnout → Distributed knowledge
4. O4: Phishing Clone → Monitoring service

### Monitor (Ongoing)
1. M2-M5: Market dynamics
2. R2-R4: Regulatory landscape
3. RP1-RP3: Reputation

## Incident Response Framework

### Detection
- Automated monitoring (uptime, anomaly, security)
- Community reporting
- Partner notifications

### Assessment
- Severity classification
- Impact scope
- Mitigation options

### Response
- Immediate containment
- Communication (internal + external)
- Technical resolution
- User support

### Recovery
- Service restoration
- User compensation (if applicable)
- Post-mortem

### Learning
- Root cause analysis
- Process improvement
- Preventive measures

## Risk Review Cadence

**Weekly:** Active incident review
**Monthly:** Risk register update
**Quarterly:** Major risk reassessment
**Annually:** Full risk framework review

## Conclusion

Risk management adalah **ongoing process**, bukan one-time activity. Key principles:

1. **Identify early:** Proactive detection
2. **Assess honestly:** No wishful thinking
3. **Mitigate proportionally:** Cost vs impact
4. **Monitor continuously:** Landscape changes
5. **Respond swiftly:** Speed limits damage
6. **Learn systematically:** Failures → improvements

**"Risk management is not about avoiding all risks — it's about understanding them and choosing which to take."**
