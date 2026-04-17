# 05 — Scam Detection Engine

## Purpose
Classify setiap token di wallet user menjadi kategori: Legit, Dust, Dead, Scam, Drainer, Honeypot. Ini jadi **core moat** GOTT vs kompetitor.

## Detection Pipeline

```
Input: Token Address + User Wallet Context
       ↓
┌─────────────────────┐
│  Step 1: Cache Check│  Hit → Return cached status
└──────┬──────────────┘       (TTL based on age)
       ↓ Miss
┌─────────────────────┐
│  Step 2: On-chain   │  Check ScamRegistry.sol
│    Registry Lookup  │  (DAO-curated database)
└──────┬──────────────┘
       ↓ Not found
┌─────────────────────┐
│  Step 3: External   │  GoPlus, TokenSniffer
│    API Check        │  (free tier)
└──────┬──────────────┘
       ↓ Parallel checks
┌─────────────────────┐
│  Step 4: Liquidity  │  PancakeSwap pool analysis
│    Analysis         │  TVL, volume, LP concentration
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Step 5: Honeypot   │  Fork-based simulation
│    Simulator        │  (try buy + sell)
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Step 6: ML         │  Classifier model
│    Classifier       │  (trained on historical)
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│  Step 7: Aggregate  │  Weighted decision
│    Decision         │
└──────┬──────────────┘
       ↓
Output: Status + Confidence Score + Recommendation
```

## Classification Rules

### Dust Token Criteria

**Hard rules (automatic classification):**
- Token value USD < $5
- Token NOT in top 500 by market cap
- User balance value < $5

**Soft rules (require more signals):**
- Token age > 6 months
- Volume 24h < $1000
- LP TVL < $10k

**Action:** Show in cleanup list, swap via PancakeSwap if liquidity sufficient.

### Dead Token Criteria

**Liquidity signals:**
- PancakeSwap pool TVL < $1,000
- No swap activity in last 30 days
- LP token ownership > 95% concentrated di 1 wallet

**Activity signals:**
- No transfers in last 60 days (other than to burn address)
- No contract interactions dari creator in 90 days

**Social signals (off-chain):**
- Twitter inactive > 6 months
- Telegram/Discord disbanded
- Website down

**Action:** Usually send to LandfillVault (swap akan fail), mark as Dead in registry.

### Scam Token Criteria

**Contract analysis:**
- Not verified on BscScan
- Owner NOT renounced
- Large mint function visible
- Blacklist function present
- Fee can be changed > 10%

**Metadata signals:**
- Name/symbol similar to legit token (typosquatting)
- Description contains URL to unknown domain
- Logo is stolen from legit project

**Transaction signals:**
- Airdropped to many wallets in single TX
- Creator holds > 50% supply
- Rapid dumps from creator wallet

**External verification:**
- Marked as scam in GoPlus
- TokenSniffer score < 20
- Community reports in registry

**Action:** Highlighted warning, option to send to LandfillVault (avoid swap).

### Drainer NFT Criteria

**Mint pattern:**
- Minted in batch > 10,000
- Minted in single TX atau rapid succession
- Airdropped to many wallets (> 1000) in short time

**Metadata red flags:**
- URL to domain registered < 30 days ago
- URL contains "claim", "airdrop", "redeem" keywords
- Image hosted on IPFS + metadata on centralized server (phishing pattern)

**Contract red flags:**
- Transfer function has gating
- `setApprovalForAll` triggers phishing
- Hidden drain function in contract

**Action:** Strong warning, option to send to burn/landfill (not marketplace).

### Honeypot Criteria

**Simulation test:**
- Can buy via PancakeSwap: YES
- Can sell via PancakeSwap: NO (fails)
- Fee on sell: 100% (equivalent)
- Hidden pause mechanism activated on sell

**Detection method:**
- Fork mainnet simulation
- Try buy $10 worth
- Try sell same amount
- If fail atau excessive loss → honeypot

