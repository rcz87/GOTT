# GUARDIANS TOKEN (GOTT) — Project Blueprint

## Token Specs

| Item | Detail |
|---|---|
| Name | Guardians Token |
| Symbol | GOTT |
| Network | BNB Smart Chain (BSC) |
| Standard | BEP-20 (ERC-20 compatible) |
| Max Supply | 1,000,000,000 (1 Billion) |
| Decimals | 18 |
| Type | Hybrid (Utility + Governance) |

## Core Features

| Feature | Detail |
|---|---|
| Mintable | MINTER_ROLE can mint up to MAX_SUPPLY cap |
| Burnable | Any holder can burn their own tokens |
| Pausable | PAUSER_ROLE can freeze all transfers (emergency) |
| Governance | ERC20Votes — on-chain delegation & voting power |
| Gasless Approve | ERC20Permit — approve via signature (no gas) |
| Anti-Whale | Max wallet 2% of supply (configurable, toggleable) |
| Access Control | Role-based: ADMIN, MINTER, PAUSER |

## Tokenomics (Recommended Allocation)

Initial mint at deploy: **40% (400,000,000 GOTT)**

| Allocation | % | Amount | Vesting |
|---|---|---|---|
| Liquidity Pool (PancakeSwap) | 15% | 150,000,000 | Locked 12 months |
| Public Sale / Launchpad | 10% | 100,000,000 | TGE 25%, 3mo linear |
| Ecosystem & Partnerships | 8% | 80,000,000 | 6mo cliff, 12mo linear |
| Team & Founders | 5% | 50,000,000 | 12mo cliff, 24mo linear |
| Marketing & Airdrop | 2% | 20,000,000 | Immediate (operational) |

Remaining 60% (600,000,000 GOTT) — **minted over time by MINTER_ROLE:**

| Allocation | % | Amount | Schedule |
|---|---|---|---|
| Staking Rewards | 25% | 250,000,000 | Minted per epoch/block |
| DAO Treasury | 20% | 200,000,000 | Minted via governance vote |
| Community Incentives | 10% | 100,000,000 | Quarterly unlock |
| Reserve | 5% | 50,000,000 | Emergency / future use |

## Role Architecture

```
DEFAULT_ADMIN_ROLE (deployer)
├── Can grant/revoke all roles
├── Configure anti-whale settings
└── Transfer admin to multisig (recommended)

MINTER_ROLE
├── Mint new tokens (up to MAX_SUPPLY)
└── Assign to: Staking contract, vesting contract

PAUSER_ROLE
├── Pause/unpause all transfers
└── Emergency use only
```

**Security recommendation:** After launch, transfer DEFAULT_ADMIN_ROLE to a Gnosis Safe multisig (3-of-5 minimum).

## Project Structure

```
gott-token/
├── contracts/
│   └── GuardiansToken.sol     ← Main contract
├── scripts/
│   └── deploy.js              ← Deploy + verify script
├── test/
│   └── GuardiansToken.test.js ← Full test suite
├── docs/
│   └── BLUEPRINT.md           ← This file
├── hardhat.config.js           ← Network config
├── package.json                ← Dependencies
├── .env.example                ← Environment template
└── .gitignore
```

## Deployment Checklist

### Phase 1: Development ✅
- [x] Smart contract written
- [x] Hardhat config for BSC
- [x] Deploy script with auto-verify
- [x] Test suite (15+ tests)

### Phase 2: Testing
- [ ] `npm install`
- [ ] `npm run compile`
- [ ] `npm run test` — all tests pass
- [ ] Deploy to BSC Testnet: `npm run deploy:testnet`
- [ ] Test all functions on testnet via BscScan

### Phase 3: Audit
- [ ] Run Slither: `slither contracts/GuardiansToken.sol`
- [ ] Run Aderyn: `aderyn .`
- [ ] Fix any findings
- [ ] Submit to auditor (Hacken/SolidProof/QuillAudits)

### Phase 4: Mainnet Deploy
- [ ] Setup `.env` with mainnet private key
- [ ] `npm run deploy:mainnet`
- [ ] Verify on BscScan
- [ ] Renounce/transfer roles to multisig

### Phase 5: Liquidity & Listing
- [ ] Create TOKEN/BNB pair on PancakeSwap
- [ ] Add initial liquidity ($10K–$50K)
- [ ] Lock LP tokens (12 months minimum)
- [ ] Exempt PancakeSwap pair from max wallet
- [ ] Exempt PancakeSwap router from max wallet
- [ ] Submit to CoinGecko
- [ ] Submit to CoinMarketCap

### Phase 6: Post-Launch
- [ ] Deploy staking contract (assign MINTER_ROLE)
- [ ] Deploy governance (Governor + Timelock)
- [ ] Setup bug bounty on Immunefi
- [ ] Community building (Telegram/Discord/Twitter)

## Quick Commands

```bash
# Install
npm install

# Compile
npm run compile

# Test (local)
npm run test

# Test with gas report
npm run test:gas

# Deploy BSC Testnet
npm run deploy:testnet

# Deploy BSC Mainnet
npm run deploy:mainnet

# Verify (manual, if auto-verify fails)
npx hardhat verify --network bscMainnet CONTRACT_ADDRESS OWNER_ADDRESS 40
```

## Post-Deploy: PancakeSwap Setup

```javascript
// After getting PancakeSwap pair address:
const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const PANCAKE_PAIR = "0x..."; // Get from PancakeSwap after adding liquidity

// Exempt from anti-whale
await token.setExemptFromMaxWallet(PANCAKE_ROUTER, true);
await token.setExemptFromMaxWallet(PANCAKE_PAIR, true);
```

## Estimated Costs (Minimum Viable Launch)

| Item | Cost |
|---|---|
| Deploy contract | ~$5 (gas) |
| BscScan verification | Free |
| PancakeSwap liquidity | $10,000–$20,000 |
| LP lock (Mudra/Team.finance) | ~$50 |
| Budget audit (SolidProof) | $3,000–$5,000 |
| Total minimum | **~$13,000–$25,000** |
