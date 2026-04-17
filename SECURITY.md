# Security Policy

## Supported Versions

Saat ini project masih di fase blueprint. Security policy akan di-update saat smart contracts di-deploy.

## Reporting a Vulnerability

### For Smart Contract Vulnerabilities (Future)

Ketika smart contracts sudah live:

1. **DO NOT** report via public GitHub Issues
2. Email: security@gott.finance (TBD)
3. Use PGP encryption (key to be published)
4. Include:
   - Vulnerability description
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (optional)

### For Non-Critical Issues

- Use GitHub Issues dengan label `security`
- Non-exploit discussions welcome

## Bug Bounty Program (Post-Launch)

### Immunefi Program

Akan di-activate saat mainnet live.

**Severity Classifications:**

| Severity | Bounty Range |
|----------|--------------|
| Critical | $10,000 - $50,000 |
| High | $5,000 - $10,000 |
| Medium | $1,000 - $5,000 |
| Low | $100 - $1,000 |

### Scope (Future)

**In Scope:**
- Smart contracts di mainnet
- Critical backend API (prod)
- Website (phishing, XSS)

**Out of Scope:**
- Testnet contracts
- Documentation typos
- Theoretical issues without PoC
- Social engineering
- Physical attacks
- Third-party services

## Response Time SLA

**Once reporting infrastructure is live:**

| Severity | Acknowledgment | Initial Response | Resolution Target |
|----------|---------------|------------------|-------------------|
| Critical | 12 hours | 24 hours | 72 hours |
| High | 24 hours | 48 hours | 7 days |
| Medium | 72 hours | 7 days | 30 days |
| Low | 7 days | 14 days | Next release |

## Disclosure Policy

### Responsible Disclosure

We follow responsible disclosure practices:
1. Report privately first
2. We investigate + fix
3. Coordinated public disclosure
4. Credit to reporter (if desired)

### Timeline

- Day 0: Report received
- Day 1: Acknowledged
- Days 1-30: Investigation + fix
- Day 31: Public disclosure (or agreed date)
- Reporter credited

### Hall of Fame

Security researchers who help kami akan di-credit di:
- Protocol website
- Twitter thank-you
- GitHub recognition
- Optional GOTT reward

## Security Practices

### For Users

**Protect yourself:**
- Always verify URL (gott.finance — official, TBD)
- Review every TX sebelum sign
- Understand approvals
- Use hardware wallet untuk large holdings
- Never share seed phrase
- Beware of phishing

**Red flags:**
- Anyone asking for seed phrase → SCAM
- Too-good-to-be-true offers → SCAM
- Urgency pressure → SCAM
- Unverified domain → CHECK TWICE

### For Developers

**Smart contract security:**
- OpenZeppelin battle-tested
- Multiple audits before mainnet
- Foundry fuzzing
- Slither + Aderyn static analysis
- Manual review checklist
- Progressive deployment

**Backend security:**
- Defense in depth
- Secret management (Vault)
- 2FA mandatory
- SSH key only
- Regular security reviews

**Frontend security:**
- CSP headers
- No localStorage for sensitive data
- Clear transaction simulation
- Warning banners

## Emergency Contacts

**For critical issues only:**

- Primary: security@gott.finance (TBD)
- Backup: (team contact TBD)
- Multisig signers: (distributed, TBD)

## Additional Resources

- [OpenZeppelin Security Audits](https://blog.openzeppelin.com/security-audits/)
- [Trail of Bits Blog](https://blog.trailofbits.com/)
- [Immunefi Learn](https://immunefi.com/learn/)
- [Ethereum Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)

---

**Last Updated:** April 2026
**Next Review:** Upon smart contract deployment