**Action:** Never swap, always send to LandfillVault.

## External API Integration

### GoPlus Security API

**Endpoint:** `https://api.gopluslabs.io/api/v1/token_security/56`

**Free tier:** 30 requests/minute, 1000/day

**Key fields:**
```json
{
  "is_honeypot": "1",
  "is_open_source": "0",
  "owner_address": "0x...",
  "sell_tax": "99.9",
  "buy_tax": "0.5",
  "transfer_pausable": "1",
  "is_blacklisted": "0",
  "can_take_back_ownership": "1"
}
```

**Usage:** Primary external validation. Cache 24h untuk token established.

### TokenSniffer API

**Endpoint:** `https://tokensniffer.com/api/tokens/:contract`

**Free tier:** 100 requests/day

**Key fields:**
```json
{
  "score": 35,
  "is_flagged": true,
  "flags": ["owner_can_mint", "max_wallet", "proxy_contract"],
  "swap_simulation": {
    "can_buy": true,
    "can_sell": false
  }
}
```

**Usage:** Secondary validation untuk contract analysis.

### DeFiLlama API

**Endpoint:** `https://api.llama.fi/protocols`

**Free tier:** Unlimited

**Usage:** Cross-check project legitimacy via TVL presence.

### Chainlink Price Feeds

**BSC Feeds:**
- BNB/USD: `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`
- Used untuk USD value calculation

**Fallback:** PancakeSwap pool price (less reliable but always available).

## ML Classifier

### Training Data

**Historical scam token dataset:**
- Rug pull database (scamdb.info, rugdoc.io exports)
- Honeypot.is archive
- Community-reported scams

**Features:**
- Contract verification status (binary)
- Token age (days since creation)
- Holder count distribution
- LP token concentration
- Creator wallet activity
- Transfer pattern (airdrop vs organic)
- Token name similarity to top 100 (Levenshtein)
- Trading volume pattern
- Buy/sell ratio
- Price volatility

### Model Architecture

**Initial:** Simple gradient boosting (XGBoost)
- Fast inference
- Explainable
- Good with tabular data

**Phase 2:** Graph neural network
- Analyze token relationships
- Detect scam clusters
- Higher accuracy untuk novel scams

### Output

```json
{
  "token": "0x...",
  "status": "Scam",
  "confidence": 0.92,
  "signals": [
    {"type": "honeypot", "score": 0.95},
    {"type": "no_liquidity", "score": 0.98},
    {"type": "owner_concentration", "score": 0.85}
  ],
  "recommendation": "send_to_landfill",
  "last_updated": "2026-04-15T10:30:00Z"
}
```

## Classification Confidence Scoring

```
Final Status = weighted_decision({
  ScamRegistry: 0.40 (highest weight if present),
  GoPlus API:   0.25,
  TokenSniffer: 0.15,
  ML Classifier: 0.15,
  Honeypot Sim:  0.05
})

Confidence thresholds:
- 0.90+: Auto-classify
- 0.70-0.90: Classify with warning
- 0.50-0.70: Flag for manual review
- <0.50: Mark as Unknown, don't include in cleanup
```

## Community Reporting

### Mechanism (Phase 2)

```
User reports token as scam
    ↓
Stake 1000 GOTT required
    ↓
Auto-cross-reference external APIs
    ↓
If consensus ≥ 80% match: Auto-accept, stake returned + reward
If consensus 50-80%: DAO vote (7 days)
If consensus < 50%: Auto-reject, stake slashed 50%
    ↓
Update ScamRegistry on-chain
```

### Reward Structure

- Valid report: 100 GOTT reward + stake returned
- Invalid report: 500 GOTT stake slashed
- Malicious report (spam): Ban after 3 offenses

### Anti-Griefing

- Rate limit: max 10 reports per wallet per day
- Stake requirement increases after false reports
- DAO can blacklist reporters

