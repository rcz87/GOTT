# 14 — Legal Considerations

> **DISCLAIMER:** Dokumen ini bukan legal advice. Konsultasi dengan lawyer qualified Indonesia sebelum eksekusi apapun yang disebut di sini.

## Indonesia Regulatory Framework

### Regulatory Bodies

**Bappebti (Badan Pengawas Perdagangan Berjangka Komoditi)**
- Historical regulator sejak 2019
- Menganggap crypto sebagai commodity asset (bukan mata uang)
- Mengatur daftar aset kripto yang boleh diperdagangkan
- Regulator exchange (Indodax, Pintu, Tokocrypto, dll)

**OJK (Otoritas Jasa Keuangan)**
- Ambil alih regulasi crypto dari Bappebti (transisi 2025)
- Fokus: consumer protection, AML, tax compliance
- Kewenangan lebih luas (bukan cuma commodity angle)

**Kominfo (Kementerian Komunikasi dan Informatika)**
- Content moderation
- Domain registration compliance
- Anti-phishing regulation

**Bank Indonesia**
- Payment system
- Rupiah stability (crypto bukan legal tender)

### Regulatory Scope Relevant ke GOTT

**✅ Applicable:**
- Token classification (utility vs security)
- Exchange listing requirements
- AML/KYC for service providers
- Tax reporting
- Consumer protection

**❓ Unclear:**
- DAO legal status
- Cross-border crypto service
- Indonesian user obligations untuk participate di DAO
- Wallet service classification

**❌ Not applicable (yet):**
- Payment license (GOTT bukan payment token)
- Banking license (no deposit-taking)

## Token Classification Analysis

### Howey Test Application (US SEC standard, relevant for reference)

**Howey Test criteria for securities:**
1. Investment of money
2. Common enterprise
3. Expectation of profit
4. Efforts of others

**GOTT analysis:**

**1. Investment of money** — ❌ NOT MET
- GOTT tidak dijual
- No IDO, no presale, no public sale
- User earn GOTT via cleanup (work-based distribution)
- Investment of labor, bukan money

**2. Common enterprise** — ❌ NOT MET
- Distributed mining via individual cleanup activity
- No central pool where gains are shared
- Each user's rewards depend on individual actions

**3. Expectation of profit** — ❌ QUESTIONABLE
- Primary utility: DAO governance participation
- Secondary: cleanup protocol access
- Speculation possible (secondary market), tapi bukan intention

**4. Efforts of others** — ❌ NOT MET
- User actively mines GOTT via own cleanup
- Protocol is autonomous (contracts + backend)
- No centralized team "driving value"

**Conclusion:** GOTT **likely NOT a security** under Howey.

### Indonesia-specific Classification

**Utility Token Factors:**
- ✅ Primary use: access protocol service
- ✅ Governance participation
- ✅ No profit-sharing or dividend
- ✅ No promise of returns
- ✅ Distributed via utility (mining)

**Commodity Token Factors (jika diklasifikasi begitu):**
- ❓ Tradeable on exchange
- ❓ Has market value
- ❓ Potential store of value

**Bappebti/OJK Framework:**
- GOTT bisa di-list di exchange Indonesia jika:
  - Submit dokumen (whitepaper, audit, etc)
  - Pass review (fundamental analysis)
  - Meet minimum requirements (market cap, liquidity, audit)

**Risk area:** Jika OJK interpret "reward untuk activity" sebagai yield-bearing, bisa dikategorikan sebagai investment product. Requires careful positioning.

## Entity Structure Options

### Option 1: PT Indonesia (Perseroan Terbatas)

**Pros:**
- Clear legal entity di Indonesia
- Easier local banking
- Tax ID (NPWP) resmi
- Local employee hiring
- Government partnership possible

**Cons:**
- High compliance burden
- Crypto regulation risk at entity level
- Tax obligations
- Reporting requirements
- Personal liability if not careful

**Use case:** Operational entity untuk development + marketing.

### Option 2: Offshore Entity

**Jurisdictions:**
- **Cayman Islands:** Popular untuk crypto foundation (DAO-friendly)
- **BVI (British Virgin Islands):** Traditional offshore, flexible
- **Panama:** Low cost, moderate oversight
- **Singapore:** Respected, but high compliance
- **Estonia:** E-residency, EU jurisdiction

**Pros:**
- Regulatory flexibility
- Lower tax burden
- DAO-compatible structures available
- International credibility

**Cons:**
- Setup cost ($2k-$10k)
- Annual maintenance ($1k-$5k)
- Indonesia tax reporting still needed for founders
- Banking might be challenging
- Perception concerns (not always positive)

**Use case:** Holding entity untuk token, IP ownership.

### Option 3: Hybrid Structure (Recommended)

**Setup:**
1. **Cayman Foundation** — DAO/Token holder
2. **PT Indonesia** — Operational entity (subsidiary atau separate)
3. **Founder personal** — Compliance personal tax

