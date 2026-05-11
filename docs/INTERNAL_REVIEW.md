# GOTT Protocol — Internal Review Package

> **Status:** Pre-audit internal review. Intended for an external audit firm (SolidProof / Hacken tier) with no prior project context.
> **Commit under review:** `8a80b35` (main).
> **Document version:** Draft 0.1 — sections §1, §12 (full runbook), and §14 pending finalization.

---

## §1 Document Purpose

*To be written last.*

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

## §6 System Invariants — Registry

> **Status:** Registry skeleton only. The detailed body (proof sketches, attack-scenarios-each-invariant-blocks) is filled in the §6 draft pass. The registry below is updated incrementally as each §4.X contract is completed, so cross-references in §4 always resolve.

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
| *I-15+ to be added as §4.5 GarbageCollector and later contracts are drafted* | | | | |

### Sub-section placeholders (to be filled in §6 body draft)

- §6.1 Token-layer invariants (I-01..I-03) — proof sketches
- §6.2 Registry-layer invariants (I-04..I-07) — proof sketches
- §6.3 Vault-layer invariants (I-08..I-10) — proof sketches
- §6.4 Mining-layer invariants — proof sketches *[pending §4.4]*
- §6.5 Collector-layer invariants — proof sketches *[pending §4.5]*
- §6.6 Governance-layer invariants — proof sketches *[pending §4.6 + §4.7]*

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