## Honeypot Simulator

### Implementation

**Hardhat Fork Approach:**
```javascript
// Pseudo-code
async function simulateHoneypot(tokenAddress) {
  // Fork BSC at latest block
  const fork = await hre.network.provider.request({
    method: "hardhat_reset",
    params: [{
      forking: {
        jsonRpcUrl: BSC_RPC,
        blockNumber: latestBlock
      }
    }]
  });

  // Impersonate a wallet with BNB
  const testWallet = "0x...";
  await impersonateAccount(testWallet);

  // Try to buy token
  const router = await getPancakeRouter();
  const buyResult = await router.swapExactETHForTokens(
    0, [WBNB, tokenAddress], testWallet, deadline,
    { value: ethers.parseEther("0.1") }
  );

  const tokenBalance = await token.balanceOf(testWallet);

  // Try to sell
  await token.approve(router, tokenBalance);
  try {
    const sellResult = await router.swapExactTokensForETH(
      tokenBalance, 0, [tokenAddress, WBNB], testWallet, deadline
    );
    return { isHoneypot: false, buyFee, sellFee };
  } catch (e) {
    return { isHoneypot: true, reason: e.message };
  }
}
```

**Production:** Run via dedicated BSC node dengan fork capability.

**Scale:** Cache results 24h, batch simulation untuk new tokens.

## Database Schema

### PostgreSQL `token_classifications` table

```sql
CREATE TABLE token_classifications (
    contract_address VARCHAR(42) PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 56,
    status VARCHAR(20) NOT NULL,
    confidence DECIMAL(3,2),
    signals JSONB,
    usd_value DECIMAL,
    liquidity_usd DECIMAL,
    token_age_days INTEGER,
    holder_count INTEGER,
    last_classified_at TIMESTAMP NOT NULL,
    classified_by VARCHAR(50),
    external_checks JSONB,
    INDEX idx_status (status),
    INDEX idx_last_classified (last_classified_at)
);
```

### Cache Strategy

**Redis:**
- Key: `token:classification:{chain}:{address}`
- TTL: 24h untuk established, 1h untuk new tokens
- Invalidation on ScamRegistry update event

## Public API

### Endpoint: `GET /api/v1/token/:address`

**Response:**
```json
{
  "address": "0x...",
  "chain": "bsc",
  "status": "Scam",
  "confidence": 0.92,
  "recommendation": "send_to_landfill",
  "details": {
    "liquidity_usd": 50.3,
    "token_age_days": 45,
    "holder_count": 1200,
    "external_checks": {
      "goplus": "flagged",
      "tokensniffer_score": 15
    }
  },
  "last_updated": "2026-04-15T10:30:00Z"
}
```

### Rate Limiting

- Free tier: 100 requests/hour per IP
- Paid tier (Phase 2): unlimited dengan API key

## Monetization (Phase 2)

### Scam Registry API as Service

**Target customers:**
- Wallet providers (Trust Wallet, SafePal, TokenPocket)
- Portfolio managers (Zerion, Zapper, DeBank)
- Exchanges (warn user before listing suspicious pair)
- Security tools (Fire, Wallet Guard)

**Pricing:**
- Starter: $99/mo (10k requests/day)
- Pro: $499/mo (100k requests/day)
- Enterprise: Custom (bulk + SLA)

**Revenue flow:**
- 50% burn GOTT (deflationary)
- 30% DAO treasury
- 20% development budget

## Future Enhancements

### v2 — Real-time Detection
- WebSocket feed of new token deployments
- Auto-classify within 10 seconds of deployment
- Early warning system untuk community

### v3 — Cross-chain
- Expand ke ETH, Polygon, Base
- Cross-chain scam pattern matching
- Shared database across chains

### v4 — AI Agent
- LLM-based analysis untuk edge cases
- Natural language explanation of risks
- Auto-generated scam warnings in multiple languages