**Flow:**
- Foundation owns token contracts + treasury
- PT operates marketing, dev, community in Indonesia
- Founder handles personal tax

**Pros:**
- Regulatory flexibility (foundation)
- Local operational legitimacy (PT)
- DAO-ready structure
- International credibility

**Cons:**
- Complex setup ($5k-$15k)
- Higher ongoing costs
- Requires legal guidance

**Recommendation:** Consult lawyer, tapi hybrid biasanya optimal untuk DAO project.

## Key Legal Documents Required

### Pre-Launch

**1. Terms of Service**
- User obligations
- Service disclaimer
- Dispute resolution
- Jurisdiction clause

**2. Privacy Policy**
- Data collection practices
- GDPR/PDPA compliance (jika applicable)
- Data retention
- User rights

**3. Risk Disclosure**
- Smart contract risk
- Market risk
- Regulatory risk
- "Not an investment" clarity

**4. User Agreement (Wallet Approval)**
- Clear approval warning
- Scope of cleanup
- Gas responsibility
- No reversal after execution

**5. Cookie Policy** (jika use cookies)
- Types of cookies
- Opt-in/opt-out

### Operational

**6. Partnership Agreement Template**
- Audit firm engagement
- Influencer partnership
- Exchange listing
- API customer

**7. Employment/Contractor Agreement**
- IP assignment
- Confidentiality
- Non-compete (reasonable scope)
- Compensation structure

**8. Ambassador Agreement**
- Role definition
- Compensation (GOTT)
- Conduct expectations
- Termination clause

**9. Treasury Spending Authorization**
- DAO governance process
- Multisig procedures
- Expense reimbursement policy

### Token-Specific

**10. Token Distribution Framework**
- Vesting terms for team
- Mining mechanics
- Airdrop terms
- Liquidity lock commitment

**11. Smart Contract Audit Report**
- Public disclosure
- Known limitations
- Version control

**12. Tokenomics Whitepaper**
- Legal-reviewed version
- Public disclosure
- Version update protocol

### Trademark & IP

**13. Trademark Registration**
- "GOTT" wordmark
- Logo
- Multiple jurisdictions (Indonesia + global)

**14. Copyright Notice**
- Code (MIT license typical)
- Content (attribution)
- Brand assets

## Compliance Checklist

### Pre-Launch Compliance

**Legal Consultation:**
- [ ] Engage Indonesia crypto lawyer (1-2 firms)
- [ ] Review tokenomics legal structure
- [ ] Risk assessment dari regulatory angle
- [ ] Entity structure decision

**Entity Setup:**
- [ ] Foundation jurisdiction chosen
- [ ] Foundation registered
- [ ] Operational entity (PT Indonesia) jika needed
- [ ] Banking setup
- [ ] Accounting systems

**Documentation:**
- [ ] ToS drafted + reviewed
- [ ] Privacy Policy drafted + reviewed
- [ ] Risk Disclosure drafted
- [ ] All bilingual (ID + EN)
- [ ] Published at website footer

**Token Compliance:**
- [ ] Utility token positioning documented
- [ ] No marketing as investment
- [ ] Clear "not financial advice" disclaimers
- [ ] Geo-block US/sanctioned countries

**Data Protection:**
- [ ] Data collection minimized
- [ ] GDPR compliance (if EU users)
- [ ] PDPA compliance (Indonesia 2024 law)
- [ ] Security measures documented

### Post-Launch Compliance

**Ongoing Monitoring:**
- [ ] Regulation changes tracking
- [ ] Tax obligations met
- [ ] Annual report (entities)
- [ ] Audit renewals (protocol)

**User Protection:**
- [ ] Clear warnings maintained
- [ ] Support responsive
- [ ] Complaint handling process
- [ ] Dispute resolution available

**AML/KYC (if applicable):**
- [ ] Threshold-based KYC (>$10k)
- [ ] Sanctions list screening
- [ ] Suspicious activity reporting
- [ ] Record retention

## Specific Legal Considerations

### Cleanup Service as "Financial Service"

**Potential concern:** Regulator interpret cleanup tool as financial intermediary (like money services business).

**Analysis:**
- User self-custody (no funds held by protocol)
- Smart contract autonomous (no custody)
- No investment advice
- No buying/selling intermediation (user executes own swaps)

**Mitigation:**
- Clear "non-custodial tool" positioning
- User controls all approvals
- Disclaimers emphasizing self-service nature

**Recommendation:** Consult local lawyer specifically untuk ini.

### DAO Legal Status

**Status in Indonesia:** Currently undefined legal construct.

**Risks:**
- Members might be held personally liable (unincorporated association)
- Treasury legal status unclear
- Voting "authority" unclear

**Mitigation Options:**
- Foundation wraps DAO (Cayman model)
- Limited liability legal wrapper (Wyoming DAO LLC for US)
- BVI VAA structure

**Recommendation:** Start with foundation structure, evolve as regulations clarify.

