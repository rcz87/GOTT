# GOTT Protocol — Internal Review Package

> **Status:** Pre-audit internal review. Intended for an external audit firm (SolidProof / Hacken tier) with no prior project context.
> **Commit under review:** `8a80b35` (main).
> **Document version:** Draft 0.9 — §4 + §5 + §6 + §7 + §8 + §9 + §10 + §11 complete; test counts reconciled (193 Hardhat + 54 Foundry); §12, §13, §14, §15, §16, §1 pending.

---

## §1 Document Purpose

*To be written last.*

---

## Draft Progress (working note — remove before delivery to audit firm)

This section tracks the internal drafting state. It is **not** part of the deliverable to the audit firm; it will be deleted in the Draft 1.0 cut.

### Done in this revision (Draft 0.9)

| Section | Status | Notes |
|---|---|---|
| §2 Executive Summary | ✅ Complete | Scope, stats, toolchain, deployment target. |
| §3 Protocol Architecture | ✅ Complete | Data flow, ASCII dependency diagram, Phase A/B/C lifecycle, off-chain deps. |
| §4.1 GuardiansToken | ✅ Complete | 13-element template. |
| §4.2 ScamRegistry | ✅ Complete | 13-element template. |
| §4.3 LandfillVault | ✅ Complete | 13-element template. FoT-token coverage gap flagged. |
| §4.4 CleanupMining | ✅ Complete | 13-element template + reward-math sanity check + 4 Slither suppressions. |
| §4.5 GarbageCollector | ✅ Complete | 13-element template. **High-risk contract.** CEI deep-dive, internal-helper audit notes, 9 logical Slither suppressions. AD-07/08/09 forward-ref'd to §10. |
| §4.6 GuardiansTimelockController | ✅ Complete | Vanilla OZ wrapper (24 LoC). AD-10 (open executor) forward-ref'd to §10. |
| §4.7 GuardiansGovernor | ✅ Complete | OZ module composition (151 LoC, 9 required overrides). AD-11 (BSC block-time variance) forward-ref'd to §10. |
| §5 Role Matrix | ✅ Complete | Consolidated table across 7 contracts + 4 post-table notes (contract-bound roles, hot keys, pause asymmetry, roleless Governor). |
| §6 System Invariants (registry + body proof-sketches) | ✅ Complete | Registry I-01..I-17 plus §6.1-§6.6 body. Each invariant covered with 6-element format (Statement / Why it matters / Enforcement / Verification / Assumptions / Failure mode blocked). Coverage gaps honestly flagged for I-15 (no dedicated `invariant_*`), I-16 (OZ Timelock property, no Foundry invariant), I-17 (no end-to-end self-amendment test). Cross-refs: AD-03 (I-08 FoT limit), AD-06 (I-02 UTC bucket), AD-07 (I-02 / I-15 bound). |
| §7 External Call Graph | ✅ Complete | 10 sub-sections (§7.1-§7.10). §7.1 reading guide (6 call classes), §7.2 ASCII high-level graphs (3: cleanup engine, landfill path, governance), §7.3 11-step `cleanupBatch` table, §7.4 `sendScamToLandfill` path, §7.5 mining-reward atomicity caveat (EVM revert propagation through DEX swaps in the same tx), §7.6 swap-fail fallback (try/catch scope explicit), §7.7 governance/Timelock pipeline, §7.8 admin/role transfer bootstrap calls, §7.9 20-row consolidated external-call inventory, §7.10 14-row revert/atomicity summary. Single "NO (caught)" row in §7.10 = router swap revert via try/catch; every other failure reverts the whole tx. |
| §8 Storage Layout & Upgrade Story | ✅ Complete | 12 sub-sections (§8.1-§8.12). Non-upgradeable design statement (no proxy / no Diamond / no delegatecall). Per-contract logical storage walks with explicit constant / immutable / mutable / inherited / external-balance separation. §8.10 Immutable dependency matrix — only `_minDelay` is in-place-changeable (via self-proposal); every other immutable requires redeploy. §8.11 6 migration playbooks (replace GC / Mining / Registry / Vault / Governor+Timelock / Token-last-resort). §8.12 9-row storage risk summary — no currently-exploitable risk; all entries require a triggering event. "High (would-be)" used to distinguish forward-planning entries from live risks. |
| §9 Trust Assumptions & Oracle Surface | ✅ Complete | §9.1 Trust Model Overview (four trust classes), §9.2 Hot-Key Surface Summary (5-row table), §9.3 oracleSigner deep-dive, §9.4 ORACLE_ROLE deep-dive, §9.5 PancakeRouter / WBNB boundary, §9.6 User-Supplied ERC-20 boundary, §9.7 Governance / Timelock boundary, §9.8 Bootstrap Trust Window, §9.9 Consolidated Trust Assumption Matrix. Operational vs on-chain controls explicitly labelled throughout. |
| §10 Acknowledged Design Decisions (body) | ✅ Complete | AD-02..AD-11 drafted using the 9-element format (Title / Severity / Affected / Decision / Rationale / Risk / Mitigation / Residual / Cross-ref). AD-01 reserved for the highest-priority external-audit finding. Severities: AD-02..AD-04 Low, AD-05/AD-06/AD-09/AD-10/AD-11 Info, AD-07 Med, AD-08 Low–Med. |
| §11 Gas & DoS Surface | ✅ Complete | 13 sub-sections (§11.1-§11.13). §11.2 7-row loop inventory (only the GC scam pre-check + swap loops have hard caps; `setStatusBatch` + `sendScamToLandfill` + `distributeInitial` are caller-discipline-bounded). §11.3 GC gas profile decomposition. §11.4 user-supplied ERC-20 grief modes. §11.10 PancakeRouter unavailability response. §11.11 BNB payout-fail user-local DoS. §11.12 14-row DoS classification matrix (single fund-at-risk row = AD-07 oracleSigner compromise). §11.13 7-item audit-request list (fork tests, FoT/rebasing coverage, optional `maxBatchSize`, frontend gas estimator, proposal hygiene, I-15 handler, I-17 E2E test). |
| Test count reconciliation | ✅ Done | **193 Hardhat + 54 Foundry = 247 total, 100% pass.** Run output: 0 failed, 0 skipped. Earlier 167+35 scan was undercount; PR-claimed 193+54 verified. Per-file: GuardiansToken 40/11, ScamRegistry 29/9, LandfillVault 27/10, CleanupMining 38/10, GarbageCollector 32/9, Governance 15/5, RoleTransfer 12/—. |

### Pending sections (planned order)

| Order | Section | Estimated complexity | Blocker / dependency |
|---|---|---|---|
| 1 | §13 Emergency Response | Medium — playbook for AD-07 (oracle key compromise), AD-02 (ORACLE_ROLE compromise), router incident, Timelock-stuck proposal, paused-vault recovery | §8 + §9 + §10 + §11 already drafted. |
| 2 | §14 Test Coverage Summary | Low — write up the verified 193+54 numbers + coverage-gap rollup from §4.X.13 cells | Test counts already verified. |
| 3 | §15 Out of Scope | Low — short list (off-chain signer infra, ORACLE_ROLE keeper service, frontend) | None. |
| 4 | §16 Appendices (Glossary, EIP-712, Reward Formula derivation, Build & Reproducibility, Repo refs) | Medium | Reward-formula derivation pulls from §4.4.12 inline rationale + AD-05. |
| 5 | §12 Deployment Reference | Low — short stub + link to `docs/DEPLOYMENT.md` | **Blocker: `docs/DEPLOYMENT.md` does not yet exist.** Create alongside §12 drafting. |
| 6 | §1 Document Purpose | Low | Write **last**, after every other section is final. |

### Design acceptances catalog (§10 body now drafted — all severities user-ack'd)

| AD | Title | Severity (final) | Origin |
|---|---|---|---|
| AD-01 | *reserved for highest-priority external-audit finding* | — | — |
| AD-02 | ScamRegistry pause response window (48 h, no EMERGENCY backup; zero funds) | Low ✅ | §4.2.4 |
| AD-03 | LandfillVault FoT amount-vs-event drift (no balanceBefore/After diff) | Low ✅ | §4.3.6 |
| AD-04 | Deploy collapses LandfillVault role separation (all 4 roles → Timelock) | Low ✅ | §4.3.4 |
| AD-05 | CleanupMining divide-before-multiply pattern (overflow protection trade-off) | Info ✅ | §4.4.12 |
| AD-06 | GuardiansToken UTC mint bucket timestamp granularity | Info ✅ | §3.4 + §4.1 |
| AD-07 | `oracleSigner` single-key risk (compromise → mint up to `MAX_MINT_PER_DAY`) | **Med** ✅ | §4.5.4 |
| AD-08 | Swap-fail fallback → user loses token to landfill without BNB refund | **Low–Med** ✅ | §4.5.6 |
| AD-09 | Per-token slippage = 0; sandwich-attack defense relies on caller-supplied `minBnbOut` | Info ✅ | §4.5.6 |
| AD-10 | Timelock open executor (`executors = [address(0)]`) | Info ✅ | §4.6.4 |
| AD-11 | BSC block-time variance (2.5–4 s) affects effective Governor voting window | Info ✅ | §4.7.10 |

### Coverage gaps to flag in §14

- `MockERC20` only — no fuzz/invariant against fee-on-transfer, rebasing, or ERC-777-callback tokens (§4.3.13).
- No fork-test against real BSC PancakeRouter v2 (§4.5.13).
- I-15 (`nonces[u]` monotonic) has no dedicated `invariant_*` handler — implicit only via `testFuzz_replayBlocked` (§4.5.13).
- I-17 (Governor `onlyGovernance` self-amendment) not exercised end-to-end (§4.7.13).
- ~~Test-count reconciliation~~ — done in Draft 0.3: 193 Hardhat + 54 Foundry verified.

---

## §2 Executive Summary

### 2.1 What GOTT Is

GOTT (Guardians of the Token) is a BSC-deployed protocol whose purpose is to let users **swap a batch of dust / dead / scam tokens out of their wallet in a single transaction** and earn GOTT rewards for doing so. The system is composed of three functional layers:

| Layer | Contracts | Responsibility |
|---|---|---|
| **Asset layer** | `GuardiansToken` | ERC20Votes governance token. Hard cap 1B. Daily-capped mint path for cleanup rewards. |
| **Cleanup engine** | `GarbageCollector`, `ScamRegistry`, `LandfillVault`, `CleanupMining` | Pulls user tokens, routes via PancakeSwap, isolates flagged tokens, computes and mints rewards under a 180-day halving schedule. |
| **Governance** | `GuardiansGovernor`, `GuardiansTimelockController` | OZ Governor + Timelock with 48 h minimum delay. Receives all admin roles in Phase 3 cutover. |

Reward sizing is gated by an off-chain oracle that signs a per-batch USD valuation (`cleanupValueUSD`) via EIP-712. This prevents self-reported reward gaming — see §9.

### 2.2 Scope of Review

**In scope** (7 production contracts, 5 production deploy scripts):

```
contracts/GuardiansToken.sol
contracts/ScamRegistry.sol
contracts/LandfillVault.sol
contracts/CleanupMining.sol
contracts/GarbageCollector.sol
contracts/governance/GuardiansTimelockController.sol
contracts/governance/GuardiansGovernor.sol
scripts/deploy*.js   (deployment runbook → docs/DEPLOYMENT.md)
```

**Out of scope** (see §15 for full list):

- `contracts/mocks/MockERC20.sol`, `contracts/mocks/MockPancakeRouter.sol` — test fixtures only, never deployed.
- Off-chain oracle backend (signs `cleanupValueUSD`) — separate engagement.
- Frontend and indexer.

### 2.3 Project Statistics

| Metric | Value |
|---|---|
| Production contracts | 7 |
| Mock contracts (test only) | 2 |
| Hardhat test files | 7 |
| Foundry test files | 6 |
| Hardhat test count | *verified in §14* |
| Foundry test count (fuzz + invariant) | *verified in §14* |
| Foundry invariant functions | 15 |
| Slither findings (Medium+) | 0 |
| Slither suppressions (documented, with rationale) | 13 |
| Compiler | Solidity `0.8.24`, EVM `cancun` |
| Optimizer | enabled, 200 runs |
| Dependencies | `@openzeppelin/contracts ^5.1.0` |
| Hardhat | `^2.22.0` |
| Foundry config | 500 fuzz runs, 100 invariant runs × depth 50, `fail_on_revert = false` |

### 2.4 Deployment Target

| Network | Chain ID | Status |
|---|---|---|
| BSC Mainnet | 56 | Final deployment target (post-audit). |
| BSC Testnet | 97 | Pre-audit shakedown environment. |
| Hardhat (local) | 31337 | Unit/integration tests + optional BSC fork. |

The protocol is **non-upgradeable by design** (no proxies, no UUPS, no Diamond). Storage layout and migration story discussed in §8.

### 2.5 Repository & Reproducibility Quick Reference

```
Repo:     github.com/rcz87/GOTT
Branch:   main
Commit:   8a80b359b9cc3cb3595a65075a1d471d754f2fba
Build:    npm ci && npx hardhat compile && forge build
Test:     npx hardhat test && forge test
Static:   slither . (zero Medium+ findings, see §14)
```

Full reproducibility steps (toolchain versions, deterministic compile flags, expected artifact hashes) in **Appendix D — Build & Reproducibility**.

### 2.6 What the Auditor Should Read First

Recommended reading order for a reviewer landing cold:

1. **§3 Architecture** — understand how the contracts talk to each other.
2. **§5 Role Matrix** — understand who can call what, before vs. after Phase 3 cutover.
3. **§4 Contract Inventory** — per-contract surface (longest section; reference, not linear read).
4. **§6 Invariants** + **§10 Acknowledged Design Decisions** — what we claim is always true, and what tradeoffs we made knowingly.
5. **§9 Trust Assumptions** — every dependency that is not "code we wrote."

---

## §3 Protocol Architecture

### 3.1 End-to-End User Flow

A successful cleanup looks like this:

```
1. User wallet holds N dust/dead tokens (T_1 ... T_N).
2. Off-chain oracle inspects the batch, computes total USD value V, and signs
   an EIP-712 CleanupAuthorization(user, batchHash, V, nonce, deadline) with
   the private key of `oracleSigner`.
3. User calls GarbageCollector.cleanupBatch(tokens, amounts, minBnbOut,
   cleanupValueUSD=V, nonce, deadline, signature).
4. GarbageCollector:
   a. Verifies the EIP-712 signature recovers to `oracleSigner`.
   b. Checks deadline >= block.timestamp.
   c. Checks nonce == nonces[user]; increments nonce[user].
   d. For each token T_i:
      - Reverts if ScamRegistry.isScamOrDrainer(T_i) is true.
        (Scam paths must use sendScamToLandfill instead — no reward.)
      - Pulls T_i from the user via transferFrom.
      - Approves PancakeRouter and calls swapExactTokensForETH.
      - On swap failure: forwards T_i to LandfillVault (push transfer).
   e. Accumulates BNB received across all swaps; reverts if < minBnbOut.
   f. Calls CleanupMining.recordCleanup(user, V, N).
   g. Sends accumulated BNB to user (last, after state changes — CEI).
5. CleanupMining:
   a. Computes reward. Conceptual formula (per NatSpec at
      CleanupMining.sol:24):
          reward = (baseRate × V × tierMult × epochMult) / 1e54
      Implementation (CleanupMining.sol:183–185) is mathematically equivalent
      but split into three sequential `/1e18` divides to avoid uint256
      overflow at large V — see §10 (divide-before-multiply rationale).
      Tier multiplier depends on user's cumulative cleaned value (first-time
      bonus, bronze, silver). Epoch multiplier halves every 180 days for
      4 epochs, then drops to zero.
   b. Updates per-user accounting (cumulative value, rewards, last-cleanup
      timestamp, per-epoch count).
   c. Calls GuardiansToken.mintReward(user, reward).
6. GuardiansToken.mintReward:
   a. Enforces hard cap (MAX_SUPPLY = 1B).
   b. Enforces daily cap (MAX_MINT_PER_DAY = 1.4M, bucketed by UTC day).
   c. Mints GOTT to user.
```

Alternate path — flagged tokens: `sendScamToLandfill(tokens, amounts)` pushes the listed tokens directly into LandfillVault and emits an event. **No reward, no oracle signature required, no nonce consumed.** Caller takes the loss explicitly.

### 3.2 Contract Dependency Diagram

```
                          ┌──────────────────────┐
                          │   GuardiansGovernor  │   (off-chain proposals)
                          │  (Governor + Votes)  │
                          └──────────┬───────────┘
                                     │ propose / queue
                                     ▼
                       ┌─────────────────────────────┐
                       │ GuardiansTimelockController │   minDelay = 48 h
                       │  (DEFAULT_ADMIN of all      │
                       │   protocol contracts after  │
                       │   Phase 3 cutover)          │
                       └──────────────┬──────────────┘
                                      │ admin calls
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────────┐        ┌───────────────┐         ┌───────────────────┐
│  GuardiansToken   │        │  ScamRegistry │         │  LandfillVault    │
│  (ERC20Votes)     │        │               │         │                   │
└─────────┬─────────┘        └───────┬───────┘         └─────────▲─────────┘
          ▲                          ▲                           │
          │ mintReward               │ isScamOrDrainer           │ push on
          │ (CLEANUP_MINER_ROLE)     │ (view)                    │ swap fail
          │                          │                           │ +
┌─────────┴─────────┐                │                  sendScamToLandfill
│   CleanupMining   │                │                           │
│  (180-day halving)│                │                           │
└─────────▲─────────┘                │                           │
          │ recordCleanup            │                           │
          │ (COLLECTOR_ROLE)         │                           │
          │                          │                           │
          │                  ┌───────┴────────┐                  │
          └──────────────────┤ GarbageCollector├──────────────────┘
                             │  (EIP-712 auth) │
                             └────────┬────────┘
                                      │ swap
                                      ▼
                             ┌────────────────┐
                             │ PancakeRouter  │   (external, immutable ref)
                             └────────────────┘

  Off-chain components (out of audit scope):
    - oracleSigner (signs CleanupAuthorization)
    - ScamRegistry ORACLE_ROLE keeper (classifies tokens)
    - Governor proposal frontend / vote relayer
```

### 3.3 Deployment & Governance Lifecycle

The protocol moves through three operational phases:

**Phase A — Pre-deploy / Genesis.** Deployer wallet holds all admin roles. No Governor yet. Used to deploy contracts in dependency order and wire cross-contract addresses.

| Step | Action | Notes |
|---|---|---|
| A.1 | Deploy `GuardiansToken` | Deployer = `DEFAULT_ADMIN`, `MINTER`, `PAUSER`. |
| A.2 | Call `distributeInitial(recipients[], amounts[])` once | TGE allocation. Flag `initialized` flips before mint loop. Irreversible. |
| A.3 | Deploy `ScamRegistry` | Deployer = `DEFAULT_ADMIN`, `ORACLE`, `PAUSER`. ORACLE will be rotated to off-chain key. |
| A.4 | Deploy `LandfillVault` | Deployer = `DEFAULT_ADMIN`, `DAO`, `EMERGENCY`, `PAUSER`. DAO will move to Timelock. |
| A.5 | Deploy `CleanupMining(gott=GuardiansToken)` | Captures `LAUNCH_TIMESTAMP` (epoch base). |
| A.6 | Deploy `GarbageCollector(router, WBNB, scamRegistry)` | These three are immutable. |
| A.7 | Grant `CLEANUP_MINER_ROLE` on GuardiansToken to CleanupMining | Required for `mintReward`. |
| A.8 | Grant `COLLECTOR_ROLE` on CleanupMining to GarbageCollector | Required for `recordCleanup`. |
| A.9 | Call `setMiningContract`, `setLandfillVault`, `setOracleSigner` on GarbageCollector | Mutable refs; can be re-pointed by `ADMIN_ROLE` holder (deployer in Phase A; Timelock after Phase B.5 cutover). |

**Phase B — Governance bootstrap.** Governor + Timelock deployed; admin roles transferred to Timelock.

| Step | Action | Notes |
|---|---|---|
| B.1 | Deploy `GuardiansTimelockController(48h, [], [address(0)], deployer)` | Open executor (anyone can execute queued ops). Deployer is temporary admin. |
| B.2 | Deploy `GuardiansGovernor(token, timelock)` | Settings: votingDelay 28,800 blocks, votingPeriod 201,600 blocks, threshold 100k GOTT, quorum 4%. |
| B.3 | Grant `PROPOSER_ROLE` on Timelock to Governor | Governor can queue. |
| B.4 | Grant `CANCELLER_ROLE` on Timelock to Governor | Governor can cancel queued ops. |
| B.5 | Run `scripts/transferRolesToTimelock.js` | Idempotent. Grants Timelock all admin/operational roles on the 5 protocol contracts, then revokes them from deployer. |
| B.6 | Deployer renounces `DEFAULT_ADMIN_ROLE` **on the Timelock contract** | Final self-lock. After this, the Timelock has no unilateral admin — every parameter change requires a Governor proposal subject to the full 48 h delay. DAO is the only remaining key-holder for protocol admin actions. |

**Phase C — Steady state.** All admin actions (parameter changes, oracle rotation, pauses, emergency burns) flow through Governor proposals with 48 h Timelock delay. Two off-chain duties remain hot:

- `oracleSigner` (single EOA, signs every `cleanupBatch`).
- `ORACLE_ROLE` holder on ScamRegistry (writes classifications).

Both keys can be rotated via DAO proposal if compromised; see §9 and §13.

### 3.4 Off-Chain Dependencies

Anything the contracts trust but do not control:

| Dependency | Where used | Trust assumption | Compromise mitigation |
|---|---|---|---|
| `oracleSigner` (EOA) | GarbageCollector EIP-712 signature | Signs honest `cleanupValueUSD` per batch. | DAO rotates via `setOracleSigner`. Per-user nonce + deadline limit blast radius. |
| ScamRegistry ORACLE_ROLE | `setStatus`, `setStatusBatch` | Honest classification of tokens. | DAO rotates role. Pauseable. Status enum range-checked. |
| PancakeRouter | GarbageCollector swap path | Standard Uniswap V2 router semantics on the configured WBNB pair. | Router address is **immutable** — a malicious or upgraded router cannot be silently injected; replacement requires new GarbageCollector deployment + governance migration. |
| WBNB | GarbageCollector swap path | Canonical WBNB on BSC. | Immutable. |
| Underlying ERC20s | LandfillVault, GarbageCollector swap | Arbitrary user-supplied tokens. May be malicious (fee-on-transfer, rebasing, reentrant transfer hooks). | ReentrancyGuard, CEI ordering, swap fallback to LandfillVault. See §10. |

**Not assumed trusted, even though referenced:**

- The user's own ERC20 token contracts. Any `transferFrom` failure is caught and the token is forwarded to LandfillVault instead of reverting the batch (see §10, design decision D-04).
- Block timestamp granularity for daily mint bucket (`block.timestamp / 1 days`). UTC day boundary is acceptable resolution for a 1.4M-token-per-day cap; manipulation surface is bounded to a single block (~3 s) and accepted as a design tradeoff (see §10, AD-06).

---

## §4 Contract Inventory

This section catalogs every production contract. Each subsection follows the same 13-element template so the auditor can navigate consistently. The template was reviewed and locked before the first contract was filled — its structure is described at the top of §4.1 and applies identically to §4.2 through §4.7.

---

### §4.1 GuardiansToken

**File:** `contracts/GuardiansToken.sol` (234 lines)
**Deployed:** Phase A.1 (see §3.3) — once per network, never re-deployed.
**Mutability:** Immutable contract. No proxy, no initializer, no UUPS, no Diamond. All setup happens in the constructor.

#### 4.1.1 Purpose

GOTT is the protocol's ERC20 governance + utility token. It enforces a hard 1B-supply cap, a 1.4M-per-UTC-day mint sub-cap on the cleanup-reward path, and exposes ERC20Votes voting power for the Governor.

#### 4.1.2 Inheritance (C3 linearization)

Direct parents (declaration order, `GuardiansToken.sol:27–34`):

```
contract GuardiansToken is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    ERC20Votes,
    AccessControl
```

**Why direct-parent listing is sufficient.** Solidity computes the full C3 MRO from this list, but enumerating every transitive ancestor (Context, EIP712, Nonces, IERC165, IERC20Metadata, IVotes, IERC5267, IERC5805, …) does not add audit value here because all OZ v5.x modules use ERC-7201 namespaced storage (`erc7201:openzeppelin.storage.<Module>`). Each module's slots are computed from its own namespace string and cannot collide regardless of linearization order. The only points where MRO order actually matters in this contract are the three explicit overrides below.

For audit purposes the relevant compositions are the three required overrides at the bottom of the file:

| Line | Function | Override list | Why this composition |
|---|---|---|---|
| 215 | `_update(from, to, value)` | `ERC20, ERC20Pausable, ERC20Votes` | All three parents override `_update`; `super._update` walks the chain so pause-check and vote-snapshot both run on every transfer/mint. |
| 223 | `nonces(owner)` | `ERC20Permit, Nonces` | Both define `nonces`; the explicit override disambiguates. |
| 229 | `supportsInterface(id)` | `AccessControl` | Only AccessControl introduces ERC-165; the override is required by Solidity but resolves to a single parent. |

**OZ v5.1.0-specific notes:**
- `AccessControl` in v5 reverts with `AccessControlUnauthorizedAccount(account, role)` (custom error), not v4's string revert. All access-denied negative tests assert on the custom error.
- `ERC20Votes` in v5 uses ERC-7201 namespaced storage (`erc7201:openzeppelin.storage.ERC20Votes`), so storage slot collision with `AccessControl`, `Pausable`, and `Nonces` is structurally impossible regardless of MRO order.
- `ERC20Pausable._update` reverts on any transfer (including mint and burn) when paused — this is the v5 behavior. Confirmed-by-test: pause-blocks-mintReward, pause-blocks-distributeInitial.
- `ERC20Permit` brings in `Nonces` storage (EIP-2612 sequential nonces for permit signatures). These nonces are **independent of and unrelated to** the per-user nonces in `GarbageCollector` (EIP-712 cleanup authorization). They live in different contracts, different namespaces, and different signature schemes; there is no shared state between them. A permit signature consumed on this token does not advance a user's cleanup nonce, and vice versa.

#### 4.1.3 Constructor

```solidity
constructor(address initialOwner)
    ERC20("Guardians Token", "GOTT")
    ERC20Permit("Guardians Token")
```

| Step in body | What it does | Source |
|---|---|---|
| 1 | Reverts with `ZeroAddress()` if `initialOwner == 0` | L88 |
| 2 | `_grantRole(DEFAULT_ADMIN_ROLE, initialOwner)` | L90 |
| 3 | `_grantRole(MINTER_ROLE, initialOwner)` | L91 |
| 4 | `_grantRole(PAUSER_ROLE, initialOwner)` | L92 |

**No initial mint.** `totalSupply()` is `0` immediately after deploy. TGE allocation is performed post-deploy by `distributeInitial(...)`.

**`CLEANUP_MINER_ROLE` is not granted in the constructor.** It is granted post-deploy in Phase A.7 to the CleanupMining contract — see §4.1.4 Roles table.

#### 4.1.4 Roles

| Role constant | Hash | Granted at deploy to | Steady-state holder | Renounce / transfer event | Can call |
|---|---|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00…00` (OZ built-in) | deployer (Phase A.1) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5; deployer self-locks at Phase B.6 | `grantRole`, `revokeRole`, any future role management |
| `MINTER_ROLE` | `keccak256("MINTER_ROLE")` | deployer (Phase A.1) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 | `mint(address,uint256)` |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (Phase A.1) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 | `pause()`, `unpause()` |
| `CLEANUP_MINER_ROLE` | `keccak256("CLEANUP_MINER_ROLE")` | — (not granted at deploy) | CleanupMining contract | Granted to CleanupMining at Phase A.7. **Not** transferred to Timelock at Phase B.5 (intentionally omitted from `scripts/transferAdminRoles.js:28`; see `scripts/transferAdminRoles.js:15` for the author's note). However, the role **is revocable** by the `DEFAULT_ADMIN_ROLE` holder (= Timelock post-B.5) via a standard `revokeRole(CLEANUP_MINER_ROLE, miningContract)` DAO proposal. | `mintReward(address,uint256)` |

**Design note on `CLEANUP_MINER_ROLE`:** This role is bound to a contract address, not an EOA. The role itself is administered by `DEFAULT_ADMIN_ROLE` (OZ default — no custom admin set), so post-Phase-B.5 the Timelock can:
- `revokeRole(CLEANUP_MINER_ROLE, oldMining)` and `grantRole(CLEANUP_MINER_ROLE, newMining)` to swap CleanupMining implementations via DAO proposal (subject to the 48 h delay).
- Or revoke without re-granting, halting the cleanup-reward path entirely without pausing the rest of the token.

Both operations follow the standard governance flow — there is no custom code path that makes this role "permanent" or otherwise privileged.

#### 4.1.5 Modifiers

Custom modifiers defined on this contract: **none.** All access control uses OZ inherited modifiers.

| Modifier | Source | Effect on this contract |
|---|---|---|
| `onlyRole(<ROLE>)` | `AccessControl` (inherited) | Reverts with `AccessControlUnauthorizedAccount(caller, role)`. |
| `whenNotPaused` (implicit) | `ERC20Pausable._update` (inherited) | Not used as a function-level modifier here — pause-check runs inside `_update` and therefore guards **all** transfers, mints, and burns automatically. |

**Single-pattern enforcement — no stacked modifiers. No reentrancy surface (no external calls outside contract: only `_mint` and `_pause`/`_unpause` from OZ; no `.call`, `.transfer`, or ERC20.transfer to external addresses).**

**Rationale: pause enforcement on `distributeInitial` is structural, not modifier-declared.** `distributeInitial` is not annotated `whenNotPaused`. Pause-protection is instead enforced one layer deeper: every `_mint` call inside its loop reaches `_update`, and `ERC20Pausable._update` (in OZ v5) reverts with `EnforcedPause` if `paused() == true`. This is identical to how `mint` and `mintReward` are protected. The alternative — annotating `distributeInitial` with `whenNotPaused` directly — would be redundant (double-check) and would *not* improve safety because the `_update` gate is the canonical chokepoint that catches every token-balance change. The Hardhat test `"distributeInitial reverts when paused"` exercises this path explicitly to confirm the structural protection.

**Consistency check** — every state-mutating external function and its modifier stack:

| Function | Modifiers applied | Pause-protected via `_update`? |
|---|---|---|
| `distributeInitial(address[], uint256[])` | `onlyRole(DEFAULT_ADMIN_ROLE)` | Yes (calls `_mint` → `_update`) |
| `mint(address, uint256)` | `onlyRole(MINTER_ROLE)` | Yes |
| `mintReward(address, uint256)` | `onlyRole(CLEANUP_MINER_ROLE)` | Yes |
| `pause()` | `onlyRole(PAUSER_ROLE)` | n/a (toggles the gate itself) |
| `unpause()` | `onlyRole(PAUSER_ROLE)` | n/a |
| `burn(uint256)` | — (public, ERC20Burnable) | Yes (caller burns own balance) |
| `burnFrom(address, uint256)` | — (public, ERC20Burnable) | Yes (requires allowance) |
| `transfer(address, uint256)` | — (public, ERC20) | Yes |
| `transferFrom(address, address, uint256)` | — (public, ERC20) | Yes |
| `approve(address, uint256)` | — (public, ERC20) | n/a (no `_update` call) |
| `permit(...)` | — (public, ERC20Permit) | n/a (signature → approve) |
| `delegate(address)` | — (public, ERC20Votes) | n/a (no token movement) |
| `delegateBySig(...)` | — (public, ERC20Votes) | n/a |

#### 4.1.6 External / Public Functions

| Signature | Modifiers | Returns | Purpose | Emits |
|---|---|---|---|---|
| `distributeInitial(address[] recipients, uint256[] amounts)` | `onlyRole(DEFAULT_ADMIN_ROLE)` | — | One-shot TGE allocation. Validates length, zero-address, zero-total, MAX_SUPPLY. Flips `initialized` before mint loop. | `InitialDistributed`, plus N × `Transfer(0, recipient, amount)` |
| `mint(address to, uint256 amount)` | `onlyRole(MINTER_ROLE)` | — | General mint. Enforces MAX_SUPPLY only (no daily cap). | `Transfer(0, to, amount)` |
| `mintReward(address to, uint256 amount)` | `onlyRole(CLEANUP_MINER_ROLE)` | — | Reward path used by CleanupMining. Enforces ZeroAddress, ZeroAmount, daily cap, MAX_SUPPLY. | `RewardMinted`, `Transfer(0, to, amount)` |
| `mintableSupply()` | `view` | `uint256` | `MAX_SUPPLY - totalSupply()` | — |
| `currentDayMinted()` | `view` | `uint256` | `mintedPerDay[block.timestamp / 1 days]` | — |
| `remainingDailyMintCapacity()` | `view` | `uint256` | `MAX_MINT_PER_DAY - mintedPerDay[today]` | — |
| `pause()` | `onlyRole(PAUSER_ROLE)` | — | Halts all transfers, mints, burns via `_update` gate. | OZ `Paused(account)` |
| `unpause()` | `onlyRole(PAUSER_ROLE)` | — | Lifts the pause gate. | OZ `Unpaused(account)` |
| `nonces(address owner)` | `view`, `override(ERC20Permit, Nonces)` | `uint256` | Disambiguating override. | — |
| `supportsInterface(bytes4)` | `view`, `override(AccessControl)` | `bool` | ERC-165. | — |

**Inherited public surface** (not re-listed as table rows; listed here by parent contract for explicit reference):

- **ERC20:** `name()`, `symbol()`, `decimals()`, `totalSupply()`, `balanceOf(address)`, `allowance(address,address)`, `transfer(address,uint256)`, `transferFrom(address,address,uint256)`, `approve(address,uint256)`.
- **ERC20Burnable:** `burn(uint256)`, `burnFrom(address,uint256)`.
- **ERC20Pausable:** no new public functions (acts via `_update`).
- **ERC20Permit / EIP712:** `permit(address,address,uint256,uint256,uint8,bytes32,bytes32)`, `DOMAIN_SEPARATOR()`, `eip712Domain()`. Plus `nonces(address)` (overridden — see table above).
- **ERC20Votes:** `getVotes(address)`, `getPastVotes(address,uint256)`, `getPastTotalSupply(uint256)`, `delegates(address)`, `delegate(address)`, `delegateBySig(address,uint256,uint256,uint8,bytes32,bytes32)`, `clock()`, `CLOCK_MODE()`, `numCheckpoints(address)`, `checkpoints(address,uint32)`.
- **Pausable:** `paused()`.
- **AccessControl:** `hasRole(bytes32,address)`, `getRoleAdmin(bytes32)`, `grantRole(bytes32,address)`, `revokeRole(bytes32,address)`, `renounceRole(bytes32,address)`. Plus `supportsInterface(bytes4)` (overridden — see table above).

**Internal helpers worth audit attention:** none beyond the three required overrides. No custom `_*` helpers introduced by this contract.

#### 4.1.7 Public State Variables (auto-getters)

| Variable | Type | Visibility | Initial value | What it tracks |
|---|---|---|---|---|
| `mintedPerDay` | `mapping(uint256 => uint256)` | `public` | empty | GOTT minted via `mintReward` per UTC day; key = `block.timestamp / 1 days`. |
| `initialized` | `bool` | `public` | `false` | One-shot guard for `distributeInitial`. Flips to `true` at L125 *before* the mint loop. |
| `MINTER_ROLE` | `bytes32 constant` | `public` | `keccak256("MINTER_ROLE")` | Role constant. |
| `PAUSER_ROLE` | `bytes32 constant` | `public` | `keccak256("PAUSER_ROLE")` | Role constant. |
| `CLEANUP_MINER_ROLE` | `bytes32 constant` | `public` | `keccak256("CLEANUP_MINER_ROLE")` | Role constant. |
| `MAX_SUPPLY` | `uint256 constant` | `public` | `1_000_000_000 * 10**18` | Hard ceiling on `totalSupply`. **Audit boundary.** |
| `MAX_MINT_PER_DAY` | `uint256 constant` | `public` | `1_400_000 ether` | Per-UTC-day cap on `mintReward` only. **Audit boundary.** |

Auto-getters from OZ parents: `name()`, `symbol()`, `decimals()`, `totalSupply()`, `balanceOf(addr)`, `allowance(o,s)`, `paused()`, `nonces(owner)`, `DOMAIN_SEPARATOR()`, plus inherited role-check views.

#### 4.1.8 Custom Errors

| Error | Signature | When thrown | Thrown by |
|---|---|---|---|
| `ExceedsMaxSupply` | `(uint256 requested, uint256 available)` | `totalSupply() + amount > MAX_SUPPLY` | `mint` (L142), `mintReward` (L175), `distributeInitial` (L120) |
| `DailyMintCapExceeded` | `(uint256 requested, uint256 available)` | `mintedPerDay[today] + amount > MAX_MINT_PER_DAY` | `mintReward` (L172) |
| `AlreadyInitialized` | `()` | `distributeInitial` called after `initialized == true` | `distributeInitial` (L109) |
| `LengthMismatch` | `()` | `recipients.length != amounts.length` | `distributeInitial` (L111) |
| `EmptyDistribution` | `()` | `recipients.length == 0` | `distributeInitial` (L110) |
| `ZeroDistributionAmount` | `()` | sum of all amounts == 0 | `distributeInitial` (L119) |
| `ZeroAmount` | `()` | `amount == 0` on reward path | `mintReward` (L168) |
| `ZeroAddress` | `()` | any address arg == `address(0)` | constructor (L88), `mintReward` (L167), `distributeInitial` per-element (L116) |

No errors are inherited-and-bubbled: OZ `AccessControl` and `Pausable` produce their own errors (`AccessControlUnauthorizedAccount`, `EnforcedPause`) which this contract surfaces unchanged.

#### 4.1.9 Events

| Event | Signature | Emitted by | Notes |
|---|---|---|---|
| `RewardMinted` | `(address indexed to, uint256 amount, uint256 indexed day)` | `mintReward` (L182) | `day` indexed for off-chain per-day aggregation. |
| `InitialDistributed` | `(address[] recipients, uint256[] amounts)` | `distributeInitial` (L131) | Arrays not indexed (not supported for dynamic types). One-shot event — emitted at most once per contract lifetime. |

Inherited events emitted but not redefined: `Transfer(from, to, value)`, `Approval(owner, spender, value)`, `Paused(account)`, `Unpaused(account)`, `DelegateChanged(...)`, `DelegateVotesChanged(...)`, `EIP712DomainChanged()`, `RoleGranted(...)`, `RoleRevoked(...)`, `RoleAdminChanged(...)`.

#### 4.1.10 Immutables & Constants

Split into two categories per the §4 template:

**Category A — Compile-time constants (`constant` keyword, no storage slot, value baked into bytecode):**

| Name | Type | Value | Set at | Rationale |
|---|---|---|---|---|
| `MAX_SUPPLY` | `uint256 constant public` | `1_000_000_000 * 10**18` (1 B GOTT) | L45 | Tokenomics hard cap. **Audit boundary** — invariant `totalSupply() ≤ MAX_SUPPLY` (§6.1). |
| `MAX_MINT_PER_DAY` | `uint256 constant public` | `1_400_000 ether` (1.4 M GOTT) | L46 | Anti-exploit ceiling on the reward-mint path; bounds blast radius of a compromised CleanupMining contract or oracle to ~1.4 M GOTT/day. |
| `MINTER_ROLE` | `bytes32 constant public` | `keccak256("MINTER_ROLE")` | L38 | — |
| `PAUSER_ROLE` | `bytes32 constant public` | `keccak256("PAUSER_ROLE")` | L39 | — |
| `CLEANUP_MINER_ROLE` | `bytes32 constant public` | `keccak256("CLEANUP_MINER_ROLE")` | L40 | — |

**Category B — Constructor-set immutables (`immutable` keyword, set once in constructor, stored in bytecode):**

*None on this contract.* All parameters that could be `immutable` are either `constant` (above) or governed by role state (`_grantRole` in the constructor body, mutable via `grantRole`/`revokeRole` thereafter).

> Bridge note for the auditor: §4.5 GarbageCollector makes heavy use of the `immutable` pattern (`router`, `WBNB`, `scamRegistry` — three external dependencies sealed at deploy time). The deliberate absence of `immutable` here reflects a different design: the token has **no external trusted dependencies** at construction, so there is nothing to seal.

**Math sanity check on the daily cap.** The two constants are sized so the reward-mint path alone would take roughly the full cleanup-mining lifetime to exhaust supply:

```
MAX_SUPPLY / MAX_MINT_PER_DAY = 1_000_000_000 / 1_400_000 ≈ 714.3 days
Cleanup-mining halving window = 4 epochs × 180 days = 720 days  (§4.4)
```

If `mintReward` were saturated every day for 720 days, the total minted would be `720 × 1.4M = 1.008B` — i.e., the daily cap would *not* let cleanup mining alone exceed `MAX_SUPPLY` by more than 0.8%, and in practice the epoch halving (1.0× → 0.5× → 0.25× → 0.125× → 0) caps the realistic emission well below the daily ceiling. The two ceilings are intentionally dimensioned to fit the same lifetime envelope. Full derivation in **Appendix C — Reward Formula** with cross-reference to §4.4 CleanupMining.

#### 4.1.11 Receive / Fallback

**None — contract cannot receive native BNB.** Any plain BNB transfer to the GuardiansToken address will revert with the EVM's default "no receive/fallback" behavior. There is no `withdrawStuckBNB` escape hatch on this contract because no BNB can accumulate.

#### 4.1.12 Slither Suppressions

**None.** This contract has **zero** Slither suppression directives.

```
$ grep -c "slither-disable" contracts/GuardiansToken.sol
0
```

This is the cleanest file in the protocol from a static-analysis perspective. The full project-wide suppression registry (15 logical suppressions across 4 of the 7 contracts) is consolidated in §14.

#### 4.1.13 Test Coverage Reference

| Test file | Test count | Notable coverage |
|---|---|---|
| `test/GuardiansToken.test.js` | *verified in §14* | Deployment (roles, constants, name/symbol), `distributeInitial` (one-shot, zero-address, length mismatch, MAX_SUPPLY ceiling, paused), `mint`, `mintReward` (daily cap, UTC-day bucket reset, MAX_SUPPLY ceiling), pause-blocks-everything, burn, governance vote delegation, required overrides. |
| `test-foundry/GuardiansToken.t.sol` | *verified in §14* | Fuzz: `testFuzz_mintRespectsMaxSupply`, `testFuzz_burnDecreasesTotalSupply`, `testFuzz_onlyMinterCanMint`, `testFuzz_delegateSetsVotingPower`, `testFuzz_mintRewardRespectsDailyCap`, `testFuzz_mintRewardZeroAmountReverts`, `testFuzz_distributeInitialOneShot`. Invariants: `invariant_totalSupplyNeverExceedsMaxSupply`, `invariant_mintableSupplyPlusTotalEqualsMaxSupply`, `invariant_dailyCapNeverExceeded`, `invariant_initializedMonotonic`. |

Cross-reference to §6 invariants: I-01 (supply cap), I-02 (daily cap), I-03 (`initialized` monotonic).

---

### §4.2 ScamRegistry

**File:** `contracts/ScamRegistry.sol` (150 lines)
**Deployed:** Phase A.3 (see §3.3) — once per network, never re-deployed.
**Mutability:** Immutable contract. No proxy, no initializer.

#### 4.2.1 Purpose

On-chain classification database mapping `token address → {Unknown, Legit, Dust, Dead, Scam, Drainer, Honeypot}`. Off-chain Guardians oracle holds `ORACLE_ROLE` and writes classifications. `GarbageCollector` reads `isScamOrDrainer` to gate the swap path; flagged tokens must use `sendScamToLandfill` instead.

#### 4.2.2 Inheritance (C3 linearization)

Direct parents (declaration order, `ScamRegistry.sol:14`):

```
contract ScamRegistry is AccessControl, Pausable
```

**Why direct-parent listing is sufficient.** Both parents are simple state holders (`AccessControl` = `mapping(bytes32 => RoleData)`; `Pausable` = single `bool`). Neither uses ERC-7201 namespaced storage in OZ v5 — they remain on legacy direct storage layout — but neither introduces any inheritance chain past `Context` / `IAccessControl` / `IERC165`, so storage slot ordering is trivial: parent slots come first in declaration order, then this contract's own `tokenInfo` mapping. No `_update`-style override composition exists on this contract; `super` calls do not appear.

**OZ v5.1.0-specific notes:**
- `AccessControl` in v5 reverts with `AccessControlUnauthorizedAccount(account, role)` (custom error).
- `Pausable` in v5 reverts with `EnforcedPause()` / `ExpectedPause()` (custom errors).
- Solidity 0.8 native enum decoding rejects out-of-range `TokenStatus` values **at the ABI boundary** with `Panic(0x21)` before the function body executes. This is the reason `_setStatus` (L106) does no manual `status < 7` range check — see invariant I-04 (§6) which confirms the protection. Panic codes are normative behavior of the Solidity ABI decoder, documented at <https://docs.soliditylang.org/en/v0.8.24/control-structures.html#panic-via-assert-and-error-via-require>. Confirmed-by-test: `test/ScamRegistry.test.js:92` (`"rejects out-of-range enum values (Solidity panic)"`).

#### 4.2.3 Constructor

```solidity
constructor(address admin)
```

| Step in body | What it does | Source |
|---|---|---|
| 1 | Reverts with `ZeroAddress()` if `admin == 0` | L69 |
| 2 | `_grantRole(DEFAULT_ADMIN_ROLE, admin)` | L70 |
| 3 | `_grantRole(PAUSER_ROLE, admin)` | L71 |

**`ORACLE_ROLE` is not granted in the constructor.** It is granted post-deploy by the deployer (Phase A) and later by the Timelock (Phase C) to whichever off-chain backend signer is operational. This is deliberate — the constructor sets up only the governance surface, leaving the data-write key to be configured separately and rotated freely.

#### 4.2.4 Roles

| Role constant | Hash | Granted at deploy to | Steady-state holder | Renounce / transfer event | Can call |
|---|---|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00…00` (OZ built-in) | deployer (Phase A.3) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:29`) | `grantRole`, `revokeRole`, any role management |
| `ORACLE_ROLE` | `keccak256("ORACLE_ROLE")` | — (not granted at deploy) | Off-chain Guardians backend signer (EOA or contract) | Granted post-deploy in Phase A by the deployer; rotated by Timelock via DAO proposal thereafter. Revocable by `DEFAULT_ADMIN_ROLE` holder at any time. **Held by an off-chain hot key, not by the Timelock** — see §9 Trust Assumptions. | `setStatus(address,TokenStatus)`, `setStatusBatch(address[],TokenStatus[])` |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (Phase A.3) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:29`) | `pause()`, `unpause()` |

**Design note on `ORACLE_ROLE`:** This is the second "hot key" surface in the protocol (the first is `oracleSigner` on GarbageCollector — see §4.5). A compromised `ORACLE_ROLE` key can flip a legitimate token to `Scam` (denial-of-service on the GarbageCollector swap gate) or flip a malicious token to `Legit` (bypassing the gate). Both blast radii are bounded: status flips are pauseable, monotonic `reportCount` (I-05, §6) provides a tamper-trail, and the Timelock can rotate or revoke the key at any time.

**Response-window note (PAUSER_ROLE post-B.5):** This contract has **no EMERGENCY_ROLE backup**. After the Phase B.5 cutover, `PAUSER_ROLE` is held only by the Timelock. A pause therefore requires a Governor proposal subject to the full 48 h Timelock delay — there is no fast circuit breaker. This is an explicit acceptance, justified by the fact that ScamRegistry holds zero funds: the worst case from a 48 h delay is up to ~48 h of GarbageCollector swap-path DoS for tokens an attacker mis-flagged as `Scam`, which users can route around by holding tokens until the Timelock executes. Tracked as §10 AD-02 (pending §10 draft).

#### 4.2.5 Modifiers

Custom modifiers defined on this contract: **none.**

| Modifier | Source | Effect |
|---|---|---|
| `onlyRole(<ROLE>)` | `AccessControl` (inherited) | Reverts with `AccessControlUnauthorizedAccount(caller, role)`. |
| `whenNotPaused` | `Pausable` (inherited) | Reverts with `EnforcedPause()` when paused. **Applied explicitly to each write function** (contrast with GuardiansToken which protects via the `_update` chain). |

**Single-pattern enforcement — no stacked modifiers in the reentrancy sense. No reentrancy surface (this contract is a pure on-chain database: no external calls, no token transfers, no `.call`, no ERC20 invocations).**

**Consistency check** — every state-mutating external function and its modifier stack:

| Function | Modifiers applied |
|---|---|
| `setStatus(address, TokenStatus)` | `onlyRole(ORACLE_ROLE)`, `whenNotPaused` |
| `setStatusBatch(address[], TokenStatus[])` | `onlyRole(ORACLE_ROLE)`, `whenNotPaused` |
| `pause()` | `onlyRole(PAUSER_ROLE)` |
| `unpause()` | `onlyRole(PAUSER_ROLE)` |
| `getStatus(address)` | `view` |
| `isScamOrDrainer(address)` | `view` |

No path exists to mutate `tokenInfo` without `ORACLE_ROLE + whenNotPaused`. The internal `_setStatus` helper is invoked only from the two gated entry points.

#### 4.2.6 External / Public Functions

| Signature | Modifiers | Returns | Purpose | Emits |
|---|---|---|---|---|
| `setStatus(address token, TokenStatus status)` | `onlyRole(ORACLE_ROLE)`, `whenNotPaused` | — | Record/update a single token's status. Calls `_setStatus`. | `StatusUpdated` |
| `setStatusBatch(address[] tokens, TokenStatus[] statuses)` | `onlyRole(ORACLE_ROLE)`, `whenNotPaused` | — | Bulk update. Validates length match and non-empty, then loops `_setStatus`. | `StatusUpdated` × N |
| `getStatus(address token)` | `view` | `TokenStatus` | Returns `tokenInfo[token].status` (defaults to `Unknown`). | — |
| `isScamOrDrainer(address token)` | `view` | `bool` | True for `Scam`, `Drainer`, or `Honeypot`. **Read by `GarbageCollector.cleanupBatch` per token.** | — |
| `pause()` | `onlyRole(PAUSER_ROLE)` | — | Halts `setStatus` and `setStatusBatch`. Reads stay live. | OZ `Paused(account)` |
| `unpause()` | `onlyRole(PAUSER_ROLE)` | — | Lifts the pause. | OZ `Unpaused(account)` |

**Inherited public surface:**

- **AccessControl:** `hasRole(bytes32,address)`, `getRoleAdmin(bytes32)`, `grantRole(bytes32,address)`, `revokeRole(bytes32,address)`, `renounceRole(bytes32,address)`, `supportsInterface(bytes4)`.
- **Pausable:** `paused()`.

**Internal helpers worth audit attention:**

| Helper | Called by | Purpose |
|---|---|---|
| `_setStatus(address, TokenStatus)` | `setStatus`, `setStatusBatch` | Sole write path. Reverts on zero-address. Writes status, `block.timestamp`, `msg.sender`, increments `reportCount`. Emits `StatusUpdated`. Enforces invariants I-04, I-05, I-06 (§6.2). |

#### 4.2.7 Public State Variables (auto-getters)

| Variable | Type | Visibility | Initial value | What it tracks |
|---|---|---|---|---|
| `tokenInfo` | `mapping(address => TokenInfo)` | `public` | empty | Per-token classification record. Auto-generated getter returns the full `TokenInfo` struct tuple `(status, lastUpdated, reportedBy, reportCount)`. |
| `ORACLE_ROLE` | `bytes32 constant` | `public` | `keccak256("ORACLE_ROLE")` | Role constant. |
| `PAUSER_ROLE` | `bytes32 constant` | `public` | `keccak256("PAUSER_ROLE")` | Role constant. |

**Struct shape** (`TokenInfo`, L34–39):

| Field | Type | Semantics |
|---|---|---|
| `status` | `TokenStatus` (enum, 1 byte) | Current classification. |
| `lastUpdated` | `uint256` | `block.timestamp` of most recent write. |
| `reportedBy` | `address` | `msg.sender` of most recent write (i.e., the ORACLE_ROLE holder that wrote it). |
| `reportCount` | `uint256` | Monotonic counter incremented on every `_setStatus` call (even on no-op same-status writes). |

**Enum shape** (`TokenStatus`, L24–32): `Unknown (0)`, `Legit (1)`, `Dust (2)`, `Dead (3)`, `Scam (4)`, `Drainer (5)`, `Honeypot (6)`. Default for any unset address is `Unknown` (zero-value).

#### 4.2.8 Custom Errors

| Error | Signature | When thrown | Thrown by |
|---|---|---|---|
| `ZeroAddress` | `()` | `token == address(0)` (write path); `admin == address(0)` (constructor) | constructor (L69), `_setStatus` (L107) |
| `LengthMismatch` | `()` | `tokens.length != statuses.length` | `setStatusBatch` (L98) |
| `EmptyBatch` | `()` | `tokens.length == 0` | `setStatusBatch` (L97) |

Inherited errors bubbled (not redefined): `AccessControlUnauthorizedAccount(account, role)`, `EnforcedPause()`, `ExpectedPause()`.

#### 4.2.9 Events

| Event | Signature | Emitted by | Notes |
|---|---|---|---|
| `StatusUpdated` | `(address indexed token, TokenStatus oldStatus, TokenStatus newStatus, address indexed reporter)` | `_setStatus` (L117) | Emits on **every** `_setStatus` call including no-op same-status writes. `oldStatus` captured before the write; useful for off-chain audit trail (e.g., detecting reversals or oscillations). |

Inherited events: `Paused(account)`, `Unpaused(account)`, `RoleGranted(role, account, sender)`, `RoleRevoked(role, account, sender)`, `RoleAdminChanged(role, previousAdminRole, newAdminRole)`.

#### 4.2.10 Immutables & Constants

**Category A — Compile-time constants (`constant`):**

| Name | Type | Value | Set at | Rationale |
|---|---|---|---|---|
| `ORACLE_ROLE` | `bytes32 constant public` | `keccak256("ORACLE_ROLE")` | L18 | — |
| `PAUSER_ROLE` | `bytes32 constant public` | `keccak256("PAUSER_ROLE")` | L19 | — |

**Category B — Constructor-set immutables (`immutable`):** *None.* This contract has no external trusted dependencies; nothing to seal at construction.

No math sanity check applicable — the contract holds no numeric ceilings or rate parameters. The only numeric state is the per-token `reportCount`, which is unbounded by design (monotonic counter).

#### 4.2.11 Receive / Fallback

**None — contract cannot receive native BNB.** Any plain BNB transfer to ScamRegistry will revert. No accumulation surface, no escape hatch needed.

#### 4.2.12 Slither Suppressions

**Total directives on this contract: 1** (with NatSpec-rationale companion line).

| Line | Directive | Detector(s) | Rationale (from inline NatSpec) |
|---|---|---|---|
| 129–130 | `/// @dev slither-disable-next-line incorrect-equality,timestamp — comparison is on enum s (not block.timestamp despite slither tracing through TokenInfo).` | (doc-comment, no directive effect) | NatSpec rationale companion to the directive on L131. Tells the auditor (and `slither` reader) why the next-line suppression is a false positive. |
| 131 | `// slither-disable-next-line incorrect-equality,timestamp` | `incorrect-equality`, `timestamp` | Active directive on L132 `isScamOrDrainer`. Slither traces `s` back into `TokenInfo` which contains a `uint256 lastUpdated` (timestamp field), then flags the enum equality checks as if they were timestamp comparisons. They are not — the comparisons are exclusively on the `TokenStatus` enum, never on `lastUpdated`. False positive. |

Cross-reference §14 for the consolidated project-wide suppression registry.

#### 4.2.13 Test Coverage Reference

| Test file | Test count | Notable coverage |
|---|---|---|
| `test/ScamRegistry.test.js` | *verified in §14* | Deployment (role grants, defaults), `setStatus` (zero-address, role-gate, pause-gate, emits event, reportCount increments), `setStatusBatch` (length mismatch, empty, batch-vs-sequential equivalence), `isScamOrDrainer` (returns true exactly for Scam/Drainer/Honeypot), pause (write blocked, reads stay live, role-gate on pause), role management. |
| `test-foundry/ScamRegistry.t.sol` | *verified in §14* | Fuzz: `testFuzz_setStatusWritesAndIncrementsCount`, `testFuzz_onlyOracleCanWrite`, `testFuzz_zeroTokenReverts`, `testFuzz_isScamOrDrainerMatchesEnum`, `testFuzz_reportCountTracksCallCount`. Invariants: `invariant_statusInEnumRange`, `invariant_reportCountMonotonic`, `invariant_lastUpdatedMonotonic`, `invariant_reportCountMatchesWrites`. |

Cross-reference to §6 invariants: I-04 (status enum range), I-05 (reportCount monotonic), I-06 (lastUpdated monotonic), I-07 (reportCount matches writes).

---

## §6 System Invariants

The protocol declares 17 invariants spanning the token, registry, vault, mining, collector, and governance layers. This section opens with the canonical **invariant index** (used for cross-references throughout the document), followed by per-layer body proof-sketches in §6.1–§6.6.

The registry is the canonical source for invariant IDs used throughout this document. The columns are:

- **ID** — stable identifier (`I-NN`). Once assigned, never reused or re-numbered.
- **Title** — one-line description of what must hold.
- **Origin** — contract that owns the invariant.
- **Verification** — where it is mechanically checked. Foundry `invariant_*` functions are the primary source; Hardhat `it()` tests are listed when they cover a property no Foundry invariant covers.
- **AD-ref** — link to a §10 Acknowledged Design Decision when the invariant is "must hold under stated assumptions" (e.g., assumes non-fee-on-transfer ERC20). Empty when the invariant is unconditional.

### Invariant index

| ID | Title | Origin | Verification | AD-ref |
|---|---|---|---|---|
| I-01 | `totalSupply() <= MAX_SUPPLY` at all times | GuardiansToken | Foundry `invariant_totalSupplyNeverExceedsMaxSupply`; Hardhat `mintReward MAX_SUPPLY ceiling` | — |
| I-02 | `mintedPerDay[today] <= MAX_MINT_PER_DAY` for every UTC day bucket | GuardiansToken | Foundry `invariant_dailyCapNeverExceeded`; Hardhat `mintReward daily cap` | AD-06 (UTC bucket timestamp granularity) |
| I-03 | `initialized` is monotonic (false → true, never reverses); `distributeInitial` succeeds at most once | GuardiansToken | Foundry `invariant_initializedMonotonic`; Hardhat `distributeInitial reverts on second call` | — |
| I-04 | `tokenInfo[t].status` always decodes to a valid `TokenStatus` enum value ∈ [0, 6] | ScamRegistry | Foundry `invariant_statusInEnumRange`; Hardhat `test/ScamRegistry.test.js:92` (out-of-range Panic 0x21) | — |
| I-05 | `tokenInfo[t].reportCount` is monotonically non-decreasing per token | ScamRegistry | Foundry `invariant_reportCountMonotonic` | — |
| I-06 | `tokenInfo[t].lastUpdated` is monotonically non-decreasing per token | ScamRegistry | Foundry `invariant_lastUpdatedMonotonic` | — |
| I-07 | `tokenInfo[t].reportCount` equals number of successful `_setStatus(t, *)` calls observed | ScamRegistry | Foundry `invariant_reportCountMatchesWrites` (handler-tracked) | — |
| I-08 | `balanceOf(vault, token) == sum_received(token) − sum_movedOut(token)` (handler-tracked balance accounting) | LandfillVault | Foundry `invariant_balanceAccounting` | AD-03 (holds for non-FoT tokens; emitted-event amount may differ from on-chain delta for FoT) |
| I-09 | `sum_movedOut(token) == sum_burned + sum_transferred + sum_emergencyWithdrawn` (action conservation) | LandfillVault | Foundry `invariant_movedOutEqualsSumOfActions` | — |
| I-10 | `balanceOf(vault, token) <= initialMint(token)` (no creation from nothing) | LandfillVault | Foundry `invariant_vaultBalanceCappedByInitialMint` | — |
| I-11 | `totalRewardsEarned[u]` is monotonically non-decreasing per user | CleanupMining | Foundry `invariant_userRewardsMonotonic` | — |
| I-12 | Σ over users of `totalRewardsEarned[u]` equals total GOTT minted via the cleanup-mining path (handler-tracked) | CleanupMining | Foundry `invariant_totalRewardsMatchTokenBalance` | — |
| I-13 | `totalCleanupsExecuted == Σ over (user, epoch) of cleanupCountPerEpoch[u][e]` (global = per-epoch sum) | CleanupMining | Foundry `invariant_globalCountMatchesPerEpochSum` | — |
| I-14 | `getCurrentEpoch()` is monotonically non-decreasing over time | CleanupMining | Foundry `invariant_epochMonotonic` | — |
| I-15 | `nonces[u]` is monotonically non-decreasing per user, increments by exactly 1 per successful `cleanupBatch`, and is unchanged by `sendScamToLandfill` | GarbageCollector | *not yet covered by a dedicated `invariant_*` — implicit via `testFuzz_replayBlocked`* | Coverage gap noted in §4.5.13; audit firm may request a dedicated handler-tracked invariant. |
| I-16 | Timelock `_minDelay ≥ 48h` for the lifetime of the protocol (modifiable only via self-proposal that itself clears the 48 h delay) | Timelock | *self-referential — enforced by the parameter machinery rather than a Foundry invariant* | Property of the OZ `TimelockController` module. Auditor may verify by inspection rather than via test. |
| I-17 | Governor parameter changes (`votingDelay`, `votingPeriod`, `proposalThreshold`, `quorumNumerator`) are `onlyGovernance` — i.e., changeable only via a self-proposal executed by the Timelock | Governor | *not exercised end-to-end in current test suite — coverage gap flagged in §4.7.13* | Property of the OZ `GovernorSettings` + `GovernorVotesQuorumFraction` modules. |
| *I-18+ reserved for §6 body-draft additions if needed* | | | | |

### §6.1 Token-layer invariants (I-01..I-03)

#### I-01 — `totalSupply()` never exceeds `MAX_SUPPLY`

**Statement.** At every block, `GuardiansToken.totalSupply() <= MAX_SUPPLY`, where `MAX_SUPPLY = 1,000,000,000 × 10¹⁸ wei` (`GuardiansToken.sol:L45`).

**Why it matters.** Single hard cap on GOTT issuance. Bounds tokenomics, governance quorum (`GovernorVotesQuorumFraction` uses `getPastTotalSupply` as quorum denominator — §4.7.10), and every economic model that quotes the 1B published cap. Violation would silently dilute holders and break protocol-wide trust.

**Enforcement mechanism.** Three mint paths, each pre-checked with `ExceedsMaxSupply(requested, available)`: `distributeInitial(...)` at `GuardiansToken.sol:L120`, `mint(...)` at `L142`, `mintReward(...)` at `L175`. The `mintReward` re-check is intentional — `MAX_MINT_PER_DAY` bounds the per-call rate, but `MAX_SUPPLY` is the unconditional ceiling. The two caps are layered, not alternatives.

**Verification coverage.** Foundry: `test-foundry/GuardiansToken.t.sol::invariant_totalSupplyNeverExceedsMaxSupply` (handler-driven across all three mint paths). Hardhat: `test/GuardiansToken.test.js → describe("mint") → it("rejects mint exceeding MAX_SUPPLY")` and `→ describe("CLEANUP_MINER mint") → it("respects MAX_SUPPLY hard cap (re-checked even under daily cap)")`.

**Assumptions / limits.** Solidity 0.8.x checked arithmetic prevents `totalSupply() + amount` overflow (the addition itself reverts before the comparison).

**Failure mode blocked.** Any compromise of `MINTER_ROLE` or `CLEANUP_MINER_ROLE` cannot drive supply past 1B GOTT, regardless of time or gas. AD-07 (compromised `oracleSigner` forging `cleanupBatch` authorizations) is double-bounded — by `MAX_MINT_PER_DAY` over the response window and by `MAX_SUPPLY` in the limit.

#### I-02 — `mintedPerDay[day] <= MAX_MINT_PER_DAY` per UTC day

**Statement.** For every UTC-day bucket `day = block.timestamp / 86400`, the cumulative mint via `mintReward` satisfies `mintedPerDay[day] <= MAX_MINT_PER_DAY = 1,400,000 × 10¹⁸ wei` (`GuardiansToken.sol:L46`).

**Why it matters.** Protocol-level bound on cleanup-mining emission rate. Load-bearing protection against `oracleSigner` compromise (AD-07): even with forged signatures, an attacker cannot mint more than 1.4M GOTT per UTC day. Without this cap, AD-07's residual risk would be the full `MAX_SUPPLY` instead of the bounded ~2.8M-over-48h figure.

**Enforcement mechanism.** `mintReward(...)` (`GuardiansToken.sol:L163`) computes `day = block.timestamp / 1 days` (`L172`), checks `mintedPerDay[day] + amount > MAX_MINT_PER_DAY` (`L173`), then increments before `_mint`. The accumulator is mapping-keyed — buckets self-reset each UTC midnight as the key changes.

**Verification coverage.** Foundry: `test-foundry/GuardiansToken.t.sol::invariant_dailyCapNeverExceeded` (handler-driven with warp-day). Hardhat: `test/GuardiansToken.test.js → describe("CLEANUP_MINER mint") → it("mints up to exact daily cap (1.4M)")`, `it("reverts single-call exceeding daily cap with DailyMintCapExceeded")`, `it("reverts cumulative-call exceeding daily cap")`, and `it("daily cap resets after warping 1 day forward")`.

**Assumptions / limits.** UTC bucket boundary is `block.timestamp / 86400`; validator-influenced by up to ~15 s at BSC block-time variance. Bucket attribution of edge-of-day transactions may differ by one day from wall-clock, but the cap holds per bucket. See AD-06.

**Failure mode blocked.** No actor — including a compromised `CLEANUP_MINER_ROLE` holder or `oracleSigner` — can mint more than 1.4M GOTT in any single UTC day. Bounds AD-07 incident-response cost.

#### I-03 — `initialized` monotonic (false → true, one-shot)

**Statement.** `GuardiansToken.initialized` is monotonically non-decreasing in the boolean order `false < true`. `distributeInitial(...)` succeeds at most once across the contract's lifetime.

**Why it matters.** Guards the TGE allocation flow. Re-running `distributeInitial` after launch would let an admin double-mint the genesis distribution, bypassing the `MAX_SUPPLY` check via timing (two valid calls each individually below the cap can together cross it on a low-supply day).

**Enforcement mechanism.** `distributeInitial(...)` (`GuardiansToken.sol:L105`) reverts with `AlreadyInitialized` if `initialized == true`; otherwise sets `initialized = true` at `L125` before the mint loop. No setter exists.

**Verification coverage.** Foundry: `test-foundry/GuardiansToken.t.sol::invariant_initializedMonotonic` (handler-driven random sequences). Hardhat: `test/GuardiansToken.test.js → describe("distributeInitial") → it("distributes to multiple recipients in a single TX and flips initialized")` and `it("reverts on second call with AlreadyInitialized")`.

**Assumptions / limits.** The flag is set before any external call inside `distributeInitial`, so reentrancy cannot re-enter into a still-`false` state.

**Failure mode blocked.** Double-distribution of the TGE allocation; admin replay of the genesis mint.

---

### §6.2 Registry-layer invariants (I-04..I-07)

#### I-04 — `tokenInfo[t].status` always decodes to a valid enum value

**Statement.** For every token address `t` ever written, `tokenInfo[t].status` decodes to a valid `TokenStatus` enum value in the range `[Unknown=0, Honeypot=6]` (`ScamRegistry.sol:L24-32`).

**Why it matters.** `GarbageCollector.cleanupBatch` consumes the registry via `isScamOrDrainer(token)` (§4.5.5), which performs three enum equality comparisons (`Scam`, `Drainer`, `Honeypot`). An out-of-range value would either match nothing (false negative — scam slips through) or trigger an EVM `Panic(0x21)` propagating into the cleanup path.

**Enforcement mechanism.** Enum decoding is Solidity's built-in: any write of an out-of-range value to a function argument typed `TokenStatus` triggers `Panic(0x21)` before the function body executes. `setStatus(token, status)` (`ScamRegistry.sol:L81`) and `setStatusBatch(...)` (`L92`) both type the input as `TokenStatus`, so the panic fires at ABI decoding.

**Verification coverage.** Foundry: `test-foundry/ScamRegistry.t.sol::invariant_statusInEnumRange` (handler decodes every status read). Hardhat: `test/ScamRegistry.test.js → describe("setStatus") → it("rejects out-of-range enum values (Solidity panic)")`.

**Assumptions / limits.** Compiler version 0.8.24 retains enum-range checks. An `unchecked { }` block would bypass them — no such block exists in this contract.

**Failure mode blocked.** Stored registry corruption that would break downstream `isScamOrDrainer` semantics.

#### I-05 — `reportCount` monotonic per token

**Statement.** For every token `t`, `tokenInfo[t].reportCount` is monotonically non-decreasing across the contract's lifetime. Each successful `_setStatus(t, *)` increments it by exactly 1, including no-op same-status writes.

**Why it matters.** The counter is the on-chain tamper trail for `ORACLE_ROLE` activity. AD-02 acceptance (no `EMERGENCY` backup on ScamRegistry) leans on this — off-chain monitors sample `reportCount` deltas to detect anomalous oracle writes during a key-compromise window.

**Enforcement mechanism.** `_setStatus(token, status)` at `ScamRegistry.sol:L106` increments `tokenInfo[token].reportCount += 1` before emitting `StatusUpdated`. The increment is unconditional on entry. No other path writes `reportCount`.

**Verification coverage.** Foundry: `test-foundry/ScamRegistry.t.sol::invariant_reportCountMonotonic` (handler-driven random `setStatus` sequences). Hardhat: `test/ScamRegistry.test.js → describe("setStatus") → it("increments reportCount on every call (not only on status change)")`.

**Assumptions / limits.** `uint256` overflow at ~2²⁵⁶ is operationally unreachable. No `unchecked` block surrounds the increment.

**Failure mode blocked.** Tamper-trail erasure or rewind via re-write attacks.

#### I-06 — `lastUpdated` monotonic per token

**Statement.** For every token `t`, `tokenInfo[t].lastUpdated` is monotonically non-decreasing — equal to `block.timestamp` at the most recent successful `_setStatus(t, *)` call.

**Why it matters.** Provides on-chain freshness signal for registry classifications. Off-chain consumers (frontend, indexers) use `lastUpdated` to display staleness; auditors use it to correlate `reportCount` deltas with attack windows.

**Enforcement mechanism.** `_setStatus(...)` writes `tokenInfo[token].lastUpdated = block.timestamp` inside the `ScamRegistry.sol:L106` body. The monotonicity follows from `block.timestamp` being non-decreasing across blocks per BSC consensus (`block.timestamp[n] >= block.timestamp[n-1]`).

**Verification coverage.** Foundry: `test-foundry/ScamRegistry.t.sol::invariant_lastUpdatedMonotonic` (compares snapshots across handler operations).

**Assumptions / limits.** Validator timestamp manipulation is bounded to ~15 s on BSC. Two `_setStatus` calls in the same block share the same `lastUpdated` value — equality, not strict increase. No real-world failure mode depends on strict increase within a block.

**Failure mode blocked.** Backdating of registry classifications.

#### I-07 — `reportCount` matches handler-tracked successful writes

**Statement.** For every token `t`, `tokenInfo[t].reportCount` equals the number of successful `_setStatus(t, *)` calls observed by the test harness across the run.

**Why it matters.** I-05 alone asserts monotonicity; I-07 asserts exact-count accuracy. Together they certify that the on-chain counter is a perfect record of writes — no double-counts, no missed increments — under the full random-write surface of the Foundry handler.

**Enforcement mechanism.** Same as I-05: unconditional `+= 1` inside `_setStatus`. I-07 adds the stronger claim that no other branch writes to `reportCount` (no setter, no admin reset, no downstream contract path).

**Verification coverage.** Foundry: `test-foundry/ScamRegistry.t.sol::invariant_reportCountMatchesWrites`. The handler maintains its own counter per token; the invariant asserts `actual == handler_tracked`.

**Assumptions / limits.** Handler-tracked invariants require the handler to model every successful write path. The handler models `setStatus` and `setStatusBatch`. A future PR adding a third write path without updating the handler would be caught by this invariant.

**Failure mode blocked.** Hidden writes to `reportCount` from refactor-introduced code paths.

---

### §6.3 Vault-layer invariants (I-08..I-10)

#### I-08 — Vault balance equals received minus moved-out

**Statement.** For every ERC-20 `token` ever interacted with, `balanceOf(vault, token) == sum_received(token) − sum_movedOut(token)` under handler-tracked accounting, where `sum_received` totals transfers into the vault and `sum_movedOut` totals `burnToken` / `transferToken` / `emergencyWithdraw` amounts.

**Why it matters.** Load-bearing accounting invariant for the vault — certifies that the vault is pure custody: tokens neither materialize from nothing nor evaporate into nowhere. Any divergence exposes either a phantom-mint surface or a phantom-burn, both of which would compromise DAO accounting of the landfill treasury.

**Enforcement mechanism.** The vault has no `transferFrom`-pull behaviour — tokens arrive only via direct ERC-20 `transfer` from external callers (§4.3 inbound paths). Outbound paths are exactly three: `burnToken` (`LandfillVault.sol:L75`), `transferToken` (`L92`), `emergencyWithdraw` (`L117`). No other write to `balanceOf` from the vault's side.

**Verification coverage.** Foundry: `test-foundry/LandfillVault.t.sol::invariant_balanceAccounting`. Handler maintains shadow `sum_received` and `sum_movedOut` per token; the invariant asserts equality with on-chain `balanceOf`.

**Assumptions / limits.** **Holds only for non-fee-on-transfer tokens — see AD-03.** For FoT tokens, the on-chain `balanceOf` delta differs from the requested `amount` argument by the fee rate; the handler records the requested amount (the emitted-event side), so equality breaks. Test fixtures use `MockERC20` (no FoT); fork-test coverage with real FoT tokens is the recommended audit-firm hardening (§4.5.13).

**Failure mode blocked.** Phantom-mint or phantom-burn surface introduced by future vault-side state writes.

#### I-09 — Action conservation across the three outbound paths

**Statement.** For every token, `sum_movedOut(token) == sum_burned + sum_transferred + sum_emergencyWithdrawn`, where each summand totals the handler-recorded amounts for the respective outbound function.

**Why it matters.** Asserts that the three outbound paths are exhaustive — no fourth path drains the vault. Tightens I-08 from "incoming minus outgoing" to "incoming minus exactly these three classes of outgoing."

**Enforcement mechanism.** Static contract surface: `burnToken`, `transferToken`, `emergencyWithdraw` are the only functions that call `IERC20.safeTransfer` from the vault address (`LandfillVault.sol:L75`, `L92`, `L117`). No other code path touches `IERC20`.

**Verification coverage.** Foundry: `test-foundry/LandfillVault.t.sol::invariant_movedOutEqualsSumOfActions`. Handler counts each function call separately; the invariant asserts the three counters sum exactly to total moved-out.

**Assumptions / limits.** Pure structural property of the contract surface — no additional assumptions.

**Failure mode blocked.** Hidden fourth outbound path added by a future PR that isn't categorised in handler bookkeeping.

#### I-10 — Vault balance bounded by initial mint

**Statement.** For every token, `balanceOf(vault, token) <= initialMint(token)`, where `initialMint(token)` is the total amount minted to the test universe for that token across the run.

**Why it matters.** Asserts no creation from nothing inside the vault — the vault cannot somehow inflate a token's supply by holding it.

**Enforcement mechanism.** The vault has no mint path — it implements only `safeTransfer`-out and accepts `safeTransfer`-in. The ERC-20 supply is set entirely by the test harness's `MockERC20.mint(...)` calls; `balanceOf(vault, token)` cannot exceed the cumulative mint of `token`.

**Verification coverage.** Foundry: `test-foundry/LandfillVault.t.sol::invariant_vaultBalanceCappedByInitialMint`. Handler tracks total mint; the invariant asserts vault balance ≤ minted total.

**Assumptions / limits.** Holds for standard ERC-20s. Rebasing tokens (whose `balanceOf` can grow without explicit mint) would violate the spirit of this invariant — out of scope per protocol token whitelist (see §15 once drafted).

**Failure mode blocked.** Sanity check against any future refactor that accidentally introduces a vault-side mint or balance-rewrite path.

---

### §6.4 Mining-layer invariants (I-11..I-14)

#### I-11 — `totalRewardsEarned[u]` monotonic per user

**Statement.** For every user `u`, `totalRewardsEarned[u]` is monotonically non-decreasing across `recordCleanup(...)` calls.

**Why it matters.** Cumulative reward bookkeeping must never decrease — frontends and indexers display `totalRewardsEarned[u]` as a lifetime stat. A decrement would surface as a negative-reward UX bug; an admin reset would corrupt user trust.

**Enforcement mechanism.** `recordCleanup(...)` (`CleanupMining.sol:L128`) increments `totalRewardsEarned[user] += reward` after the reward calc. No setter, no admin reset path, no other write to the mapping.

**Verification coverage.** Foundry: `test-foundry/CleanupMining.t.sol::invariant_userRewardsMonotonic`. Handler keeps a shadow per-user max; the invariant asserts on-chain ≥ shadow at every step.

**Assumptions / limits.** Reward can be zero (post-Epoch-3 — `epochMultiplier == 0`), in which case the field is unchanged but still non-decreasing. `uint256` overflow at ~2²⁵⁶ is operationally unreachable.

**Failure mode blocked.** Reward rollback or admin reset of user lifetime totals.

#### I-12 — Σ rewards matches mined GOTT

**Statement.** `Σ over users u of totalRewardsEarned[u]` equals the total GOTT minted via the cleanup-mining path under handler tracking — i.e., the sum of bookkeeping balances reconciles to the on-chain `_mint`-ed amount.

**Why it matters.** The mining path is the protocol's emission firehose: every GOTT minted as cleanup reward must have a matching entry in `totalRewardsEarned`. A divergence would indicate either (a) a silent mint without bookkeeping (silent inflation), or (b) bookkeeping without mint (phantom rewards displayed to users). Both compromise emission accounting and dilute trust in `mintReward`'s daily-cap enforcement (I-02).

**Enforcement mechanism.** `recordCleanup(...)` at `CleanupMining.sol:L128` performs three writes atomically: `totalRewardsEarned[user] += reward`, the cleanup-count bookkeeping (see I-13), and `gott.mintReward(user, reward)` (the external call, guarded by `nonReentrant`). The order is bookkeeping-first, mint-last (CEI per §4.4.5). If the external call reverts, all bookkeeping reverts with it.

**Verification coverage.** Foundry: `test-foundry/CleanupMining.t.sol::invariant_totalRewardsMatchTokenBalance`. The handler tracks every successful `recordCleanup` reward; the invariant asserts that the sum equals the cleanup-mining minted balance on the token.

**Assumptions / limits.** Tracks only the cleanup-mining path. TGE distribution and treasury `mint` are excluded from this invariant (they have their own cap-checking via I-01).

**Failure mode blocked.** Silent emission via a path that mints without bookkeeping; phantom reward displays without an actual mint.

#### I-13 — Global cleanup count equals per-epoch sum

**Statement.** `totalCleanupsExecuted == Σ over (user, epoch) of cleanupCountPerEpoch[u][e]`.

**Why it matters.** Cross-checks two independent counters that must always agree. `totalCleanupsExecuted` is the protocol-wide count; `cleanupCountPerEpoch[u][e]` is the per-user-per-epoch leaderboard data. A divergence would indicate that one counter was incremented and not the other — a bug in `recordCleanup` write atomicity.

**Enforcement mechanism.** `recordCleanup(...)` (`CleanupMining.sol:L128`) increments both counters in the same function body without any branch that could skip one. Both writes are inside the `nonReentrant + whenNotPaused + onlyRole(COLLECTOR_ROLE)` envelope.

**Verification coverage.** Foundry: `test-foundry/CleanupMining.t.sol::invariant_globalCountMatchesPerEpochSum`. The invariant iterates all (user, epoch) cells the handler has touched and asserts the sum equals `totalCleanupsExecuted`.

**Assumptions / limits.** None — pure cross-counter consistency.

**Failure mode blocked.** Future PR that adds a code path mutating one counter without the other.

#### I-14 — `getCurrentEpoch()` monotonic

**Statement.** `getCurrentEpoch()` is monotonically non-decreasing over time: `getCurrentEpoch[block n] >= getCurrentEpoch[block n-1]`.

**Why it matters.** Asserts the epoch clock never rolls back. The cleanup-mining reward formula multiplies by `epochMultiplier`, which is a function of epoch index — a rollback would silently re-enable past higher reward multipliers and inflate emission.

**Enforcement mechanism.** `getCurrentEpoch()` (`CleanupMining.sol:L221`) returns `(block.timestamp − LAUNCH_TIMESTAMP) / EPOCH_DURATION`. `LAUNCH_TIMESTAMP` is `immutable` (set in constructor); `block.timestamp` is non-decreasing across blocks per BSC consensus. The integer division is monotonic in its numerator.

**Verification coverage.** Foundry: `test-foundry/CleanupMining.t.sol::invariant_epochMonotonic` (with `warpEpoch` handler advancing time). Also exercised by `testFuzz_epochAdvancesMonotonic`.

**Assumptions / limits.** Validator timestamp manipulation is bounded to ~15 s on BSC. Two epoch boundaries cannot be crossed back-to-back via timestamp tricks, since `EPOCH_DURATION = 180 days >> 15 s`.

**Failure mode blocked.** Reward multiplier rollback via clock manipulation.

---

### §6.5 Collector-layer invariants (I-15)

#### I-15 — `nonces[u]` monotonic, +1 per cleanupBatch, unaffected by sendScamToLandfill

**Statement.** For every user `u`, `GarbageCollector.nonces[u]` is monotonically non-decreasing; increments by exactly 1 on each successful `cleanupBatch(...)`; remains unchanged across any call to `sendScamToLandfill(...)`.

**Why it matters.** The nonce is the EIP-712 replay-protection mechanism for the entire cleanup engine. AD-07 (compromised `oracleSigner`) is bounded by `MAX_MINT_PER_DAY` (I-02) only if forged signatures cannot be replayed past one consumption. A nonce that skipped, double-counted, or reset would either invalidate legitimately-signed authorizations the backend has already issued (breaking user UX) or allow signature reuse, breaking the AD-07 bound by letting the same forgery mint repeatedly within a single day.

**Enforcement mechanism.** `_verifyAndConsumeAuth(...)` at `GarbageCollector.sol:L228` reads `expected = nonces[msg.sender]`, asserts `nonce == expected` (revert `InvalidNonce` otherwise), verifies the EIP-712 signature, then writes `nonces[msg.sender] = expected + 1` at `L250`. The write is the last operation in the helper, immediately before `cleanupBatch` proceeds to swap and reward. `sendScamToLandfill(...)` does not call this helper and does not read or write `nonces`.

**Verification coverage.** **No dedicated `invariant_*` handler exists.** The property is covered *implicitly* by replay-blocking tests: Foundry `test-foundry/GarbageCollector.t.sol::testFuzz_replayBlocked`; Hardhat `test/GarbageCollector.test.js → describe("cleanupBatch — signature semantics") → it("rejects replay: same signature on second call (nonce already consumed)")` and `→ describe("sendScamToLandfill") → it("does not consume cleanupBatch nonce")`. **This is a coverage gap, flagged in §4.5.13.** The audit firm may reasonably request a handler-tracked Foundry invariant of the shape `nonces[u] == handler.successfulCleanupBatchCount[u]` after every step.

**Assumptions / limits.** The implicit coverage exercises a single round-trip per user. Until a dedicated invariant exists, the assumption is that any refactor of the `+= 1` discipline will be caught by code review rather than by an automated property check.

**Failure mode blocked.** EIP-712 signature replay against the cleanup engine; nonce-reset attacks that would silently unblock previously-consumed signatures.

---

### §6.6 Governance-layer invariants (I-16..I-17)

#### I-16 — Timelock `_minDelay >= 48h`

**Statement.** `GuardiansTimelockController._minDelay >= 48 hours` for the lifetime of the protocol. Reduction below 48 h requires a self-proposal that itself clears the existing 48 h delay.

**Why it matters.** The 48 h delay is the load-bearing protocol-wide review window. It bounds AD-07 (oracle-key rotation cycle), AD-02 (scam-classifier rotation cycle), and AD-10 (post-vote review window before open execution).

**Enforcement mechanism.** **No Foundry invariant** — the property is enforced by the OZ `TimelockController` parameter machinery. `updateDelay` is `onlyRoleOrOpenRole(DEFAULT_ADMIN_ROLE)`, and post-B.6 the only `DEFAULT_ADMIN_ROLE` holder is the Timelock itself, which means a delay change must clear its own delay. Verified by inspection of OZ v5.1.0 `TimelockController.updateDelay` source.

**Verification coverage.** Hardhat: `test/Governance.test.js → describe("Deployment") → it("Timelock min delay = 48h")` (deploy-time assertion only). No Foundry invariant covers post-deploy delay manipulation paths.

**Assumptions / limits.** Relies on (a) OZ `TimelockController` v5.1.0 behaviour as audited upstream, and (b) the Phase B.6 final-lock step (deployer renounces `DEFAULT_ADMIN_ROLE` on the Timelock) having executed successfully. If B.6 was skipped, the deployer retains the ability to reduce `_minDelay` without delay. The B.6 ritual is documented in `scripts/transferAdminRoles.js` and §3.3.

**Failure mode blocked.** Silent reduction of the protocol-wide review window via a non-Timelock-gated path.

#### I-17 — Governor parameter changes are `onlyGovernance`

**Statement.** `votingDelay`, `votingPeriod`, `proposalThreshold`, and `quorumNumerator` on `GuardiansGovernor` are mutable only via the `onlyGovernance` modifier — i.e., only via a Governor self-proposal that itself is queued and executed by the Timelock with the full 48 h delay.

**Why it matters.** Anchors the DAO's self-amendment process. Without this property, a privileged actor could quietly tighten or loosen voting thresholds and silently corrupt subsequent governance outcomes.

**Enforcement mechanism.** Inherited from OZ `GovernorSettings` and `GovernorVotesQuorumFraction` v5.1.0 — each setter (`setVotingDelay`, `setVotingPeriod`, `setProposalThreshold`, `updateQuorumNumerator`) carries the `onlyGovernance` modifier. `onlyGovernance` short-circuits to `require(msg.sender == _executor())`, where `_executor()` returns the Timelock address (`GuardiansGovernor.sol:L149` override). The Timelock executes only proposals that have passed the Governor vote and cleared its own 48 h delay.

**Verification coverage.** **No end-to-end test exercises a self-amendment proposal** (flagged in §4.7.13). Hardhat: `test/Governance.test.js → describe("Deployment") → it("Governor settings match docs/12 spec")` covers the *initial* values. Foundry: `test-foundry/Governance.t.sol::test_governorSettings` similar. Neither exercises a proposal-to-amend flow end-to-end.

**Assumptions / limits.** Relies on (a) OZ Governor v5.1.0 module composition as audited upstream, and (b) Phase B.3/B.4 having granted `PROPOSER_ROLE` and `CANCELLER_ROLE` to the Governor on the Timelock. The audit firm may reasonably request a smoke test that proposes `setVotingPeriod(...)`, queues, executes, and reads back the new value.

**Failure mode blocked.** Backdoor parameter changes bypassing the DAO vote + Timelock delay.

---

### §4.3 LandfillVault

**File:** `contracts/LandfillVault.sol` (140 lines)
**Deployed:** Phase A.4 (see §3.3) — once per network, never re-deployed.
**Mutability:** Immutable contract. No proxy, no initializer.

#### 4.3.1 Purpose

A custody contract that holds tokens swept by `GarbageCollector` (either explicitly via `sendScamToLandfill` or implicitly as swap-failure fallback). Tokens arrive **via direct ERC20 push** — there is no `deposit` function and no receipt event. The DAO can later `burnToken` (send to `0xdEaD`) or `transferToken` (re-route to a buyback / restitution wallet). A separate `EMERGENCY_ROLE` can sweep balances out **even while paused** as a circuit breaker for a compromised vault.

#### 4.3.2 Inheritance (C3 linearization)

Direct parents (declaration order, `LandfillVault.sol:18`):

```
contract LandfillVault is AccessControl, Pausable, ReentrancyGuard
```

**Why direct-parent listing is sufficient.** All three parents are simple state holders on legacy direct storage (no ERC-7201). No `_update`-style override composition exists; `super` is never called. Storage layout is trivially deterministic: each parent's slots come first in declaration order, then this contract's own state (no custom storage at all — the vault holds no internal balance accounting; see §4.3.7).

**OZ v5.1.0-specific notes:**
- `AccessControl` and `Pausable` errors: `AccessControlUnauthorizedAccount`, `EnforcedPause`, `ExpectedPause` (custom errors, not strings).
- `ReentrancyGuard` in v5 reverts with `ReentrancyGuardReentrantCall()`.
- `SafeERC20` in v5 handles three classes of non-standard ERC20s (no return value, returns false, returns `bytes`) and reverts on any failure with `SafeERC20FailedOperation(token)`. **It does not detect or correct fee-on-transfer behavior** — actual delivered amount may be less than the `amount` argument. See §4.3.6, §4.3.10 math note, and §10 AD-03 (pending §10 draft) for the explicit acceptance of this.

#### 4.3.3 Constructor

```solidity
constructor(address admin, address dao)
```

| Step in body | What it does | Source |
|---|---|---|
| 1 | Reverts with `ZeroAddress()` if `admin == 0` | L50 |
| 2 | Reverts with `ZeroAddress()` if `dao == 0` | L51 |
| 3 | `_grantRole(DEFAULT_ADMIN_ROLE, admin)` | L53 |
| 4 | `_grantRole(PAUSER_ROLE, admin)` | L54 |
| 5 | `_grantRole(EMERGENCY_ROLE, admin)` | L55 |
| 6 | `_grantRole(DAO_ROLE, dao)` | L56 |

**Two-address split is intentional.** `admin` receives the governance triad (admin/pauser/emergency); `dao` receives only the burn/transfer role. Pre-Phase-B.5 the deploy script (`scripts/deployLandfillVault.js:18`) sets `DAO = deployer.address` — i.e., deployer fills both slots. The intent of keeping them as separate constructor arguments is so post-Phase-B.5 rotation can transfer them to *different* destinations if governance design later separates emergency authority from DAO authority. The current `transferAdminRoles.js:30` sends all four roles to the same Timelock — see §4.3.4 design note.

#### 4.3.4 Roles

| Role constant | Hash | Granted at deploy to | Steady-state holder | Renounce / transfer event | Can call |
|---|---|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00…00` (OZ built-in) | deployer (Phase A.4) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:30`) | role management |
| `DAO_ROLE` | `keccak256("DAO_ROLE")` | deployer (Phase A.4, via `dao` constructor arg) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:30`) | `burnToken(address,uint256)`, `transferToken(address,address,uint256)` — both `whenNotPaused + nonReentrant` |
| `EMERGENCY_ROLE` | `keccak256("EMERGENCY_ROLE")` | deployer (Phase A.4) | Timelock (per current deploy) — author's intent was a dedicated multisig | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:30`). See design note below. | `emergencyWithdraw(address,address)` — **bypasses pause**, `nonReentrant` |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (Phase A.4) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 | `pause()`, `unpause()` |

**Capability matrix (a — EMERGENCY_ROLE vs PAUSER_ROLE):**

| Capability | `PAUSER_ROLE` | `EMERGENCY_ROLE` |
|---|---|---|
| Stop DAO burn/transfer | Yes (via pause) | No (does not have access to burn/transfer) |
| Move funds out of vault | No | **Yes** (full balance per token) |
| Operates while paused | n/a (it sets the pause) | **Yes — explicitly bypasses pause** (`emergencyWithdraw` has no `whenNotPaused` modifier, L103-107) |
| Re-entry protection | n/a | `nonReentrant` |

**Threat model & rationale for the pause bypass:** If the DAO's burn/transfer key (or the DAO process itself) is compromised, the response sequence is:
1. `PAUSER_ROLE` holder calls `pause()` → halts `burnToken` and `transferToken` immediately.
2. `EMERGENCY_ROLE` holder calls `emergencyWithdraw(token, safeAddress)` → sweeps balances to a recovery address.
3. Without the pause bypass, step 2 would also be frozen during step 1's pause window, defeating the purpose. The pause bypass on `emergencyWithdraw` is therefore *required* for the circuit-breaker semantic to work.

**Critical caveat — current deploy collapses the separation:** `scripts/transferAdminRoles.js:30` sends `["DEFAULT_ADMIN_ROLE", "DAO_ROLE", "EMERGENCY_ROLE", "PAUSER_ROLE"]` *all* to the Timelock. Post-B.5, the same entity (Timelock, with 48 h delay) holds every role. The constructor's two-key split exists but is not exploited operationally. This means the threat model above only works if the DAO subsequently separates `EMERGENCY_ROLE` to a faster-acting multisig (deploy-script L67 notes the intent: `"Optional: rotate PAUSER_ROLE / EMERGENCY_ROLE to dedicated multisigs"`). **Tracked as §10 AD-04** (pending §10 draft).

#### 4.3.5 Modifiers

Custom modifiers defined on this contract: **none.**

| Modifier | Source | Effect |
|---|---|---|
| `onlyRole(<ROLE>)` | `AccessControl` (inherited) | Reverts with `AccessControlUnauthorizedAccount(caller, role)`. |
| `whenNotPaused` | `Pausable` (inherited) | Reverts with `EnforcedPause()` when paused. Applied to `burnToken`, `transferToken`. **Deliberately omitted from `emergencyWithdraw` (see §4.3.4 threat model).** |
| `nonReentrant` | `ReentrancyGuard` (inherited) | Reverts with `ReentrancyGuardReentrantCall()`. Applied to **every** function that calls `safeTransfer` on an arbitrary token. |

**This is the first contract in the inventory with a meaningful modifier stack.** All three fund-moving functions hold `nonReentrant` because the called token contract is user-supplied and may execute arbitrary code on transfer (ERC-777 hooks, ERC-1363 callbacks, malicious fallback). The `nonReentrant` guard is non-negotiable on this surface.

**Consistency check** — every state-mutating external function and its modifier stack:

| Function | `onlyRole` | `whenNotPaused` | `nonReentrant` | Notes |
|---|---|---|---|---|
| `burnToken(address, uint256)` | `DAO_ROLE` | ✓ | ✓ | Standard DAO path. |
| `transferToken(address, address, uint256)` | `DAO_ROLE` | ✓ | ✓ | Standard DAO path. |
| `emergencyWithdraw(address, address)` | `EMERGENCY_ROLE` | **✗ (intentional)** | ✓ | Pause-bypass is the entire point of this function — see §4.3.4. |
| `pause()` | `PAUSER_ROLE` | n/a | n/a | — |
| `unpause()` | `PAUSER_ROLE` | n/a | n/a | — |
| `getBalance(address)` | — | — | — | `view`. |

#### 4.3.6 External / Public Functions

| Signature | Modifiers | Returns | Purpose | Emits |
|---|---|---|---|---|
| `burnToken(address token, uint256 amount)` | `onlyRole(DAO_ROLE)`, `whenNotPaused`, `nonReentrant` | — | "Burn" by `safeTransfer(0xdEaD, amount)`. Validates non-zero token + amount. **Does not call `_burn` on the foreign token** — see §4.3.10 dead-letter mechanism. | `TokenBurned(token, amount)` |
| `transferToken(address token, address to, uint256 amount)` | `onlyRole(DAO_ROLE)`, `whenNotPaused`, `nonReentrant` | — | Move tokens to an arbitrary recipient (buyback, restitution, off-chain custody). Validates non-zero token / to / amount. | `TokenTransferred(token, to, amount)` |
| `emergencyWithdraw(address token, address to)` | `onlyRole(EMERGENCY_ROLE)`, `nonReentrant` | — | Sweep full balance via `IERC20.balanceOf(this) → safeTransfer(to, balance)`. Validates non-zero token / to. Reverts with `ZeroAmount()` if balance is zero (no-op suppression). **No `whenNotPaused`** — see §4.3.4. | `EmergencyWithdrawn(token, to, balance)` |
| `getBalance(address token)` | `view` | `uint256` | Convenience wrapper around `IERC20(token).balanceOf(address(this))`. | — |
| `pause()` | `onlyRole(PAUSER_ROLE)` | — | Halts `burnToken` and `transferToken`. Does **not** halt `emergencyWithdraw`. | OZ `Paused(account)` |
| `unpause()` | `onlyRole(PAUSER_ROLE)` | — | Lifts the pause. | OZ `Unpaused(account)` |

**Critical accounting note for the auditor (e — fee-on-transfer ERC20 handling):**

The vault holds **no internal balance accounting state**. There is no `mapping(address => uint256) public recordedBalance` or similar. Every balance read goes directly to `IERC20(token).balanceOf(address(this))`. This has important consequences:

1. **For `emergencyWithdraw`:** The transferred amount is `balanceOf(this)` measured *immediately before the transfer*. For a fee-on-transfer (FoT) token, the recipient receives less than the emitted-event `balance`. There is no `balanceBefore`/`balanceAfter` delta check. The emitted `EmergencyWithdrawn(token, to, balance)` records the **pre-fee** amount; the recipient's wallet credit will be **post-fee**. This drift is not measured or surfaced anywhere.

2. **For `burnToken` and `transferToken`:** Both trust the caller-supplied `amount`. There is no pre-call assertion that `amount <= balanceOf(this)` — `safeTransfer` will revert if the balance is insufficient, so the OZ wrapper provides the safety. However, for FoT tokens, the emitted-event `amount` again records the **pre-fee** value while the on-chain delta is the **post-fee** value.

3. **No `balanceBefore/balanceAfter` diff pattern is used anywhere in this contract.** The design is intentional and is best characterized as *balance-of-reality* (the source of truth is always `balanceOf`) rather than *recorded-balance* (the source of truth is internal state). This makes the contract robust to:
   - FoT tokens (no internal counter to drift).
   - Rebasing tokens (balance can move under the contract's feet between calls; the next call reads the new value).
   - Unsolicited transfers from arbitrary parties (no need to track who sent what; all balance is fungible from the vault's perspective).

4. **The cost of this design:** Emitted event amounts may overstate the actual on-chain delta for FoT tokens. Downstream indexers / explorers should treat `amount` as the **caller-stated intent**, not the **delivered amount**. **Tracked as §10 AD-03 (FoT amount-vs-event drift, severity Low — informational, no fund loss path).**

5. **What this design does NOT protect against:** A malicious ERC20 whose `transfer` hook re-enters this contract. The `nonReentrant` modifier defends against re-entry; combined with the CEI ordering (state effects before `safeTransfer` — though there are no state effects to speak of, only event emission after the transfer), the surface is minimal.

**Inherited public surface:**

- **AccessControl:** `hasRole(bytes32,address)`, `getRoleAdmin(bytes32)`, `grantRole(bytes32,address)`, `revokeRole(bytes32,address)`, `renounceRole(bytes32,address)`, `supportsInterface(bytes4)`.
- **Pausable:** `paused()`.
- **ReentrancyGuard:** no new public functions (acts via `nonReentrant`).

**Internal helpers worth audit attention:** none. The three external state-mutating functions are short enough to read end-to-end without extracted helpers.

#### 4.3.7 Public State Variables (auto-getters)

**No custom state variables** beyond the role constants.

| Variable | Type | Visibility | Initial value | What it tracks |
|---|---|---|---|---|
| `DAO_ROLE` | `bytes32 constant` | `public` | `keccak256("DAO_ROLE")` | Role constant. |
| `EMERGENCY_ROLE` | `bytes32 constant` | `public` | `keccak256("EMERGENCY_ROLE")` | Role constant. |
| `PAUSER_ROLE` | `bytes32 constant` | `public` | `keccak256("PAUSER_ROLE")` | Role constant. |

State the vault appears to "hold" — token balances — lives entirely in the inherited ERC20 contracts' own storage, not in this contract. `getBalance(token)` and the `emergencyWithdraw` balance read reach out to that external state on every call. This is the key fact behind the FoT-robustness argument in §4.3.6.

**Two-entry-point accounting (d — unified, no source distinction):**

Tokens arrive in the vault from three sources:

1. **`GarbageCollector.sendScamToLandfill(tokens, amounts)`** — explicit push, one event per token (`ScamTokenSent`), emitted by GarbageCollector. Vault emits nothing on receipt.
2. **`GarbageCollector` swap-failure fallback** — implicit push from inside `cleanupBatch` when a `swapExactTokensForETH` call reverts; tokens are forwarded to the vault. Event `SwapFallbackToLandfill` emitted by GarbageCollector. Vault emits nothing on receipt.
3. **Unsolicited transfer** — any address can `ERC20.transfer(landfillVault, …)` directly. No on-chain event is produced by either party that identifies this as "donation to vault."

The vault contract itself **cannot distinguish among the three sources**. There is no `Receipt` event, no per-source counter, no sender-attribution mapping. All three look identical to `balanceOf`. This is deliberate — accounting per source belongs in off-chain indexers consuming GarbageCollector's events, not in this contract.

#### 4.3.8 Custom Errors

| Error | Signature | When thrown | Thrown by |
|---|---|---|---|
| `ZeroAddress` | `()` | any `address` argument is `address(0)` | constructor (L50-51), `burnToken` (L72), `transferToken` (L88-89), `emergencyWithdraw` (L108-109) |
| `ZeroAmount` | `()` | `amount == 0` (DAO functions) or `balanceOf(this) == 0` (emergency) | `burnToken` (L73), `transferToken` (L90), `emergencyWithdraw` (L115) |

Inherited errors bubbled: `AccessControlUnauthorizedAccount`, `EnforcedPause`, `ExpectedPause`, `ReentrancyGuardReentrantCall`, `SafeERC20FailedOperation(token)`.

#### 4.3.9 Events

| Event | Signature | Emitted by | Notes |
|---|---|---|---|
| `TokenBurned` | `(address indexed token, uint256 amount)` | `burnToken` (L76) | `amount` = caller-stated, may overstate actual for FoT tokens (§10 AD-03). |
| `TokenTransferred` | `(address indexed token, address indexed to, uint256 amount)` | `transferToken` (L93) | Same FoT caveat as above. |
| `EmergencyWithdrawn` | `(address indexed token, address indexed to, uint256 amount)` | `emergencyWithdraw` (L118) | `amount` = `balanceOf(this)` *before* the transfer; same FoT caveat. |

Inherited events: `Paused(account)`, `Unpaused(account)`, `RoleGranted`, `RoleRevoked`, `RoleAdminChanged`.

#### 4.3.10 Immutables & Constants

**Category A — Compile-time constants (`constant`):**

| Name | Type | Value | Set at | Rationale |
|---|---|---|---|---|
| `DAO_ROLE` | `bytes32 constant public` | `keccak256("DAO_ROLE")` | L24 | — |
| `EMERGENCY_ROLE` | `bytes32 constant public` | `keccak256("EMERGENCY_ROLE")` | L25 | — |
| `PAUSER_ROLE` | `bytes32 constant public` | `keccak256("PAUSER_ROLE")` | L26 | — |

**Category B — Constructor-set immutables (`immutable`):** *None.* This contract has no external trusted dependencies; nothing to seal at construction.

**Dead-letter mechanism (c — explicit type clarification):**

The "burn" path on L75 uses `IERC20(token).safeTransfer(address(0xdEaD), amount)`. This is **not** Solidity's `_burn` (which the vault cannot call — it does not own the foreign token's bytecode). The mechanism is dead-letter via the convention of `0x000000000000000000000000000000000000dEaD`:

- The token's `totalSupply()` is **unchanged** by this operation. From the token's perspective, the balance simply moved from one address to another.
- The dead address has no known private key and no contract code; transfers in are not transferrable out.
- The vault's `balanceOf(this)` decreases by the transferred amount (less any FoT fee — see §4.3.6).
- The token's standard `Transfer(vault, 0xdEaD, amount)` event fires, providing on-chain auditability that the vault burned X amount of the foreign token at the vault's discretion.

Cross-reference to the vault-layer invariant (I-08, §6) `vaultBalance(token) == sum_received(token) - sum_movedOut(token)`. The invariant is enforced by the test handler tracking all inbound/outbound movements and asserting against `balanceOf` after each. **For FoT tokens, this invariant only holds when the test fixture uses a non-FoT MockERC20** — see §4.3.13.

#### 4.3.11 Receive / Fallback

**None — contract cannot receive native BNB.** Native BNB transfers will revert. This is correct by design: the vault is meant to hold ERC20s only, and any BNB sent here would be unrecoverable (no `withdrawStuckBNB` escape hatch exists on this contract — contrast §4.5 GarbageCollector, which does have one).

#### 4.3.12 Slither Suppressions

**Total directives on this contract: 1.**

| Line | Directive | Detector(s) | Rationale (from inline comment) |
|---|---|---|---|
| 114 | `// slither-disable-next-line incorrect-equality` | `incorrect-equality` | The comment block at L111-112 says: *"Defensive zero-check — revert to avoid emitting a no-op EmergencyWithdrawn. Not a security comparison; slither flags `==` against externally-sourced values."* The `==` is on `balance` (a fresh `balanceOf` read), used to short-circuit when the vault has nothing of `token` to sweep. The early revert with `ZeroAmount()` keeps the event stream clean. False positive for Slither's "comparison against externally-sourced value" heuristic. |

#### 4.3.13 Test Coverage Reference

| Test file | Test count | Notable coverage |
|---|---|---|
| `test/LandfillVault.test.js` | *verified in §14* | Deployment (role grants, constructor zero-checks), `burnToken` (DAO-only, pause-blocked, zero-token/amount reverts, emits event, balance decreases), `transferToken` (similar), `emergencyWithdraw` (EMERGENCY-only, bypasses pause, zero-balance revert), `pause` / `unpause` (PAUSER-only, paused state checks), role management. |
| `test-foundry/LandfillVault.t.sol` | *verified in §14* | Fuzz: `testFuzz_burnTokenMovesToDeadAddress`, `testFuzz_transferTokenMovesToRecipient`, `testFuzz_onlyDaoCanBurn`, `testFuzz_onlyEmergencyCanWithdraw`, `test_emergencyWithdrawBypassesPause`, `test_burnRevertsWhenPaused`, `testFuzz_zeroAmountReverts`. Invariants: `invariant_balanceAccounting`, `invariant_movedOutEqualsSumOfActions`, `invariant_vaultBalanceCappedByInitialMint`. |

**Coverage gap to flag for the auditor:** All vault tests use `MockERC20` (a standard non-fee-on-transfer token). There is **no fuzz or invariant coverage exercising fee-on-transfer (FoT), rebasing, or ERC-777-callback tokens** against the vault. The §10 AD-03 acceptance ("emitted event amount may overstate actual transferred amount for FoT tokens") is therefore a *design assertion*, not a *tested property*. If the audit firm has internal FoT-token test fixtures, running them against this contract would strengthen the AD-03 acceptance from "argued correctness" to "tested correctness."

Cross-reference to §6 invariants: I-08, I-09, I-10 (vault-layer; titles in §6 registry once added).

---

### §4.4 CleanupMining

**File:** `contracts/CleanupMining.sol` (256 lines)
**Deployed:** Phase A.5 (see §3.3) — once per network. **The deploy step captures `block.timestamp` into `LAUNCH_TIMESTAMP`**, so re-deployment would reset the epoch clock; the contract is effectively unswappable post-launch (a replacement would start back at Epoch 0 with the full reward multiplier, breaking the halving schedule).
**Mutability:** Immutable contract. Three parameters (`baseRate`, `tierBronze`, `tierSilver`) are mutable via `ADMIN_ROLE` setters; everything else is fixed at deploy or constant.

#### 4.4.1 Purpose

Computes and disburses GOTT rewards for each cleanup batch. Receives `recordCleanup(user, cleanupValueUSD, tokenCount)` from `GarbageCollector` (which holds `COLLECTOR_ROLE`), applies a tier multiplier (first-cleanup bonus, bronze, silver, or default) and an epoch multiplier (180-day halving for 4 epochs, then zero), and calls `gott.mintReward(user, reward)` to issue the reward.

#### 4.4.2 Inheritance (C3 linearization)

Direct parents (declaration order, `CleanupMining.sol:35`):

```
contract CleanupMining is AccessControl, Pausable, ReentrancyGuard
```

**Why direct-parent listing is sufficient.** Same shape as §4.3 LandfillVault — three simple state holders on legacy direct storage, no ERC-7201 namespacing, no `_update`/`super` composition.

**OZ v5.1.0-specific notes:**
- Standard v5 custom errors: `AccessControlUnauthorizedAccount`, `EnforcedPause`, `ReentrancyGuardReentrantCall`.
- Local `IGuardiansToken` interface (`CleanupMining.sol:9–13`) is intentionally minimal. It exposes only `mintReward(address,uint256)` and the auto-getter mirror `MAX_MINT_PER_DAY()`. The uppercase getter name violates Solidity's recommended camelCase convention, which is why the interface declaration is wrapped in `// slither-disable-start naming-convention` / `end` (L8/L14) — the name MUST match GuardiansToken's public constant getter (§4.1.10 L46) for ABI compatibility. See §4.4.12.

#### 4.4.3 Constructor

```solidity
constructor(address admin, address _gott)
```

| Step in body | What it does | Source |
|---|---|---|
| 1 | Reverts with `ZeroAddress()` if `admin == 0` | L107 |
| 2 | Reverts with `ZeroAddress()` if `_gott == 0` | L108 |
| 3 | Set `gott = IGuardiansToken(_gott)` (immutable) | L110 |
| 4 | Set `LAUNCH_TIMESTAMP = block.timestamp` (immutable) | L111 |
| 5 | `_grantRole(DEFAULT_ADMIN_ROLE, admin)` | L113 |
| 6 | `_grantRole(ADMIN_ROLE, admin)` | L114 |
| 7 | `_grantRole(PAUSER_ROLE, admin)` | L115 |

**Critical: `LAUNCH_TIMESTAMP` is set at deploy time, not at first-cleanup.** This means the epoch clock starts running immediately on deployment, regardless of when the first user interacts. The protocol team must therefore deploy CleanupMining as close as possible to the *intended* launch moment — every day between deploy and first user cleanup consumes a day of Epoch 0's full-reward multiplier. The audit firm should confirm this matches the team's launch plan; if the team needs a delay, the correct fix is to deploy later, not to add a separate "go-live" toggle (which would add governance surface for a one-time event).

**`COLLECTOR_ROLE` is not granted in the constructor.** Granted post-deploy in Phase A.8 to the `GarbageCollector` contract. See §4.4.4.

#### 4.4.4 Roles

| Role constant | Hash | Granted at deploy to | Steady-state holder | Renounce / transfer event | Can call |
|---|---|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00…00` (OZ built-in) | deployer (Phase A.5) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:31`) | role management |
| `ADMIN_ROLE` | `keccak256("ADMIN_ROLE")` | deployer (Phase A.5) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:31`) | `setBaseRate(uint256)`, `setTierThresholds(uint256,uint256)` |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (Phase A.5) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:31`) | `pause()`, `unpause()` |
| `COLLECTOR_ROLE` | `keccak256("COLLECTOR_ROLE")` | — (not granted at deploy) | `GarbageCollector` contract | Granted to GarbageCollector at Phase A.8. **Not** transferred to Timelock at Phase B.5 (intentionally omitted from `scripts/transferAdminRoles.js:31`; explicit author note at `scripts/transferAdminRoles.js:16`: `CleanupMining.COLLECTOR_ROLE (held by GarbageCollector contract)`). Revocable by `DEFAULT_ADMIN_ROLE` holder (= Timelock post-B.5) via standard `revokeRole` DAO proposal. | `recordCleanup(address,uint256,uint256)` |

**Design note on `COLLECTOR_ROLE`:** Same pattern as `CLEANUP_MINER_ROLE` on GuardiansToken (§4.1.4) — bound to a contract address, governed by `DEFAULT_ADMIN_ROLE`, swappable via DAO proposal if `GarbageCollector` is ever replaced.

**Pause response window (same caveat as §4.2 ScamRegistry):** No EMERGENCY_ROLE on this contract. Post-B.5, pause requires a Governor proposal subject to the full 48 h Timelock delay. Acceptable because CleanupMining holds no funds — the worst-case impact of a 48 h delay is up to ~48 h of uncontested reward over-emission if the reward formula is later found to have a flaw, capped per-day by `MAX_MINT_PER_DAY` (1.4 M GOTT — §4.1.10) which is enforced *downstream* on the token. The token's daily cap is therefore the load-bearing protection, not this contract's pause.

#### 4.4.5 Modifiers

Custom modifiers defined on this contract: **none.**

| Modifier | Source | Effect |
|---|---|---|
| `onlyRole(<ROLE>)` | `AccessControl` (inherited) | `AccessControlUnauthorizedAccount`. |
| `whenNotPaused` | `Pausable` (inherited) | `EnforcedPause()`. Applied to `recordCleanup` only. |
| `nonReentrant` | `ReentrancyGuard` (inherited) | `ReentrancyGuardReentrantCall()`. Applied to `recordCleanup`. |

**Stacked modifiers + CEI ordering on `recordCleanup`.** The single state-mutating function on the critical path uses all three modifiers and follows strict Checks-Effects-Interactions order (L138–161):

1. **Checks** — zero-address revert; reward calc reads state but does not mutate.
2. **Effects** — every storage write (`hasCleanedBefore`, `totalCleanupValue`, `lastCleanupTimestamp`, `cleanupCountPerEpoch`, `totalCleanupsExecuted`, `totalValueCleaned`, `totalRewardsEarned`) happens before any external call. Event emission is also pre-interaction.
3. **Interaction** — exactly one external call: `gott.mintReward(user, reward)` to the immutable trusted token contract. Conditional on `reward > 0` to skip the no-op call when `epochMultiplier == 0` (post-Epoch 3).

The `nonReentrant` guard is defense-in-depth — even though the only external callee is the trusted immutable `gott`, the guard cheaply forecloses any future scenario where a different (possibly user-supplied) external call is added without re-deriving the safety argument.

**Consistency check** — every state-mutating external function and its modifier stack:

| Function | `onlyRole` | `whenNotPaused` | `nonReentrant` | Notes |
|---|---|---|---|---|
| `recordCleanup(address, uint256, uint256)` | `COLLECTOR_ROLE` | ✓ | ✓ | The only state-mutating function on the reward path. |
| `setBaseRate(uint256)` | `ADMIN_ROLE` | — | — | Pure config. No reentrancy surface (no external call). |
| `setTierThresholds(uint256, uint256)` | `ADMIN_ROLE` | — | — | Same. |
| `pause()` | `PAUSER_ROLE` | n/a | n/a | — |
| `unpause()` | `PAUSER_ROLE` | n/a | n/a | — |
| `calculateReward(...)` | — | — | — | `view`. |
| `getTierMultiplier(...)`, `getEpochMultiplier()`, `getCurrentEpoch()` | — | — | — | `view`. |

#### 4.4.6 External / Public Functions

| Signature | Modifiers | Returns | Purpose | Emits |
|---|---|---|---|---|
| `recordCleanup(address user, uint256 cleanupValueUSD, uint256 tokenCount)` | `onlyRole(COLLECTOR_ROLE)`, `whenNotPaused`, `nonReentrant` | — | Record cleanup + mint reward. Updates user + global state; calls `gott.mintReward` last. **`cleanupValueUSD` must be 1e18-scaled** (caller responsibility — currently `GarbageCollector` after EIP-712 verification). | `RewardCalculated(user, value, tokenCount, reward, epoch)` |
| `calculateReward(address user, uint256 cleanupValueUSD)` | `public view` | `uint256` | Reward simulation. Used both internally by `recordCleanup` and externally (UI / quote). Returns 0 when epoch ≥ 4. **Divide-before-multiply pattern, intentional — see §4.4.12 and Appendix C.** | — |
| `getTierMultiplier(address user, uint256 value)` | `public view` | `uint256` (1e18-scaled) | First-cleanup `2.0e18`; ≥ silver `1.25e18`; ≥ bronze `1.5e18`; default `1.0e18`. **Order matters:** the silver vs. bronze comparison reads `>= tierSilver` first, then `>= tierBronze`, so silver wins for the same value (silver > bronze threshold, but silver multiplier `1.25 < 1.5` bronze — see §4.4.10 math note for the intentional anti-whale gradient). | — |
| `getEpochMultiplier()` | `public view` | `uint256` (1e18-scaled) | Halving table: `1.0 / 0.5 / 0.25 / 0.125 / 0` for epochs 0–4+. | — |
| `getCurrentEpoch()` | `public view` | `uint256` | `(block.timestamp − LAUNCH_TIMESTAMP) / EPOCH_DURATION`. Monotonic non-decreasing — see I-14 (§6). | — |
| `setBaseRate(uint256 newRate)` | `onlyRole(ADMIN_ROLE)` | — | Update reward rate. Validates `0 < newRate ≤ MAX_BASE_RATE`. | `BaseRateChanged(old, new)` |
| `setTierThresholds(uint256 newBronze, uint256 newSilver)` | `onlyRole(ADMIN_ROLE)` | — | Update tier cutoffs. Validates `0 < newBronze < newSilver`. | `TierThresholdsChanged(oldB, oldS, newB, newS)` |
| `pause()` | `onlyRole(PAUSER_ROLE)` | — | Halts `recordCleanup`. View functions remain live. | OZ `Paused(account)` |
| `unpause()` | `onlyRole(PAUSER_ROLE)` | — | Lifts pause. | OZ `Unpaused(account)` |

**Inherited public surface:**

- **AccessControl:** `hasRole(bytes32,address)`, `getRoleAdmin(bytes32)`, `grantRole(bytes32,address)`, `revokeRole(bytes32,address)`, `renounceRole(bytes32,address)`, `supportsInterface(bytes4)`.
- **Pausable:** `paused()`.
- **ReentrancyGuard:** no new public functions.

**Internal helpers worth audit attention:** none. The contract has no `_*` helpers; the reward calc is short enough to inline in `calculateReward`.

#### 4.4.7 Public State Variables (auto-getters)

**Per-user state (mappings):**

| Variable | Type | Visibility | Initial | What it tracks |
|---|---|---|---|---|
| `hasCleanedBefore` | `mapping(address => bool)` | `public` | empty | First-cleanup flag for the 2.0× tier bonus. Set to `true` on first successful `recordCleanup`. |
| `totalCleanupValue` | `mapping(address => uint256)` | `public` | empty | Cumulative 1e18-scaled USD value cleaned by user. |
| `totalRewardsEarned` | `mapping(address => uint256)` | `public` | empty | Cumulative GOTT minted to user via this contract. Monotonic non-decreasing — see I-11 (§6). |
| `lastCleanupTimestamp` | `mapping(address => uint256)` | `public` | empty | Unix timestamp of most recent cleanup. Used by off-chain analytics; not consulted on-chain. |
| `cleanupCountPerEpoch` | `mapping(address => mapping(uint256 => uint256))` | `public` | empty | Per-user, per-epoch cleanup count. |

**Global state:**

| Variable | Type | Visibility | Initial | What it tracks |
|---|---|---|---|---|
| `totalCleanupsExecuted` | `uint256` | `public` | 0 | Sum over all users of cleanup events. Cross-checked against per-epoch sum by I-13 (§6). |
| `totalValueCleaned` | `uint256` | `public` | 0 | Sum over all users of `cleanupValueUSD`. |

**Mutable config (tunable by `ADMIN_ROLE`):**

| Variable | Type | Visibility | Initial | What it tracks |
|---|---|---|---|---|
| `baseRate` | `uint256` | `public` | `100 ether` (= 100 GOTT per $1 USD) | Base GOTT/USD coefficient in the reward formula. Bounded by `MAX_BASE_RATE`. |
| `tierBronze` | `uint256` | `public` | `100e18` ($100 USD scaled by 1e18) | Lower tier threshold. |
| `tierSilver` | `uint256` | `public` | `1000e18` ($1000 USD scaled by 1e18) | Upper tier threshold. Must be `> tierBronze`. |

**Constants & immutables — see §4.4.10.**

#### 4.4.8 Custom Errors

| Error | Signature | When thrown | Thrown by |
|---|---|---|---|
| `ZeroAddress` | `()` | constructor or `recordCleanup` receives `address(0)` | constructor (L107-108), `recordCleanup` (L138) |
| `InvalidBaseRate` | `()` | `setBaseRate` called with `0` or `> MAX_BASE_RATE` | `setBaseRate` (L230) |
| `InvalidTierThresholds` | `()` | `setTierThresholds` called with `newBronze == 0` or `newBronze >= newSilver` | `setTierThresholds` (L237) |

Inherited errors: `AccessControlUnauthorizedAccount`, `EnforcedPause`, `ReentrancyGuardReentrantCall`, plus any error bubbled from `gott.mintReward` (e.g., `DailyMintCapExceeded`, `ExceedsMaxSupply` from §4.1.8).

**Downstream revert behavior (audit-relevant):** Because `gott.mintReward` is called at the *end* of `recordCleanup` (after all state writes), a token-side revert (e.g., hitting the 1.4 M daily cap) **rolls back the entire `recordCleanup` call** including the bookkeeping updates. The user's on-chain accounting therefore stays consistent with their actual GOTT balance: if the reward couldn't be minted, the cleanup itself is treated as never having occurred from this contract's perspective. Note that `GarbageCollector.cleanupBatch` (§4.5) will also have rolled back any token swaps in that same outer transaction. Confirmed-by-test: see invariant I-12 (sum of per-user `totalRewardsEarned` matches mined GOTT total).

#### 4.4.9 Events

| Event | Signature | Emitted by | Notes |
|---|---|---|---|
| `RewardCalculated` | `(address indexed user, uint256 cleanupValueUSD, uint256 tokenCount, uint256 rewardAmount, uint256 indexed epoch)` | `recordCleanup` (L156) | Emitted **before** the `gott.mintReward` call (CEI). If the mint reverts, the whole tx rolls back including this event. |
| `BaseRateChanged` | `(uint256 oldRate, uint256 newRate)` | `setBaseRate` (L233) | — |
| `TierThresholdsChanged` | `(uint256 oldBronze, uint256 oldSilver, uint256 newBronze, uint256 newSilver)` | `setTierThresholds` (L242) | — |

Inherited: `Paused`, `Unpaused`, `RoleGranted`, `RoleRevoked`, `RoleAdminChanged`.

#### 4.4.10 Immutables & Constants

**Category A — Compile-time constants (`constant`):**

| Name | Type | Value | Set at | Rationale |
|---|---|---|---|---|
| `EPOCH_DURATION` | `uint256 constant public` | `180 days` | L50 | Fixed halving window. Tokenomics choice (§4.4 NatSpec L28-33). |
| `MAX_BASE_RATE` | `uint256 constant public` | `1000 ether` (1000 GOTT/$) | L53 | Hard ceiling for `setBaseRate` validation. Bounds the worst-case reward inflation by 10× the default (`baseRate = 100 ether`). |
| `COLLECTOR_ROLE` | `bytes32 constant public` | `keccak256("COLLECTOR_ROLE")` | L39 | — |
| `ADMIN_ROLE` | `bytes32 constant public` | `keccak256("ADMIN_ROLE")` | L40 | — |
| `PAUSER_ROLE` | `bytes32 constant public` | `keccak256("PAUSER_ROLE")` | L41 | — |

**Category B — Constructor-set immutables (`immutable`):**

| Name | Type | Value | Set at | Rationale |
|---|---|---|---|---|
| `gott` | `IGuardiansToken immutable public` | constructor arg `_gott` | L110 (constructor) | The reward sink. Sealed at deploy — a malicious or replacement token cannot be silently injected. Replacement requires redeploying CleanupMining. |
| `LAUNCH_TIMESTAMP` | `uint256 immutable public` | `block.timestamp` at deploy | L111 (constructor) | Epoch clock base. Sealed at deploy — see §4.4.3 "Critical" note. Sticky `slither-disable-next-line naming-convention` on L48 because SCREAMS_CASE is used for visual parity with `EPOCH_DURATION` (both deploy-time-fixed). |

**This is the first contract in the inventory to use the `immutable` keyword.** The bridge note from §4.1.10 lands here: GuardiansToken has no external dependencies to seal, but CleanupMining has two (`gott` and the launch moment), and they are sealed in the canonical way (immutable storage with deploy-time initialization).

**Math sanity check — reward formula bounds.** The full derivation is in **Appendix C — Reward Formula**, but two quick checks the auditor can verify by inspection:

1. **Maximum per-cleanup reward (no halving, max tier, max baseRate):**
    ```
    reward_max = baseRate × cleanupValueUSD × tierMult × epochMult / 1e54
               = MAX_BASE_RATE × cleanupValueUSD × 2.0 × 1.0 / 1e54
               = 1000e18 × cleanupValueUSD × 2e18 × 1e18 / 1e54
               = 2 × cleanupValueUSD                          (after the 1e54 normalization)
    ```
    So at the worst-case admin-set `baseRate` and the first-cleanup `2.0×` tier in Epoch 0, the reward in GOTT is `2 × cleanupValueUSD` (i.e., 2 GOTT per $1 cleaned, 1e18-scaled). At the default `baseRate = 100 ether`, the figure is `0.2 × cleanupValueUSD` — i.e., $1 cleaned in Epoch 0 with first-cleanup tier earns 200 GOTT.

2. **Tier multiplier order intentional anti-whale gradient:** The function returns `1.25e18` for `value ≥ tierSilver` and `1.5e18` for `value ≥ tierBronze`. Since the silver check is evaluated *first* (L199 before L200), a $5000 cleanup wins the silver tier (`1.25×`), not the bronze tier (`1.5×`). The gradient is **anti-whale**: small-but-meaningful cleanups ($100–$999) get the highest non-bonus multiplier (`1.5×`); large cleanups ($1000+) get the moderate multiplier (`1.25×`); the first-cleanup bonus (`2.0×`) is the only multiplier that beats bronze. This is by design — confirmed-by-test in `test/CleanupMining.test.js` (the "Tier multipliers" describe block).

3. **Cleanup-mining total emission budget:**
    ```
    Sum of epoch multipliers: 1.0 + 0.5 + 0.25 + 0.125 = 1.875
    Lifetime upper bound:     baseRate × Σ(cleanupValueUSD × tierMult) × 1.875 / 1e54
    ```
    Combined with the daily cap on `gott.mintReward` (1.4 M GOTT — §4.1.10) and the math sanity check there (~720 days ≈ 4 epochs), the protocol-wide emission via cleanup mining is bounded to slightly under `MAX_SUPPLY`. Full derivation in Appendix C.

#### 4.4.11 Receive / Fallback

**None — contract cannot receive native BNB.** This contract does not handle ETH/BNB at all; rewards are paid in GOTT via the token's mint path.

#### 4.4.12 Slither Suppressions

**Total directives on this contract: 4 logical** (3 paired-block + 1 next-line). This is the contract with the most Slither suppressions in the protocol — each is load-bearing and documented inline.

| Lines | Directive | Detector(s) | Rationale (from inline comments) |
|---|---|---|---|
| 8–14 | `// slither-disable-start naming-convention` / `end` | `naming-convention` | Local `IGuardiansToken` interface at L9-13 declares `MAX_MINT_PER_DAY()` in screaming case to mirror the auto-generated getter of GuardiansToken's `public constant MAX_MINT_PER_DAY` (§4.1.10 L46). Solidity requires interface function names to match the implementation's getter name exactly for ABI compatibility. False positive for Slither's camelCase convention check. |
| 48 | `// slither-disable-next-line naming-convention` | `naming-convention` | `LAUNCH_TIMESTAMP` immutable uses SCREAMS_CASE for visual parity with `EPOCH_DURATION` constant — both are deploy-time-fixed and conceptually constant from the caller's perspective. Same rationale as the interface getter. |
| 182–186 | `// slither-disable-start divide-before-multiply` / `end` | `divide-before-multiply` | `calculateReward` divides by `1e18` three times sequentially instead of multiplying all four factors and dividing by `1e54` once. The literal `/ 1e54` form overflows `uint256` for `cleanupValueUSD ≥ ~$2k` (see Appendix C for the overflow derivation). The divide-early form keeps every intermediate well below `uint256` max. **Precision is preserved** because all inputs are 1e18-scaled multiples (`baseRate`, `tierMult`, `epochMult` are all `≥ 1e18` in the value space the formula actually exercises). Documented as §10 AD-05 (pending §10 draft, severity Info — intentional pattern with full rationale). |
| 210–219 | `// slither-disable-start incorrect-equality,timestamp` / `end` | `incorrect-equality`, `timestamp` | `getEpochMultiplier` uses strict `==` on the epoch index (`epoch == 0`, `epoch == 1`, etc.). Slither traces `epoch` back through `getCurrentEpoch` → `(block.timestamp − LAUNCH_TIMESTAMP) / EPOCH_DURATION` and flags every `==` comparison as a "timestamp comparison." The comparisons are on the *derived integer epoch index*, not on `block.timestamp` directly. Manipulation surface is bounded to one block (~3 s on BSC) and cannot move the epoch index across a halving boundary in any realistic scenario. Same false-positive pattern as §4.2 isScamOrDrainer. |

Cross-reference §14 for the consolidated project-wide suppression registry.

#### 4.4.13 Test Coverage Reference

| Test file | Test count | Notable coverage |
|---|---|---|
| `test/CleanupMining.test.js` | *verified in §14* | Deployment (immutables captured, roles), epoch progression (multipliers per epoch including post-mining zero), tier multipliers (first-cleanup, bronze, silver, default, silver-beats-bronze ordering), reward formula by example (small / medium / large values across multiple epoch-tier combinations), `recordCleanup` (role gate, pause, zero-address, downstream mint cap revert), pause, admin setters (validation bounds, event emission). |
| `test-foundry/CleanupMining.t.sol` | *verified in §14* | Fuzz: `testFuzz_rewardScalesLinearlyWithValue`, `testFuzz_epochAdvancesMonotonic`, `testFuzz_postMiningRewardIsZero`, `testFuzz_onlyCollectorCanRecord`, `testFuzz_setBaseRateBounded`, `testFuzz_setBaseRateRejectsOutOfBounds`. Invariants: `invariant_userRewardsMonotonic`, `invariant_totalRewardsMatchTokenBalance`, `invariant_globalCountMatchesPerEpochSum`, `invariant_epochMonotonic`. |

Cross-reference to §6 invariants: I-11 (`totalRewardsEarned` monotonic), I-12 (sum-of-rewards matches token mint accounting), I-13 (global count = per-epoch sum), I-14 (epoch monotonic).

---

### §4.5 GarbageCollector

**File:** `contracts/GarbageCollector.sol` (404 lines)
**Deployed:** Phase A.6 (see §3.3) — once per network. Three external dependencies (`router`, `WBNB`, `scamRegistry`) are sealed as `immutable` at deploy; replacement requires a fresh deployment and governance migration of `COLLECTOR_ROLE` on CleanupMining.
**Mutability:** Three protocol-wiring addresses (`miningContract`, `landfillVault`, `oracleSigner`) and three tuning parameters (`maxTokensPerCleanup`, `swapDeadlineBuffer`, `minCleanupValueUSD`) are mutable via `ADMIN_ROLE` setters. Everything else is fixed at deploy or `constant`.

> **High-risk contract.** This is the only protocol contract that simultaneously: (a) verifies off-chain signatures (EIP-712), (b) holds and forwards native BNB, (c) interacts with an unaudited external dependency (PancakeRouter) and arbitrary user-supplied ERC-20s in the same call, and (d) is the sole external entry point for reward issuance. Sections §4.5.5 (CEI), §4.5.6 (internal helpers), and §4.5.12 (Slither) all warrant deeper review than the vanilla contracts above.

#### 4.5.1 Purpose

Main cleanup orchestrator. Pulls user-owned ERC-20s into this contract, swaps each to BNB via PancakeRouter (failure falls through to LandfillVault), forwards reward bookkeeping to `CleanupMining.recordCleanup`, and pays out the accumulated BNB to the user. Every cleanup batch is gated by an EIP-712 signature from `oracleSigner` over a `CleanupAuthorization` struct, which binds the off-chain-computed `cleanupValueUSD` to a specific user, batch, nonce, and deadline.

#### 4.5.2 Inheritance (C3 linearization)

Direct parents (declaration order, `GarbageCollector.sol:47`):

```
contract GarbageCollector is AccessControl, Pausable, ReentrancyGuard, EIP712
```

**Why direct-parent listing is sufficient.** Three of the four parents (`AccessControl`, `Pausable`, `ReentrancyGuard`) use legacy direct storage with disjoint variables — the same pattern as §4.3 and §4.4. The fourth, `EIP712`, stores `_HASHED_NAME` and `_HASHED_VERSION` in fixed slots set once in its own constructor; the v5 implementation also derives `_cachedDomainSeparator` and `_cachedChainId` from those slots at runtime. None of the parents override `_msgSender`, `_msgData`, or any shared hook function. There is no diamond-shape multiple-inheritance to resolve; C3 here is simply the declaration order with `Context` (transitive parent of `AccessControl` and `Pausable`) deduplicated by the compiler.

**OZ v5.1.0-specific notes:**
- Standard v5 custom errors: `AccessControlUnauthorizedAccount`, `EnforcedPause`, `ReentrancyGuardReentrantCall`.
- `EIP712("GarbageCollector", "1")` — the name and version literals are folded into `_HASHED_NAME` and `_HASHED_VERSION` in the parent constructor (`GarbageCollector.sol:139`). Changing either string would change the domain separator and invalidate any in-flight signatures, so the auditor should confirm these match the literals used by the backend signer.
- `ECDSA.recover` is the v5 implementation that reverts (rather than returning `address(0)`) on malleable / invalid signatures. This is the security property `_verifyAndConsumeAuth` relies on at L248.

#### 4.5.3 Constructor

```solidity
constructor(
    address admin,
    address _router,
    address _wbnb,
    address _scamRegistry,
    address _mining,
    address _vault,
    address _oracleSigner
) EIP712("GarbageCollector", "1")
```

| Step in body | What it does | Source |
|---|---|---|
| 0 | `EIP712("GarbageCollector", "1")` parent constructor stores `_HASHED_NAME = keccak256("GarbageCollector")` and `_HASHED_VERSION = keccak256("1")` | parent init list, L139 |
| 1 | Reverts with `ZeroAddress()` if `admin == 0` | L140 |
| 2 | Reverts with `ZeroAddress()` if `_router == 0` | L141 |
| 3 | Reverts with `ZeroAddress()` if `_wbnb == 0` | L142 |
| 4 | Reverts with `ZeroAddress()` if `_scamRegistry == 0` | L143 |
| 5 | Reverts with `ZeroAddress()` if `_mining == 0` | L144 |
| 6 | Reverts with `ZeroAddress()` if `_vault == 0` | L145 |
| 7 | Reverts with `ZeroAddress()` if `_oracleSigner == 0` | L146 |
| 8 | Set `router = IPancakeRouter(_router)` (immutable) | L148 |
| 9 | Set `WBNB = _wbnb` (immutable) | L149 |
| 10 | Set `scamRegistry = IScamRegistry(_scamRegistry)` (immutable) | L150 |
| 11 | Set `miningContract = ICleanupMining(_mining)` (mutable, rotatable) | L151 |
| 12 | Set `landfillVault = _vault` (mutable, rotatable) | L152 |
| 13 | Set `oracleSigner = _oracleSigner` (mutable, rotatable) | L153 |
| 14 | `_grantRole(DEFAULT_ADMIN_ROLE, admin)` | L155 |
| 15 | `_grantRole(ADMIN_ROLE, admin)` | L156 |
| 16 | `_grantRole(PAUSER_ROLE, admin)` | L157 |

**Mutable vs immutable wiring rationale.** The three external dependencies that are *operationally untrusted but architecturally fixed* (`router`, `WBNB`, `scamRegistry`) are immutable: a compromised admin cannot silently re-point the swap path or bypass the scam gate. The three that are *protocol-internal but expected to be upgraded* (`miningContract`, `landfillVault`, `oracleSigner`) are mutable, governed by `ADMIN_ROLE` = Timelock post-B.5. The split is deliberate: the audit firm should confirm that the mutable surface is acceptable given Timelock + 48 h delay.

**`COLLECTOR_ROLE` flow.** This contract does not hold any role on itself for the reward path; rather, it is granted `COLLECTOR_ROLE` *on the CleanupMining contract* at Phase A.8 (see §3.3 and §4.4.4). The constructor wires `miningContract` but cannot grant itself the role — that step is post-deploy.

#### 4.5.4 Roles

| Role constant | Hash | Granted at deploy to | Steady-state holder | Renounce / transfer event | Can call |
|---|---|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00…00` (OZ built-in) | deployer (Phase A.6) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:32`) | role management |
| `ADMIN_ROLE` | `keccak256("ADMIN_ROLE")` | deployer (Phase A.6) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:32`) | `setMiningContract`, `setLandfillVault`, `setOracleSigner`, `setMaxTokensPerCleanup`, `setMinCleanupValueUSD`, `setSwapDeadlineBuffer`, `withdrawStuckBNB` |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (Phase A.6) | Timelock | Granted to Timelock + revoked from deployer at Phase B.5 (`scripts/transferAdminRoles.js:32`) | `pause()`, `unpause()` |

**`oracleSigner` is NOT a role.** Unlike `ORACLE_ROLE` on ScamRegistry (§4.2.4), the backend signer here is a plain `address` stored in mutable state — there is no `AccessControl` registry entry, no `hasRole` query, and no `revokeRole` path. Rotation is `setOracleSigner(newSigner)` under `ADMIN_ROLE`. This is intentional: the EIP-712 signer is verified by `ECDSA.recover`, not by `hasRole`, so promoting it to a role would add storage and grant-event surface without security benefit.

**Single-key risk.** The `oracleSigner` is one EOA whose private key signs every cleanup batch. Compromise = unlimited reward mint up to the daily cap enforced *downstream* on the token (§4.1.10 `MAX_MINT_PER_DAY = 1.4 M GOTT`). The 48 h Timelock can rotate the key, but the per-day cap is the only protocol-level bound during the rotation window. Tracked as §10 AD-07 (pending §10 draft, severity Med — see §4.5.12 cross-ref).

**Pause response window (post-B.5):** Same shape as §4.2 and §4.4 — no EMERGENCY_ROLE backup; pause requires a Governor proposal subject to the full 48 h Timelock delay. The worst-case impact differs from those contracts because GarbageCollector *does* handle funds (user tokens during the swap path, BNB during payout). However:

- Reentrancy guards on every state-mutating external function (§4.5.5) prevent in-flight exploitation of a single transaction.
- The user's tokens are only at risk *during* their own `cleanupBatch` call — there is no long-lived custody.
- A 48 h delay before pause means up to 48 h of continued reward issuance against a discovered exploit; this is bounded per-day by the token's `MAX_MINT_PER_DAY` cap.

Acceptable, with §10 AD note flagging the absence of a fast-pause path.

#### 4.5.5 Modifiers

Custom modifiers defined on this contract: **none.**

| Modifier | Source | Effect |
|---|---|---|
| `onlyRole(<ROLE>)` | `AccessControl` (inherited) | `AccessControlUnauthorizedAccount`. |
| `whenNotPaused` | `Pausable` (inherited) | `EnforcedPause()`. Applied to `cleanupBatch` and `sendScamToLandfill`. |
| `nonReentrant` | `ReentrancyGuard` (inherited) | `ReentrancyGuardReentrantCall()`. Applied to `cleanupBatch`, `sendScamToLandfill`, and `withdrawStuckBNB`. |

**Stacked modifiers + CEI ordering on `cleanupBatch` (L174–218).** This is the single highest-risk state-mutating function in the protocol. The order of checks and effects is load-bearing and the auditor should walk it line-by-line:

1. **Checks** —
   - Length and bound checks (L184–187): length match, non-empty, ≤ `maxTokensPerCleanup`, `cleanupValueUSD ≥ minCleanupValueUSD`.
   - `_verifyAndConsumeAuth` (L190 → internal helper L221–251): deadline, nonce equality, ECDSA recover, **nonce increment** (effect-during-checks; see note below).
   - Scam pre-check loop (L194–197): `scamRegistry.isScamOrDrainer(tokens[i])` per token; reverts the whole batch if any flagged.

2. **Effects** —
   - The nonce increment in step 1 (`nonces[msg.sender] = expected + 1`, L250) is technically an "effect" but is placed inside the auth helper for atomicity with the verification — it cannot be reordered without breaking replay protection. CEI literalists would call this a violation, but it is the correct ordering: nonce *must* be incremented before any external call so a reentrant call from `msg.sender` cannot reuse the signature.
   - Per-token swap loop (L200–202): `_swapTokenToBNB` is an *interaction* (calls `safeTransferFrom`, `forceApprove`, `router.swapExactTokensForETH`, or falls back to `safeTransfer` to vault on revert). The "effect" recorded by this loop is the change in `address(this).balance`, measured before/after via L199 and L203.
   - `miningContract.recordCleanup(msg.sender, cleanupValueUSD, len)` (L207) — external call to the trusted CleanupMining contract, which mints GOTT to the user via the token. This is the reward effect.
   - `emit CleanupExecuted(...)` (L209).

3. **Interaction (CEI tail)** — BNB payout to user (L213–217) is the *last* state-affecting action. The low-level `call` is the canonical pattern for native-token transfer; `nonReentrant` plus the consumed nonce close the only realistic re-entry path (re-entry from `msg.sender`'s receive hook calling back into `cleanupBatch`).

**Why the "swap inside the loop" doesn't break CEI in practice.** The classical CEI prohibition is "do not modify your contract's state after an external call." The state this contract owns is: nonces (incremented pre-loop), the AccessControl/Pausable bookkeeping (modifier-level), and the ReentrancyGuard slot. None of these are written during the swap loop. The `address(this).balance` change is *EVM-managed state*, not contract storage, and is the intended carrier of the swap output. The auditor should confirm that no future addition of contract-owned state writes inside the loop is allowed without re-deriving this safety argument.

**Consistency check** — every state-mutating external function and its modifier stack:

| Function | `onlyRole` | `whenNotPaused` | `nonReentrant` | Notes |
|---|---|---|---|---|
| `cleanupBatch(...)` | — (sig-auth, not role-auth) | ✓ | ✓ | The critical path. Auth via EIP-712 sig. |
| `sendScamToLandfill(...)` | — (open to any user) | ✓ | ✓ | No sig required; deliberate (see §4.5.6). |
| `setMiningContract` | `ADMIN_ROLE` | — | — | Pure config; emits event. |
| `setLandfillVault` | `ADMIN_ROLE` | — | — | Same. |
| `setOracleSigner` | `ADMIN_ROLE` | — | — | Same. Key rotation path. |
| `setMaxTokensPerCleanup` | `ADMIN_ROLE` | — | — | Bound-checked against `MAX_TOKENS_HARD_CAP`. |
| `setMinCleanupValueUSD` | `ADMIN_ROLE` | — | — | Non-zero. |
| `setSwapDeadlineBuffer` | `ADMIN_ROLE` | — | — | `0 < newBuffer ≤ 1 days`. |
| `withdrawStuckBNB` | `ADMIN_ROLE` | — | ✓ | `nonReentrant` defense-in-depth against admin error / proxy admin. |
| `pause()` | `PAUSER_ROLE` | n/a | n/a | — |
| `unpause()` | `PAUSER_ROLE` | n/a | n/a | — |
| `hashCleanupAuth(...)` | — | — | — | `view`, off-chain helper. |

#### 4.5.6 External / Public Functions

| Signature | Modifiers | Returns | Purpose | Emits |
|---|---|---|---|---|
| `cleanupBatch(address[] tokens, uint256[] amounts, uint256 minBnbOut, uint256 cleanupValueUSD, uint256 nonce, uint256 deadline, bytes signature)` | `nonReentrant`, `whenNotPaused` | `uint256 totalBnbReceived` | Sig-authorised swap-and-reward batch. Pulls each `tokens[i]` from `msg.sender`, swaps to BNB (or falls back to vault), totals received BNB, calls `recordCleanup`, then forwards BNB to user. | `CleanupExecuted(user, tokens, amounts, bnbReceived, cleanupValueUSD)`, plus per-token `SwapFallbackToLandfill` on swap revert. |
| `sendScamToLandfill(address[] tokens, uint256[] amounts)` | `nonReentrant`, `whenNotPaused` | — | Explicit per-user push of arbitrary ERC-20s to LandfillVault. **No signature, no scam-classification check** — the user opts in to the loss; this is the "dump" path for tokens they cannot or will not route through `cleanupBatch`. No reward, no `recordCleanup`, no nonce consumption. | `ScamTokenSent(user, token, amount)` per token. |
| `hashCleanupAuth(address user, address[] tokens, uint256[] amounts, uint256 cleanupValueUSD, uint256 nonce, uint256 deadline)` | `external view` | `bytes32` | Computes the EIP-712 digest the backend `oracleSigner` must sign. Caller-side parity check for the backend; no state read beyond `_HASHED_NAME` / `_HASHED_VERSION` / chainId. | — |
| `setMiningContract(address)` | `onlyRole(ADMIN_ROLE)` | — | Rotate `miningContract`. Zero-rejected. **Does not unwind COLLECTOR_ROLE on the old mining contract** — that revocation is a separate DAO proposal (caller responsibility). | `MiningContractChanged(old, new)` |
| `setLandfillVault(address)` | `onlyRole(ADMIN_ROLE)` | — | Rotate `landfillVault`. Affects both `sendScamToLandfill` destination and the swap-fail fallback target in `_swapTokenToBNB`. | `LandfillVaultChanged(old, new)` |
| `setOracleSigner(address)` | `onlyRole(ADMIN_ROLE)` | — | Rotate the EIP-712 signer EOA. **In-flight signatures from the previous signer remain valid until their deadline** — the contract does not invalidate pre-signed authorizations on rotation. The deadline window plus per-user nonce uniqueness bounds this. | `OracleSignerChanged(old, new)` |
| `setMaxTokensPerCleanup(uint256)` | `onlyRole(ADMIN_ROLE)` | — | Adjust per-batch cap. Validates `0 < newMax ≤ MAX_TOKENS_HARD_CAP` (50). | `MaxTokensChanged(old, new)` |
| `setMinCleanupValueUSD(uint256)` | `onlyRole(ADMIN_ROLE)` | — | Adjust dust-floor. Validates `newMin > 0`. | `MinCleanupValueChanged(old, new)` |
| `setSwapDeadlineBuffer(uint256)` | `onlyRole(ADMIN_ROLE)` | — | Adjust the `block.timestamp + buffer` deadline passed to Pancake. Validates `0 < newBuffer ≤ 1 days`. | `SwapDeadlineBufferChanged(old, new)` |
| `withdrawStuckBNB(address to)` | `onlyRole(ADMIN_ROLE)`, `nonReentrant` | — | Sweep the BNB balance to `to`. Returns silently when balance is zero (no revert, no event). Slither `arbitrary-send-eth` suppressed (see §4.5.12). | `StuckBNBWithdrawn(to, amount)` (only when amount > 0) |
| `pause()` | `onlyRole(PAUSER_ROLE)` | — | Halts `cleanupBatch` and `sendScamToLandfill`. Does *not* halt `withdrawStuckBNB` (intentional — see §4.5.12). | OZ `Paused(account)` |
| `unpause()` | `onlyRole(PAUSER_ROLE)` | — | Lifts pause. | OZ `Unpaused(account)` |

**Inherited public surface:**

- **AccessControl:** `hasRole(bytes32,address)`, `getRoleAdmin(bytes32)`, `grantRole(bytes32,address)`, `revokeRole(bytes32,address)`, `renounceRole(bytes32,address)`, `supportsInterface(bytes4)`.
- **Pausable:** `paused()`.
- **ReentrancyGuard:** no new public functions.
- **EIP712:** `eip712Domain()` returns the canonical domain struct (ERC-5267); off-chain signers should read this rather than hardcoding the domain.

**Internal helpers worth audit attention:**

1. **`_verifyAndConsumeAuth(...)` (L221–251)** — extracted from `cleanupBatch` to avoid stack-too-deep. **Encodes the entire EIP-712 invariant.** Reviewer should verify:
   - `block.timestamp > deadline` (L233) — strict `>`, so a transaction included exactly at `deadline` is still valid.
   - Nonce equality check uses `nonces[msg.sender]` (the *caller's* nonce, not the signed `user` field) — this is consistent because the signed digest at L242 binds `msg.sender` via the first encoded field, so a forwarded signature for a different user would fail the digest match. The defense is in the digest, not the nonce path.
   - `keccak256(abi.encode(tokens, amounts))` (L242) — `abi.encode`, not `encodePacked`, prevents length-shift ambiguity (`[a,b]` cannot be confused with `[ab]` because the encoded form includes lengths and offsets).
   - `ECDSA.recover` reverts on malformed signatures in OZ v5; a returned address equal to `oracleSigner` is the only success path.

2. **`_swapTokenToBNB(token, amount, from)` (L283–309)** — encapsulates the per-token swap including the failure fallback. Reviewer should verify:
   - `safeTransferFrom` then `forceApprove(router, amount)` (L285–286) — `forceApprove` resets allowance to zero first when needed (USDT-style approve-race protection).
   - `try ... catch` on `router.swapExactTokensForETH` (L295–308). On revert: `forceApprove(router, 0)` (L305) clears the approval to prevent the router from later draining the contract via a stale allowance, then `safeTransfer(landfillVault, amount)` (L306) forwards the tokens.
   - **The swap-fail fallback is the protocol's biggest user-facing UX wart.** A user whose token fails to swap loses that token to the vault but is still charged for it in the `cleanupValueUSD` total (the signature is over the entire batch). Their batch-level `minBnbOut` provides the only refund path — if the surviving swaps don't hit `minBnbOut`, the whole transaction reverts and all tokens are restored. Tracked as §10 AD-08 (severity Low–Med, pending §10 draft).
   - Per-token slippage is 0 (L297: `amountOutMin = 0`). The defense is the batch-level `totalBnbReceived < minBnbOut` check (L204), which makes `minBnbOut` user-supplied and frontend-computed. Sandwich-attack resistance therefore depends on whether the frontend tracks per-block mempool exposure. Tracked as §10 AD-09 (severity Info, design intent).

#### 4.5.7 Public State Variables (auto-getters)

**Mutable protocol wiring:**

| Variable | Type | Getter signature | Notes |
|---|---|---|---|
| `miningContract` | `ICleanupMining` | `miningContract() returns (ICleanupMining)` | Target of `recordCleanup`. Rotatable. |
| `landfillVault` | `address` | `landfillVault() returns (address)` | Sink for `sendScamToLandfill` and swap-fail fallback. |
| `oracleSigner` | `address` | `oracleSigner() returns (address)` | EIP-712 signer EOA. |

**Tuning parameters:**

| Variable | Type | Default | Getter signature |
|---|---|---|---|
| `maxTokensPerCleanup` | `uint256` | 20 | `maxTokensPerCleanup() returns (uint256)` |
| `swapDeadlineBuffer` | `uint256` | `10 minutes` | `swapDeadlineBuffer() returns (uint256)` |
| `minCleanupValueUSD` | `uint256` | `1e18` ($1, 1e18-scaled) | `minCleanupValueUSD() returns (uint256)` |

**Per-user state:**

| Variable | Type | Semantics |
|---|---|---|
| `nonces` | `mapping(address => uint256)` | Monotonic per-user counter. Auto-getter: `nonces(address) returns (uint256)`. Incremented exactly once per successful `cleanupBatch`. **Not incremented by `sendScamToLandfill`** (no signature consumed). See I-15 (§6). |

(Immutables and constants — listed in §4.5.10.)

#### 4.5.8 Custom Errors

| Error | Signature | When thrown | Thrown by |
|---|---|---|---|
| `ZeroAddress()` | `error ZeroAddress()` | Any zero-address rejection. | constructor (L140–146), `setMiningContract` (L335), `setLandfillVault` (L342), `setOracleSigner` (L349), `withdrawStuckBNB` (L383) |
| `InvalidLength()` | `error InvalidLength()` | Length mismatch or zero-length input arrays. | `cleanupBatch` (L184–185), `sendScamToLandfill` (L266–267) |
| `TooManyTokens()` | `error TooManyTokens()` | Batch exceeds `maxTokensPerCleanup`. | `cleanupBatch` (L186) |
| `BelowMinThreshold()` | `error BelowMinThreshold()` | `cleanupValueUSD < minCleanupValueUSD`. | `cleanupBatch` (L187) |
| `InsufficientBnbOut(uint256 received, uint256 minOut)` | `error InsufficientBnbOut(uint256,uint256)` | Total BNB after swaps below user-supplied `minBnbOut`. Echoes both values for caller diagnosis. | `cleanupBatch` (L204) |
| `BnbTransferFailed()` | `error BnbTransferFailed()` | Low-level `call` to send BNB returned `false`. | `cleanupBatch` (L216), `withdrawStuckBNB` (L390) |
| `InvalidMaxTokens()` | `error InvalidMaxTokens()` | `setMaxTokensPerCleanup` argument is 0 or > `MAX_TOKENS_HARD_CAP`. | `setMaxTokensPerCleanup` (L356) |
| `InvalidMinCleanupValue()` | `error InvalidMinCleanupValue()` | `setMinCleanupValueUSD` argument is 0. | `setMinCleanupValueUSD` (L363) |
| `InvalidSwapDeadlineBuffer()` | `error InvalidSwapDeadlineBuffer()` | `setSwapDeadlineBuffer` argument is 0 or > 1 day. | `setSwapDeadlineBuffer` (L370) |
| `TokenIsScam(address token)` | `error TokenIsScam(address)` | A token in the batch is flagged in ScamRegistry. Identifies the specific token for caller diagnosis. | `cleanupBatch` (L196) |
| `InvalidSignature()` | `error InvalidSignature()` | ECDSA recovery returns a signer ≠ `oracleSigner`. | `_verifyAndConsumeAuth` (L248) |
| `SignatureExpired()` | `error SignatureExpired()` | `block.timestamp > deadline`. | `_verifyAndConsumeAuth` (L233) |
| `InvalidNonce(uint256 expected, uint256 provided)` | `error InvalidNonce(uint256,uint256)` | Submitted nonce ≠ `nonces[msg.sender]`. Echoes both for caller diagnosis. | `_verifyAndConsumeAuth` (L236) |

#### 4.5.9 Events

| Event | Signature | Emitted by | Notes |
|---|---|---|---|
| `CleanupExecuted` | `(address indexed user, address[] tokens, uint256[] amounts, uint256 bnbReceived, uint256 cleanupValueUSD)` | `cleanupBatch` (L209) | Single per-batch success event. `tokens`/`amounts` are the *originally submitted* arrays — they include any that fell through to the vault (also surfaced via `SwapFallbackToLandfill`). |
| `ScamTokenSent` | `(address indexed user, address indexed token, uint256 amount)` | `sendScamToLandfill` (L271) | One per token per call. No per-call aggregate event. |
| `SwapFallbackToLandfill` | `(address indexed user, address indexed token, uint256 amount)` | `_swapTokenToBNB` catch branch (L307) | One per failed swap inside `cleanupBatch`. Off-chain indexers should cross-reference with `CleanupExecuted` to reconstruct per-token outcome. |
| `MiningContractChanged` | `(address indexed oldAddr, address indexed newAddr)` | `setMiningContract` (L338) | — |
| `LandfillVaultChanged` | `(address indexed oldAddr, address indexed newAddr)` | `setLandfillVault` (L345) | — |
| `OracleSignerChanged` | `(address indexed oldAddr, address indexed newAddr)` | `setOracleSigner` (L352) | Signer rotation. |
| `MaxTokensChanged` | `(uint256 oldMax, uint256 newMax)` | `setMaxTokensPerCleanup` (L359) | — |
| `MinCleanupValueChanged` | `(uint256 oldValue, uint256 newValue)` | `setMinCleanupValueUSD` (L366) | — |
| `SwapDeadlineBufferChanged` | `(uint256 oldBuffer, uint256 newBuffer)` | `setSwapDeadlineBuffer` (L373) | — |
| `StuckBNBWithdrawn` | `(address indexed to, uint256 amount)` | `withdrawStuckBNB` (L387) | Only emitted when `amount > 0`. Zero-balance call is a silent no-op. |

**Inherited events:**

- **AccessControl:** `RoleGranted`, `RoleRevoked`, `RoleAdminChanged`.
- **Pausable:** `Paused`, `Unpaused`.

#### 4.5.10 Immutables & Constants

**Category A — compile-time `constant`:**

| Name | Type | Value | Notes |
|---|---|---|---|
| `ADMIN_ROLE` | `bytes32` | `keccak256("ADMIN_ROLE")` | Conventional protocol role hash. |
| `PAUSER_ROLE` | `bytes32` | `keccak256("PAUSER_ROLE")` | Conventional protocol role hash. |
| `MAX_TOKENS_HARD_CAP` | `uint256` | `50` | Upper bound for `setMaxTokensPerCleanup`. Gas/DoS ceiling: even with the maximum batch size, the per-batch loops (scam pre-check + swap loop) stay within block gas at BSC's 30 M block limit by a comfortable margin. The audit firm may want to verify this via a gas-profiling fuzz against `MAX_TOKENS_HARD_CAP = 50` with adversarial-cost ERC-20 implementations. |
| `CLEANUP_AUTH_TYPEHASH` | `bytes32` | `keccak256("CleanupAuthorization(address user,bytes32 batchHash,uint256 cleanupValueUSD,uint256 nonce,uint256 deadline)")` | EIP-712 struct hash. Must match the backend signer's typehash bit-for-bit. The string literal at L85 is the authoritative form; the comment at L83 is documentation only. |

**Category B — constructor-set `immutable`:**

| Name | Type | Set at L | Bound to |
|---|---|---|---|
| `router` | `IPancakeRouter` | 148 | The PancakeRouter address on the target network. Cannot be re-pointed — a malicious or replaced router cannot be silently injected. |
| `WBNB` | `address` | 149 | Canonical WBNB on BSC. Used as the second hop in every swap path. |
| `scamRegistry` | `IScamRegistry` | 150 | The ScamRegistry deployed at Phase A.3. Cannot be re-pointed; the swap-gate dependency is sealed. |

**EIP-712 implicit immutables (from parent):**

| Name | Set at | Notes |
|---|---|---|
| `_HASHED_NAME` | parent constructor at L139 (`EIP712("GarbageCollector", "1")`) | `keccak256("GarbageCollector")` |
| `_HASHED_VERSION` | parent constructor at L139 | `keccak256("1")` |

These determine the domain separator and therefore the validity of every in-flight signature. Changing the contract name or version literal in source would invalidate all existing oracle signatures and require a backend-coordinated rotation.

**Bridge note for the auditor.** §4.5 GarbageCollector is the protocol's largest single contract surface (404 source lines, 9 logical Slither suppressions over 10 inline comment lines, 13 custom errors). Where §4.4 CleanupMining encapsulates the *math* of the reward formula, §4.5 encapsulates the *trust boundary* — the place where off-chain inputs (signatures, oracle classifications, router quotes) cross into on-chain effects. §10 will collect the design acceptances (AD-07/AD-08/AD-09) for this trust boundary.

#### 4.5.11 Receive / Fallback

```solidity
receive() external payable {}
```

**Empty `receive()` at L403.** Required because PancakeRouter's `swapExactTokensForETH` sends the swap output as native BNB via a low-level call to `address(this)`; without a `receive`, every swap would revert.

**No `fallback()` defined.** Any call with unknown selector reverts (the OZ v5 default). External CALL with non-empty calldata and a non-existent selector triggers the implicit revert; this is the correct behavior — there is no upgrade path or proxy delegation surface for this contract.

#### 4.5.12 Slither Suppressions

**Total directives on this contract: 9 logical** (1 paired-block + 8 next-line, 10 raw inline lines). Every suppression has an inline `WHY` comment and is load-bearing for an external integration constraint. Suppressions are grouped below in source order; the auditor should walk each one in context.

| Lines | Directive | Detector(s) | Rationale (verbatim from inline comments + reviewer summary) |
|---|---|---|---|
| 12–25 | `// slither-disable-start naming-convention` / `end` | `naming-convention` | Local `IPancakeRouter` interface declares `WETH()` in screaming case to mirror PancakeRouter's deployed getter name. Solidity requires interface function names to exactly match the implementation's signature for ABI compatibility — the literal `WETH()` is the on-chain selector and cannot be camelCased. Same pattern as the `MAX_MINT_PER_DAY()` interface in §4.4.2. |
| 61 | `// slither-disable-next-line naming-convention` | `naming-convention` | `WBNB` immutable uses SCREAMS_CASE for visual parity with the upstream `WETH` ticker convention on Uniswap V2-style routers. Same documented rationale as the interface above. |
| 195 | `// slither-disable-next-line calls-loop` | `calls-loop` | Scam pre-check loop calls `scamRegistry.isScamOrDrainer(tokens[i])` per token. Gas is bounded by `maxTokensPerCleanup ≤ MAX_TOKENS_HARD_CAP = 50` (§4.5.10), and the callee is the immutable `scamRegistry` whose `isScamOrDrainer` is a single-SLOAD view function (§4.2.6). Slither flags "external call in loop" for DoS concerns; the bound and the callee both rule that out. |
| 214 | `// slither-disable-next-line low-level-calls` | `low-level-calls` | `msg.sender.call{value: totalBnbReceived}("")` is the canonical low-level pattern for forwarding native BNB. `transfer`/`send` are no longer recommended (2300-gas stipend can break with EOA-as-contract recipients on BSC). `nonReentrant` covers the re-entry concern; the call value is the locally-computed `totalBnbReceived`. |
| 232 | `// slither-disable-next-line timestamp` | `timestamp` | EIP-712 deadline check (`block.timestamp > deadline`). This is the canonical signature-expiry pattern (Permit2, EIP-2612, every meta-tx framework). Slither's `timestamp` warning is a false positive for signature expiry — miner timestamp manipulation has a ~3 s blast radius on BSC, which is irrelevant against deadlines measured in minutes. |
| 294 | `// slither-disable-next-line calls-loop,unused-return` | `calls-loop`, `unused-return` | Two detectors silenced together: (1) `calls-loop` — same rationale as L195; the swap loop is gas-bounded and the callee is the immutable `router`. (2) `unused-return` — `swapExactTokensForETH` returns the per-hop amount array, but the contract intentionally measures BNB delta at the *batch level* via `address(this).balance` deltas (L199/L203) rather than summing the return arrays. This is robust against any router that under-reports its output (deflationary tokens, fee-on-transfer pairs) and avoids per-token accounting that would conflict with the batch-level `minBnbOut` invariant. |
| 381 | `// slither-disable-next-line arbitrary-send-eth` | `arbitrary-send-eth` | `withdrawStuckBNB(address to)` lets `ADMIN_ROLE` choose the recipient of a BNB sweep. Slither flags admin-chosen recipients as `arbitrary-send-eth`. False positive: the recipient is constrained to a Timelock-authored proposal post-B.5, so the "arbitrary" surface is the same as any DAO-controlled treasury sweep. The function is gated by `onlyRole(ADMIN_ROLE)` + `nonReentrant`. Tracked as §10 design acceptance for admin sweep authority. |
| 385 | `// slither-disable-next-line incorrect-equality` | `incorrect-equality` | Early-return on `amount == 0` before emitting `StuckBNBWithdrawn` — avoids a no-op event for an empty sweep. Same defensive `==` pattern as §4.3.12 LandfillVault L114. False positive for "comparison against externally-sourced value." |
| 388 | `// slither-disable-next-line low-level-calls` | `low-level-calls` | Native BNB transfer in `withdrawStuckBNB`. Same rationale as L214; `nonReentrant` plus the admin-only modifier close the re-entry surface. |

**Why `withdrawStuckBNB` is not pause-gated.** The function is admin-only and intended as a recovery tool for BNB that lands in the contract outside the normal `cleanupBatch` flow (donations, dust, future Pancake-router edge cases). If the contract is paused due to an exploit in `cleanupBatch`, the recovery path must remain open — pausing it would trap recoverable funds. The `arbitrary-send-eth` suppression therefore depends on the audit firm accepting that `ADMIN_ROLE` (= Timelock post-B.5) is trusted for this specific destination authority. AD candidate (§10), severity Info.

Cross-reference §14 for the consolidated project-wide suppression registry.

#### 4.5.13 Test Coverage Reference

| Test file | Test count | Notable coverage |
|---|---|---|
| `test/GarbageCollector.test.js` | *verified in §14* | Deployment (7-way zero-address rejection in constructor, oracleSigner stored, nonce starts at 0, `hashCleanupAuth` matches off-chain digest), happy-path `cleanupBatch` (swap → BNB to user → reward minted → nonce ++), signature semantics (non-oracle key → `InvalidSignature`, expired deadline, nonce mismatch, **replay rejection on second call**, mismatched tokens vs signed batch, sig for a different `user` vs `msg.sender`, oracle-key rotation via `setOracleSigner`), validation (length mismatch, empty arrays, `TooManyTokens`, `BelowMinThreshold`, `TokenIsScam`, `InsufficientBnbOut`), swap-failure fallback (single token → vault still completes batch; entire batch fails → 0 BNB but `recordCleanup` still fires), `sendScamToLandfill` (no reward, no nonce consumption, length checks, paused gate), pause coverage (both paths blocked), admin setters (role + zero + bound checks, event emission), `withdrawStuckBNB` (role gate, zero-address rejection, full-balance sweep). |
| `test-foundry/GarbageCollector.t.sol` | *verified in §14* | Fuzz: `testFuzz_cleanupBatchPaysExpectedBNB`, `testFuzz_invalidSignerReverts`, `testFuzz_expiredDeadlineReverts`, `testFuzz_replayBlocked`, `testFuzz_scamTokenReverts`, `testFuzz_swapFailureRoutesToLandfill`, `testFuzz_sendScamToLandfillNoReward`. Targeted: `test_pauseBlocksBothPaths`, `test_withdrawStuckBNB`. **No invariant test yet for `nonces[u]` monotonicity (I-15);** the property is implicitly tested via `testFuzz_replayBlocked` (a successful second call to the same `nonce` reverts) but lacks a dedicated `invariant_*` handler. Audit firm may flag this as a coverage gap. |

Cross-reference to §6 invariants: **I-15** (per-user nonce monotonic — added to registry; see §6).

**Coverage gap to flag for the auditor.** The Hardhat suite uses a `MockPancakeRouter` that always succeeds at a fixed 1:1 token→BNB rate and a `MockRevertingRouter` for the failure-fallback path. There is **no fork-test against the real BSC PancakeRouter** in either suite. The audit firm should consider running fork tests against PancakeRouter v2 (`0x10ED43C7…E4cD16Ce`) with a representative set of real BSC token pairs (high-liquidity, low-liquidity, fee-on-transfer, rebasing) to validate the swap path under production routing conditions. This is also where the per-token-slippage-0 design decision (AD-09 candidate, §4.5.6) gets its real-world stress test.

---

### §4.6 GuardiansTimelockController

**File:** `contracts/governance/GuardiansTimelockController.sol` (24 lines)
**Deployed:** Phase B.1 (see §3.3) — once per network, never re-deployed.
**Mutability:** Vanilla OZ `TimelockController`. The contract source contains **zero custom logic** — it is a constructor pass-through. All semantics are inherited from `@openzeppelin/contracts/governance/TimelockController.sol` (v5.1.0).

#### 4.6.1 Purpose

Holds the queueing and execution machinery for DAO proposals after Phase B.5. Every protocol contract's `DEFAULT_ADMIN_ROLE` and operational role (`MINTER`, `ADMIN`, `DAO`, `EMERGENCY`, `PAUSER`) is granted to this contract; every admin parameter change therefore enters a queue subject to the configured `minDelay` before it can be executed. The instance for this protocol is parameterised at deploy with **`minDelay = 48 hours`**.

#### 4.6.2 Inheritance (C3 linearization)

Direct parent (declaration order, `GuardiansTimelockController.sol:17`):

```
contract GuardiansTimelockController is TimelockController
```

**Why direct-parent listing is sufficient.** Single inheritance, no diamond shape. `TimelockController` in OZ v5.1.0 inherits from `AccessControl` and `IERC721Receiver` / `IERC1155Receiver` (the latter two to accept NFTs queued through governance proposals, irrelevant to this protocol). No overrides, no `super` calls — the child contract adds nothing.

**OZ v5.1.0-specific notes:**
- `TimelockController` exposes four roles: `DEFAULT_ADMIN_ROLE` (held by `admin` constructor arg), `PROPOSER_ROLE`, `EXECUTOR_ROLE`, `CANCELLER_ROLE`. The Governor is granted `PROPOSER` and `CANCELLER` at Phase B.3/B.4; `EXECUTOR_ROLE` is held by `address(0)` at deploy (open execution).
- Standard v5 custom errors: `TimelockUnauthorizedCaller`, `TimelockInsufficientDelay`, `TimelockInvalidOperationLength`, `TimelockUnexpectedOperationState`, `TimelockUnexecutedPredecessor`.

#### 4.6.3 Constructor

```solidity
constructor(
    uint256 minDelay,
    address[] memory proposers,
    address[] memory executors,
    address admin
) TimelockController(minDelay, proposers, executors, admin) {}
```

**Body is empty.** All initialisation happens in the OZ `TimelockController` constructor, which:

1. Sets `_minDelay = minDelay`.
2. Grants `DEFAULT_ADMIN_ROLE` to `admin` (the deployer at Phase B.1; renounced at Phase B.6).
3. Grants `PROPOSER_ROLE` and `CANCELLER_ROLE` to each address in `proposers` (empty array at Phase B.1 — Governor is granted these roles separately at Phase B.3/B.4 via `grantRole`).
4. Grants `EXECUTOR_ROLE` to each address in `executors` (`[address(0)]` at Phase B.1 — open execution, see §4.6.4 below).

**Deploy-time values (per `scripts/deployGovernance.js` and §3.3 B.1):**

| Constructor arg | Value | Notes |
|---|---|---|
| `minDelay` | `48 hours` (172,800 seconds) | The DAO's minimum review window. Cannot be reduced without a self-proposal that itself passes the 48 h delay. |
| `proposers` | `[]` | Empty at deploy; Governor granted `PROPOSER_ROLE` at Phase B.3. |
| `executors` | `[address(0)]` | Open execution — anyone can call `execute(...)` on a queued operation once its delay has elapsed. See §4.6.4. |
| `admin` | deployer EOA | Temporary; renounced at Phase B.6 (`renounceRole(DEFAULT_ADMIN_ROLE, deployer)` called on the Timelock itself). |

#### 4.6.4 Roles

| Role constant | Hash | Granted at deploy to | Steady-state holder | Renounce / transfer event | Can call |
|---|---|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00…00` | deployer (Phase B.1) | **nobody** (renounced at Phase B.6) | `renounceRole` self-call at Phase B.6 — the load-bearing final lock; after this, parameter changes on the Timelock itself (e.g., `updateDelay`) require a Timelock proposal targeting itself with the 48 h delay | role management |
| `PROPOSER_ROLE` | `keccak256("PROPOSER_ROLE")` | none (empty array at deploy) | Governor | Granted to Governor at Phase B.3 (`grantRole(PROPOSER_ROLE, governor)` called by deployer-admin) | `schedule(...)`, `scheduleBatch(...)`, `cancel(...)` (overlapping with CANCELLER) |
| `CANCELLER_ROLE` | `keccak256("CANCELLER_ROLE")` | none (empty array at deploy — OZ v5 also grants this implicitly to anyone in the `proposers` array) | Governor | Granted to Governor at Phase B.4 | `cancel(bytes32 id)` |
| `EXECUTOR_ROLE` | `keccak256("EXECUTOR_ROLE")` | `address(0)` (Phase B.1 — open execution) | `address(0)` (anyone) | Not transferred | `execute(...)`, `executeBatch(...)` after the delay window |

**Open executor — design acceptance (AD candidate).** `executors = [address(0)]` means OZ's `TimelockController` skips the `onlyRoleOrOpenRole(EXECUTOR_ROLE)` gate on `execute*` (the v5 helper short-circuits when `hasRole(role, address(0)) == true`). Practical effect: once a proposal has been queued by the Governor and its 48 h delay has elapsed, **anyone** can pay the gas to execute it. This is the canonical OZ-recommended setup for public DAOs — it removes liveness dependence on a designated relayer. The audit firm should confirm that this is the intent. Tracked as §10 AD-10 (severity Info — by design, awaiting user ack).

#### 4.6.5 Modifiers

The child contract defines none. Inherited from OZ `TimelockController`:

| Modifier | Source | Effect |
|---|---|---|
| `onlyRole(<ROLE>)` | `AccessControl` (inherited) | `AccessControlUnauthorizedAccount`. |
| `onlyRoleOrOpenRole(EXECUTOR_ROLE)` | OZ `TimelockController` internal helper | Short-circuits when `hasRole(EXECUTOR_ROLE, address(0))` — the open-execution path. |

#### 4.6.6 External / Public Functions

The child contract defines none. Full external surface inherited verbatim from OZ `TimelockController` v5.1.0:

- **Operation lifecycle:** `schedule`, `scheduleBatch`, `cancel`, `execute`, `executeBatch`, `updateDelay`.
- **Operation queries:** `isOperation`, `isOperationPending`, `isOperationReady`, `isOperationDone`, `getTimestamp`, `getMinDelay`, `hashOperation`, `hashOperationBatch`.
- **AccessControl surface:** `hasRole`, `getRoleAdmin`, `grantRole`, `revokeRole`, `renounceRole`, `supportsInterface`.

The audit firm should treat the v5.1.0 `TimelockController` as its own audit subject — it is the canonical OZ contract and has been independently audited multiple times. The protocol-specific question is **only** the constructor parameterisation (§4.6.3) and the role wiring at Phase B.3–B.6.

#### 4.6.7 Public State Variables (auto-getters)

The child contract defines none. Inherited from OZ `TimelockController`:

| Variable | Type | Getter | Notes |
|---|---|---|---|
| `_minDelay` | `uint256` (private) | `getMinDelay()` | Returns the configured 48 h. |
| `_timestamps` | `mapping(bytes32 => uint256)` (private) | `getTimestamp(bytes32)` | Per-operation ready-time. |

#### 4.6.8 Custom Errors

The child contract defines none. Inherited from OZ `TimelockController`: `TimelockUnauthorizedCaller`, `TimelockInsufficientDelay`, `TimelockInvalidOperationLength`, `TimelockUnexpectedOperationState`, `TimelockUnexecutedPredecessor`.

#### 4.6.9 Events

The child contract defines none. Inherited: `CallScheduled`, `CallExecuted`, `CallSalt`, `Cancelled`, `MinDelayChange`, plus AccessControl's `RoleGranted` / `RoleRevoked` / `RoleAdminChanged`.

#### 4.6.10 Immutables & Constants

The child contract defines none. The OZ `TimelockController` storage layout is fully mutable — `_minDelay` is updatable via `updateDelay` (self-call, requires a queued proposal). No `immutable` slots.

#### 4.6.11 Receive / Fallback

OZ `TimelockController` defines `receive() external payable {}` to accept BNB for proposals that send native value (e.g., a treasury withdrawal proposal). The child contract does not override.

#### 4.6.12 Slither Suppressions

**Total directives on this contract: 0.** The child has no logic; the parent (OZ `TimelockController` v5.1.0) carries the canonical audited Slither profile.

#### 4.6.13 Test Coverage Reference

| Test file | Test count | Notable coverage |
|---|---|---|
| `test/Governance.test.js` | *verified in §14* | Shared with §4.7 Governor. Deployment: Timelock 48 h min delay assertion; Governor wired with `PROPOSER + CANCELLER` roles on Timelock; **`address(0)` holds `EXECUTOR_ROLE` (open execution test)**. Lifecycle: full propose → vote → queue → execute path against the token (grants `MINTER_ROLE` via Timelock). Negative paths: cannot execute before voting period ends; cannot execute before Timelock min delay elapses. Phase B.5/B.6: post-transfer + renounce, deployer can no longer grant roles directly. |
| `test-foundry/Governance.t.sol` | *verified in §14* | Shared with §4.7. `test_executorIsTimelock` confirms Governor's `_executor()` returns the Timelock address (i.e., proposals execute as the Timelock, which is what holds the operational roles). |

No invariants exclusive to this contract — Timelock semantics are exercised by §4.7 Governor flows.

---

### §4.7 GuardiansGovernor

**File:** `contracts/governance/GuardiansGovernor.sol` (151 lines)
**Deployed:** Phase B.2 (see §3.3) — once per network, never re-deployed.
**Mutability:** Module composition over OZ Governor v5.1.0. The contract defines **zero custom state** and **zero custom logic**; every public function is either a constructor pass-through, a parameter-getter, or a required Solidity override that delegates to `super`.

#### 4.7.1 Purpose

DAO proposal entry point. Reads voting power from GuardiansToken's `ERC20Votes` extension (§4.1.2) and queues passed proposals through the Timelock (§4.6). The composition pins four governance parameters — `votingDelay`, `votingPeriod`, `proposalThreshold`, `quorum` — at deploy via OZ `GovernorSettings` and `GovernorVotesQuorumFraction`. Changing any of them post-deploy requires a self-proposal that itself clears the 48 h Timelock window.

#### 4.7.2 Inheritance (C3 linearization)

Direct parents (declaration order, `GuardiansGovernor.sol:28–35`):

```
contract GuardiansGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
```

**Why direct-parent listing is sufficient (with one caveat).** This is the only contract in the protocol with **non-trivial C3 linearization** — six OZ modules contributing overlapping `votingDelay`, `votingPeriod`, `proposalThreshold`, `quorum`, `state`, `_executor`, `_queueOperations`, `_executeOperations`, `_cancel`, and `proposalNeedsQueuing`. Solidity v0.8.24 requires explicit `override(Base1, Base2)` on each conflicting function — these are the nine override blocks at L52–L150. Each is a `super.X(...)` delegation; the C3 order matters because `super` resolves to "the next parent in linearization order that defines `X`."

**OZ v5.1.0-specific notes:**

- Modules used: `Governor` (core), `GovernorSettings` (parameterised delay/period/threshold), `GovernorCountingSimple` (for/against/abstain), `GovernorVotes` (vote source = ERC20Votes), `GovernorVotesQuorumFraction` (percentage quorum), `GovernorTimelockControl` (Timelock integration). This is the canonical OZ "DAO with Timelock" template.
- `Governor.clock()` follows `IVotes.clock()` on the token. `GuardiansToken` uses the OZ v5 default (`block.number` — see §4.1.2), so all four parameters (`votingDelay`, `votingPeriod`, snapshot at proposal-start, queue-ready timestamp) are denominated in **blocks**, not seconds. The implementation comment at L25–26 is the authoritative note. See §4.7.10 for the BSC block-time assumption.
- Required overrides: 9 in total. Each is a trivial `super.X(...)` pass-through.

#### 4.7.3 Constructor

```solidity
constructor(IVotes _token, TimelockController _timelock)
    Governor("GuardiansGovernor")
    GovernorSettings(28_800, 201_600, 100_000 * 10 ** 18)
    GovernorVotes(_token)
    GovernorVotesQuorumFraction(4)
    GovernorTimelockControl(_timelock)
{}
```

**Body is empty.** All initialisation happens in the parent constructors:

| Parent constructor | Argument(s) | Effect |
|---|---|---|
| `Governor("GuardiansGovernor")` | `name = "GuardiansGovernor"` | EIP-712 domain separator for vote signatures uses this name. Auditor: confirm the off-chain UI signs against the same string. |
| `GovernorSettings(28_800, 201_600, 100_000 * 10**18)` | `votingDelay = 28,800` blocks, `votingPeriod = 201,600` blocks, `proposalThreshold = 100,000e18` | See §4.7.10 for the BSC-3s-block conversion. |
| `GovernorVotes(_token)` | The deployed GuardiansToken address (cast to `IVotes`) | Pins the vote source. Cannot be changed without redeploying. |
| `GovernorVotesQuorumFraction(4)` | `numerator = 4`, denominator defaults to 100 → 4% | Quorum = 4% of total `getPastTotalSupply()` at proposal-start block. |
| `GovernorTimelockControl(_timelock)` | The deployed Timelock address | Pins execution surface. Cannot be changed without redeploying. |

**`_token` and `_timelock` are not stored as `immutable` by the child** — they are read into private storage by their respective parent modules (`GovernorVotes._token`, `GovernorTimelockControl._timelock`). Both have public getters: `token()` and `timelock()`.

#### 4.7.4 Roles

**The Governor contract is roleless.** OZ `Governor` does not inherit `AccessControl` — there are no `bytes32 public constant *_ROLE` declarations. Authorisation for `propose()` is by *delegated voting power* (must hold ≥ `proposalThreshold` at the proposal-snapshot block); authorisation for `castVote*` is by *any token holder with non-zero past votes*; authorisation for `queue()` and `execute()` are gated by the proposal state machine plus the Timelock's own role checks.

| Capability | Authorisation | Notes |
|---|---|---|
| `propose(...)` | `getVotes(proposer, t) ≥ proposalThreshold` at `t = clock() - 1` | 100k GOTT delegated to the proposer at the block immediately before the propose tx. |
| `castVote*(...)` | any holder with `getPastVotes(voter, snapshot) > 0` | Snapshot = proposal-start block. Vote weight equals delegated balance at snapshot. |
| `queue(...)` | proposal state == `Succeeded` (passed + quorum reached) + Governor holds `PROPOSER_ROLE` on Timelock | The Governor's role on the Timelock — granted at Phase B.3 — is the load-bearing wiring. |
| `execute(...)` | proposal state == `Queued` + Timelock delay elapsed + Timelock `EXECUTOR_ROLE` open (held by `address(0)`) | The 48 h delay is enforced by the Timelock, not the Governor. |
| `cancel(...)` | proposer cancels before voting starts (`Pending` state) OR Governor holds `CANCELLER_ROLE` on Timelock for queued proposals | Granted at Phase B.4. |

#### 4.7.5 Modifiers

The child defines none. Inherited modifier surface from OZ `Governor` is internal-only (`onlyGovernance` for self-calls during execution); no `external` function uses an external modifier directly. State checks are inline.

#### 4.7.6 External / Public Functions

Vast majority inherited from `Governor` and modules. The child contract redeclares **nine overrides** that delegate to `super`:

| Function | Override target(s) | Body | Purpose |
|---|---|---|---|
| `votingDelay()` | `Governor`, `GovernorSettings` | `return super.votingDelay();` | Returns the configured 28,800. |
| `votingPeriod()` | `Governor`, `GovernorSettings` | `return super.votingPeriod();` | Returns the configured 201,600. |
| `proposalThreshold()` | `Governor`, `GovernorSettings` | `return super.proposalThreshold();` | Returns the configured 100,000e18. |
| `quorum(uint256 timepoint)` | `Governor`, `GovernorVotesQuorumFraction` | `return super.quorum(timepoint);` | Returns `4 * pastTotalSupply / 100`. |
| `state(uint256 proposalId)` | `Governor`, `GovernorTimelockControl` | `return super.state(proposalId);` | Adds `Queued` / `Executed` states from Timelock module. |
| `proposalNeedsQueuing(uint256)` | `Governor`, `GovernorTimelockControl` | `return super.proposalNeedsQueuing(proposalId);` | Always `true` for this Governor (every passed proposal queues). |
| `_queueOperations(...)` | `Governor`, `GovernorTimelockControl` | `return super._queueOperations(...);` | Routes to Timelock `scheduleBatch`. Internal. |
| `_executeOperations(...)` | `Governor`, `GovernorTimelockControl` | `super._executeOperations(...);` | Routes to Timelock `executeBatch`. Internal. |
| `_cancel(...)` | `Governor`, `GovernorTimelockControl` | `return super._cancel(...);` | Cancels queued op in Timelock. Internal. |
| `_executor()` | `Governor`, `GovernorTimelockControl` | `return super._executor();` | Returns the Timelock address — proposals execute as the Timelock. **Load-bearing for role wiring.** |

**Inherited public surface (high-level summary):**

- **Proposal lifecycle:** `propose`, `queue` (two overloads), `execute` (two overloads), `cancel` (two overloads).
- **Voting:** `castVote`, `castVoteWithReason`, `castVoteWithReasonAndParams`, `castVoteBySig`, `castVoteWithReasonAndParamsBySig`.
- **Reads:** `name`, `version`, `clock`, `CLOCK_MODE`, `COUNTING_MODE`, `hasVoted`, `proposalVotes`, `proposalDeadline`, `proposalSnapshot`, `proposalEta`, `proposalProposer`, `getVotes`, `getVotesWithParams`, `hashProposal`, `state`, `proposalThreshold`, `votingDelay`, `votingPeriod`, `quorum`, `token`, `timelock`, `quorumNumerator`, `quorumDenominator`.
- **EIP-712:** `eip712Domain` (for vote signature off-chain reconstruction).

**Internal helpers worth audit attention:** none. All internal helpers are inherited OZ logic; the only child overrides are the nine `super` pass-throughs above.

#### 4.7.7 Public State Variables (auto-getters)

The child contract defines none. Storage layout is fully managed by the OZ parent modules.

#### 4.7.8 Custom Errors

The child contract defines none. Inherited from OZ Governor modules: `GovernorAlreadyCastVote`, `GovernorAlreadyQueuedProposal`, `GovernorDisabledDeposit`, `GovernorInsufficientProposerVotes`, `GovernorInvalidProposalLength`, `GovernorInvalidQuorumFraction`, `GovernorInvalidSignature`, `GovernorInvalidVoteType`, `GovernorNonexistentProposal`, `GovernorNotQueuedProposal`, `GovernorOnlyExecutor`, `GovernorOnlyProposer`, `GovernorQueueNotImplemented`, `GovernorRestrictedProposer`, `GovernorUnexpectedProposalState`, plus AccessControl errors transitively reachable when interacting with the Timelock.

#### 4.7.9 Events

The child contract defines none. Inherited: `ProposalCreated`, `ProposalCanceled`, `ProposalExecuted`, `ProposalQueued`, `VoteCast`, `VoteCastWithParams`, `QuorumNumeratorUpdated`, `TimelockChange`, `VotingDelaySet`, `VotingPeriodSet`, `ProposalThresholdSet`.

#### 4.7.10 Immutables & Constants

**No `immutable` or `constant` declarations in the child.** The four governance parameters are stored in `GovernorSettings`'s internal mutable slots (changeable only via self-proposal):

| Parameter | Value at deploy | OZ storage slot | Mutable via |
|---|---|---|---|
| `votingDelay` | 28,800 blocks | `GovernorSettings._votingDelay` | `setVotingDelay(uint48)` — `onlyGovernance` |
| `votingPeriod` | 201,600 blocks | `GovernorSettings._votingPeriod` | `setVotingPeriod(uint32)` — `onlyGovernance` |
| `proposalThreshold` | 100,000 × 10¹⁸ | `GovernorSettings._proposalThreshold` | `setProposalThreshold(uint256)` — `onlyGovernance` |
| `quorumNumerator` | 4 | `GovernorVotesQuorumFraction._quorumNumeratorHistory` (Checkpoints) | `updateQuorumNumerator(uint256)` — `onlyGovernance` |

`onlyGovernance` is the OZ self-call gate: each setter can only be invoked by the Governor itself via a proposal that the Timelock executes — i.e., changing a governance parameter is a normal DAO proposal subject to the full 48 h delay.

**BSC block-time assumption note.** All four time-domain parameters (`votingDelay`, `votingPeriod`) are denominated in *blocks* because the token's clock is `block.number`. The deploy constants (28,800 ≈ 1 day, 201,600 ≈ 7 days) assume **BSC's nominal 3-second block time**. BSC block time has been observed to fluctuate (≈2.5–4 s during congestion events on historical chain stats), so the effective wall-clock voting window varies by approximately the same proportion. This is an explicit acceptance — the alternative (timestamp-based clock via ERC-6372) would require GuardiansToken to override its clock mode, and the BSC fluctuation is bounded enough that a 7-day window can shift by hours but not days. Auditor may flag this as an Info-level note for the §10 design acceptances.

#### 4.7.11 Receive / Fallback

OZ `Governor` defines `receive() external payable virtual` that reverts unless the call is `_executor()` (i.e., the Timelock during a proposal that returns BNB). The child does not override. Effect: random BNB sends to the Governor revert; only the Timelock can route BNB through it as part of a proposal flow.

#### 4.7.12 Slither Suppressions

**Total directives on this contract: 0.** The child has no logic and adds no Slither-flagged patterns. The OZ Governor module composition has been independently audited.

#### 4.7.13 Test Coverage Reference

| Test file | Test count | Notable coverage |
|---|---|---|
| `test/Governance.test.js` | *verified in §14* | Settings parity check: `votingDelay == 28800`, `votingPeriod == 201600`, `proposalThreshold == 100k * 1e18`, quorum numerator = 4. Wiring: Governor's `token()` and `timelock()` return the deployed addresses. **Proposal threshold:** rejects proposer with delegated GOTT below threshold; accepts at threshold. **Full lifecycle:** propose → wait `votingDelay` → vote → wait `votingPeriod` → queue → wait Timelock min delay → execute (grants `MINTER_ROLE` on the token as the canonical end-to-end DAO action). **State gates:** cannot vote in `Pending`; cannot execute in `Active`; cannot execute before Timelock min delay. **Quorum:** 4% reflects total supply at snapshot; defeats proposals below quorum. **Cancel:** proposer can cancel in `Pending`. |
| `test-foundry/Governance.t.sol` | *verified in §14* | Fuzz: `testFuzz_quorumIsExact4PercentOfPastSupply` (asserts `quorum() == 4 * pastSupply / 100` across a wide mint range), `testFuzz_proposeRevertsBelowThreshold`, `testFuzz_proposeAcceptsAtOrAboveThreshold`. Targeted: `test_governorSettings`, `test_executorIsTimelock` (asserts `_executor()` returns Timelock — load-bearing for role wiring). |

**Coverage gap to flag for the auditor.** No test exercises a **parameter-change proposal** end-to-end (e.g., a proposal that calls `setVotingPeriod` or `updateQuorumNumerator` on the Governor itself, queued through the Timelock, executed, and the new value read back). The mechanism is OZ-canonical and well-audited, but a one-shot smoke test of the self-governance path would strengthen the audit story. Not blocking — flag in §14.

---

## §5 Role Matrix

This section consolidates the per-contract role tables in §4.X.4 into a single matrix covering every `AccessControl` role declared across the protocol. The intent is to give the auditor a one-page view of the authority graph: which key holds what, at deploy vs. steady-state, and where in the source the transition happens.

### 5.1 Lifecycle convention

Every role on every protocol contract follows the same lifecycle:

1. **Phase A (deploy)** — granted to the deployer EOA in the constructor, or granted post-deploy to a sibling contract address (the two contract-bound roles: `CLEANUP_MINER_ROLE` on the token, `COLLECTOR_ROLE` on mining).
2. **Phase B.5 (cutover)** — `scripts/transferAdminRoles.js` grants every deployer-held admin/operational role to the Timelock, then revokes it from the deployer. The two contract-bound roles are deliberately skipped at this step (the contract address remains the role holder).
3. **Phase B.6 (final lock)** — deployer renounces `DEFAULT_ADMIN_ROLE` on the Timelock itself. After this, every parameter change requires a Governor proposal subject to the full 48 h Timelock delay.

The protocol has **no role that is granted to an externally-owned account in steady-state**, with one explicit exception: `ORACLE_ROLE` on ScamRegistry, held by the off-chain Guardians-oracle key (rotatable via DAO). See §9 for the trust analysis of this exception.

### 5.2 The matrix

| Contract | Role | Hash | Granted at deploy to | Steady-state holder (post-B.5) | Capabilities | Phase B.5 transfer ref |
|---|---|---|---|---|---|---|
| GuardiansToken | `DEFAULT_ADMIN_ROLE` | `0x00…00` | deployer (A.1) | Timelock | role management | `scripts/transferAdminRoles.js:28` |
| GuardiansToken | `MINTER_ROLE` | `keccak256("MINTER_ROLE")` | deployer (A.1) | Timelock | `mint(address,uint256)` (TGE + treasury) | `scripts/transferAdminRoles.js:28` |
| GuardiansToken | `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (A.1) | Timelock | `pause()`, `unpause()` | `scripts/transferAdminRoles.js:28` |
| GuardiansToken | `CLEANUP_MINER_ROLE` | `keccak256("CLEANUP_MINER_ROLE")` | — (not at deploy) | **CleanupMining contract** | `mintReward(address,uint256)` (subject to `MAX_MINT_PER_DAY` + `MAX_SUPPLY`) | granted at Phase A.7, **intentionally skipped** at B.5 — see note below the table |
| ScamRegistry | `DEFAULT_ADMIN_ROLE` | `0x00…00` | deployer (A.3) | Timelock | role management | `scripts/transferAdminRoles.js:29` |
| ScamRegistry | `ORACLE_ROLE` | `keccak256("ORACLE_ROLE")` | deployer (A.3, transitional) | **Off-chain Guardians-oracle EOA** (rotated post-A.3 via DAO proposal) | `setStatus(address,TokenStatus)`, `setStatusBatch(...)` | not in `transferAdminRoles.js` — rotated separately to the oracle key |
| ScamRegistry | `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (A.3) | Timelock | `pause()`, `unpause()` | `scripts/transferAdminRoles.js:29` |
| LandfillVault | `DEFAULT_ADMIN_ROLE` | `0x00…00` | deployer (A.4) | Timelock | role management | `scripts/transferAdminRoles.js:30` |
| LandfillVault | `DAO_ROLE` | `keccak256("DAO_ROLE")` | deployer (A.4, via `dao` constructor arg) | Timelock | `burnToken(...)`, `transferToken(...)` (`whenNotPaused + nonReentrant`) | `scripts/transferAdminRoles.js:30` |
| LandfillVault | `EMERGENCY_ROLE` | `keccak256("EMERGENCY_ROLE")` | deployer (A.4) | Timelock (per current deploy; author's intent = separate multisig — AD-04) | `emergencyWithdraw(...)` — **bypasses pause** | `scripts/transferAdminRoles.js:30` |
| LandfillVault | `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (A.4) | Timelock | `pause()`, `unpause()` | `scripts/transferAdminRoles.js:30` |
| CleanupMining | `DEFAULT_ADMIN_ROLE` | `0x00…00` | deployer (A.5) | Timelock | role management | `scripts/transferAdminRoles.js:31` |
| CleanupMining | `ADMIN_ROLE` | `keccak256("ADMIN_ROLE")` | deployer (A.5) | Timelock | `setBaseRate(uint256)`, `setTierThresholds(uint256,uint256)` | `scripts/transferAdminRoles.js:31` |
| CleanupMining | `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (A.5) | Timelock | `pause()`, `unpause()` | `scripts/transferAdminRoles.js:31` |
| CleanupMining | `COLLECTOR_ROLE` | `keccak256("COLLECTOR_ROLE")` | — (not at deploy) | **GarbageCollector contract** | `recordCleanup(address,uint256,uint256)` | granted at Phase A.8, **intentionally skipped** at B.5 — see note below the table |
| GarbageCollector | `DEFAULT_ADMIN_ROLE` | `0x00…00` | deployer (A.6) | Timelock | role management | `scripts/transferAdminRoles.js:32` |
| GarbageCollector | `ADMIN_ROLE` | `keccak256("ADMIN_ROLE")` | deployer (A.6) | Timelock | `setMiningContract`, `setLandfillVault`, `setOracleSigner`, `setMaxTokensPerCleanup`, `setMinCleanupValueUSD`, `setSwapDeadlineBuffer`, `withdrawStuckBNB` | `scripts/transferAdminRoles.js:32` |
| GarbageCollector | `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | deployer (A.6) | Timelock | `pause()`, `unpause()` | `scripts/transferAdminRoles.js:32` |
| GuardiansTimelockController | `DEFAULT_ADMIN_ROLE` | `0x00…00` | deployer (B.1, temporary) | **nobody — renounced at Phase B.6** | role management | `renounceRole` self-call at B.6 — the final lock |
| GuardiansTimelockController | `PROPOSER_ROLE` | `keccak256("PROPOSER_ROLE")` | — (empty array at B.1) | Governor | `schedule(...)`, `scheduleBatch(...)`, `cancel(...)` | granted at Phase B.3 (`grantRole` by deployer-admin) |
| GuardiansTimelockController | `CANCELLER_ROLE` | `keccak256("CANCELLER_ROLE")` | — (empty array at B.1) | Governor | `cancel(bytes32 id)` | granted at Phase B.4 |
| GuardiansTimelockController | `EXECUTOR_ROLE` | `keccak256("EXECUTOR_ROLE")` | `address(0)` (B.1, open execution) | `address(0)` — anyone | `execute(...)`, `executeBatch(...)` post-delay | not transferred — AD-10 |
| GuardiansGovernor | — | — | — | — | (roleless contract — authorization is by delegated voting power, not by `AccessControl`) | — |

### 5.3 Notes on the matrix

**1. Two roles intentionally skipped at Phase B.5.**

`CLEANUP_MINER_ROLE` (on GuardiansToken) and `COLLECTOR_ROLE` (on CleanupMining) are the only roles **not transferred to the Timelock** at the B.5 cutover. Both are deliberately bound to a sibling *contract address*, not an EOA:

- `CLEANUP_MINER_ROLE` is held by the deployed `CleanupMining` contract — granted in Phase A.7 so that `recordCleanup` can ultimately mint GOTT to the user via `gott.mintReward`.
- `COLLECTOR_ROLE` is held by the deployed `GarbageCollector` contract — granted in Phase A.8 so that `cleanupBatch` can forward reward bookkeeping to `recordCleanup`.

Both are still **revocable** by `DEFAULT_ADMIN_ROLE` (= Timelock post-B.5) via a standard `revokeRole(...)` DAO proposal — the proposal would be the natural path for swapping in a replacement `CleanupMining` or `GarbageCollector` contract. See the author's inline note at `scripts/transferAdminRoles.js:15-16`.

**2. The two "hot key" surfaces in steady-state.**

After the B.6 final lock, only two keys remain *operationally hot* (i.e., needed for routine protocol operations rather than admin parameter changes):

| Key | Surface | Role granted | Compromise blast radius | Mitigation |
|---|---|---|---|---|
| `ORACLE_ROLE` keeper (off-chain backend EOA) | ScamRegistry | `ORACLE_ROLE` | False-positive: DoS on GarbageCollector swap-gate for mis-flagged tokens. False-negative: a malicious token slips past the gate, but ReentrancyGuard / CEI / swap-fail fallback still bound user loss to the swap output. | DAO can `revokeRole(ORACLE_ROLE, compromisedKey)` then `grantRole(ORACLE_ROLE, newKey)` via Timelock proposal (48 h delay). |
| `oracleSigner` (off-chain EIP-712 signer EOA) | GarbageCollector | **none** (not a role — plain `address` in storage) | Forged `cleanupValueUSD` → unlimited reward mint up to per-day cap (`MAX_MINT_PER_DAY = 1.4M GOTT`). | DAO calls `setOracleSigner(newSigner)` (48 h Timelock delay). Per-user nonce + deadline bound any pre-rotation forgeries. — AD-07 |

Both keys are rotatable through governance with no contract redeploy required. The 48 h Timelock delay means the maximum incident response window is one day for detection + one day for proposal queue, which is the load-bearing assumption for AD-07.

**3. Pause-window asymmetry.**

`EMERGENCY_ROLE` exists on **only one** protocol contract: LandfillVault. It permits `emergencyWithdraw` to bypass pause, providing a fast circuit-breaker for vault drainage. The other contracts (GuardiansToken, ScamRegistry, CleanupMining, GarbageCollector) have no equivalent — their fastest pause path is `PAUSER_ROLE` held by the Timelock, which is subject to the full 48 h queue delay post-B.5. See §4.2.4, §4.4.4, §4.5.4 for the contract-specific acceptances of this latency.

**4. The Governor is roleless by design.**

Authorization on the Governor is by *delegated voting weight* (for `propose`) and *snapshot vote balance* (for `castVote*`), not by an `AccessControl` registry. The single OZ-internal `onlyGovernance` modifier governs self-calls during proposal execution (used by `setVotingDelay`, `setVotingPeriod`, etc.) — this is enforced by checking that the caller is the Timelock-executed proposal context, not by a role mapping. See `docs/INTERNAL_REVIEW.md` §4.7.4 for the breakdown by capability.

### 5.4 Cross-references

- Source for the matrix rows: §4.1.4 (GuardiansToken), §4.2.4 (ScamRegistry), §4.3.4 (LandfillVault), §4.4.4 (CleanupMining), §4.5.4 (GarbageCollector), §4.6.4 (Timelock), §4.7.4 (Governor — roleless).
- Source for the transfer script: `scripts/transferAdminRoles.js`. Idempotent; tested in `test/RoleTransfer.test.js` (12 tests).
- Source for Phase A/B/C lifecycle: §3.3.

---

## §7 External Call Graph

### §7.1 Scope and Reading Guide

This section maps **external calls** in the protocol — every call that crosses a contract boundary, plus every native BNB movement. Internal helper calls (`_setStatus`, `_verifyAndConsumeAuth`, `_swapTokenToBNB`) are listed only where they encapsulate a security-relevant transition. Pure / view reads are excluded unless they gate a write path (e.g., `ScamRegistry.isScamOrDrainer` is included because it gates `cleanupBatch`).

Calls are categorised into six classes, used as a colour-key in the diagrams below:

| Class | Description | Example |
|---|---|---|
| **1. User-initiated** | An EOA calls a public function on a protocol contract. | `User → GarbageCollector.cleanupBatch(...)` |
| **2. Protocol-internal** | One protocol contract calls another. | `GarbageCollector → CleanupMining.recordCleanup(...)` |
| **3. Governance / admin** | The Timelock (post-B.5) calls an admin function on a protocol contract. | `Timelock → ScamRegistry.grantRole(ORACLE_ROLE, ...)` |
| **4. External protocol** | A protocol contract calls an out-of-scope deployed contract. | `GarbageCollector → PancakeRouter.swapExactTokensForETH(...)` |
| **5. Token transfer** | An ERC-20 transfer or approval call. | `GarbageCollector → IERC20(token).safeTransferFrom(user, gc, amount)` |
| **6. Native BNB** | A native-value call (low-level `call{value:}`) or `receive()` invocation. | `GarbageCollector → msg.sender.call{value: totalBnbReceived}("")` |

Every arrow in §7.2–§7.8 carries a category tag. The consolidated inventory in §7.9 is sortable by category.

### §7.2 High-Level Call Graph

**Cleanup engine (user-initiated path):**

```
                                              ┌────────────────────────┐
                                              │ Off-chain oracleSigner │
                                              │      (HSM EOA)         │
                                              └───────────┬────────────┘
                                                          │ EIP-712 sig
                                                          │ (CleanupAuthorization)
                                                          ▼
   ┌────────┐  (1) cleanupBatch(...)     ┌──────────────────────────┐
   │  User  │ ──────────────────────────▶│    GarbageCollector       │
   │  EOA   │                            │  (cleanup orchestrator)   │
   └────────┘                            └──────────┬───────────────┘
       ▲                                            │
       │                              (2) isScamOrDrainer (view, gates write)
       │                                  ┌─────────▼─────────┐
       │                                  │   ScamRegistry    │
       │                                  └───────────────────┘
       │                                            │
       │                              (3) safeTransferFrom(user, gc, amt)
       │                                  ┌─────────▼─────────┐
       │                                  │ User ERC-20 token │
       │                                  └─────────┬─────────┘
       │                                            │
       │                                  (4) forceApprove(router, amt)
       │                                            ▼
       │                                  ┌────────────────────────┐
       │     (5b) BNB delta on success    │  PancakeRouter v2      │
       │ ◀───────────────────────────     │  (immutable)            │
       │     (via receive())              │  swapExactTokensForETH  │
       │                                  └────────┬───────────────┘
       │                                  success  │      revert (catch)
       │                                           ▼      ▼
       │                       BNB lands in GC    [GC]   (5c) safeTransfer
       │                       via receive()              to landfillVault
       │                                                  ┌──────────────────┐
       │                                                  │  LandfillVault    │
       │                                                  └──────────────────┘
       │
       │             (6) recordCleanup      ┌────────────────────┐
       │ ──────────────────────────────────▶│   CleanupMining    │
       │                                    │ (COLLECTOR_ROLE)   │
       │                                    └─────────┬──────────┘
       │                                              │
       │                              (7) mintReward(user, reward)
       │                                              ▼
       │                                    ┌────────────────────┐
       │                                    │  GuardiansToken    │
       │                                    │  (MAX_MINT_PER_DAY │
       │                                    │   + MAX_SUPPLY)    │
       │                                    └────────────────────┘
       │
       │ (8) msg.sender.call{value: totalBnbReceived}("")  ← CEI tail
       │ ◀───────────────────────────────────────────────
```

**Explicit landfill path (no oracle, no reward):**

```
   ┌────────┐   sendScamToLandfill(tokens, amounts)   ┌────────────────────┐
   │  User  │ ───────────────────────────────────────▶│  GarbageCollector  │
   │  EOA   │                                         └──────────┬─────────┘
   └────────┘                                                    │ per token:
                                                                 │ safeTransferFrom
                                                                 │   user → landfillVault
                                                                 ▼
                                                       ┌────────────────────┐
                                                       │   LandfillVault    │
                                                       └────────────────────┘
                                              emit ScamTokenSent(user, token, amount)
```

**Governance pipeline (post-Phase-B.5):**

```
┌────────────────┐  delegate  ┌────────────────┐  propose / vote   ┌──────────────────────┐
│ Token holder   │───────────▶│ GuardiansToken │◀──────────────────│  GuardiansGovernor    │
│ (delegatee)    │            │ (ERC20Votes)   │                   │  (Settings + Counting │
└────────────────┘            └────────────────┘                   │   + Votes + Quorum +  │
                                                                   │   TimelockControl)    │
                                                                   └──────────┬───────────┘
                                                                              │ queue
                                                                              ▼
                                                                ┌──────────────────────────┐
                                                                │ GuardiansTimelockController│
                                                                │  _minDelay = 48h          │
                                                                │  EXECUTOR = address(0)    │
                                                                │  PROPOSER = Governor      │
                                                                └────────────┬─────────────┘
                                                          execute (anyone, after 48h)
                                                                              │
                              ┌───────────────────────────────────────────────┴───────────────────────────────┐
                              ▼                       ▼                      ▼                ▼                ▼
                  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ ┌─────────────────┐ ┌─────────────────┐
                  │ GuardiansToken   │  │  ScamRegistry    │  │  LandfillVault   │ │ CleanupMining   │ │ GarbageCollector │
                  │ admin functions  │  │ admin functions  │  │ admin functions  │ │ admin functions │ │ admin functions  │
                  └──────────────────┘  └──────────────────┘  └──────────────────┘ └─────────────────┘ └─────────────────┘
```

### §7.3 User Cleanup Path: `cleanupBatch`

The numbered steps below trace a successful `cleanupBatch(...)` call from user submission through BNB payout. Steps marked **(internal)** do not cross a contract boundary but encapsulate a security-relevant transition.

| Step | Caller | Callee | Function | Gate / modifier | Asset movement | Failure behavior | Cross-ref |
|---|---|---|---|---|---|---|---|
| 1 | User EOA | GarbageCollector | `cleanupBatch(tokens, amounts, minBnbOut, cleanupValueUSD, nonce, deadline, sig)` | `nonReentrant + whenNotPaused` (no role gate — auth is sig-based) | none yet | length / bound revert (`InvalidLength`, `TooManyTokens`, `BelowMinThreshold`) | §4.5.5 |
| 2 (internal) | GarbageCollector | (self) | `_verifyAndConsumeAuth(...)` | inline — verifies deadline, nonce, EIP-712 sig | none | `SignatureExpired` / `InvalidNonce` / `InvalidSignature` revert before any swap | §4.5.6, AD-07, I-15 |
| 3 | GarbageCollector | ScamRegistry | `isScamOrDrainer(token)` (view, gates write) | none (view) | none | If `true` for any token → `TokenIsScam(token)` revert before any swap | §4.5.5, I-04 |
| 4 | GarbageCollector | IERC20(token) | `safeTransferFrom(user, gc, amount)` | none — relies on user's prior `approve(gc, ≥amount)` | tokens: user → GarbageCollector | SafeERC20 revert (insufficient allowance / balance / non-standard token); **not** in try/catch — reverts whole tx | §4.5.6 |
| 5 | GarbageCollector | IERC20(token) | `forceApprove(router, amount)` | none | sets allowance (no asset movement) | SafeERC20 revert; not in try/catch | §4.5.6 |
| 6a | GarbageCollector | PancakeRouter | `swapExactTokensForETH(amount, 0, [token, WBNB], gc, block.timestamp + deadlineBuffer)` | none (router is immutable, trusted) | tokens: GC → router pool; **BNB: pool → GC via internal WBNB unwrap** | **try/catch**: revert → fallback path (step 6b); success → step 6c | §4.5.6, AD-09 |
| 6b | GarbageCollector | IERC20(token) | `forceApprove(router, 0)` then `safeTransfer(landfillVault, amount)` (catch branch) | none | tokens: GC → LandfillVault; allowance cleared | If `safeTransfer` itself reverts (extremely uncommon — token already in GC), reverts whole tx | §4.5.6, AD-08 |
| 6c (internal) | GarbageCollector | (self) | `address(this).balance − bnbBefore` delta measurement | inline | none — measures accumulated BNB | n/a | §4.5.6 |
| 7 (internal) | GarbageCollector | (self) | `totalBnbReceived < minBnbOut` check | inline | none — gate before reward bookkeeping and payout | `InsufficientBnbOut(received, minOut)` revert; **all prior token movements unwind via EVM revert** | §4.5.5, AD-09 |
| 8 | GarbageCollector | CleanupMining | `recordCleanup(user, cleanupValueUSD, tokens.length)` | callee-side: `onlyRole(COLLECTOR_ROLE) + whenNotPaused + nonReentrant` | none directly; triggers step 9 | revert (paused, role revoked, downstream mint cap hit) → reverts whole tx | §4.4, §7.5 |
| 9 | CleanupMining | GuardiansToken | `mintReward(user, reward)` | callee-side: `onlyRole(CLEANUP_MINER_ROLE)` + I-01 + I-02 checks | GOTT: minted to user | `MaxSupplyExceeded` / `DailyMintCapExceeded` revert → propagates up through `recordCleanup` → reverts whole `cleanupBatch` | §4.1, §7.5, I-01, I-02 |
| 10 | GarbageCollector | — | `emit CleanupExecuted(...)` | inline | none | event emission has no failure mode (pre-payout — see §7.10 row "BNB payout fail") | §4.5.9 |
| 11 | GarbageCollector | msg.sender (User EOA) | `msg.sender.call{value: totalBnbReceived}("")` | gated only by `nonReentrant`; CEI tail (last operation) | BNB: GC → user | If `call` returns `false` → `BnbTransferFailed` revert; **the `CleanupExecuted` event emitted in step 10 is also reverted** | §4.5.6 |

**Atomicity summary for this path.** Every step from 4 onward either succeeds or causes the whole transaction to revert (with one exception: step 6 router revert is caught and rerouted to landfill — see §7.6). State changes from earlier steps are unwound by EVM revert semantics, including token transfers, approvals, and the mining-side `recordCleanup` state writes. The BNB payout is the *last* state-affecting operation; a failure in that final step still reverts everything before it.

### §7.4 Explicit Landfill Path: `sendScamToLandfill`

A separate user-initiated path that does **not** require an oracle signature, does **not** check the scam registry, and does **not** issue any reward.

| Step | Caller | Callee | Function | Gate / modifier | Asset movement | Failure behavior |
|---|---|---|---|---|---|---|
| 1 | User EOA | GarbageCollector | `sendScamToLandfill(tokens, amounts)` | `nonReentrant + whenNotPaused` | none yet | `InvalidLength` revert on empty / mismatched arrays |
| 2 (per token) | GarbageCollector | IERC20(token) | `safeTransferFrom(user, landfillVault, amount)` | none — relies on user's prior `approve(gc, ≥amount)` | tokens: user → LandfillVault (direct, not via GC custody) | SafeERC20 revert → reverts whole tx (no try/catch on this path); earlier per-token transfers in the same call are unwound |
| 3 (per token) | GarbageCollector | — | `emit ScamTokenSent(user, token, amount)` | inline | none | n/a |

**Notes.**
- The function name promises "scam tokens" but the contract does **not** consult `ScamRegistry.isScamOrDrainer(...)` — the user opts in to the dump explicitly. This is intentional (see §4.5.6). A token that fails to swap via `cleanupBatch` (e.g., no Pancake liquidity) but is not registered as scam can still be dumped via this path.
- No `cleanupValueUSD`, no nonce consumption, no `CleanupAuthorization`. The signed-authorization machinery (§7.3 steps 1–2) does not apply here.
- No reward path. The user accepts the asset loss as the price of vault custody.
- Atomicity: if any per-token `safeTransferFrom` in the batch reverts, the whole call reverts and earlier per-token transfers (already executed in this same call) unwind via EVM revert. No partial success.

### §7.5 Mining Reward Path

The reward bookkeeping bridge spans two contracts and one external call back to the token. It is invoked exclusively from `GarbageCollector.cleanupBatch` step 8 (§7.3) — there is no other on-chain entry point to `recordCleanup`.

| Step | Caller | Callee | Function | Gate / modifier | Asset movement | Failure behavior |
|---|---|---|---|---|---|---|
| 1 | GarbageCollector | CleanupMining | `recordCleanup(user, cleanupValueUSD, tokens.length)` | `onlyRole(COLLECTOR_ROLE) + whenNotPaused + nonReentrant` | none directly | role / paused / param-validation revert → propagates up to `cleanupBatch` and reverts whole tx |
| 2 (internal) | CleanupMining | (self) | reward calc + state writes (`totalRewardsEarned`, `cleanupCountPerEpoch`, `totalCleanupsExecuted`) | inline | none — pure storage writes | n/a |
| 3 | CleanupMining | GuardiansToken | `mintReward(user, reward)` | callee-side: `onlyRole(CLEANUP_MINER_ROLE)` + `mintedPerDay[day] + amount > MAX_MINT_PER_DAY` (I-02) + `totalSupply() + amount > MAX_SUPPLY` (I-01) | GOTT: minted to user | `MaxSupplyExceeded` / `DailyMintCapExceeded` revert → propagates back through `recordCleanup` → back through `cleanupBatch` → reverts whole tx |

**Atomicity caveat (important).** If `mintReward` reverts in step 3, the revert propagates as follows:
- `CleanupMining.recordCleanup` reverts — its state writes from step 2 are unwound.
- The revert propagates into `GarbageCollector.cleanupBatch` at step 8 of §7.3.
- All state writes in `cleanupBatch` from steps 4–7 (§7.3) are also unwound by the EVM.
- **External calls in the same transaction also unwind their state effects.** This is critical: even though `PancakeRouter.swapExactTokensForETH` at step 6 (§7.3) executed and produced a BNB delta, the router's internal state changes are part of the same transaction and are reverted. The user's token does not end up swapped; the user's wallet state is restored to pre-`cleanupBatch`. No partial swap residue.

This is a general EVM property, not a protocol-specific guarantee — but worth stating explicitly because the asymmetry is sometimes misread. In particular, the swap-fail fallback path (§7.6) is **not** an exception to this; the fallback runs inside `try/catch` *before* `minBnbOut` and reward bookkeeping, so if the later steps revert, the fallback's `safeTransfer` to landfill also reverts.

**Order of state-effects.** Inside `recordCleanup`, the state writes precede the `mintReward` external call (CEI ordering — see §4.4.5). The reentrancy guard plus the trusted-immutable identity of `gott` close the only re-entry path, but the CEI ordering is the load-bearing protection.

### §7.6 Swap Failure / Fallback Path

Step 6 of §7.3 wraps the router call in a `try / catch`. The handler covers **only** the router call — not the preceding `safeTransferFrom` (step 4) or the following `minBnbOut` check (step 7).

```solidity
try router.swapExactTokensForETH(
    amount,
    0,                          // per-token slippage = 0 (AD-09)
    path,                       // [token, WBNB]
    address(this),
    block.timestamp + swapDeadlineBuffer
) returns (uint256[] memory) {
    // success — BNB landed in GC via receive()
} catch {
    // router reverted — fallback path
    t.forceApprove(address(router), 0);              // clear stale allowance
    t.safeTransfer(landfillVault, amount);           // forward token to vault
    emit SwapFallbackToLandfill(from, token, amount);
}
```

**What the `catch` covers.**
- Any revert inside `router.swapExactTokensForETH`: insufficient liquidity, deadline expiry, price-impact triggers, malicious router logic. The router itself is `immutable` and trusted to be canonical PancakeRouter v2 (§9.5), but its *outcome* is not trusted — even a canonical router can revert for legitimate reasons (e.g., no pair).

**What the `catch` does NOT cover.**
- Step 4 `safeTransferFrom` from user to GC — runs *before* the try/catch.
- Step 5 `forceApprove(router, amount)` — also before the try/catch.
- Step 7 `minBnbOut` aggregate check — runs *after* the try/catch on the batch level.
- Step 8 `recordCleanup` and step 9 `mintReward` — after the swap loop completes.
- Step 11 native BNB payout — final step, after reward bookkeeping.

A revert in any of those non-caught steps propagates and reverts the whole transaction, *including* any per-token `safeTransfer` to landfill that the catch already executed earlier in the same batch.

**Outcome of a single-token catch-and-continue.** If only one token in the batch's swap reverts, the batch continues with the remaining tokens. The user's pre-existing `cleanupValueUSD` (signed by the oracle for the whole batch) still applies — they receive reward for the full batch's notional value, but BNB only for the tokens that actually swapped. AD-08 (Low–Med) is the accepted UX trade-off. The batch-level `minBnbOut` is the user's escape hatch: if too many tokens fall through to the vault, aggregate BNB < `minBnbOut` and the whole batch reverts in step 7 (§7.3), unwinding even the catch's landfill transfers.

### §7.7 Governance / Timelock Call Path

After Phase B.5, every admin function on every protocol contract is reachable only through the Timelock. The end-to-end flow:

| Step | Caller | Callee | Function | Gate / modifier | Asset movement | Failure behavior |
|---|---|---|---|---|---|---|
| 1 | Token holder | GuardiansToken | `delegate(delegatee)` | inherited from `ERC20Votes` | none — assigns voting weight to `delegatee` | revert on `delegatee == 0` per OZ spec |
| 2 | Proposer EOA (≥ 100k GOTT delegated) | GuardiansGovernor | `propose(targets, values, calldatas, description)` | inherited `proposalThreshold` check (`getVotes(proposer) >= proposalThreshold`) | none | `GovernorInsufficientProposerVotes` revert |
| 3 | Token holders | GuardiansGovernor | `castVote(...)` / `castVoteWithReason(...)` / `castVoteBySig(...)` | snapshot vote weight; per-voter once | none | `GovernorAlreadyCastVote` revert if double-vote |
| 4 (state transition) | — | Governor | `state(proposalId)` returns `Succeeded` after voting period + quorum + majority | view | none | n/a |
| 5 | Anyone (gas payer) | GuardiansGovernor | `queue(targets, values, calldatas, descriptionHash)` | `state == Succeeded`; Governor must hold `PROPOSER_ROLE` on Timelock | none | `GovernorUnexpectedProposalState` revert |
| 6 (internal) | Governor | Timelock | `scheduleBatch(...)` | callee-side: `onlyRole(PROPOSER_ROLE)` | none — schedules op | `TimelockInsufficientDelay` if proposed delay < `_minDelay` |
| 7 (delay elapses) | — | Timelock | `_minDelay = 48h` enforced | view | none | n/a |
| 8 | Anyone (gas payer) | GuardiansGovernor | `execute(targets, values, calldatas, descriptionHash)` | `state == Queued` + Timelock delay elapsed; Governor delegates to Timelock | varies by proposal payload | proposal targets revert → whole `execute` reverts; proposal stays in `Queued` state, re-executable after fix |
| 9 (internal) | Governor | Timelock | `executeBatch(...)` | callee-side: `onlyRoleOrOpenRole(EXECUTOR_ROLE)` — short-circuited because `EXECUTOR_ROLE` holder is `address(0)` (AD-10) | varies | target reverts propagate up |
| 10 | Timelock | (target protocol contract) | admin function (e.g., `setOracleSigner`, `grantRole`, `pause`, `mint`, etc.) | callee-side role gate on the target (e.g., `onlyRole(ADMIN_ROLE)` — held by Timelock) | varies | target's own revert reasons |

**Open executor caveat (AD-10).** Step 8/9 can be invoked by *any* address — not just the Governor, not just a designated relayer. The payload is fixed when the proposal was queued in step 5/6, so an arbitrary caller cannot inject new calldata; they can only trigger execution of the already-approved payload. This is the canonical OZ-recommended pattern.

**Voting-window caveat (AD-11).** Step 3 voting window is `votingPeriod = 201,600 blocks`. At BSC's 2.5–4 s block time, the wall-clock window varies from ≈ 5.8 days to ≈ 9.3 days around the 7-day target. Off-chain governance UIs should display block-number deadlines, not wall-clock estimates.

**Cross-references.** §4.7 (Governor module composition), §5 Role Matrix (which target functions Timelock can reach), §9.7 (governance trust boundary), I-16, I-17, AD-10, AD-11.

### §7.8 Admin / Role Transfer Call Path (Bootstrap)

Phases A and B are scripted from `scripts/deployFull.js` (when written — currently per-contract `scripts/deploy<Name>.js`) and `scripts/transferAdminRoles.js`. The on-chain calls during the cutover:

| Step | Caller | Callee | Function | Effect |
|---|---|---|---|---|
| B.3 | Deployer EOA | Timelock | `grantRole(PROPOSER_ROLE, governor)` | Governor can `schedule` proposals |
| B.4 | Deployer EOA | Timelock | `grantRole(CANCELLER_ROLE, governor)` | Governor can `cancel` queued ops |
| B.5.a | Deployer EOA | GuardiansToken | `grantRole(DEFAULT_ADMIN_ROLE, timelock)` + `grantRole(MINTER_ROLE, timelock)` + `grantRole(PAUSER_ROLE, timelock)` | Timelock receives all token admin authority |
| B.5.b | Deployer EOA | GuardiansToken | `revokeRole(MINTER_ROLE, deployer)` + `revokeRole(PAUSER_ROLE, deployer)` + `revokeRole(DEFAULT_ADMIN_ROLE, deployer)` | Deployer loses token authority |
| B.5.c–f | Deployer EOA | ScamRegistry / LandfillVault / CleanupMining / GarbageCollector | analogous `grantRole(...)` for each admin / pauser / DAO / emergency role to Timelock, then `revokeRole(...)` from deployer | Each contract's admin transferred |
| B.6 | Deployer EOA | Timelock | `renounceRole(DEFAULT_ADMIN_ROLE, deployer)` | **Final lock**: no EOA holds any admin authority anywhere |

`scripts/transferAdminRoles.js` is idempotent (re-running partial state is safe) and tested in `test/RoleTransfer.test.js` (12 tests, see §5.4).

**Roles intentionally NOT transferred at B.5:** `CLEANUP_MINER_ROLE` on GuardiansToken (held by CleanupMining contract) and `COLLECTOR_ROLE` on CleanupMining (held by GarbageCollector contract). See §5.3 note 1 for the rationale.

**Cross-references.** §3.3 (Phase A/B/C lifecycle), §5 Role Matrix (steady-state holder column), §9.8 (Bootstrap Trust Window — the on-chain-unbounded risk during this ritual).

### §7.9 External Call Inventory

Consolidated table of every external call in the protocol. Filter by **Class** to focus on a category. **Gate** lists the modifier or pre-condition on the *caller* side; callee-side gates are noted in the **Notes** column where relevant.

| # | Source (contract.function) | Callee.function | Class | Gate (caller) | Value/token movement | Revert handling | Notes / cross-ref |
|---|---|---|---|---|---|---|---|
| 1 | `GarbageCollector.cleanupBatch` | `ScamRegistry.isScamOrDrainer(token)` | view | `nonReentrant + whenNotPaused` (caller) | none | revert (`TokenIsScam`) propagates → whole tx reverts | per-token loop; gas bounded by `MAX_TOKENS_HARD_CAP = 50`. §4.5.5 |
| 2 | `GarbageCollector._swapTokenToBNB` | `IERC20(token).safeTransferFrom(user, gc, amount)` | ERC-20 transfer | `nonReentrant + whenNotPaused` | tokens: user → GC | **not** in try/catch; revert → whole tx reverts | §4.5.6 |
| 3 | `GarbageCollector._swapTokenToBNB` | `IERC20(token).forceApprove(router, amount)` | ERC-20 approve | `nonReentrant + whenNotPaused` | sets allowance | revert → whole tx reverts | OZ `forceApprove` resets to 0 first when needed |
| 4 | `GarbageCollector._swapTokenToBNB` | `PancakeRouter.swapExactTokensForETH(...)` | DEX swap | `nonReentrant + whenNotPaused` | tokens: GC → pool; BNB: pool → GC (via receive) | **in `try/catch`**: revert → step 5/6 fallback; no whole-tx revert from router | §4.5.6, AD-08, AD-09, §9.5 |
| 5 | `GarbageCollector._swapTokenToBNB` (catch branch) | `IERC20(token).forceApprove(router, 0)` | ERC-20 approve | catch branch — runs only on router revert | clears allowance | If revert here → whole tx reverts | §4.5.6 |
| 6 | `GarbageCollector._swapTokenToBNB` (catch branch) | `IERC20(token).safeTransfer(landfillVault, amount)` | ERC-20 transfer | catch branch — runs only on router revert | tokens: GC → LandfillVault | If revert here → whole tx reverts | §4.5.6, AD-08 |
| 7 | `GarbageCollector.cleanupBatch` | `CleanupMining.recordCleanup(user, cleanupValueUSD, tokens.length)` | protocol-internal | `nonReentrant + whenNotPaused`; callee-side: `onlyRole(COLLECTOR_ROLE) + whenNotPaused + nonReentrant` | triggers step 8 (mint) | revert → whole tx reverts | §4.4, §7.5 |
| 8 | `CleanupMining.recordCleanup` | `GuardiansToken.mintReward(user, reward)` | protocol-internal | callee-side: `onlyRole(CLEANUP_MINER_ROLE)` + I-01 + I-02 checks | GOTT: minted to user | revert → propagates up through `recordCleanup` → up through `cleanupBatch` → whole tx reverts | §4.1, §7.5, I-01, I-02 |
| 9 | `GarbageCollector.cleanupBatch` | `msg.sender.call{value: totalBnbReceived}("")` | native BNB | `nonReentrant + whenNotPaused`; **CEI tail** | BNB: GC → user | `false` return → `BnbTransferFailed` revert → whole tx reverts | §4.5.6 |
| 10 | `GarbageCollector.sendScamToLandfill` | `IERC20(token).safeTransferFrom(user, landfillVault, amount)` | ERC-20 transfer | `nonReentrant + whenNotPaused` | tokens: user → LandfillVault | **not** in try/catch; revert → whole tx reverts | §4.5.6, §7.4 |
| 11 | `LandfillVault.burnToken` | `IERC20(token).safeTransfer(0xdEaD, amount)` | ERC-20 transfer | `onlyRole(DAO_ROLE) + whenNotPaused + nonReentrant` | tokens: vault → `0xdEaD` | revert → whole tx reverts | §4.3, AD-03 caveat for FoT |
| 12 | `LandfillVault.transferToken` | `IERC20(token).safeTransfer(to, amount)` | ERC-20 transfer | `onlyRole(DAO_ROLE) + whenNotPaused + nonReentrant` | tokens: vault → `to` | revert → whole tx reverts | §4.3 |
| 13 | `LandfillVault.emergencyWithdraw` | `IERC20(token).safeTransfer(to, balance)` | ERC-20 transfer | `onlyRole(EMERGENCY_ROLE) + nonReentrant` (**bypasses pause**) | tokens: vault → `to` (full balance) | revert → whole tx reverts | §4.3, AD-04 |
| 14 | `GarbageCollector.withdrawStuckBNB` | `to.call{value: balance}("")` | native BNB | `onlyRole(ADMIN_ROLE) + nonReentrant` | BNB: GC → `to` | `false` return → `BnbTransferFailed` revert | §4.5.6, AD-10 caveat |
| 15 | PancakeRouter | `GarbageCollector.receive()` | native BNB (callback) | none — `receive() external payable {}` accepts unconditionally | BNB: router → GC | `receive` cannot revert (empty body) | §4.5.11 |
| 16 | (any caller via OZ flow) | `GuardiansToken._update` (ERC20Votes hook) | view-effect-style internal | inherited from OZ | none | n/a | included for completeness — Votes accounting on transfer |
| 17 | Anyone (post-delay) | `GuardiansTimelockController.executeBatch(...)` | governance execute | `onlyRoleOrOpenRole(EXECUTOR_ROLE)` — open executor | varies by proposal | per-target revert → whole `executeBatch` reverts; proposal stays Queued | §4.6.6, §7.7, AD-10 |
| 18 | Timelock | (any target.adminFn) | governance / admin | callee-side role gate on target | varies | callee revert → propagates up to `executeBatch` revert | §5 Role Matrix |
| 19 | Governor | `Timelock.scheduleBatch(...)` | governance queue | callee-side: `onlyRole(PROPOSER_ROLE)` | none | revert → reverts `queue` call | §4.6.6, §7.7 |
| 20 | Token holder | `GuardiansToken.delegate(delegatee)` | inherited OZ | none | none — voting weight assignment | revert on `delegatee == 0` per OZ | §4.1.6 |

**Patterns to note.**
- **Exactly one `try/catch` in the protocol** (rows 4–6). All other external calls propagate reverts straight up.
- **Three native BNB outbound calls** (rows 9, 14, 15-callback). Two are low-level `call{value:}` (rows 9, 14); one is `receive()` (row 15). All are gated by `nonReentrant` on the caller side.
- **No `delegatecall` anywhere** in the protocol contract surface. The only `delegate` is `ERC20Votes.delegate` (row 20), which is a vote-weight assignment, not an EVM `delegatecall`.

### §7.10 Revert / Atomicity Summary

| Scenario | Reverts whole tx? | User asset outcome | Event outcome | Notes |
|---|---|---|---|---|
| Invalid signature (`InvalidSignature`) | YES | tokens not moved | none | `_verifyAndConsumeAuth` reverts before any swap. §7.3 step 2 |
| Expired deadline (`SignatureExpired`) | YES | tokens not moved | none | same |
| Invalid nonce (`InvalidNonce`) | YES | tokens not moved | none | same |
| Scam token in `cleanupBatch` (`TokenIsScam`) | YES | tokens not moved | none | scam pre-check loop reverts before any swap. §7.3 step 3 |
| ERC-20 `safeTransferFrom` fail in `cleanupBatch` | YES | tokens not moved (per-token failure unwinds all prior per-token transfers in the same call) | none | not in try/catch — only the router call is wrapped. §7.6 |
| PancakeRouter swap fail for one token | NO (caught) | token forwarded to `landfillVault`; user does **not** receive BNB for that token but reward is still computed on full batch `cleanupValueUSD` | `SwapFallbackToLandfill(user, token, amount)` emitted | try/catch wraps only the router call. §7.6, AD-08 |
| Aggregate `minBnbOut` fail (`InsufficientBnbOut`) | YES | **all** tokens unwound by EVM revert — including any per-token fallback transfers to landfill that the catch branch already executed earlier in the same batch | none (all events reverted) | §7.3 step 7, AD-09 |
| `recordCleanup` revert (paused, role revoked, mint cap downstream) | YES | all tokens unwound; no reward | none | propagates from CleanupMining → cleanupBatch. §7.5 |
| `mintReward` daily-cap fail (`DailyMintCapExceeded`) | YES | all tokens unwound; no reward | none | propagates back through `recordCleanup`. I-02, §7.5 |
| `mintReward` MAX_SUPPLY fail (`MaxSupplyExceeded`) | YES | all tokens unwound; no reward | none | propagates back through `recordCleanup`. I-01, §7.5 |
| BNB payout fail (`BnbTransferFailed`) | YES | all tokens unwound; the `CleanupExecuted` event emitted just before payout is also reverted | none | step 11 is the CEI tail. §7.3 step 11 |
| `sendScamToLandfill` `safeTransferFrom` fail | YES | tokens not moved (per-token failure unwinds prior per-token transfers in the same call) | none (any `ScamTokenSent` emitted earlier in the same call is reverted) | no try/catch on this path. §7.4 |
| Governance proposal target call fail | YES (within `executeBatch`) | proposal stays in `Queued` state — re-executable after the underlying issue is fixed | the `executeBatch` call reverts; no `ProposalExecuted` event emitted | per OZ TimelockController atomicity. §7.7 step 8/9 |
| `LandfillVault.burnToken` / `transferToken` / `emergencyWithdraw` ERC-20 transfer fail | YES | tokens not moved | none | callee-side `nonReentrant` + role gate already passed; revert is inside the transfer itself |

**Reading the table.**
- "YES" in column 2 means an EVM revert unwinds all state changes in the current transaction.
- The single "NO (caught)" row is the router swap failure inside `_swapTokenToBNB`. **Every other failure mode in this section reverts the whole transaction.**
- "User asset outcome" describes the user-visible end state *after* the transaction. For revert rows, "not moved" / "unwound" mean the user's wallet state is identical to before the call.

**Cross-references.** §4.5 (GarbageCollector contract walkthrough), §6 (invariants enforced by these revert paths), §9 (trust assumptions on what the revert behaviour bounds), §10 AD-07 / AD-08 / AD-09 / AD-10 (design acceptances on the catch / atomicity trade-offs).

---

## §8 Storage Layout & Upgrade Story

### §8.1 Non-Upgradeable Design Statement

The GOTT protocol is **non-upgradeable on-chain**. Concretely:

- **No proxy** — none of the seven production contracts is deployed behind a transparent / UUPS / Beacon proxy.
- **No Diamond / facet pattern** — no `EIP-2535` dispatcher; every external call resolves directly to a single contract address.
- **No `delegatecall` anywhere in the protocol contract surface** (verified in §7.9 inventory, row patterns note). `ERC20Votes.delegate` is vote-weight assignment, not EVM `delegatecall`.
- **Every contract is deployed as immutable bytecode.** Once deployed, the code at that address never changes.

**"Upgrade" in this protocol means redeploy + governance migration.** There is no in-place implementation swap. A contract that is found defective post-launch must be replaced by deploying a new contract and migrating the relevant state and role grants — see §8.11 for the per-contract playbooks.

**Storage layout still matters**, for four reasons distinct from proxy-safe upgrade compatibility:

1. **Audit inspection.** Reviewers need to know which slots are constants (no slot allocated), immutables (bytecode-embedded), mutable storage (live state), and inherited (managed by an OZ parent module).
2. **Migration planning.** When a contract is replaced, the protocol team must know which state needs to be exported / replayed / dropped on the successor.
3. **Trust boundary clarity.** Immutables are part of the deployment-time trust act; mutables are part of the runtime governance surface. The split feeds §9 and §10.
4. **Forward documentation.** Future readers (including future versions of the protocol team) should not silently assume any of the contracts is proxy-upgradeable. The audit-facing artifact should rule that out explicitly.

**Cross-references.** §7.9 (no `delegatecall` row pattern), §9 (trust model), §10 AD-04 (vault role separation; relevant because the only role-migration playbook in v0.2.x scope is the Phase B.5 cutover).

> **A note on slot-level layout.** This section describes the **logical** storage layout of each contract — which categories of state live where, what is mutable, what is immutable, and what is constant. It does **not** enumerate Solidity storage slot numbers because the compiler does not emit a stable storage-layout artifact under the current `hardhat.config.js` / `foundry.toml` settings (no `viaIR` slot-naming, no `--storage-layout` output captured). If the audit firm requires slot-by-slot enumeration, it can be generated by running `forge inspect <Contract> storage-layout` against the locked Solidity 0.8.24 toolchain.

### §8.2 Storage Layout Summary Table

| Contract | Upgradeable? | Proxy? | Constructor-set immutables | Mutable storage owned by contract | Inherited storage modules (OZ v5.1.0) | Migration difficulty | Notes |
|---|---|---|---|---|---|---|---|
| `GuardiansToken` | ❌ No | None | — (no `immutable` declarations) | `mintedPerDay` mapping, `initialized` flag | `ERC20`, `ERC20Burnable` (no new storage), `Pausable`, `ERC20Permit` (via `EIP712` + `Nonces`), `ERC20Votes` (Checkpoints), `AccessControl` | **Highest** — live balances, allowances, vote checkpoints, delegation, permit nonces, total supply | TGE allocation + governance vote source. See §8.3. |
| `ScamRegistry` | ❌ No | None | — | `tokenInfo` mapping (`status`, `lastUpdated`, `reportedBy`, `reportCount` per token) | `AccessControl`, `Pausable` | Medium — classifications must be replayed onto a successor | See §8.4 |
| `LandfillVault` | ❌ No | None | — | none beyond inherited (vault has no per-token bookkeeping; balances live in the ERC-20 contracts) | `AccessControl`, `Pausable`, `ReentrancyGuard` | Low for governance / Medium for token migration | See §8.5 |
| `CleanupMining` | ❌ No | None | `gott`, `LAUNCH_TIMESTAMP` | `baseRate`, `tierBronze`, `tierSilver`; per-user maps (`hasCleanedBefore`, `totalCleanupValue`, `totalRewardsEarned`, `lastCleanupTimestamp`, `cleanupCountPerEpoch`); globals (`totalCleanupsExecuted`, `totalValueCleaned`) | `AccessControl`, `Pausable`, `ReentrancyGuard` | Medium — immutable `LAUNCH_TIMESTAMP` cannot be preserved; epoch clock resets on redeploy | See §8.6 |
| `GarbageCollector` | ❌ No | None | `router`, `WBNB`, `scamRegistry` | `miningContract`, `landfillVault`, `oracleSigner`; `maxTokensPerCleanup`, `swapDeadlineBuffer`, `minCleanupValueUSD`; `nonces` mapping | `AccessControl`, `Pausable`, `ReentrancyGuard`, `EIP712` (`_HASHED_NAME`, `_HASHED_VERSION` — bytecode-embedded via EIP712 parent) | Medium — three immutables fix the swap-path identity; replacement is a deploy + role rewire | See §8.7 |
| `GuardiansTimelockController` | ❌ No (OZ v5.1.0 canonical) | None | `__self` (transitive, OZ-internal — used to prevent direct `execute` outside intended path) | `_minDelay`, `_timestamps` mapping | `AccessControl`, `IERC721Receiver`, `IERC1155Receiver` (callback receivers, no state) | Medium — admin root post-B.5; replacement requires careful role transfer to a new Timelock | See §8.8 |
| `GuardiansGovernor` | ❌ No | None | — (token + timelock stored privately by parent modules, not as child-level immutables) | none owned by the child contract | `Governor` (proposal state, votes), `GovernorSettings` (delay, period, threshold), `GovernorCountingSimple` (vote tallies per proposal), `GovernorVotes` (`_token`), `GovernorVotesQuorumFraction` (`_quorumNumeratorHistory`), `GovernorTimelockControl` (`_timelock`, `_timelockIds`) | Medium — replacement requires re-granting `PROPOSER_ROLE` / `CANCELLER_ROLE` to new Governor on Timelock | See §8.9 |

### §8.3 GuardiansToken Storage Layout

**Constants (no storage slot).** `MAX_SUPPLY = 1_000_000_000 * 10^18` (`GuardiansToken.sol:L45`); `MAX_MINT_PER_DAY = 1_400_000 * 10^18` (`L46`); the three role-hash constants `MINTER_ROLE`, `PAUSER_ROLE`, `CLEANUP_MINER_ROLE` (`L38-L40`). All are `bytes32` / `uint256` `constant`, embedded in bytecode.

**Immutables.** **None.** Unlike CleanupMining (which seals its `gott` reference) and GarbageCollector (which seals `router` / `WBNB` / `scamRegistry`), the token contract has no external dependencies to seal — it stands alone at the bottom of the protocol's dependency graph.

**Own mutable storage.**
- `mapping(uint256 => uint256) public mintedPerDay` (`L52`) — UTC-day-bucket accumulator for I-02 enforcement.
- `bool public initialized` (`L55`) — one-shot TGE flag (I-03).

**Inherited storage (OZ v5.1.0 modules — managed by the parent contracts, not directly by GuardiansToken):**

| Module | Storage |
|---|---|
| `ERC20` | `_balances`, `_allowances`, `_totalSupply`, `_name`, `_symbol` |
| `ERC20Burnable` | none (only methods) |
| `Pausable` | `_paused` |
| `ERC20Permit` / `EIP712` / `Nonces` | `_HASHED_NAME` (immutable), `_HASHED_VERSION` (immutable), `_cachedDomainSeparator`, `_cachedChainId`, `_cachedThis`, `_nonces` |
| `ERC20Votes` | `_delegatee` (per-account delegation), `_delegateCheckpoints` (per-delegatee Checkpoints), `_totalCheckpoints` (global supply Checkpoints) |
| `AccessControl` | `_roles` (mapping from role → struct of members + admin role) |

The `Checkpoints.Trace208` storage is non-trivial for migration: it stores a chronologically-ordered series of `(block_number, voting_power)` pairs per delegatee plus per global supply. A migration to a new token contract must decide whether to preserve historical voting weight (read the original token's `getPastVotes(...)` and replay) or to reset the voting timeline from zero.

**Migration story.** This is the **hardest contract to migrate** in the protocol. Live state includes:
- ERC-20 balances and allowances for every token holder (could be hundreds of thousands of accounts at maturity).
- `ERC20Permit` per-account nonces (consumed by gasless approvals).
- `ERC20Votes` per-delegatee checkpoint history + global supply checkpoint history.
- TGE distribution traces in `mintedPerDay` (effectively unchecked, append-only via `mintReward`).

If a critical bug is found post-mainnet, the safest replacement route is **deploy a new token + snapshot-and-claim migration**: snapshot balances at a fixed block, deploy a new GOTT contract with an `initialClaim(address, uint256, proof)` function that users call to receive their balance on the new token. Voting checkpoint history would be re-derived from the snapshot point forward. **In-place storage upgrade is not an option** — there is no proxy.

**Cross-references.** §6 I-01, I-02, I-03; §10 AD-06; §4.1.

### §8.4 ScamRegistry Storage Layout

**Constants (no storage slot).** `ORACLE_ROLE` (`ScamRegistry.sol:L18`), `PAUSER_ROLE` (`L19`). `TokenStatus` enum (`L24-32`) is type-only, not a storage slot.

**Immutables.** **None.**

**Own mutable storage.**
- `mapping(address => TokenInfo) public tokenInfo` — single slot per token, with `TokenInfo` struct fields packed by Solidity per layout rules: `TokenStatus status` (1 byte), `uint64 lastUpdated`, `uint64 reportCount`, `address reportedBy`. (See §4.2.7 for the struct layout used by the contract.)

**Inherited storage:**

| Module | Storage |
|---|---|
| `AccessControl` | `_roles` |
| `Pausable` | `_paused` |

**Migration story.** Conceptually simple but operationally non-trivial:
1. Deploy new `ScamRegistry` (same code or an updated successor).
2. Export current `tokenInfo` for every classified token (read off-chain via event replay of `StatusUpdated` since deploy block, or via direct state read of all known token addresses).
3. On the new registry, replay the latest `setStatus` per token using the new `ORACLE_ROLE` keeper. `reportCount` and historical `lastUpdated` for each token **cannot be preserved** — the new registry starts with `reportCount = 1` per migrated token. Off-chain indexers should adjust their schemas to span "registry epochs" if continuity matters.
4. **The `GarbageCollector.scamRegistry` reference is `immutable`** (§4.5.10) — the existing GarbageCollector cannot be re-pointed at the new registry. A registry migration therefore implies **a parallel GarbageCollector migration** (§8.7). The two are coupled by deployment-time immutability.

**Cross-references.** §6 I-04 (enum range), I-05 (reportCount monotonic), I-06 (lastUpdated monotonic), I-07 (count matches writes); §9.4 (ORACLE_ROLE trust); §10 AD-02.

### §8.5 LandfillVault Storage Layout

**Constants (no storage slot).** `DAO_ROLE` (`LandfillVault.sol:L24`), `EMERGENCY_ROLE` (`L25`), `PAUSER_ROLE` (`L26`).

**Immutables.** **None.**

**Own mutable storage.** **None beyond inherited modules.** The vault holds no per-token bookkeeping. **Token balances are stored in the respective ERC-20 contracts** (`balanceOf(vault, token)`), not in the vault's own storage. This is the load-bearing design choice behind I-08 / I-09 / I-10 — the vault has nothing to corrupt in its own slots; the entire balance state is delegated to the external ERC-20 contract.

**Inherited storage:**

| Module | Storage |
|---|---|
| `AccessControl` | `_roles` |
| `Pausable` | `_paused` |
| `ReentrancyGuard` | `_status` (single-slot lock flag) |

**Migration story.** The lightest migration in the protocol — there is **no contract-local state to preserve**.

1. Deploy new `LandfillVault` with the new role allocation (e.g., separate multisig for `EMERGENCY_ROLE` per AD-04 future direction).
2. For each token currently held in the old vault: governance proposes `oldVault.transferToken(token, newVault, balance)` to move the balance.
3. Update `GarbageCollector.landfillVault` via `setLandfillVault(newVault)` (this address is mutable, §4.5.6).
4. Revoke roles from the old vault (it becomes a dead address but cannot be `selfdestruct`-ed; the protocol team accepts the residual contract on-chain).

**Known limitation: stuck tokens.** Any token in the old vault whose `transfer` reverts (paused token, blacklisted vault address, etc.) is permanently stuck. `emergencyWithdraw` faces the same constraint — it calls `safeTransfer`, which is at the mercy of the token's own logic. **The protocol has no on-chain escape hatch** if a token decides to lock the vault's balance. This is acceptable because (a) the vault is by design a custody-only contract for tokens the protocol does not assume are well-behaved, and (b) the alternative — bytecode-level token unlocking — is not feasible.

**Cross-references.** §6 I-08 / I-09 / I-10; §10 AD-03 (FoT drift) / AD-04 (role separation); §4.3.

### §8.6 CleanupMining Storage Layout

**Constants (no storage slot).** `COLLECTOR_ROLE`, `ADMIN_ROLE`, `PAUSER_ROLE` (`CleanupMining.sol:L39-L41`); `EPOCH_DURATION = 180 days` (`L50`); `MAX_BASE_RATE = 1000 ether` (`L53`).

**Immutables (bytecode-embedded via Solidity `immutable`, set in constructor):**

| Name | Source | Notes |
|---|---|---|
| `gott` | `CleanupMining.sol:L46` | `IGuardiansToken` reference to the token contract. **Cannot be changed in-place.** |
| `LAUNCH_TIMESTAMP` | `L49` | `block.timestamp` at deployment. **Anchors the epoch clock for the entire contract lifetime.** A new CleanupMining redeploy starts a fresh epoch-zero. |

**Own mutable storage.**

*Tuning parameters (admin-settable):*
- `uint256 baseRate = 100 ether` (`L58`).
- `uint256 tierBronze = 100e18` (`L59`).
- `uint256 tierSilver = 1000e18` (`L60`).

*Per-user accounting (mappings):*
- `mapping(address => bool) public hasCleanedBefore` (`L65`).
- `mapping(address => uint256) public totalCleanupValue` (`L66`).
- `mapping(address => uint256) public totalRewardsEarned` (`L67`).
- `mapping(address => uint256) public lastCleanupTimestamp` (`L68`).
- `mapping(address => mapping(uint256 => uint256)) public cleanupCountPerEpoch` (`L70`) — per-user-per-epoch counter.

*Global counters:*
- `uint256 public totalCleanupsExecuted` (`L75`).
- `uint256 public totalValueCleaned` (`L76`).

**Inherited storage:** `AccessControl._roles`, `Pausable._paused`, `ReentrancyGuard._status`.

**Migration story.** The structural challenge is `LAUNCH_TIMESTAMP`. Because it is immutable, a new deployment captures a fresh `block.timestamp` — the epoch clock resets to zero. This has economic consequences: a redeploy mid-Epoch-2 would restart users at Epoch 0 with the full 1.0× multiplier, breaking the halving schedule (§4.4 reward table).

**A safe redeploy therefore requires governance acceptance** that the new contract starts a fresh emission curve. The audit firm should verify the runbook anticipates this: if the bug requiring redeploy is found within Epoch 0, the impact is small; deeper into the schedule, a redeploy is increasingly disruptive to tokenomics.

**Migration steps:**
1. Deploy new `CleanupMining` (same code or successor) — `LAUNCH_TIMESTAMP` set to deployment block.
2. `GuardiansToken.grantRole(CLEANUP_MINER_ROLE, newMining)` via Governor proposal.
3. `GarbageCollector.setMiningContract(newMining)` via Governor proposal (mutable wiring, §4.5.6).
4. `newMining.grantRole(COLLECTOR_ROLE, garbageCollector)` (since `COLLECTOR_ROLE` was held by GC on the *old* mining contract, the grant must be replayed on the new one).
5. `GuardiansToken.revokeRole(CLEANUP_MINER_ROLE, oldMining)` to stop the old contract from issuing rewards.
6. Per-user accounting (totalRewardsEarned, cleanupCountPerEpoch, etc.) is **not migrated** — these are bookkeeping for the off-chain indexer / dashboard. Frontend should display both old-contract and new-contract totals if continuity matters to users.

**Cross-references.** §6 I-11 / I-12 / I-13 / I-14; §10 AD-05 (divide-before-multiply); §4.4.

### §8.7 GarbageCollector Storage Layout

**Constants (no storage slot).** `ADMIN_ROLE`, `PAUSER_ROLE` (`GarbageCollector.sol:L53-L54`); `MAX_TOKENS_HARD_CAP = 50` (`L78`); `CLEANUP_AUTH_TYPEHASH` (`L84`).

**Immutables (bytecode-embedded, constructor-set):**

| Name | Source | Notes |
|---|---|---|
| `router` | `L59` | `IPancakeRouter` reference — sealed to a specific deployed router. |
| `WBNB` | `L62` | Canonical WBNB on BSC. |
| `scamRegistry` | `L63` | `IScamRegistry` reference — sealed to a specific deployed registry. |
| `_HASHED_NAME`, `_HASHED_VERSION` (from EIP712 parent) | parent constructor at `L139` | EIP-712 domain separator components, set from `EIP712("GarbageCollector", "1")`. Changing either string requires a new deployment + signer-coordinated rotation. |

**Own mutable storage (rotatable wiring + tuning + nonces).**

*Protocol-internal wiring:*
- `address public miningContract` (`L68`) — `setMiningContract` rotatable.
- `address public landfillVault` (`L69`) — `setLandfillVault` rotatable.
- `address public oracleSigner` (`L70`) — `setOracleSigner` rotatable (AD-07 rotation primitive).

*Tuning parameters:*
- `uint256 public maxTokensPerCleanup = 20` (`L75`).
- `uint256 public swapDeadlineBuffer = 10 minutes` (`L76`).
- `uint256 public minCleanupValueUSD = 1e18` (`L77`).

*EIP-712 nonce state:*
- `mapping(address => uint256) public nonces` (`L88`) — per-user monotonic nonce (I-15).

**Inherited storage:** `AccessControl._roles`, `Pausable._paused`, `ReentrancyGuard._status`, plus `EIP712` cache slots (`_cachedDomainSeparator`, `_cachedChainId`, `_cachedThis`).

**Migration story.** The three swap-path immutables (`router`, `WBNB`, `scamRegistry`) fix the GC's deployment-time identity. A redeploy is required for any of: replacing the router (e.g., Pancake v3 migration), replacing WBNB (e.g., canonical re-deployment by BSC), or replacing the ScamRegistry (e.g., §8.4 migration).

**Steps:**
1. Deploy new `GarbageCollector` with updated immutables. `EIP712("GarbageCollector", "1")` — note that the domain string can stay the same; what changes is the **`verifyingContract` address inside the EIP-712 domain separator**, computed from the new contract's `address(this)`. **This automatically invalidates every pre-signed `CleanupAuthorization` for the old GC** without any manual step, because the domain hash differs.
2. `CleanupMining.grantRole(COLLECTOR_ROLE, newGC)` via Governor proposal.
3. `CleanupMining.revokeRole(COLLECTOR_ROLE, oldGC)`.
4. **New GC starts with `nonces[user] == 0` for every user.** Old `nonces` are not migrated and do not need to be: because the domain separator differs between old and new GC, old signatures cannot replay on the new contract. The frontend must fetch the nonce from the new (active) collector at sign time.
5. Pause `oldGC` to block any in-flight calls (or let it stay live during a brief overlap window — in-flight calls succeed on the old contract until pause, but no new rewards flow because `COLLECTOR_ROLE` is revoked).
6. Frontend / off-chain signer service updated to target the new `verifyingContract` in EIP-712 metadata.

**Nonce continuity trade-off.** Preserving nonces across a GC redeploy would have required adding a `setInitialNonces(...)` admin function and an off-chain export/import step, increasing both the migration surface and the post-migration trust surface (a malicious admin could set arbitrary nonces). The chosen design — fresh-nonce-on-deploy + domain-separation-bound replay protection — is operationally simpler and security-equivalent.

**Cross-references.** §6 I-15 (nonce monotonic); §9.3 (oracleSigner) / §9.5 (router / WBNB); §10 AD-07 / AD-08 / AD-09; §4.5.

### §8.8 GuardiansTimelockController Storage Layout

**Constants (no storage slot).** Role hashes inherited from OZ `TimelockController`: `PROPOSER_ROLE`, `EXECUTOR_ROLE`, `CANCELLER_ROLE`, `DEFAULT_ADMIN_ROLE` (the last via `AccessControl`).

**Immutables.** None at the GuardiansTimelockController child level. OZ `TimelockController` itself uses `address private immutable __self` (OZ-internal, used to bind `onlyGovernance` self-calls); this is a transitive immutable not exposed to the child.

**Own mutable storage.** None at the child level — the contract body is empty (§4.6.3 constructor pass-through). All state is in the OZ parent.

**Inherited storage (OZ `TimelockController` v5.1.0):**
- `uint256 private _minDelay` — the 48 h delay.
- `mapping(bytes32 => uint256) private _timestamps` — per-operation ready-time.
- `AccessControl._roles` — `DEFAULT_ADMIN_ROLE`, `PROPOSER_ROLE`, `EXECUTOR_ROLE`, `CANCELLER_ROLE`.

**Migration story.** The Timelock is the **admin root post-B.5**, which makes replacement non-trivial — every role granted to the Timelock across the five protocol contracts must be transferred to the successor.

**Steps:**
1. Deploy new `GuardiansTimelockController` with the desired `_minDelay` and the existing Governor pre-granted `PROPOSER_ROLE` + `CANCELLER_ROLE` (analogous to Phase B.1–B.4).
2. Propose (via the *existing* Timelock) a Governor proposal whose payload calls `grantRole(<role>, newTimelock)` on every protocol contract and then `revokeRole(<role>, oldTimelock)` on each — batched. This is a self-supersession proposal: the old Timelock is signing off on its own replacement, executed under its own 48 h delay.
3. Old Timelock self-renounces `DEFAULT_ADMIN_ROLE` on the new Timelock (if it was granted at step 1) — final lock parallel to Phase B.6.
4. Frontend / off-chain governance UI updated to target the new Timelock.

**Risk during migration window.** Between step 2 (proposal queued) and step 3 (old Timelock dies), both Timelocks transiently hold admin authority. A maliciously-passed proposal during this window could exploit the duplication. **The 48 h delay still applies to such a proposal**, providing the standard review window — but the operational risk is non-trivial enough that this migration should not be undertaken without strong cause.

**Cross-references.** §6 I-16 (min delay); §9.7 (governance trust); §10 AD-10 (open executor); §4.6.

### §8.9 GuardiansGovernor Storage Layout

**Constants (no storage slot).** None declared at the child level (governance parameters are stored in the inherited modules, not as constants).

**Immutables.** None at the child level. The `_token` and `_timelock` references are stored privately by their respective parent modules (`GovernorVotes._token`, `GovernorTimelockControl._timelock`), both set in the parent constructors at deploy time. They have public getters (`token()`, `timelock()`) but no rotators — replacement requires a fresh Governor deployment.

**Own mutable storage.** None at the child level — the contract body is composed entirely of `super.X()` overrides (§4.7.6).

**Inherited storage (OZ v5.1.0 modules):**

| Module | Storage |
|---|---|
| `Governor` | `_name` (immutable from EIP-712), `_proposals` (mapping from proposalId to ProposalCore), EIP-712 cache |
| `GovernorSettings` | `_votingDelay`, `_votingPeriod`, `_proposalThreshold` |
| `GovernorCountingSimple` | `_proposalVotes` (per-proposal tally) |
| `GovernorVotes` | `_token` (private) |
| `GovernorVotesQuorumFraction` | `_quorumNumeratorHistory` (Checkpoints) |
| `GovernorTimelockControl` | `_timelock` (private), `_timelockIds` (mapping proposalId → Timelock op hash) |

**Migration story.**

1. Deploy new `GuardiansGovernor` with the desired settings, pointing at the same token + Timelock (or a new Timelock per §8.8).
2. Via the *existing* Governor + Timelock pipeline, queue a proposal that:
   - `Timelock.grantRole(PROPOSER_ROLE, newGovernor)`
   - `Timelock.grantRole(CANCELLER_ROLE, newGovernor)`
   - `Timelock.revokeRole(PROPOSER_ROLE, oldGovernor)`
   - `Timelock.revokeRole(CANCELLER_ROLE, oldGovernor)`
3. Execute the proposal after the 48 h delay.
4. **Token voting checkpoints remain in GuardiansToken** (§8.3), not in the Governor. The new Governor reads voting weight from the same token — no checkpoint migration required.
5. In-flight proposals on the old Governor remain executable on the old Governor (it still has `PROPOSER_ROLE` until step 3 executes). Operational discipline: do not queue new proposals on the old Governor during the migration window.

**Cross-references.** §6 I-17 (onlyGovernance for self-amendment); §10 AD-11 (BSC block-time variance); §4.7.

### §8.10 Immutable Dependency Matrix

Every `immutable` (Solidity-level) and structurally-fixed reference across the protocol. "Can change in-place?" is **always No** for Solidity `immutable` declarations — the column is listed for completeness; the meaningful column is **Replacement path**.

| Contract | Immutable / fixed dependency | Can change in-place? | Replacement path | Operational impact |
|---|---|---|---|---|
| `CleanupMining` | `gott` (`L46`) | No | Deploy new CleanupMining; re-grant `CLEANUP_MINER_ROLE` on token; re-grant `COLLECTOR_ROLE` on new mining | Epoch clock resets (§8.6); per-user totals not migrated |
| `CleanupMining` | `LAUNCH_TIMESTAMP` (`L49`) | No | Set automatically by `block.timestamp` at deploy | Epoch curve restart at zero — emission schedule disrupted if redeployed mid-protocol |
| `GarbageCollector` | `router` (`L59`) | No | Deploy new GarbageCollector with new router; re-grant `COLLECTOR_ROLE` on CleanupMining | Frontend update; nonce reset (intentional, §8.7) |
| `GarbageCollector` | `WBNB` (`L62`) | No | Same as router (deploy new GC) | Practically a non-event — canonical WBNB on BSC is stable |
| `GarbageCollector` | `scamRegistry` (`L63`) | No | New GC deploy required; the §8.4 ScamRegistry migration is therefore coupled to a §8.7 GarbageCollector migration | Two-contract redeployment in lockstep |
| `GarbageCollector` | `EIP712._HASHED_NAME`, `_HASHED_VERSION` (set at parent constructor `L139`) | No | New GC deploy with same strings keeps EIP-712 metadata stable; domain `verifyingContract` differs anyway | Backend signer must point at new GC address |
| `GuardiansGovernor` | `_token` (private, in `GovernorVotes`) | No | Deploy new Governor pointing at same token + Timelock (§8.9) | Re-grant `PROPOSER_ROLE` / `CANCELLER_ROLE` on Timelock |
| `GuardiansGovernor` | `_timelock` (private, in `GovernorTimelockControl`) | No | New Governor required for new Timelock target | Coupled with §8.8 migration |
| `GuardiansTimelockController` | `_minDelay` (mutable but self-governed) | **Yes, via self-proposal** | `updateDelay(newDelay)` queued + executed under existing delay (I-16) | The proposal must clear the *current* minimum delay before the change takes effect |

**Reading the matrix.**
- The only "Yes, via self-proposal" entry is the Timelock's own `_minDelay`. Every other immutable / fixed reference requires a deploy + governance migration.
- **Token, vault, and mining are the structurally-flexible references** in the cleanup engine — they are mutable on the GarbageCollector and can be re-pointed without a GC redeploy. The router, WBNB, and scam-registry references are **structurally-sealed**.

### §8.11 Redeploy / Migration Playbooks

Each playbook lists the on-chain steps assuming a healthy governance pipeline (Governor + Timelock + 48 h delay). All actions are gated by Timelock proposals unless noted.

**1. Replace GarbageCollector** (e.g., router upgrade or scam-registry replacement)

1. Deploy new `GarbageCollector` with updated `router` / `WBNB` / `scamRegistry` constructor args.
2. Governor proposal batch:
   - `CleanupMining.grantRole(COLLECTOR_ROLE, newGC)`
   - `CleanupMining.revokeRole(COLLECTOR_ROLE, oldGC)`
   - `oldGC.pause()` (optional — prevents in-flight calls landing after revocation)
3. Update frontend EIP-712 `verifyingContract` to new GC address.
4. Update off-chain signer service to issue authorizations against the new domain separator.
5. Verify on BscScan + publish migration announcement.

**2. Replace CleanupMining** (e.g., reward formula bug — last-resort path)

1. Deploy new `CleanupMining` with same `gott` address. `LAUNCH_TIMESTAMP` resets — accept the epoch restart.
2. Governor proposal batch:
   - `GuardiansToken.grantRole(CLEANUP_MINER_ROLE, newMining)`
   - `GarbageCollector.setMiningContract(newMining)` (mutable wiring)
   - `newMining.grantRole(COLLECTOR_ROLE, garbageCollector)`
   - `GuardiansToken.revokeRole(CLEANUP_MINER_ROLE, oldMining)`
3. Per-user totals reset to zero on the new contract — frontend should display historical totals separately.
4. Verify + announce.

**3. Replace ScamRegistry**

1. Deploy new `ScamRegistry`.
2. Off-chain: export all classified tokens from old registry (event replay or state read).
3. New `ORACLE_ROLE` keeper batch-replays classifications via `setStatusBatch` on the new registry (chunked per §11.5).
4. **Coupled GC migration required** (§8.7 / playbook 1) because GC's `scamRegistry` is immutable.
5. Governor revokes the old registry's keeper role (optional — old registry becomes unused but cannot be `selfdestruct`-ed).

**4. Replace LandfillVault**

1. Deploy new `LandfillVault` with desired role configuration (e.g., separate multisig for `EMERGENCY_ROLE` per AD-04).
2. Governor proposal batch — for each token in the old vault:
   - `oldVault.transferToken(token, newVault, balance)` (or `oldVault.burnToken(token, balance)` if the token is to be retired)
3. `GarbageCollector.setLandfillVault(newVault)` (mutable wiring).
4. Governor revokes roles on the old vault. Old vault becomes a dead address.
5. **Stuck-token caveat:** any token whose `transfer` is blocked cannot be moved; the protocol team accepts that residual balance in the old vault may be permanent (§8.5 / §11.6).

**5. Replace Governor / Timelock**

1. Deploy new `GuardiansTimelockController` and new `GuardiansGovernor` (if both are being replaced) — analogous to Phase B.1–B.2.
2. Via the **existing** Governor + Timelock pipeline, queue a self-supersession proposal — payload grants the appropriate roles to the new Timelock + Governor on every protocol contract and revokes from the old ones.
3. Execute after 48 h.
4. Old Timelock + Governor remain on-chain but lose all authority. Old Timelock self-renounces `DEFAULT_ADMIN_ROLE` on the new Timelock if step 2 granted it.
5. **Operational risk window:** between proposal queue and execution, both Timelocks transiently hold admin authority (§8.8). Frontend pause on new proposals during this window is recommended.

**6. Replace GuardiansToken (last-resort)**

The hardest playbook. **Recommended only for a Critical-severity finding on the token itself.**

1. Decide on a snapshot block.
2. Deploy new GOTT token contract (likely with the bug fix). New token starts with `totalSupply = 0` and `initialized = false`.
3. Provide a `claim(amount, merkleProof)`-style migration function on the new token (not present in v0.2.x — would be a v0.3+ addition).
4. Off-chain: compute merkle tree of balances at snapshot block.
5. Users claim into the new token; old token continues to function but the protocol's cleanup engine is paused or pointed to the new token via `CleanupMining` redeploy (because `gott` is immutable on the current mining contract).
6. **ERC20Votes checkpoint history is lost** (or has to be replayed via off-chain delegation re-delegation). Frontend explains.
7. Liquidity pools, exchange listings, indexers — all must follow the new token.

**This playbook touches every protocol contract** and is the reason GuardiansToken is the highest-migration-difficulty entry in §8.2.

### §8.12 Storage Risk Summary

Audit-facing summary of where storage layout intersects with protocol risk.

| Risk | Affected contract | Severity | Why bounded | Migration route | Reference |
|---|---|---|---|---|---|
| Token storage cannot be upgraded in-place | GuardiansToken | High (would-be) | No proxy; deploy + snapshot/claim migration only | §8.11 playbook 6 | §8.3 |
| GarbageCollector immutable `router` / `WBNB` / `scamRegistry` | GarbageCollector | Medium | Mutable wiring (`miningContract`, `landfillVault`, `oracleSigner`) provides operational flexibility; immutables are sealed *by design* to bound trust | §8.11 playbook 1 | §8.7 |
| GarbageCollector fresh `nonces` mapping on redeploy | GarbageCollector | Info | EIP-712 domain separator naturally invalidates pre-signed authorizations on the old contract; no replay risk | §8.7 nonce trade-off | §8.7, I-15 |
| CleanupMining `LAUNCH_TIMESTAMP` immutable | CleanupMining | Medium | Epoch clock resets on redeploy — disruptive mid-curve but acceptable for emergency replacements | §8.11 playbook 2 | §8.6, I-14 |
| LandfillVault permanently stuck non-transferable tokens | LandfillVault | Low | Token-local; no protocol-level escape hatch but no protocol-level fund-at-risk either | §8.5 known limitation | §8.5, §11.6 |
| ScamRegistry classification replay burden on migration | ScamRegistry | Low | Operational — `setStatusBatch` exists; coupled GC redeploy required | §8.11 playbook 3 | §8.4 |
| Governor / Timelock role migration complexity | Governance | Medium | Self-supersession pattern; 48 h delay still applies to the migration proposal | §8.11 playbook 5 | §8.8, §8.9 |
| `ERC20Votes` checkpoint history not portable across token redeploy | GuardiansToken | High (would-be) | No proxy migration; checkpoint Trace208 storage is module-internal | §8.11 playbook 6 step 6 | §8.3 |
| Bootstrap-window admin role concentration (Phase A through B.6) | All contracts | Medium (operational) | Time-bounded; deployer key custody + idempotent `transferAdminRoles.js` | §3.3 + §9.8 + §7.8 | §9.8 |

**Reading the table.**
- **"High (would-be)"** for token storage means a Critical token-layer bug *would* trigger the playbook-6 migration — it is not a live risk but a forward-planning entry for the protocol team's runbook.
- The Medium entries are *operational complexity* during migration, not on-chain security holes.
- The Low entries describe constraints the protocol design has accepted and documented (AD-03, AD-04 family).
- **No storage risk is currently exploitable on-chain.** Every entry assumes a triggering event (a discovered bug, a router deprecation, a Pancake upgrade) that has not occurred.

---

## §9 Trust Assumptions & Oracle Surface

This section enumerates every off-chain or external dependency the protocol *trusts but does not control*. The audit firm should treat each entry as a question of the form "what can this trusted party do, and what stops them from doing more?" Anything that is *not* in this section is, by elimination, fully constrained by on-chain code — the §6 invariant catalog plus the §4 contract inventory.

### §9.1 Trust Model Overview

The GOTT protocol is **non-upgradeable on-chain** (no proxy, no `delegatecall`-to-implementation, no admin-controlled storage rewrites — see §8 once drafted). Once deployed, every contract's bytecode is fixed for its lifetime. Despite this, the live system depends on several off-chain and external actors whose behaviour cannot be verified at compile time. Those dependencies fall into four classes:

| Class | What is trusted | Why it cannot be eliminated |
|---|---|---|
| **1. Hot-key trust** | Off-chain EOAs holding role grants or producing signatures consumed on-chain (`oracleSigner`, `ORACLE_ROLE` keeper, deployer during bootstrap). | The protocol's value proposition requires off-chain inputs (USD pricing, scam classification). Pushing those fully on-chain would require oracles or unbounded computation. |
| **2. External protocol trust** | Other deployed contracts the protocol calls into or reads from (PancakeRouter, WBNB). | The protocol exists to swap tokens; that requires a DEX. Replicating Pancake's liquidity on-chain is out of scope. |
| **3. User-supplied token trust** | Arbitrary ERC-20 tokens that enter `cleanupBatch` and the vault. | The protocol's user-facing flow accepts whatever token the user holds. |
| **4. Governance / process trust** | The Timelock + Governor proposal pipeline + the operational health of voters and proposers after Phase B.5. | The DAO is the protocol's parameter-tuning authority by design. |

Each class is examined below. The format for each subsection is: who is trusted, what they can do, what bounds them on-chain, and what bounds them operationally. The protocol does **not** assume any of these parties is honest or available — only that their *blast radius* is bounded as described.

### §9.2 Hot-Key Surface Summary

| # | Trust surface | Where used | Capability (the worst single action) | Worst-case impact | Bound / mitigation | Related AD | Related invariant |
|---|---|---|---|---|---|---|---|
| 1 | `oracleSigner` EOA | `GarbageCollector.cleanupBatch` EIP-712 signature verification | Forge a `CleanupAuthorization` with arbitrarily inflated `cleanupValueUSD` for any `(user, batchHash, nonce, deadline)` they choose | Mint up to `MAX_MINT_PER_DAY = 1.4M GOTT` per UTC day to attacker-chosen addresses, until rotated. Maximum ≈ 2.8M GOTT (0.28 % of MAX_SUPPLY) across the 48 h Timelock rotation window. | `MAX_MINT_PER_DAY` daily cap (I-02); `MAX_SUPPLY` absolute cap (I-01); per-user monotonic nonce (I-15); per-signature `deadline`; Timelock-gated `setOracleSigner` rotation; operational HSM custody + real-time mint monitoring | AD-07 (Med) | I-01, I-02, I-15 |
| 2 | `ORACLE_ROLE` keeper EOA on ScamRegistry | `ScamRegistry.setStatus` / `setStatusBatch` | Set arbitrary `TokenStatus` on arbitrary tokens (legit → Scam to DoS the cleanup gate; malicious → Legit to bypass it) | Up to 48 h of mis-classification across any subset of tokens. No fund movement. | Enum range check (I-04); `reportCount` monotonic tamper trail (I-05, I-07); `lastUpdated` freshness signal (I-06); Timelock-gated revoke + rotate path; pause via `PAUSER_ROLE` (also Timelock, 48 h delay) | AD-02 (Low) | I-04, I-05, I-06, I-07 |
| 3 | Deployer EOA during Phase A / B (bootstrap window) | All protocol contracts before Phase B.5 cutover; Timelock before Phase B.6 final lock | Hold every admin role on every protocol contract; mint up to `MAX_SUPPLY` via `MINTER_ROLE`; pause or reconfigure any contract; reduce Timelock `_minDelay` before B.6 | Full protocol takeover if the deployer key is compromised during the bootstrap window. | `scripts/transferAdminRoles.js` cuts over to Timelock at B.5; deployer renounces Timelock admin at B.6; idempotent script + `test/RoleTransfer.test.js` (12 tests) cover the cutover ritual | — (not an AD — risk is the *bootstrap window*, see §9.8) | I-01, I-16 |
| 4 | Timelock + Governor (post-Phase-B.5) | Every admin path on every protocol contract | Pass any proposal the Governor passes — re-point `miningContract` / `landfillVault` / `oracleSigner`, change tier thresholds, pause contracts, grant or revoke roles | A malicious proposal that passes the vote and survives the 48 h queue can drain or reconfigure the protocol. The vote + queue gates are the load-bearing protection; there is no checkpoint between queue expiry and execution. | 48 h Timelock review window; `CANCELLER_ROLE` (Governor) can cancel queued ops; open executor (anyone) means execution is observable | AD-10 (Info, open executor); AD-11 (Info, voting-window variance) | I-16, I-17 |
| 5 | `EMERGENCY_ROLE` holder (currently Timelock; future-state separate multisig per AD-04) | `LandfillVault.emergencyWithdraw` (bypasses pause) | Sweep arbitrary tokens out of the vault while paused | Drain the landfill treasury. | `nonReentrant` + role gate; in current deployment also subject to 48 h Timelock delay because `EMERGENCY_ROLE` is held by the Timelock (the architectural intent of "fast circuit breaker" is **not realized** in v0.2.x — see AD-04) | AD-04 (Low) | I-08, I-09, I-10 |

A few patterns to note across the table:
- **Two roles are held by off-chain EOAs in steady state** (rows 1 and 2). All other roles are held either by a contract address (Timelock, Governor, sibling protocol contracts) or by `address(0)` (open executor).
- **No hot-key surface can directly bypass `MAX_SUPPLY` (I-01) or the per-day cap (I-02)** — both are unconditional on-chain checks. The worst-case mint figure for AD-07 is derived *from* I-02 × 48 h, not despite it.
- **Operational controls (HSM custody, monitoring, cancellation watch) are not on-chain enforced.** They are listed in the "Bound / mitigation" column for completeness, but they are exactly the surface the audit firm should challenge as part of the operational-readiness review.

### §9.3 `oracleSigner` Trust Surface

**Where used.** `GarbageCollector.cleanupBatch(...)` (`GarbageCollector.sol:L174`) requires an EIP-712 signature from `oracleSigner` over a `CleanupAuthorization` struct binding `(user, batchHash, cleanupValueUSD, nonce, deadline)`. The signature is verified inside `_verifyAndConsumeAuth(...)` (`GarbageCollector.sol:L228`) via `ECDSA.recover(digest, signature) == oracleSigner` (`L248`). The signer address is stored as a plain mutable `address` — not an `AccessControl` role — and rotated via `setOracleSigner(...)` (`L348`) under `ADMIN_ROLE` (= Timelock post-B.5).

**What the signer can do.**
- Authorise an arbitrarily inflated `cleanupValueUSD` for a batch they sign. This translates linearly into reward magnitude via `CleanupMining.calculateReward(...)` (see §4.4 reward formula).
- Choose the `user` field of the authorization, but the on-chain digest at `GarbageCollector.sol:L242` binds `msg.sender`, not the signed `user` — so a forged authorization can only be executed by the address it was signed for. The attacker must therefore control the recipient address (or coordinate with the user) to capture the forged reward.
- Set arbitrary `deadline` (subject to the user's frontend potentially rejecting unreasonable values — but on-chain there is no upper bound on `deadline`).

**What the signer cannot do.**
- **Move tokens directly.** The signer has no token approval, no role, no admin capability. The only on-chain effect of their signature is to gate the call to `cleanupBatch`.
- **Bypass `minBnbOut`.** The user-supplied `minBnbOut` is a separate `cleanupBatch` argument, not part of the signed payload. A forged signature still has to clear the user's slippage guard; if the user submits an honest `minBnbOut`, the batch reverts when actual BNB received is below.
- **Mint past `MAX_MINT_PER_DAY` (I-02) or `MAX_SUPPLY` (I-01).** Both are on-chain caps enforced by `GuardiansToken.mintReward(...)`.
- **Replay an old signature.** Each signature consumes the user's nonce (I-15) and expires at its `deadline`.

**On-chain bounds.** The protocol-level worst case is therefore bounded by the *product* of: (a) `MAX_MINT_PER_DAY` per UTC day; (b) the 48 h Timelock rotation window; (c) the per-user nonce cadence (a single user can be the target of forged authorizations at most `MAX_MINT_PER_DAY / per-batch reward` times per day before downstream `mintReward` reverts). The 2.8M-GOTT figure in AD-07 is the simple product of (a) × 2 days; it is not improvable by signer-side tricks.

**Operational controls (not on-chain enforced).**
- **HSM or KMS-backed key custody** for the signer service. The protocol's contracts cannot verify how the key is stored.
- **IP / address allowlist** on the backend signer service so only the official frontend submits authorization requests. *Operational, not on-chain enforced.*
- **Real-time monitoring** of `CleanupMining.RewardCalculated` events and `GuardiansToken.mintReward` daily totals (via `mintedPerDay(today)`). Deviation from the expected mining curve (per §4.4.4 epoch table) is the primary anomaly signal. *Operational.*
- **Short signature deadlines** (frontend convention: signed-now + 10–30 minutes). The on-chain contract has no minimum-deadline requirement, so this is purely a frontend/backend discipline. *Operational.*
- **Emergency pause + rotation** — a single Governor proposal can `pause()` the GarbageCollector *and* `setOracleSigner(newSigner)`. Both are subject to the 48 h Timelock delay.

**Residual.** AD-07 (Med). The 2.8M GOTT worst-case figure is accepted; user funds (existing GOTT holdings) are unaffected by the attack; only the emission stream is at risk.

### §9.4 ScamRegistry `ORACLE_ROLE` Trust Surface

**Where used.** `ScamRegistry.setStatus(token, status)` (`ScamRegistry.sol:L81`) and `setStatusBatch(...)` (`L92`) are gated by `onlyRole(ORACLE_ROLE)`. The role holder writes the canonical on-chain classification (`Unknown` / `Legit` / `Dust` / `Dead` / `Scam` / `Drainer` / `Honeypot`) consumed by `GarbageCollector.cleanupBatch` via `isScamOrDrainer(token)` (§4.2.6, §4.5.5).

**What the keeper can do.**
- Flip the status of any token, including legitimate tokens, to any of the seven values.
- Batch-update many tokens in one call via `setStatusBatch`.

**What the keeper cannot do.**
- **Move funds.** The registry holds zero funds.
- **Bypass the enum range** (I-04). Solidity ABI decoding rejects values outside `[0..6]` with `Panic(0x21)`.
- **Erase the audit trail.** `reportCount` (I-05, I-07) is monotonic; `lastUpdated` (I-06) is monotonic. Every write is observable.

**Worst-case impact.**
- **False positive** (legitimate token mis-flagged as `Scam`/`Drainer`/`Honeypot`): users cannot cleanup that token via `cleanupBatch` (the scam pre-check loop reverts at `GarbageCollector.sol:L196`). They can still dump it via `sendScamToLandfill` (which does not consult the registry — see §4.5.6) at the cost of no reward. Bounded user impact, no fund loss.
- **False negative** (malicious token mis-flagged as `Legit` / `Dust` / etc.): a malicious token slips past the swap gate into `cleanupBatch._swapTokenToBNB`. ReentrancyGuard + CEI ordering + swap-fail fallback bound the user's loss to that single batch — the user loses up to the batch's input amount of the malicious token (which they intended to lose anyway as part of cleanup). No protocol-level fund loss.

**On-chain bounds.** Enum range (I-04); tamper trail (I-05, I-06, I-07); revocability of `ORACLE_ROLE` by `DEFAULT_ADMIN_ROLE` (= Timelock).

**Operational controls (not on-chain enforced).**
- **Monitor `StatusUpdated` events** for sudden classification flips on tokens with historical activity. The `oldStatus` / `newStatus` fields plus the `reporter` indexed argument make this a clean indexer target. *Operational.*
- **Pre-submit review** of `setStatusBatch` calls beyond a threshold size (e.g., > 50 tokens in one tx). The contract has no such cap; the review is procedural.
- **Key rotation** via Timelock — `grantRole(ORACLE_ROLE, newKeeper)` + `revokeRole(ORACLE_ROLE, oldKeeper)` in a single proposal (48 h delay).
- **Optional future hardening**: replace the single-keeper EOA with a multisig or a small oracle committee. Not in v0.2.x scope; would be a parameter change post-deploy.

**Residual.** AD-02 (Low). 48 h window of mis-classification accepted because the registry holds zero funds and the worst-case fund-loss path (false negative) is already double-bounded by the cleanup engine's own safety properties.

### §9.5 PancakeRouter / WBNB Trust Boundary

**Where used.** `GarbageCollector._swapTokenToBNB(...)` (`GarbageCollector.sol:L283`) calls `router.swapExactTokensForETH(...)` once per token. The router address is stored as `immutable IPancakeRouter router` (constructor-set at `GarbageCollector.sol:L148`). The WBNB address is stored as `immutable address WBNB` (`L149`) and used as the second hop of every swap path.

**Trust assumption.** The router behaves as a standard Uniswap-V2-style `IRouter02`:
- `swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline)` transfers `amountIn` of `path[0]` from `msg.sender` (the collector, which has approved the router), executes the swap against the router's configured pair pool, and sends the resulting native asset (BNB) to `to`. If the swap cannot meet `amountOutMin` or any path-internal invariant fails, the entire call reverts.
- WBNB is the canonical BSC wrapped-native token at the address fixed in the GarbageCollector constructor.

**What the router can do (under the trust assumption).**
- Quote any exchange rate it likes for any token-to-BNB swap. The collector does not second-guess the rate.
- Revert any individual swap call.
- Send back any amount of BNB ≤ its quoted output. The collector measures `address(this).balance` deltas at the batch level (§4.5.6) rather than trusting per-call return values.

**What the router cannot do.**
- **Be silently swapped.** `router` and `WBNB` are `immutable`. A malicious or upgraded router cannot be injected post-deploy; replacement requires deploying a new `GarbageCollector` and migrating `COLLECTOR_ROLE` on `CleanupMining` to the new instance via a DAO proposal — observable on-chain, queue-gated by Timelock.
- **Drain the collector via a stale allowance.** On router revert, the collector resets the per-token allowance to zero (`forceApprove(router, 0)` at `GarbageCollector.sol:L305`) before forwarding the token to the landfill. No long-lived approval remains.

**Failure mode handling.** Swap revert is *not* a protocol failure — it is the swap-fail fallback path (AD-08). The collector forwards the token to `landfillVault` and emits `SwapFallbackToLandfill`. The batch continues with the remaining tokens; if aggregate BNB received falls below `minBnbOut`, the whole batch reverts and all token movements unwind via EVM semantics.

**On-chain bounds.** Immutability of `router` + `WBNB`; per-token allowance cleanup; batch-level `minBnbOut`; `nonReentrant` on the calling function.

**Operational controls (not on-chain enforced).**
- **Monitoring of router operational status** on BSC. If PancakeRouter v2 is paused or deprecated, the collector should be paused via a Governor proposal until a replacement collector is deployed.
- **Coverage gap (cross-ref §14):** the test suite uses `MockPancakeRouter` (always succeeds at 1:1) and `MockRevertingRouter` (always fails). **There is no fork-test against the real BSC PancakeRouter v2 (`0x10ED43C7…E4cD16Ce`).** Real-token routing on real liquidity pairs — including high-liquidity, low-liquidity, fee-on-transfer, and rebasing tokens — is recommended as audit-firm hardening. Linked to AD-08, AD-09.

**Residual.** Accepted under the assumption of canonical PancakeRouter v2 behaviour. Cross-ref AD-08 (Low–Med) for the user-side UX failure mode and AD-09 (Info) for the per-token slippage trade-off.

### §9.6 User-Supplied ERC-20 Token Trust Boundary

**Where used.** Two paths in the protocol accept arbitrary user-chosen ERC-20 token addresses:
- `GarbageCollector.cleanupBatch(...)` (the swap-and-reward path), via the `tokens[]` calldata array.
- `GarbageCollector.sendScamToLandfill(...)` (the explicit dump path), same.
- `LandfillVault` receives the tokens that fall through either path.

**The protocol does not assume the token is honest, standards-compliant, or non-malicious.** The user is opting into the cleanup of whatever they hold; the protocol's job is to make sure that *no matter what the token does*, neither the protocol nor other users are harmed by including it in a batch.

**Mitigations layered against malicious tokens.**

| Defence | Where | Threat addressed |
|---|---|---|
| `SafeERC20` (`forceApprove`, `safeTransfer`, `safeTransferFrom`) | `GarbageCollector._swapTokenToBNB` + LandfillVault outbound paths | Non-standard ERC-20s (missing return values, USDT-style approve-race) |
| `nonReentrant` on every state-mutating external function | GarbageCollector + Vault | ERC-777-style hook callbacks that re-enter the protocol mid-call |
| CEI ordering inside `cleanupBatch` and `recordCleanup` | GarbageCollector + CleanupMining | Re-entry via the BNB payout call to `msg.sender` (§4.5.5) |
| `maxTokensPerCleanup` ≤ `MAX_TOKENS_HARD_CAP = 50` | GarbageCollector | Gas-griefing tokens with deliberately expensive transfer hooks |
| ScamRegistry pre-check loop | `cleanupBatch` | Tokens previously classified as `Scam` / `Drainer` / `Honeypot` |
| Swap-fail fallback to landfill | `_swapTokenToBNB` catch branch | Tokens that PancakeRouter cannot route (no liquidity, deflationary edge cases) |
| Allowance cleanup on swap fail (`forceApprove(router, 0)`) | `_swapTokenToBNB` | Stale-allowance drain after a malicious approve|
| Token immutability of `router` / `WBNB` / `scamRegistry` | GarbageCollector constructor | Cannot inject a malicious dependency that the user's token weaponizes |

**Known limits (not fully covered by mocks).**
- **Fee-on-transfer (FoT) tokens.** I-08 holds only for non-FoT tokens (see AD-03). The vault's emitted-amount fields drift from on-chain `balanceOf` deltas. Test fixtures (`MockERC20`) are standard non-FoT.
- **Rebasing tokens.** Vault accounting (I-10) implicitly assumes total supply does not grow without explicit mint. Rebasing tokens violate this; out-of-scope per token whitelist (§15 once drafted).
- **ERC-777 / callback-token edge cases.** `nonReentrant` guards re-entry into the same contract path, but does not guard against cross-contract re-entry via the token's `tokensToSend` / `tokensReceived` hooks calling back into a *different* protocol contract. The current protocol surface is shallow enough that no such cross-contract callback exists, but the audit firm should verify this property explicitly.
- **Tokens with non-standard decimals or that revert on zero-amount transfers.** Handled by `SafeERC20` for zero-amount; non-standard decimals affect `cleanupValueUSD` computation (oracle responsibility, not on-chain).

**On-chain bounds.** ReentrancyGuard, CEI, batch-size cap, scam pre-check, swap-fail fallback. None of these depends on the token being well-behaved.

**Operational controls (not on-chain enforced).** Frontend can warn the user before signing a batch that includes tokens with known FoT / rebasing / callback behaviour. *Operational.*

**Cross-references.** AD-03 (Low — FoT drift), AD-08 (Low–Med — swap-fail UX), §4.5.13 (no fork-test against real BSC token diversity), §4.3.13 (no FoT-token fuzz fixtures), §14 (coverage gaps).

### §9.7 Governance / Timelock Trust Boundary

**Where used.** After Phase B.5, every admin role on every protocol contract is held by the Timelock. After Phase B.6 (deployer renounces `DEFAULT_ADMIN_ROLE` on the Timelock), the Timelock itself can only be reconfigured by proposals targeting itself with the full 48 h delay.

**What governance can do.**
- Rotate `oracleSigner` (`GarbageCollector.setOracleSigner`).
- Rotate `ORACLE_ROLE` keeper (`ScamRegistry.grantRole` + `revokeRole`).
- Re-point `miningContract`, `landfillVault` on the collector (mutable wiring).
- Change `baseRate`, `tierBronze`, `tierSilver` on CleanupMining.
- Change `maxTokensPerCleanup`, `swapDeadlineBuffer`, `minCleanupValueUSD` on the collector.
- Pause / unpause any of the five core contracts.
- Burn or transfer any landfilled token via `LandfillVault.burnToken` / `transferToken`.
- Sweep the vault's full balance of any token via `emergencyWithdraw` (currently bypassing pause but still 48 h-gated because the role is held by the Timelock — see AD-04).
- Withdraw stuck BNB from the collector via `withdrawStuckBNB`.
- Mint up to `MAX_SUPPLY` via the token's `MINTER_ROLE` (held by the Timelock post-B.5).
- Modify governance parameters (`votingDelay`, `votingPeriod`, `proposalThreshold`, `quorumNumerator`) via self-proposal (I-17).
- Modify Timelock `_minDelay` via self-proposal (I-16).

**What governance cannot do.**
- **Bypass `MAX_SUPPLY` (I-01).** Even Timelock-routed `mint` calls are subject to the cap.
- **Bypass the 48 h delay.** Every proposal queues for at least the configured `_minDelay`.
- **Execute without observability.** Open executor (AD-10) means every queued proposal is publicly executable — execution is therefore *publicly observable* before it lands.

**Trust assumption (operational).** The protocol assumes that:
- The Governor parameters (4 % quorum, 100k GOTT proposal threshold) produce a healthy proposal cadence. If voter participation collapses, the protocol cannot self-amend.
- Community / monitoring catches malicious proposals during the 48 h queue window. There is no on-chain post-vote review checkpoint (AD-10). *Operational.*
- BSC block production stays within the variance range that keeps the 7-day voting period operationally meaningful (AD-11). *Operational.*

**On-chain bounds.** 48 h Timelock delay; Governor vote thresholds; `MAX_SUPPLY` and `MAX_MINT_PER_DAY` caps; `onlyGovernance` modifier on parameter changes (I-17); `_minDelay` self-bound (I-16).

**Operational controls (not on-chain enforced).** Community proposal-review watchers; documentation / runbook for "malicious proposal nears execution" (§13 once drafted); off-chain coordination of voters.

**Residual.** Accepted. AD-10 (Info — open executor) and AD-11 (Info — BSC block-time variance) cover the two non-obvious aspects.

### §9.8 Bootstrap Trust Window (Phase A & Phase B before final lock)

**Where used.** During the deployment ritual, the deployer EOA holds powerful roles transitionally:

- **Phase A (A.1 through A.9):** Deployer is `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`, `ORACLE_ROLE`, `DAO_ROLE`, `EMERGENCY_ROLE`, and `ADMIN_ROLE` across all five core contracts. Required to wire cross-contract addresses and grant the two contract-bound roles (`CLEANUP_MINER_ROLE`, `COLLECTOR_ROLE`).
- **Phase B.1 through B.4:** Deployer also holds `DEFAULT_ADMIN_ROLE` on the freshly-deployed Timelock — used to grant `PROPOSER_ROLE` and `CANCELLER_ROLE` to the Governor.
- **Phase B.5:** `scripts/transferAdminRoles.js` cuts over: grants Timelock all admin/operational roles, revokes them from deployer. After B.5 the deployer no longer holds *protocol* roles, but still holds `DEFAULT_ADMIN_ROLE` on the Timelock itself.
- **Phase B.6:** Deployer renounces `DEFAULT_ADMIN_ROLE` on the Timelock — final self-lock. After this, no EOA holds any admin role anywhere in the protocol.

**Risk during the window.** If the deployer key is compromised *before* B.6, the attacker holds the same authority as the deployer:
- Pre-B.5: full protocol admin authority on the core contracts.
- Between B.5 and B.6: only `DEFAULT_ADMIN_ROLE` on the Timelock (reducing `_minDelay` or transferring Timelock admin to an attacker-controlled address).

**Mitigations.**
- **`scripts/transferAdminRoles.js`** is idempotent — re-runnable if interrupted; tested in `test/RoleTransfer.test.js` (12 tests) covering grant + revoke ordering, idempotency under partial-state re-runs, and the deliberate skipping of `CLEANUP_MINER_ROLE` / `COLLECTOR_ROLE` (see §5.3).
- **The B.5 cutover is publicly observable** — every grant + revoke emits `RoleGranted` / `RoleRevoked`. The audit firm can sample the chain post-cutover to verify state.
- **B.6 is a single `renounceRole` call** — minimal surface to get wrong.
- **The deployer key is operationally expected to be a hardware wallet or HSM during Phases A and B.** *Operational, not on-chain enforced.*

**Cross-references.** §3.3 (Phase A/B/C lifecycle), §5 Role Matrix (§5.2 transfer-ref column points to `scripts/transferAdminRoles.js` line numbers).

**Trust window length.** Phase A through B.6 is intended to execute within hours, not days, of the initial deployment. The longer the deployer key holds these roles, the larger the operational risk. The audit firm should verify that the deployment runbook (per §12 once drafted, and `docs/DEPLOYMENT.md` when created) specifies same-session execution of Phases A and B.

### §9.9 Trust Assumption Matrix (consolidated summary)

| Trust surface | On-chain bounded? | Off-chain operational control? | Residual risk | Section / AD / invariant refs |
|---|---|---|---|---|
| `oracleSigner` EOA forging `CleanupAuthorization` | ✅ Bounded by `MAX_SUPPLY`, `MAX_MINT_PER_DAY`, per-user nonce, deadline expiry, Timelock rotation | ⚠️ HSM custody + mint-event monitoring + frontend deadline discipline | Up to ≈ 2.8M GOTT (0.28 % MAX_SUPPLY) forgeable mint during 48 h rotation window | §9.3, AD-07 (Med), I-01, I-02, I-15 |
| `ORACLE_ROLE` keeper EOA on ScamRegistry | ✅ Enum range, tamper trail, revocability | ⚠️ Event monitoring + batch-size review + key rotation | Up to 48 h of mis-classification across an arbitrary token set; **no fund movement** | §9.4, AD-02 (Low), I-04, I-05, I-06, I-07 |
| PancakeRouter v2 behaviour (canonical Uniswap-V2 semantics) | ⚠️ Partial — router is immutable, allowance cleanup, batch `minBnbOut` | ⚠️ Off-chain monitoring of router operational status; no fork-test against real router in current suite | Swap-failure UX cost to user; protocol-level fund-loss surface bounded by `minBnbOut` | §9.5, AD-08 (Low–Med), AD-09 (Info), §4.5.13 (coverage gap) |
| Canonical WBNB address on BSC | ✅ Immutable in constructor | — | Zero — WBNB is part of BSC's protocol layer | §9.5 |
| Arbitrary user-supplied ERC-20 tokens | ✅ ReentrancyGuard, CEI, batch cap, SafeERC20, scam pre-check, swap-fail fallback | ⚠️ Frontend warnings for FoT / rebasing / callback tokens | FoT amount-vs-event drift in vault; per-batch user-side loss bounded by `minBnbOut` | §9.6, AD-03 (Low), AD-08 (Low–Med), §4.3.13 + §4.5.13 (coverage gaps) |
| Governor + Timelock (post-B.5) | ✅ 48 h delay, `MAX_SUPPLY`, `onlyGovernance` for self-amendment, role revocability | ⚠️ Community vote turnout + proposal-watch + voting-period block-time variance | A malicious proposal that passes vote + survives 48 h queue can drain or reconfigure the protocol | §9.7, AD-10 (Info), AD-11 (Info), I-16, I-17 |
| Deployer EOA during bootstrap (Phase A + B before B.6) | ❌ **Not on-chain bounded** — deployer holds full admin power across all contracts until B.5, plus Timelock admin until B.6 | ⚠️ Hardware wallet / HSM custody; same-session execution of Phases A and B; idempotent `transferAdminRoles.js` | Full protocol takeover if the deployer key is compromised before B.6 | §9.8, §3.3, §5 Role Matrix, I-16 (post-B.6 only) |
| `EMERGENCY_ROLE` on LandfillVault (currently Timelock; future-state separate multisig per AD-04) | ⚠️ Subject to 48 h Timelock delay in current deployment — the "fast circuit breaker" advantage is **not realized in v0.2.x** | ⚠️ Future-state multisig provisioning + signer onboarding | A Timelock-routed exploit can drain the vault even while paused | §9.2 row 5, AD-04 (Low), I-08, I-09, I-10 |

**Reading the matrix:**
- ✅ in the "On-chain bounded?" column means the worst-case action is bounded by code, not by hope.
- ⚠️ means partial or layered — the column "Off-chain operational control?" is then load-bearing for the residual.
- ❌ means the surface is *not* bounded on-chain. The only such surface in the protocol is the **deployer EOA during the bootstrap window** (§9.8). Every other surface has an on-chain bound; operational controls are layered defence-in-depth rather than sole protection.

The audit firm's operational-readiness checklist should therefore concentrate on: (a) the bootstrap key custody and runbook execution, (b) the two off-chain EOA hot keys (`oracleSigner` and `ORACLE_ROLE` keeper), and (c) the community / monitoring discipline that backs AD-10's "execution is observable" assumption.

---

## §10 Acknowledged Design Decisions

This section catalogs every deliberate trade-off the protocol team has made where the chosen design has known second-order effects that an auditor might otherwise flag as a finding. Each entry follows a 9-element format so the audit firm can decide independently whether to accept, push back, or escalate.

Severity levels follow the SolidProof / Hacken convention:
- **Critical / High** — none in this catalog. (Any High-severity item would block the audit submission.)
- **Med** — non-trivial residual risk; mitigation depends on operational discipline (key custody, monitoring).
- **Low** — bounded residual risk; protocol-level invariants still hold.
- **Low–Med** — bounded *protocol* risk but non-trivial *user* impact in edge cases.
- **Info** — design transparency; no residual risk beyond what is inherent to the chosen primitive.

The catalog is stable across drafts: AD numbers do not change once assigned (see §4.X forward-references). New entries append; existing entries are not renumbered.

### AD-01 — *Reserved*

This slot is intentionally held open for the highest-priority finding to surface during external audit. If the audit firm flags a Critical / High issue that requires a design acceptance (rather than a code fix), it will be documented here. As of Draft 0.3 no such item exists; the slot is reserved to keep the AD-02..AD-NN numbering stable across audit revisions.

### AD-02 — ScamRegistry pause response window relies on 48 h Timelock

**Severity:** Low

**Affected contracts / functions:**
- `ScamRegistry.pause()`, `ScamRegistry.unpause()` — gated by `PAUSER_ROLE`
- `ScamRegistry.setStatus(...)`, `ScamRegistry.setStatusBatch(...)` — `whenNotPaused`
- Downstream: `GarbageCollector.cleanupBatch` scam pre-check loop (§4.5.5 step 1.3)

**Decision:** Do not add an `EMERGENCY_ROLE` (or equivalent fast-pause backup) to ScamRegistry. After Phase B.5, `PAUSER_ROLE` is held only by the Timelock; any pause therefore requires a Governor proposal subject to the full 48 h Timelock delay.

**Rationale:** ScamRegistry holds zero funds. Its on-chain surface is a classification mapping plus monotonic counters — there is no balance to drain, no immediate user loss vector. The cost of an EMERGENCY backup is an extra role, an extra multisig to provision, and a permanent governance attack surface for that multisig. The benefit (faster pause for a contract that cannot lose funds) does not justify the cost.

**Risk / trade-off:** Up to 48 h of attacker-controlled writes if `ORACLE_ROLE` is compromised before the Timelock proposal to revoke executes. During that window:
- *False positives:* mis-flagged-as-Scam tokens DoS the `GarbageCollector` swap gate. Users hold the affected token and route via `sendScamToLandfill` until the proposal executes.
- *False negatives:* mis-flagged-as-Legit malicious tokens slip past the gate into `cleanupBatch`. ReentrancyGuard + CEI + swap-fail fallback bound user loss to the swap output of that single batch.

**Mitigation / operational control:** `ORACLE_ROLE` is revocable by `DEFAULT_ADMIN_ROLE` (= Timelock) via a standard `revokeRole(ORACLE_ROLE, compromisedKey)` DAO proposal. Every `setStatus` call increments a monotonic per-token `reportCount` (I-05), providing an on-chain tamper trail that off-chain monitoring can sample for anomaly detection. A pause proposal and a role-revocation proposal can be queued in the same Timelock batch.

**Residual risk accepted:** Up to 48 h of stale or malicious classifications across the on-chain registry. Bounded user impact per the False-positive / False-negative analysis above.

**Cross-reference:** §4.2.4 (Roles), §5.3 (pause-window asymmetry), §9 (oracle trust analysis), §13 (incident playbook for `ORACLE_ROLE` compromise).

---

### AD-03 — LandfillVault emitted-amount vs on-chain delta drift for fee-on-transfer tokens

**Severity:** Low

**Affected contracts / functions:**
- `LandfillVault.transferToken(token, to, amount)` — emits `TokenTransferred(token, to, amount)` using the *requested* `amount`.
- `LandfillVault.burnToken(token, amount)` — emits `TokenBurned(token, amount)` using the *requested* `amount`.
- `LandfillVault.emergencyWithdraw(token, to)` — uses `balanceOf` directly, so not affected; included for completeness.

**Decision:** Do not implement `balanceBefore` / `balanceAfter` delta measurement in the vault's outbound paths. Emitted-event amount fields use the function argument, not the post-transfer on-chain delta. The contract's authoritative state is `balanceOf(vault, token)`, not the event stream.

**Rationale:** The "balance-of-reality" pattern keeps the vault's storage minimal and gas-cheap (no extra SLOADs around each transfer). Indexers and dashboards consuming vault state are expected to query `balanceOf` for authoritative figures, treating events as activity hints rather than balance arithmetic. Fee-on-transfer tokens are a long-tail of the ERC-20 ecosystem (well under 1% by volume on BSC); a generic FoT-aware vault would impose a flat per-operation gas tax to handle them.

**Risk / trade-off:** Off-chain consumers that sum `TokenTransferred.amount` and `TokenBurned.amount` per token will overstate vault outflow for FoT tokens by the per-transfer fee rate (typically 1–10%). I-08 (`balanceOf == sum_received − sum_movedOut`) is captioned with this caveat: it holds for non-FoT tokens; FoT tokens require the balance-of-reality reading.

**Mitigation / operational control:** Documented inline at `LandfillVault.sol` and in §4.3.6. Indexer documentation (when shipped — Phase 3 frontend) must surface the FoT caveat. Vault `balanceOf` is always authoritative for treasury accounting; event-summed numbers are advisory.

**Residual risk accepted:** Per-token event-arithmetic error of up to the FoT fee rate for any FoT token that lands in the vault. Aggregate cap is `balanceOf(vault, token)`, which cannot be inflated by event drift. No protocol-level invariant is violated.

**Cross-reference:** §4.3.6, §4.3.13 (no FoT coverage in current test suite — recommended for audit-firm fork fixtures), §6 invariant I-08 caveat.

---

### AD-04 — LandfillVault role separation collapsed at deploy (all roles → Timelock)

**Severity:** Low

**Affected contracts / functions:**
- `LandfillVault` Phase A.4 deploy and Phase B.5 cutover.
- `DEFAULT_ADMIN_ROLE`, `DAO_ROLE`, `EMERGENCY_ROLE`, `PAUSER_ROLE` — all granted to the same address (the Timelock) post-B.5.

**Decision:** Use a single Timelock holder for all four LandfillVault roles in v0.2.x deployment. The original architecture intent (per `scripts/deployLandfillVault.js:L67` inline note) was a dedicated separate multisig for `EMERGENCY_ROLE`, providing fast-circuit-breaker authority distinct from the DAO governance path. The deployment script consolidates them for v0.2 simplicity.

**Rationale:** v0.2 deployment scope explicitly excludes a separate multisig — provisioning, key custody, signer onboarding, and multisig contract auditing are all out of scope for the initial Phase B.5 cutover. The architectural intent is preserved: `EMERGENCY_ROLE` is a distinct role on the contract, just temporarily held by the same address as the other three. Upgrading to a separate multisig is a single DAO proposal away (grant `EMERGENCY_ROLE` to multisig, revoke from Timelock).

**Risk / trade-off:** The fast-circuit-breaker advantage of `EMERGENCY_ROLE` (bypasses pause; can sweep vault even when paused) is reduced because invoking it still requires a Timelock proposal with the full 48 h delay. The architectural separation exists at the role level but not the operational level — a Timelock proposal exploit could in principle target `emergencyWithdraw` directly.

**Mitigation / operational control:** All four roles share the same governance gate (Timelock + 48 h), so the *practical* attack surface is the same as for any DAO admin function: a malicious proposal must pass Governor vote + queue + execute. The `EMERGENCY_ROLE` capability is documented in §4.3.4 with its intended (post-upgrade) operational separation.

**Residual risk accepted:** No multi-sig fast-pause architecture is in place for the vault in v0.2.x. The intended diversity benefit (multisig holder distinct from Governor / Timelock holders) is deferred. To upgrade: provision multisig, schedule a Timelock proposal that calls `grantRole(EMERGENCY_ROLE, multisig)` + `revokeRole(EMERGENCY_ROLE, timelock)` — single batched action, ~48 h to execute.

**Cross-reference:** §4.3.4 (LandfillVault roles), §5.3 (pause-window asymmetry note), `scripts/transferAdminRoles.js:30`, deploy-script inline note at `scripts/deployLandfillVault.js:L67`.

---

### AD-05 — CleanupMining divide-before-multiply pattern

**Severity:** Info

**Affected contracts / functions:**
- `CleanupMining.calculateReward(...)` body, lines L182–186 (paired Slither suppression `divide-before-multiply`).
- Comment block at L24: `reward = (baseRate × cleanupValueUSD × tierMult × epochMult) / 1e54`.

**Decision:** Compute the reward by dividing by `1e18` three times sequentially during the multiplication chain, rather than multiplying all four factors first and dividing by `1e54` at the end. The literal "multiply-then-divide" form is the mathematically equivalent reference; the implementation is the divide-early form.

**Rationale:** All four input factors are 1e18-scaled (`baseRate`, `cleanupValueUSD`, `tierMult`, `epochMult` ∈ [`0.125e18`..`1000e18`]). The product `baseRate × cleanupValueUSD × tierMult × epochMult` overflows `uint256` (≈ `1.16 × 10⁷⁷`) for any `cleanupValueUSD ≥ ≈ $2,000`. The divide-early form caps each intermediate at a known-safe magnitude (each division by `1e18` restores the scale before the next multiplication), keeping every intermediate well below `uint256.max`.

**Risk / trade-off:** Truncation rounding occurs at each intermediate division. For inputs that are all 1e18-scaled (which they always are in this contract), the truncation error per division is sub-wei.

**Mitigation / operational control:** Inline `// slither-disable-start divide-before-multiply` block documents the rationale at `CleanupMining.sol:L182-186`. The §16 Appendix C (pending §16 draft) will provide the full overflow derivation. Foundry fuzz test `testFuzz_rewardScalesLinearlyWithValue` exercises the formula across a wide value range; the implementation matches the linear-scaling property within rounding tolerance.

**Residual risk accepted:** Per-cleanup reward may be rounded down by up to ≈ 3 wei (one per division step). Aggregate underpayment across the protocol lifetime is bounded by `3 × total_cleanups`, which is operationally invisible (≈ 1e9 cleanups × 3 wei ≪ 1 GOTT).

**Cross-reference:** §4.4.10 (CleanupMining math sanity check), §4.4.12 (Slither suppression rationale), §16 Appendix C (pending — full derivation).

---

### AD-06 — GuardiansToken UTC mint-bucket timestamp granularity

**Severity:** Info

**Affected contracts / functions:**
- `GuardiansToken.mintReward(...)` — uses `block.timestamp / 1 days` as the key into `mintedPerDay`.
- `mintedPerDay` storage mapping.

**Decision:** Bucket the daily mint cap by canonical EVM-day (`block.timestamp / 86400`). Boundaries roll over at UTC midnight, not project-local midnight. No caller-supplied epoch parameter, no separate per-day-checkpoint state.

**Rationale:** Cheap (single `/ 1 days` integer division), unambiguous (UTC has no DST), and matches the on-chain convention for daily-bucket primitives across the OZ ecosystem. The protocol is Indonesia-first (UTC+7); the team accepted UTC midnight rather than a custom WIB-midnight bucket because (a) Solidity has no timezone, (b) UTC matches all external indexers and observability tools, and (c) a custom WIB bucket would require a hard-coded `+25,200s` offset that future timezone changes (DST or government time changes) could invalidate.

**Risk / trade-off:** BSC validators can shift `block.timestamp` by up to ~15 seconds without immediate consensus rejection. A transaction submitted near the UTC-midnight boundary may be attributed to either day depending on the inclusion block's stamp.

**Mitigation / operational control:** The daily cap is large enough that edge-of-day variance is negligible: `MAX_MINT_PER_DAY = 1.4M GOTT`, and the validator-controllable window is `~15s` out of `86,400s` (~0.017% of the day). In the worst case, an attacker who somehow times all their cleanups for the last 15 seconds before midnight could fit two days' worth of mints into a single 15-second window if validator collusion is assumed — but this requires both (i) the daily cap to be otherwise binding and (ii) validator collusion to manipulate timestamps, both of which are independently bounded.

**Residual risk accepted:** Up to ~15 seconds of validator-influenced day attribution per UTC-midnight crossing. The token's mint flow remains capped per day under all realistic operating assumptions.

**Cross-reference:** §3.4 (off-chain dependencies — validator timestamp assumption), §4.1 (GuardiansToken).

---

### AD-07 — `oracleSigner` single-key risk

**Severity:** Med

**Affected contracts / functions:**
- `GarbageCollector.cleanupBatch(...)` — every batch is authorised by an EIP-712 signature from `oracleSigner`.
- `GarbageCollector.setOracleSigner(address)` — `onlyRole(ADMIN_ROLE)` rotation path.
- `GarbageCollector.oracleSigner` — single mutable `address` (not an `AccessControl` role).
- Downstream: `CleanupMining.recordCleanup` and `GuardiansToken.mintReward` (the reward path).

**Decision:** For v0.2.x, a single externally-owned account holds the `oracleSigner` private key and signs every `CleanupAuthorization`. The key is custodied by the Guardians backend service. Multi-sig signature aggregation (e.g., 2-of-3 backend signers) is deferred to v0.3+.

**Rationale:** Multi-sig signer aggregation requires (a) frontend coordination to collect signatures from multiple endpoints before submitting `cleanupBatch`, (b) backend infrastructure to run multiple signer endpoints with HSM/KMS-managed keys per endpoint, and (c) signature-set encoding inside the existing EIP-712 payload. All three are non-trivial; none are required to ship v0.2.x. The Phase B.5 Timelock (with 48 h rotation delay) is the load-bearing rotation primitive — a compromised key is not a permanent compromise.

**Risk / trade-off:** A compromised `oracleSigner` private key can forge `CleanupAuthorization` signatures for arbitrary `cleanupValueUSD`, minting unlimited GOTT bounded only by the downstream `MAX_MINT_PER_DAY` cap (1.4M GOTT, §4.1.10). Across the maximum 48 h Timelock rotation window, the upper bound on forgeable mint is **2 days × 1.4M = 2.8M GOTT ≈ 0.28 % of MAX_SUPPLY (1B)**. The attacker would also need to control or coordinate with `msg.sender` addresses, since the signed digest binds `msg.sender` (§4.5.6 internal helpers).

**Mitigation / operational control:**
- Backend key custody via HSM / cloud KMS (operational, not on-chain).
- Real-time monitoring of `RewardCalculated` events from CleanupMining + `Transfer` events from GuardiansToken — deviation from the expected mining curve (per §4.4.4 epoch table) flags an anomaly within minutes.
- Rotation path: `setOracleSigner(newSigner)` proposed by Governor + queued by Timelock (48 h). The protocol-level rotation cap is therefore 48 h between detection and freeze.
- Per-user nonce + deadline on the signed authorization means signatures pre-signed before the compromise cannot be reused after the user's nonce advances; signatures forged *during* the compromise window expire at their `deadline` field (typically minutes to hours).
- Optional faster path: `pause()` the GarbageCollector via `PAUSER_ROLE` (also held by Timelock — 48 h delay applies) suspends all `cleanupBatch` calls without rotating the key. Combine pause + key rotation in one batched proposal.

**Residual risk accepted:** Up to 2.8M GOTT forgeable mint during the worst-case 48 h incident-response window (detection latency + Timelock rotation delay). User-fund impact is zero (forged mint diverts emission to the attacker's address; existing GOTT holdings are unaffected). The 0.28 % of MAX_SUPPLY cap is the load-bearing protocol-level bound.

**Cross-reference:** §4.5.4 (Roles + single-key risk callout), §4.5.6 (`_verifyAndConsumeAuth` audit checkpoints), §5.3 (hot-key table — first row), §9 (full trust analysis — pending §9 draft), §13 (incident playbook — pending §13 draft).

---

### AD-08 — Swap-fail fallback forwards token to LandfillVault without BNB refund

**Severity:** Low–Med

**Affected contracts / functions:**
- `GarbageCollector._swapTokenToBNB(token, amount, from)` `catch` branch (`GarbageCollector.sol:L303-308`).
- `GarbageCollector.cleanupBatch(...)` — calls `_swapTokenToBNB` per token; aggregates BNB via `address(this).balance` delta.
- Emits `SwapFallbackToLandfill(user, token, amount)` per failed swap (one event per token).

**Decision:** On `swapExactTokensForETH` revert, the catch branch resets the router approval to zero and forwards the user's token amount to `landfillVault` instead of propagating the revert to the batch level. The reward bookkeeping (`miningContract.recordCleanup`) still proceeds using the full `cleanupValueUSD` signed by the oracle.

**Rationale:** Per-token revert that propagated to the batch level would (i) burn the user's gas for any tokens that successfully swapped earlier in the same batch, and (ii) require the user to re-sign a fresh EIP-712 authorization with a fresh nonce to retry. The fallback-to-landfill behaviour preserves the working portion of the batch and emits a clear event so frontends can inform the user.

**Risk / trade-off:** A user whose token fails to swap loses that token to the vault but receives no BNB refund for it. They are still charged for that token's notional value in the `cleanupValueUSD` total (the oracle signed the entire batch as a single sum). In the worst case — 1 token succeeds (above `minBnbOut`), N tokens fail — the user effectively pays the asset cost of N tokens for the BNB output of 1.

**Mitigation / operational control:**
- Batch-level `minBnbOut` is the user's primary safety net: if the aggregate BNB across all successful swaps falls below `minBnbOut`, the whole batch reverts and all token transfers (including the failed-to-landfill forwards) are restored by EVM revert semantics.
- Frontend responsibility: estimate per-token swap likelihood at sign time and present a realistic `minBnbOut`. Tokens with known liquidity issues should be routed via `sendScamToLandfill` (no reward, no oracle signature) instead.
- `SwapFallbackToLandfill` event allows off-chain refund decisions (manual treasury restitution from `landfillVault` via DAO proposal).
- Per-token slippage cap (AD-09) is the architectural future direction; deferred to v0.3+ due to EIP-712 payload constraints.

**Residual risk accepted:** Pathological-case user UX failure where the user loses most of a batch's token value to landfill without proportional BNB output. Bounded by `minBnbOut`. Frontend documentation must surface this trade-off; mid-term hardening is per-token slippage caps in v0.3+.

**Cross-reference:** §4.5.6 (`_swapTokenToBNB` audit checkpoints), §4.5.13 (no fork-test against real PancakeRouter — coverage gap), §11 Gas & DoS surface (pending §11 draft).

---

### AD-09 — Per-token slippage = 0; batch-level `minBnbOut` is the sole slippage guard

**Severity:** Info

**Affected contracts / functions:**
- `GarbageCollector._swapTokenToBNB(...)` `router.swapExactTokensForETH(amount, 0, path, ...)` call (`GarbageCollector.sol:L297` — second argument is `amountOutMin = 0`).
- `GarbageCollector.cleanupBatch(...)` `totalBnbReceived < minBnbOut` check at `GarbageCollector.sol:L204`.

**Decision:** Set the per-token `amountOutMin` parameter on every Pancake router call to zero. Slippage protection is enforced only at the batch level, via the user-supplied `minBnbOut` against the post-swap `address(this).balance` delta.

**Rationale:** A per-token slippage cap requires a per-token USD quote computed at signature time. The current `CleanupAuthorization` EIP-712 payload commits only to the aggregate `cleanupValueUSD`; adding per-token caps would require either (i) extending the payload to carry an `expectedBnbOut[]` parallel array (increasing signed-data size linearly with batch size and complicating the off-chain signer service), or (ii) deriving per-token caps from the aggregate at sign time (which loses the per-token granularity benefit). The chosen design treats `minBnbOut` as the user's risk-tolerance knob; the frontend computes a realistic value from live routing quotes.

**Risk / trade-off:** A targeted MEV sandwich attack on a single token in a batch can push that token's BNB output to near-zero. The batch survives only if the remaining tokens overproduce BNB sufficient to clear `minBnbOut` (in which case the attacker captures the sandwiched portion but the batch still completes with reduced output).

**Mitigation / operational control:**
- Frontend computes `minBnbOut` from realistic per-block routing quotes including a 1–2 % slippage tolerance margin.
- Users with low risk tolerance can lower `minBnbOut` further at the cost of higher revert probability under adverse routing conditions.
- High-MEV-risk tokens (e.g., low-liquidity longtails) are observably routable via `sendScamToLandfill` to avoid the swap path entirely.

**Residual risk accepted:** Per-token sandwich-attack exposure bounded only by the aggregate `minBnbOut`. Future hardening = per-token slippage caps in signed metadata (v0.3+ depending on EIP-712 payload-size trade-off vs frontend complexity).

**Cross-reference:** §4.5.6 (`_swapTokenToBNB` audit notes), AD-08 (linked failure mode).

---

### AD-10 — Timelock open executor (`executors = [address(0)]`)

**Severity:** Info

**Affected contracts / functions:**
- `GuardiansTimelockController` constructor at Phase B.1.
- `EXECUTOR_ROLE` granted to `address(0)` — OZ `TimelockController` short-circuits the `onlyRoleOrOpenRole(EXECUTOR_ROLE)` gate when `hasRole(EXECUTOR_ROLE, address(0))` is true.

**Decision:** Pass `executors = [address(0)]` to the `TimelockController` constructor. After a proposal has been queued by the Governor and its 48 h delay has elapsed, `execute(...)` and `executeBatch(...)` are callable by any address.

**Rationale:** This is the OZ-recommended pattern for public DAOs (per the v5.1.0 docs and the Governor reference deployments). Removing executor-role gating means the protocol does not depend on a single designated relayer key for liveness — any community member, MEV searcher, or watcher bot can execute a queued proposal once its delay expires. Reducing liveness dependence to "any rational actor with gas" is strictly better than depending on a specific relayer.

**Risk / trade-off:** Once a malicious proposal has passed Governor vote *and* survived the 48 h Timelock queue, no further gating exists between queue expiry and execution. The "open execution" is therefore the absence of a *post-approval* checkpoint, not the absence of a *pre-approval* checkpoint — the vote + queue gates remain fully in force.

**Mitigation / operational control:**
- The 48 h Timelock queue is the load-bearing review window. The community (and the audit firm, post-deployment) has 48 h to inspect every queued proposal's payload for malicious intent.
- `CANCELLER_ROLE` is held by the Governor (granted at Phase B.4); a separate Governor proposal can cancel a queued op before its delay expires. Cancellation is a separate vote, but the 48 h window is generous enough to organize one.
- Bug-bounty scope (Phase 4.5) is expected to cover "malicious-but-passed proposal" scenarios.

**Residual risk accepted:** No checkpoint between Timelock queue expiry and execution. Risk is fully mitigated only if the vote + queue + community-watch system detects malicious proposals during the queue window. This is the canonical OZ-DAO trust model.

**Cross-reference:** §4.6.4 (Timelock roles), §5.2 (matrix), §13 Emergency Response (pending §13 — incident playbook for "malicious proposal nears execution").

---

### AD-11 — BSC block-time variance shifts effective Governor voting window

**Severity:** Info

**Affected contracts / functions:**
- `GuardiansGovernor` constructor parameters: `votingDelay = 28,800` blocks, `votingPeriod = 201,600` blocks.
- Inherited `Governor.clock()` returns `block.number` (because `GuardiansToken.clock()` uses the OZ v5 default, see §4.1.2).

**Decision:** Use the OZ v5 default block-number clock for governance time-keeping. Voting periods are denominated in BSC blocks. The nominal conversion `28,800 blocks ≈ 1 day` and `201,600 blocks ≈ 7 days` assumes BSC's design-target 3-second block time.

**Rationale:** Switching to a timestamp-based clock (ERC-6372 `CLOCK_MODE`) would require GuardiansToken to override its clock mode, propagating to every Votes-based contract that reads from the token. The block-number clock matches BSC's canonical voting denomination and avoids timestamp-manipulation surface (timestamps are validator-controllable by ~15 s; block numbers are not).

**Risk / trade-off:** BSC block production is bounded but variable — historically observed between ~2.5 s (light load) and ~4 s (congestion). At 2.5 s/block, `201,600 blocks ≈ 5.8 days`. At 4 s/block, `201,600 blocks ≈ 9.3 days`. The effective wall-clock voting window therefore varies by approximately **±20–30 %** around the 7-day target.

**Mitigation / operational control:**
- The 7-day voting period is generously sized — even at the high end (~9.3 days) it is operationally manageable; even at the low end (~5.8 days) it leaves time for vote organization.
- The 1-day voting delay (28,800 blocks) similarly varies ~0.83–1.33 days, providing proposers a buffer window for off-chain pre-vote coordination.
- Frontend / governance UI should display *block-number deadlines* alongside best-effort wall-clock estimates, reminding voters that the wall-clock end is approximate.

**Residual risk accepted:** Effective voting wall-clock window shifts by ~24 % around the 7-day target across normal BSC operating conditions. Operationally tolerable for the expected DAO cadence (parameter changes, role rotations, treasury proposals — none of which are time-sensitive at the hour scale).

**Cross-reference:** §4.7.10 (Governor immutables + BSC block-time assumption), §3.4 (off-chain dependencies — implicit BSC chain-time assumption).

---

## §11 Gas & DoS Surface

### §11.1 Scope and Threat Model

This section enumerates every loop, gas-sensitive path, external-call dependency, and atomicity surface that could be exploited to deny service or to grief users with wasted gas. Each item is classified by scope:

| Scope | Definition | Example |
|---|---|---|
| **User-local** | Failure affects only the calling user's transaction. Gas is lost; no other user, no protocol state is impacted. | A hostile ERC-20 reverts inside the user's `cleanupBatch`; the user's tx reverts, other users are unaffected. |
| **Role-local** | Failure affects only operations gated by a specific role; non-role actions continue. | `ORACLE_ROLE` keeper submits a batch too large for block gas; `setStatusBatch` reverts, but `cleanupBatch` and other contracts are unaffected. |
| **Protocol-global** | Failure halts a contract-wide capability for all users until resolved. | `GarbageCollector` paused → no user can call `cleanupBatch` until governance unpauses. |
| **Governance** | Failure inside a Governor proposal's execution. | A queued proposal's target call reverts; `executeBatch` reverts; the proposal stays in `Queued` state until re-attempted. |
| **External protocol** | A deployed contract the protocol depends on becomes unavailable or misbehaves. | PancakeRouter v2 is paused or deprecated; per-token swaps fail; batches fall back to landfill or revert on aggregate `minBnbOut`. |

**Not every revert is a vulnerability.** Several reverts in the protocol are intentional safety halts: `MAX_SUPPLY` overflow (I-01), daily-cap overflow (I-02), `whenNotPaused` gates, role checks. These should not be conflated with DoS — they are the protocol functioning correctly. This section focuses on reverts that are *unintended* failure modes or *intended* failure modes whose blast radius the audit firm should verify.

### §11.2 Loop Inventory

Every loop in the protocol, with explicit bound and gas-control owner.

| Contract / function | Loop over | Max bound | Length controlled by | External calls inside? | DoS risk | Mitigation / cross-ref |
|---|---|---|---|---|---|---|
| `GuardiansToken.distributeInitial` (`GuardiansToken.sol:L115` validation loop + `L127` mint loop) | `recipients[]` | **No hard cap** | Admin / `DEFAULT_ADMIN_ROLE` (deployer at TGE, one-shot) | mint loop: internal `_mint` only (no external) | Admin-supplied; one-shot at TGE — if admin batches too many recipients in one tx, the call reverts on block gas, but no state changes (I-03 keeps `initialized = false`). Admin can retry with smaller chunks. | One-shot guard (I-03) + admin-only — not a runtime user-facing path. |
| `ScamRegistry.setStatusBatch` (`ScamRegistry.sol:L100`) | `tokens[]` × `statuses[]` | **No hard cap** | `ORACLE_ROLE` keeper | per-iteration: only internal `_setStatus` (no external calls) | Operator-controlled gas — if the keeper submits a batch too large for block gas, the call reverts; no funds at risk; classifications already on-chain are unaffected. | Operational discipline (chunk large updates). Audit firm may request a `maxBatchSize` parameter — see §11.5 and §11.13. |
| `GarbageCollector.cleanupBatch` scam pre-check loop (`GarbageCollector.sol:L194`) | `tokens[]` | **`maxTokensPerCleanup` ≤ `MAX_TOKENS_HARD_CAP` = 50** | User-supplied `tokens[]`, bounded by `maxTokensPerCleanup` (default 20) | Yes — `ScamRegistry.isScamOrDrainer(token)` per iteration (view) | Bounded by `MAX_TOKENS_HARD_CAP`. Per-iteration call is a single-SLOAD view (§4.2.6); 50 × cheap view + arithmetic stays well below BSC's 30M block gas. | §4.5.5, §4.5.10 (hard cap rationale), `// slither-disable-next-line calls-loop` at L195. |
| `GarbageCollector.cleanupBatch` swap loop (`GarbageCollector.sol:L200`) | `tokens[]` | Same — bounded by `maxTokensPerCleanup` ≤ 50 | Same | Yes — `safeTransferFrom`, `forceApprove`, `swapExactTokensForETH`, and on revert `forceApprove(router, 0)` + `safeTransfer(landfillVault)` | Bounded by hard cap, but per-iteration cost is dominated by router + token. A 50-token batch with adversarial-gas tokens is the protocol's worst-case `cleanupBatch` gas profile. | §4.5.6, AD-09; recommended fork-test against real BSC PancakeRouter v2 with diverse tokens (§4.5.13 gap, §11.13). |
| `GarbageCollector.sendScamToLandfill` (`GarbageCollector.sol:L269`) | `tokens[]` × `amounts[]` | **No hard cap** (only empty / length-mismatch checks) | User-supplied | Yes — `safeTransferFrom` per iteration | User pays their own gas. If the user submits a batch too large for block gas, the call reverts with no state change. | User-local gas loss only — protocol-level state is never partially mutated because EVM revert unwinds all per-token transfers. §7.4 |
| `LandfillVault.*` | — | — | — | — | **No loops in the vault.** All outbound operations are one-token-per-call. | §4.3.6 |
| `CleanupMining.recordCleanup` | — | — | — | — | **No loops.** Constant-time reward computation + storage writes + single external `mintReward` call. | §4.4.6 |
| `GuardiansTimelockController.executeBatch` (inherited OZ) | `targets[]` × `values[]` × `payloads[]` | **No hard cap** (OZ default) | Proposer (Governor) at queue time | Yes — one external call per target | Governance-scope DoS: a proposal that bundles too many operations may revert on block gas. | Operational — see §11.9. |

**Patterns to note.**
- **Two of the seven loops have a hard on-chain cap** (the two inside `cleanupBatch`). All other loops rely on the caller's discipline.
- **No loop performs more than one external call per iteration except the swap loop**, and the swap loop is the one with the tightest cap.
- **No loop in the protocol is over an unbounded on-chain set** (e.g., over all users, all tokens, etc.). Every loop iterates over a *caller-supplied* array; the worst case is the caller burns their own gas, not that the contract iterates indefinitely.

### §11.3 GarbageCollector Batch Gas Surface

`cleanupBatch` is the highest-gas path in the protocol. Its cost profile decomposes as:

```
total_gas ≈ fixed_overhead
          + N × (scam_precheck_view + safeTransferFrom + forceApprove + router_swap)
          + recordCleanup_overhead
          + mintReward_overhead
          + bnb_payout_overhead
```

where N = `tokens.length` ≤ `maxTokensPerCleanup` ≤ `MAX_TOKENS_HARD_CAP = 50`.

**Two distinct loops on `tokens[]`, both bounded by the same `len`:**

1. **Scam pre-check loop** (`GarbageCollector.sol:L194-197`) — single view call per token. Reverts the *whole* batch if any token is flagged. Cheap per iteration but reads from a different contract (cold-SLOAD on first access of each token's `TokenInfo` slot).
2. **Swap loop** (`GarbageCollector.sol:L200-202`) — calls `_swapTokenToBNB` per token. Per-iteration cost is dominated by `PancakeRouter.swapExactTokensForETH` (typically 100k-200k gas on standard pairs, more for low-liquidity pairs that route through multiple pools).

**Two structural caveats.**
- Per-token cost is **not bounded by the contract** — it is bounded by the *token's* transfer implementation and the router's path complexity. A hostile token with a deliberately expensive `transfer` hook can blow up per-iteration gas. The user pays this cost. The protocol cannot guarantee `cleanupBatch` will fit in a block for adversarial tokens.
- `minBnbOut` failure (§7.3 step 7) reverts the whole transaction **after** all per-token work has been done. This is **user-local gas loss**, not protocol-state corruption — but it is a real cost the user should be made aware of by the frontend before signing.

**Hard cap rationale (§4.5.10).** `MAX_TOKENS_HARD_CAP = 50` was chosen so that even a 50-token batch with adversarial-cost tokens stays inside BSC's 30M block-gas limit by a comfortable margin (rough envelope: 50 × ~500k worst-case-per-token = 25M, still ≤ 30M). The runtime cap `maxTokensPerCleanup` defaults to 20 and is admin-settable up to the hard cap.

**Cross-references.** §4.5.10 (immutables), §7.3 (call-graph), §7.6 (swap fallback), AD-08 (Low–Med, swap-fail UX), AD-09 (Info, per-token slippage = 0).

### §11.4 User-Supplied ERC-20 Gas Griefing

An arbitrary ERC-20 token passed to `cleanupBatch` or `sendScamToLandfill` can grief the user in several ways:

| Token behaviour | Effect on `cleanupBatch` | Effect on `sendScamToLandfill` |
|---|---|---|
| `transferFrom` always reverts | safe-transferFrom step (§7.3 step 4) reverts → **whole batch reverts** (no try/catch on this path) | per-token `safeTransferFrom` reverts → **whole call reverts**, prior per-token transfers in the same call unwound |
| `transferFrom` consumes 1M+ gas | per-token gas blows up; if total exceeds block gas, whole batch reverts; user pays the gas | same — user pays |
| ERC-777 callback (`tokensToSend` / `tokensReceived`) | callback may re-enter the protocol; `nonReentrant` on `cleanupBatch` blocks re-entry into the same contract; cross-contract re-entry is not blocked but the protocol's external surface is shallow enough to make this hard to exploit | same — `nonReentrant` blocks re-entry |
| Fee-on-transfer | `safeTransferFrom(user, gc, amount)` moves less than `amount` to the GC; subsequent `forceApprove(router, amount)` + `swapExactTokensForETH(amount, ...)` may revert because the GC's balance is less than `amount`. **Result: this token falls into the try/catch fallback path → sent to landfill.** | tokens forwarded directly to vault with fee deducted; vault accounting drifts (AD-03) |
| Rebasing | `balanceOf(gc)` can grow or shrink between `safeTransferFrom` and `swap`. If it shrinks below `amount`, router reverts → catch branch → token forwarded to landfill | tokens forwarded; vault accounting drifts |
| Reverts when `amount == 0` | per-iteration revert if batch contains a zero amount; both paths revert with no partial-state | same |

**Mitigations layered in the protocol.**
- `SafeERC20` (`forceApprove`, `safeTransferFrom`, `safeTransfer`) handles non-standard return values and USDT-style approve-race.
- `nonReentrant` blocks re-entry on the calling contract path.
- CEI ordering bounds the time window for any side-effect to land.
- `maxTokensPerCleanup` bounds the per-batch gas budget.
- Scam pre-check excludes known malicious tokens from the swap path.
- The try/catch fallback (around the router call only — see §7.6) routes router-rejected tokens to landfill rather than reverting.

**Limits.**
- The protocol **cannot guarantee** a successful cleanup for an adversarial token.
- Worst case is **user-local**: the user's transaction reverts (paying gas) or the user's token ends up in the landfill instead of swapped (AD-08).
- **No protocol-global halt** is triggered by a hostile token — other users' `cleanupBatch` calls are unaffected by another user's hostile-token tx (each `cleanupBatch` reads `ScamRegistry` and operates on its own `tokens[]`).

**Cross-references.** §9.6 (user-supplied token trust boundary), §14 (recommended FoT / rebasing / ERC-777 coverage), AD-03 / AD-08.

### §11.5 ScamRegistry Batch Update Gas Surface

`setStatusBatch(tokens[], statuses[])` loops over the input arrays. No on-chain max batch size. The role gate (`ORACLE_ROLE`) limits the caller to the off-chain keeper key.

**Failure modes.**
- A batch too large for block gas reverts; no state change.
- A batch within block gas executes atomically — all classifications applied or none.
- No funds are at risk in any case.

**Why no on-chain `maxBatchSize`?** The `ORACLE_ROLE` is trusted (within the bounds described in §9.4 and AD-02) and operationally controlled. Adding a `maxBatchSize` parameter would (a) require a Governor proposal to tune, (b) add a code path to test, and (c) provide no protection that the keeper's own discipline doesn't already provide. **However, the audit firm may legitimately request this parameter** as a defence-in-depth measure if `ORACLE_ROLE` is ever held by a less-trusted multisig in the future.

**Operational mitigations.**
- Chunk large updates into multiple txs (e.g., 100 tokens per call). *Operational, not on-chain.*
- Monitor `StatusUpdated` indexing throughput on the backend.
- Future optional hardening: if the audit firm flags this as a finding, add `if (len > MAX_BATCH) revert OversizedBatch();` at the top of `setStatusBatch`. Single-line change.

**Cross-references.** §4.2.6, §9.4, AD-02 (Low — pause response window).

### §11.6 LandfillVault Gas / DoS Surface

The vault has **no loops** in any of its operations:

- `burnToken(token, amount)` — single `safeTransfer(0xdEaD, amount)`.
- `transferToken(token, to, amount)` — single `safeTransfer(to, amount)`.
- `emergencyWithdraw(token, to)` — single `safeTransfer(to, balanceOf(this))`.
- `getBalance(token)` — single `balanceOf` view.

**Failure modes are token-local.**
- If a token's `transfer` reverts (e.g., paused token, blacklist), the vault's outbound call reverts. The vault's state is unchanged.
- `emergencyWithdraw` may fail for the same reason. There is no protocol-level escape hatch if a token has decided to lock the vault's balance.

**This is token-local DoS, not protocol-global.** Other tokens in the vault remain unaffected. A burn proposal for token A still succeeds even if token B's transfer is reverting.

**FoT / rebasing caveat (AD-03).** For fee-on-transfer tokens, the vault's emitted-amount fields (`TokenBurned.amount`, `TokenTransferred.amount`) differ from the on-chain `balanceOf` delta. This is event-stream drift, not a DoS — the operation still succeeds; only the indexer view is approximate.

**Cross-references.** §4.3, §6 I-08 (with AD-03 caveat), §9.6.

### §11.7 CleanupMining Gas / DoS Surface

`CleanupMining.recordCleanup` has **no loops**. Per-call work:

1. Read `getCurrentEpoch()`, `getTierMultiplier(user, value)`, `calculateReward(...)` — all constant-time view computations.
2. Storage writes: `totalRewardsEarned[user]`, `cleanupCountPerEpoch[user][epoch]`, `totalCleanupsExecuted`, `totalValueCleaned`, `lastCleanupTimestamp[user]`, `hasCleanedBefore[user]`. Five mappings + two scalars; deterministic constant cost.
3. Single external call: `gott.mintReward(user, reward)`.

**Per-call failure modes.**
- `mintReward` reverts for any of: contract paused, `CLEANUP_MINER_ROLE` revoked, daily cap (I-02), max supply (I-01). All four are **intentional safety gates**, not gas DoS.
- If `mintReward` reverts, `recordCleanup` reverts, and the calling `cleanupBatch` reverts (§7.5 atomicity caveat).

**No gas-exhaustion path.** The function is deterministic and small enough that block-gas budget is never the binding constraint.

**Cross-references.** §4.4, §7.5, I-01, I-02.

### §11.8 GuardiansToken Gas / DoS Surface

**`distributeInitial` loop (one-shot, admin-only).** Bounded by admin discretion at TGE. If the admin submits too many recipients in one call, the tx reverts on block gas and the `initialized` flag is never flipped (I-03) — admin can retry with smaller chunks. **Not a runtime user-facing surface.**

**`mintReward` constant-time.** Two storage reads + arithmetic + one storage write + `_mint`. No loops.

**`ERC20Votes` checkpoint cost on transfer.** Every `transfer` / `_mint` / `_burn` updates the source and destination's vote checkpoints (when delegated). The OZ v5.1.0 implementation uses `Checkpoints.Trace208` for `O(log n)` lookups but the *write* is `O(1)` amortised. **Transfers post-delegation are noticeably more expensive than pre-delegation** — typically +30-50k gas per transfer when both source and destination have delegated. This is OZ-canonical behaviour and not a protocol-specific concern.

**Pause halts transfers/mints/burns by design.** When the token is paused, all state-mutating paths revert with `EnforcedPause`. This is **protocol-global** (no user can move GOTT) and **intentional**. The pause is gated by `PAUSER_ROLE` (= Timelock post-B.5), so it cannot be triggered without a 48 h Governor proposal.

**Cross-references.** §4.1.6, §4.1.10, I-01, I-02, I-03.

### §11.9 Governance / Timelock Gas Surface

A Governor proposal may bundle multiple `(target, value, calldata)` triples. The Timelock executes them sequentially in `executeBatch`.

**Failure modes.**
- The bundled execution **is not atomic per-target**: if any target call reverts, `executeBatch` reverts and **all prior target calls in the same execute call unwind via EVM revert**. The proposal stays in the `Queued` state and can be re-executed after the underlying issue is fixed (§7.7 step 8/9, §7.10 row "Governance proposal target call fail").
- A proposal with too many targets / too large calldatas may exceed block gas. The proposal can still be queued (OZ does not gas-check at queue time), but `executeBatch` will fail when invoked. There is **no on-chain max-batch-size on proposals**.
- The open executor (AD-10) means anyone pays the gas to execute; if execution fails, anyone can retry — the call-data is fixed at queue time, so the retry runs identical bytes.

**Operational mitigations.**
- **Keep proposals small.** Single-purpose proposals (one role rotation per proposal, one parameter change per proposal) reduce both the per-execute gas budget and the per-proposal review surface.
- **Dry-run on a fork.** Off-chain test of the proposal's `executeBatch` on a forked BSC mainnet at the queue-end block predicts failures before the open executor wastes gas.
- **Do not bundle unrelated emergency actions.** If `pause + rotate_oracle_signer` are bundled and the rotation reverts (e.g., zero-address typo), the pause is also unwound — the protocol stays unpaused during the incident response.

**No on-chain enforcement** of any of the above. These are governance hygiene practices.

**Cross-references.** §7.7, I-16 (Timelock min delay), I-17 (Governor onlyGovernance for self-amendment), AD-10 (open executor), AD-11 (block-time variance affecting voting window).

### §11.10 External Protocol DoS: PancakeRouter / WBNB

PancakeRouter v2 is `immutable` on the GarbageCollector (§9.5). If the router becomes unavailable — paused by Pancake, deprecated, or globally reverting — the per-token swap call inside `_swapTokenToBNB` fails.

**Failure mode propagation.**
- **Per-token revert** is caught by the try/catch (§7.6). The token is forwarded to the landfill and the batch continues.
- **All tokens reverting** means `totalBnbReceived = 0`. If the user supplied `minBnbOut > 0`, the aggregate check fails and the whole batch reverts. If the user supplied `minBnbOut = 0`, the batch completes successfully — every token is forwarded to the landfill, the user pays gas, receives no BNB, but the reward (computed from `cleanupValueUSD`) is still issued.

**Governance response.**
- **Pause `GarbageCollector`** via a `PAUSER_ROLE` Governor proposal (subject to 48 h delay). New `cleanupBatch` calls are blocked. Existing batches in flight at proposal-execution time are unaffected (they execute as their own transactions before the pause lands).
- **Deploy a new `GarbageCollector`** with a replacement router address (parameterised at constructor — see §4.5.3). Governance migrates `COLLECTOR_ROLE` on `CleanupMining` to the new collector (revoke from old, grant to new). The old collector becomes a dead address.
- **Cannot re-point the existing collector's router.** `router` is `immutable` (§4.5.10); replacement requires the new-deployment path above.

**Cross-references.** §9.5, §7.6 (try/catch scope), AD-08 (Low–Med — swap-fail UX), AD-09 (Info — slippage trade-off).

### §11.11 Native BNB Payout DoS

`cleanupBatch` pays the user via `msg.sender.call{value: totalBnbReceived}("")` (§7.3 step 11, `GarbageCollector.sol:L215`). If `msg.sender` is a contract whose `receive()` or `fallback()` reverts (or consumes more than the call's gas stipend), the low-level call returns `false` and the contract reverts the whole transaction with `BnbTransferFailed`.

**Failure modes by caller.**
- **EOA caller** — `receive()` does not exist for EOAs; native transfer always accepts. Cannot fail.
- **Contract caller without `receive()` or `fallback()`** — call returns `false` → revert. The contract caller has effectively excluded itself from `cleanupBatch`.
- **Contract caller with reverting `receive()`** — same revert.
- **Contract caller with gas-expensive `receive()`** — depends on call's gas budget; low-level `call` forwards all remaining gas, so a long `receive()` may consume the rest of the user's gas allowance but should not block correctness.

**This is user-local DoS** — a single user contract that cannot receive BNB cannot `cleanupBatch`. The protocol-level effect is zero: other users are unaffected, no state is partially mutated.

**Intentional design.** The alternative — silently retaining the user's BNB in the contract for later withdrawal — would create a "stuck BNB" surface that bloats contract storage and complicates accounting. The `withdrawStuckBNB` admin function (§4.5.6) exists for *donations and dust*, not for routine cleanup payouts; using it to recover user BNB from a failed payout would require admin intervention per incident and a custom restitution proposal, which is operationally heavier than asking the user to call again from an EOA.

**Cross-references.** §4.5.6, §7.3 step 11, §7.10 row "BNB payout fail".

### §11.12 DoS Classification Matrix

Each scenario classified by scope, atomicity, and on-chain bound.

| # | Scenario | Scope | Reverts whole tx? | Funds at risk? | Bound | Mitigation / cross-ref |
|---|---|---|---|---|---|---|
| 1 | Hostile ERC-20 `transferFrom` revert in `cleanupBatch` | User-local | YES | No — user retains pre-call state | not in try/catch | Frontend warning + scam-registry pre-listing. §11.4 |
| 2 | Expensive ERC-20 `transfer` exhausts gas | User-local | YES (if exceeds block gas) | No | `MAX_TOKENS_HARD_CAP = 50` | Per-token gas not bounded by contract; user pays. §11.3 |
| 3 | PancakeRouter per-token revert | User-local (caught) | NO | No — token routed to landfill (user retains reward computation but no BNB for that token) | try/catch around router call | AD-08, §7.6, §11.10 |
| 4 | Aggregate `minBnbOut` fail | User-local | YES | No — full state unwound including landfill fallback transfers | user supplies `minBnbOut` | AD-09, §7.3 step 7 |
| 5 | `oracleSigner` compromise → forged authorizations | Protocol-global (emission inflation) | NO (per call) — but cumulative effect within 48 h response window | Yes — up to ≈ 2.8M GOTT mintable | I-01 (`MAX_SUPPLY`), I-02 (`MAX_MINT_PER_DAY`), I-15 (nonce), `deadline` | AD-07 (Med), §9.3 |
| 6 | `ORACLE_ROLE` spam batch classifications | Role-local | YES (if batch exceeds block gas) | No (no funds in registry) | No on-chain `maxBatchSize` | Operational chunking + audit-firm-optional `maxBatchSize`. §11.5, AD-02 |
| 7 | Daily mint cap reached (legitimate or attacker-driven) | Protocol-global (mining-path-local) | YES (next `mintReward` call) | No — cap is the protection | I-02 enforces; bucket resets next UTC day | Intentional safety gate. §4.1, §7.5, I-02 |
| 8 | `CleanupMining` paused | Protocol-global (mining path) | YES (next `recordCleanup` call) | No — pause is protection | Timelock-gated unpause (48 h) | Intentional safety gate. §4.4, AD-02 (analogous pause-window acceptance) |
| 9 | `GarbageCollector` paused | Protocol-global (cleanup path) | YES (next `cleanupBatch` / `sendScamToLandfill`) | No | Timelock-gated unpause (48 h) | Intentional safety gate. §4.5 |
| 10 | Timelock proposal too large for block gas | Governance | YES (`executeBatch` reverts) | No — proposal stays Queued | No on-chain max-batch-size on proposals | Operational discipline: keep proposals small. §11.9 |
| 11 | BNB payout recipient rejects native BNB | User-local | YES | No — full state unwound | low-level `call` returns `false` → revert | Use EOA for `cleanupBatch`; contract callers must support `receive()`. §11.11 |
| 12 | `LandfillVault` outbound transfer blocked by token (e.g., blacklist) | Token-local | YES (per outbound call) | No — vault state unchanged | n/a — token-side decision | `emergencyWithdraw` will also fail for the same token; no protocol-level escape. §11.6 |
| 13 | Hostile ERC-20 with ERC-777 callback attempts re-entry | User-local | YES (re-entry blocked by `nonReentrant`) | No | `nonReentrant` on every state-mutating external function | §11.4, §9.6 |
| 14 | PancakeRouter globally unavailable | External protocol | NO per-token (caught); YES if `minBnbOut > 0` and no swaps succeed | No (tokens land in vault; user accepts loss or transaction reverts) | try/catch + `minBnbOut` | Governance pause + new collector deploy. §11.10 |

**Reading the matrix.**
- **Funds at risk: only row 5** (AD-07 oracleSigner compromise) carries a fund-loss column — and that fund is *protocol emission*, not user holdings.
- **Protocol-global DoS rows (7, 8, 9):** all are intentional safety gates triggered by governance, not by attacker action. The 48 h Timelock delay is the load-bearing review window.
- **User-local rows (1, 2, 3, 4, 11, 13):** affect only the calling user's transaction; protocol state is never partially mutated by these.

### §11.13 Residual Gas Risks / Audit Requests

Items the audit firm may legitimately request as part of their finding set:

1. **Fork-test against real BSC PancakeRouter v2 (`0x10ED43C7…E4cD16Ce`)** with a representative spread of real BSC tokens: high-liquidity, low-liquidity, fee-on-transfer, rebasing, ERC-777-like. The current test suite uses `MockPancakeRouter` (always succeeds at 1:1) and `MockRevertingRouter` (always fails). The intermediate behaviour — partial liquidity, multi-hop routing, dynamic slippage — is unexercised. Cross-ref §4.5.13, §9.5, §11.4.
2. **Coverage for fee-on-transfer / rebasing / ERC-777-like tokens** in both the GarbageCollector swap path and the LandfillVault custody path. Current fixtures use standard `MockERC20`. Cross-ref §4.3.13, §11.4, AD-03.
3. **Optional `maxBatchSize` on `ScamRegistry.setStatusBatch`** as a defence-in-depth bound. Single-line addition. Cross-ref §11.5, AD-02.
4. **Frontend gas-estimator warnings** for: high token count (approaching `maxTokensPerCleanup`); low-liquidity tokens (high revert probability via the try/catch); known hostile tokens (per off-chain scam registry feed). *Operational, not on-chain.* Cross-ref §11.3, §11.4.
5. **Governance proposal hygiene** — written guidance for proposers on keeping `executeBatch` payloads small, separating emergency actions from configuration changes, and dry-running on a fork before queueing. *Operational.* Cross-ref §11.9.
6. **Dedicated `invariant_*` handler for I-15** (`nonces[u]` monotonic) — currently covered implicitly by `testFuzz_replayBlocked` plus replay-rejection Hardhat tests. Audit firm may want a handler-tracked Foundry invariant of the shape `nonces[u] == handler.successfulCleanupBatchCount[u]`. Cross-ref §6.5, §4.5.13.
7. **End-to-end self-amendment proposal test** for I-17 (Governor `onlyGovernance` parameter setters). Currently only the *initial-value* assertions exist; the propose-→-queue-→-execute-→-verify path is not exercised. Cross-ref §6.6, §4.7.13.

None of these items are blocking for the Phase 4 audit submission; they are listed here so the audit firm can prioritise them according to its own methodology.

---