### Token Listing Requirements (Indonesia)

**Bappebti Requirements (historically):**
- Whitepaper
- Project team doxxed (partially)
- Audit report
- Roadmap
- Minimum liquidity
- Risk assessment

**OJK (Post-2025):**
- Likely more stringent
- Consumer protection emphasis
- Potentially requires licensing untuk exchange
- Transparent operations

**Strategy:**
- Prepare dokumentasi lengkap
- Target Tier 3 listing pertama (MEXC, Gate.io)
- Indonesia exchange listing Phase 2 (Pintu, Tokocrypto)
- Official Bappebti/OJK submission if required

### Cross-Border Considerations

**Indonesian user + Cayman Foundation + BSC blockchain:**

**Questions:**
- Jurisdiction untuk disputes?
- Tax obligations?
- Compliance requirements?

**Mitigation:**
- Clear ToS jurisdiction clause
- User tax responsibility disclaimer
- Legal entity in user-facing jurisdiction jika possible
- Transparent operations

### Team Compensation Legal Structure

**Vesting contract setup:**
- On-chain vesting (Sablier, Llamapay)
- 12-month cliff + 24-month linear
- Multisig-controlled revocation (only for misconduct)
- Transparent schedule

**Tax implications:**
- Vested tokens as income at vesting date
- Capital gains on subsequent sale
- Indonesian tax reporting (Pajak Penghasilan)

**Documentation:**
- Individual team agreements
- Clear vesting schedule
- IP assignment
- Non-compete reasonable

## Incident Legal Response

### Protocol Exploit

**Immediate:**
- Engage legal counsel
- Preserve evidence
- Communicate transparently (no over-promise)
- Document all actions

**Potential actions:**
- Law enforcement report (if attacker identifiable)
- Compensation framework (if funds recoverable)
- Public disclosure (responsible)
- User support + information

### Regulatory Inquiry

**Immediate:**
- Preserve all records
- Engage specialized lawyer
- Cooperate professionally
- Don't make public statements without counsel

**Key principles:**
- Transparency
- Good faith
- Document everything
- Follow legal advice

### User Dispute

**Process:**
- Internal support first (30 days resolution)
- Mediation (if unresolved)
- Arbitration clause (ToS)
- Jurisdiction as specified in ToS

## Bilingual Documentation

### Priority Documents (Must be bilingual ID + EN)

- Terms of Service
- Privacy Policy
- Risk Disclosure
- User Agreement
- Website content
- Marketing materials

### Technical Documentation

- English primary (developer standard)
- Indonesian translation for key docs
- Code comments in English (industry standard)

### Translation Quality

- Professional legal translator untuk legal documents
- Community translator untuk marketing
- Review by native Indonesian speaker (team member)

## Budget Allocation

### Initial (Year 1)

| Category | Budget (USD) |
|----------|-------------|
| Legal consultation (initial) | $3,000 |
| Entity setup (Cayman + PT) | $7,000 |
| Document drafting | $2,000 |
| Trademark registration | $1,500 |
| Ongoing legal retainer | $5,000 |
| **Total** | **$18,500** |

### Ongoing (Annual)

| Category | Budget (USD) |
|----------|-------------|
| Legal retainer | $5,000 |
| Entity maintenance | $3,000 |
| Compliance updates | $2,000 |
| **Total** | **$10,000** |

## Recommendations Summary

### Immediate Actions
1. **Engage Indonesia crypto lawyer** (CONSULT, not optional)
2. **Decide entity structure** (recommend hybrid: foundation + PT)
3. **Draft core legal documents** (ToS, Privacy, Risk Disclosure)
4. **Register trademark** ("GOTT" + logo)
5. **Geo-block high-risk jurisdictions** (US, sanctioned)

### Pre-Launch Actions
1. **Complete entity setup**
2. **Publish all legal documents** (bilingual)
3. **Audit + public disclosure**
4. **KYC framework untuk large claims**
5. **Compliance officer designated** (or retained)

### Ongoing
1. **Monitor regulation changes**
2. **Annual legal review**
3. **Compliance training team**
4. **Incident response readiness**

## Disclaimer

Dokumen ini adalah **overview** bukan legal advice. Regulasi crypto Indonesia masih evolving. Konsultasi dengan qualified lawyer specializing in Indonesian crypto law adalah **MANDATORY** sebelum proceed dengan eksekusi apapun dari blueprint ini.

**Lawyer recommendations (research required):**
- Sri Rahayu Ningsih & Partners
- Hukum Online Komunitas
- IndoBlocks legal partners
- AHRP (has crypto practice)

**Additional resources:**
- Indonesia Blockchain Association (ABI)
- AsosiaSI Pedagang Fisik Aset Kripto Indonesia (APBKI)
- Bappebti official site
- OJK crypto regulation portal

## Key Principle

**"Comply first, launch second."**

Regulatory surprise can kill protocol. Legal foundation = long-term survival. Invest upfront, save later.
