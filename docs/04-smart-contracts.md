# 04 — Smart Contract Specifications

## Contract Inventory

| Contract | Purpose | Priority | Complexity |
|----------|---------|----------|------------|
| `GuardiansToken.sol` | Main GOTT token (modified) | P0 | Medium |
| `GarbageCollector.sol` | Cleanup execution | P0 | High |
| `CleanupMining.sol` | Reward distribution | P0 | High |
| `ScamRegistry.sol` | Token status database | P1 | Low |
| `LandfillVault.sol` | Treasury holder | P1 | Low |
| `Governor.sol` | DAO voting | P2 | Medium |
| `Timelock.sol` | Execution delay | P2 | Low |
| `NFTGraveyard.sol` | Curated NFT marketplace | P3 | Medium |

## 1. GuardiansToken.sol (Modified)

### Changes from Existing

**Remove:**
- Anti-whale `maxWalletAmount` mechanism
- `isExemptFromMaxWallet` mapping
- `setMaxWalletAmount`, `toggleMaxWallet`, `setExemptFromMaxWallet` functions

**Reasoning:** Mining distribution natural via cleanup = no need for anti-whale. Keep governance & voting clean.

**Add:**
- `CLEANUP_MINER_ROLE` for CleanupMining contract
- `MAX_MINT_PER_DAY` daily cap (anti-exploit)
- `mintReward()` function with daily cap check
- `distributeInitial()` one-shot function for TGE distribution (constructor mints 0)

> Naming: token-side memakai `PER_DAY`. Istilah "epoch" direservasi untuk halving 180-hari di `CleanupMining.sol`.

### Interface

```solidity
// Only new/changed functions shown

bytes32 public constant CLEANUP_MINER_ROLE = keccak256("CLEANUP_MINER_ROLE");

uint256 public constant MAX_MINT_PER_DAY = 1_400_000 ether;

mapping(uint256 => uint256) public mintedPerDay; // key = block.timestamp / 1 days

event RewardMinted(address indexed to, uint256 amount, uint256 day);

function mintReward(address to, uint256 amount)
    external
    onlyRole(CLEANUP_MINER_ROLE)
{
    uint256 day = block.timestamp / 1 days;
    require(
        mintedPerDay[day] + amount <= MAX_MINT_PER_DAY,
        "Daily mint cap exceeded"
    );
    require(
        totalSupply() + amount <= MAX_SUPPLY,
        "Max supply exceeded"
    );

    mintedPerDay[day] += amount;
    _mint(to, amount);

    emit RewardMinted(to, amount, day);
}

function currentDayMinted() external view returns (uint256) {
    return mintedPerDay[block.timestamp / 1 days];
}

function remainingMintCapacity() external view returns (uint256) {
    uint256 day = block.timestamp / 1 days;
    return MAX_MINT_PER_DAY - mintedPerDay[day];
}
```

### Security Considerations

- `CLEANUP_MINER_ROLE` harus hanya granted ke `CleanupMining.sol` address
- Daily cap mencegah single-exploit drain seluruh emission pool
- `MAX_SUPPLY` hard cap tetap enforced
- `distributeInitial()` guarded one-shot (`bool initialized`) — gak bisa dipanggil dua kali

## 2. GarbageCollector.sol

### Purpose
Main contract yang execute cleanup: batch approve, swap via DEX, emit reward event.

### Key Functions

```solidity
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPancakeRouter {
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function WETH() external pure returns (address);
}

interface ICleanupMining {
    function recordCleanup(
        address user,
        uint256 cleanupValueUSD,
        uint256 tokenCount
    ) external;
}

contract GarbageCollector is ReentrancyGuard, Pausable, AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IPancakeRouter public immutable router;
    ICleanupMining public miningContract;
    address public immutable WBNB;
    address public landfillVault;

    // Config
    uint256 public maxTokensPerCleanup = 20;
    uint256 public swapDeadlineBuffer = 10 minutes;
    uint256 public minCleanupValueUSD = 1e18; // $1 minimum

    // Events
    event CleanupExecuted(
        address indexed user,
        address[] tokens,
        uint256[] amounts,
        uint256 bnbReceived,
        uint256 cleanupValueUSD
    );

    event ScamTokenSent(
        address indexed user,
        address token,
        uint256 amount
    );

    // Errors
    error TooManyTokens();
    error BelowMinThreshold();
    error SwapFailed(address token);
    error InvalidLength();

    constructor(
        address _router,
        address _wbnb,
        address _miningContract,
        address _landfillVault
    ) {
        router = IPancakeRouter(_router);
        WBNB = _wbnb;
        miningContract = ICleanupMining(_miningContract);
        landfillVault = _landfillVault;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Main cleanup function - swap multiple tokens to BNB
     * @param tokens Array of token addresses to cleanup
     * @param amounts Corresponding amounts for each token
     * @param minBnbOut Minimum BNB expected (slippage protection)
     * @param cleanupValueUSD Off-chain computed USD value (for reward calc)
     */
    function cleanupBatch(
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint256 minBnbOut,
        uint256 cleanupValueUSD
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 totalBnbReceived)
    {
        if (tokens.length != amounts.length) revert InvalidLength();
        if (tokens.length > maxTokensPerCleanup) revert TooManyTokens();
        if (cleanupValueUSD < minCleanupValueUSD) revert BelowMinThreshold();

        uint256 bnbBefore = address(this).balance;

        // Transfer & swap each token
        for (uint256 i = 0; i < tokens.length; i++) {
            _swapTokenToBNB(tokens[i], amounts[i], msg.sender);
        }

        totalBnbReceived = address(this).balance - bnbBefore;
        require(totalBnbReceived >= minBnbOut, "Insufficient output");

        // Transfer BNB to user
        (bool sent, ) = msg.sender.call{value: totalBnbReceived}("");
        require(sent, "BNB transfer failed");

        // Record for reward
        miningContract.recordCleanup(msg.sender, cleanupValueUSD, tokens.length);

        emit CleanupExecuted(msg.sender, tokens, amounts, totalBnbReceived, cleanupValueUSD);
    }

    /**
     * @notice Send unswappable scam tokens to LandfillVault
     * @param tokens Array of scam token addresses
     * @param amounts Corresponding amounts
     */
    function sendScamToLandfill(
        address[] calldata tokens,
        uint256[] calldata amounts
    )
        external
        nonReentrant
        whenNotPaused
    {
        if (tokens.length != amounts.length) revert InvalidLength();

        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).transferFrom(msg.sender, landfillVault, amounts[i]);
            emit ScamTokenSent(msg.sender, tokens[i], amounts[i]);
        }

        // No reward for scam transfer (it's a safety action, not value recovery)
    }

    // Internal swap logic
    function _swapTokenToBNB(
        address token,
        uint256 amount,
        address from
    ) internal returns (uint256 bnbOut) {
        IERC20(token).transferFrom(from, address(this), amount);
        IERC20(token).approve(address(router), amount);

        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = WBNB;

        try router.swapExactTokensForETH(
            amount,
            0, // No per-token slippage, handled at batch level
            path,
            address(this),
            block.timestamp + swapDeadlineBuffer
        ) returns (uint[] memory amounts) {
            bnbOut = amounts[amounts.length - 1];
        } catch {
            // If swap fails, send to landfill
            IERC20(token).transfer(landfillVault, amount);
            bnbOut = 0;
        }
    }

    // Admin functions
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function setMiningContract(address _new) external onlyRole(ADMIN_ROLE) {
        miningContract = ICleanupMining(_new);
    }

    function setLandfillVault(address _new) external onlyRole(ADMIN_ROLE) {
        landfillVault = _new;
    }

    function setMaxTokensPerCleanup(uint256 _max) external onlyRole(ADMIN_ROLE) {
        require(_max > 0 && _max <= 50, "Invalid range");
        maxTokensPerCleanup = _max;
    }

    receive() external payable {}
}
```

### Security Considerations

- **Reentrancy:** Protected via OpenZeppelin's ReentrancyGuard
- **Swap failure:** Fallback send to landfill (better UX than revert)
- **Slippage:** Batch-level protection via `minBnbOut`
- **Max tokens:** Prevents gas griefing attacks
- **Value oracle:** `cleanupValueUSD` comes from backend — need signed commitment

**TODO:** Add signed commitment from backend untuk `cleanupValueUSD` biar user nggak bisa self-report value.

## 3. CleanupMining.sol

### Purpose
Calculate dan mint GOTT reward berdasarkan cleanup activity.

### Key Functions

```solidity
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IGuardiansToken {
    function mintReward(address to, uint256 amount) external;
    function MAX_MINT_PER_DAY() external view returns (uint256);
}

contract CleanupMining is AccessControl, ReentrancyGuard {

    bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IGuardiansToken public immutable gott;

    // Constants
    uint256 public constant EPOCH_DURATION = 180 days; // 6 months
    uint256 public immutable LAUNCH_TIMESTAMP;

    // Config (adjustable via DAO)
    uint256 public baseRate = 100 ether; // 100 GOTT per $1

    // Tier thresholds (USD * 1e18)
    uint256 public tierBronze = 100e18;  // $100
    uint256 public tierSilver = 1000e18; // $1000

    // User state
    mapping(address => bool) public hasCleanedBefore;
    mapping(address => uint256) public totalCleanupValue;
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public lastCleanupTimestamp;
    mapping(address => uint256) public cleanupCountPerEpoch;

    uint256 public totalCleanupsExecuted;
    uint256 public totalValueCleaned;

    event RewardCalculated(
        address indexed user,
        uint256 cleanupValue,
        uint256 rewardAmount,
        uint256 epoch
    );

    constructor(address _gott) {
        gott = IGuardiansToken(_gott);
        LAUNCH_TIMESTAMP = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Called by GarbageCollector to record cleanup & mint reward
     */
    function recordCleanup(
        address user,
        uint256 cleanupValueUSD,
        uint256 tokenCount
    )
        external
        onlyRole(COLLECTOR_ROLE)
        nonReentrant
    {
        uint256 reward = calculateReward(user, cleanupValueUSD);

        if (reward > 0) {
            gott.mintReward(user, reward);
            totalRewardsEarned[user] += reward;
        }

        hasCleanedBefore[user] = true;
        totalCleanupValue[user] += cleanupValueUSD;
        lastCleanupTimestamp[user] = block.timestamp;

        uint256 currentEpoch = getCurrentEpoch();
        cleanupCountPerEpoch[user]++;

        totalCleanupsExecuted++;
        totalValueCleaned += cleanupValueUSD;

        emit RewardCalculated(user, cleanupValueUSD, reward, currentEpoch);
    }

    /**
     * @notice Calculate reward for a cleanup
     */
    function calculateReward(
        address user,
        uint256 cleanupValueUSD
    )
        public
        view
        returns (uint256)
    {
        uint256 tierMult = getTierMultiplier(user, cleanupValueUSD);
        uint256 epochMult = getEpochMultiplier();

        // reward = baseRate * value * tierMult * epochMult / 1e36
        uint256 reward = (baseRate * cleanupValueUSD * tierMult * epochMult) / 1e54;

        return reward;
    }

    /**
     * @notice Get tier multiplier (scaled by 1e18)
     * 2.0x for first cleanup
     * 1.5x for > $100
     * 1.25x for > $1000
     * 1.0x default
     */
    function getTierMultiplier(address user, uint256 value)
        public
        view
        returns (uint256)
    {
        if (!hasCleanedBefore[user]) return 2e18;
        if (value >= tierSilver) return 1.25e18;
        if (value >= tierBronze) return 1.5e18;
        return 1e18;
    }

    /**
     * @notice Get epoch multiplier (halving per epoch)
     * Epoch 1: 1.0x
     * Epoch 2: 0.5x
     * Epoch 3: 0.25x
     * Epoch 4: 0.125x
     * Beyond: 0 (mining ended)
     */
    function getEpochMultiplier() public view returns (uint256) {
        uint256 epoch = getCurrentEpoch();
        if (epoch == 0) return 1e18;
        if (epoch == 1) return 0.5e18;
        if (epoch == 2) return 0.25e18;
        if (epoch == 3) return 0.125e18;
        return 0; // Mining ended after epoch 4
    }

    function getCurrentEpoch() public view returns (uint256) {
        return (block.timestamp - LAUNCH_TIMESTAMP) / EPOCH_DURATION;
    }

    // Admin / DAO functions
    function setBaseRate(uint256 _rate) external onlyRole(ADMIN_ROLE) {
        require(_rate > 0 && _rate <= 1000 ether, "Invalid rate");
        baseRate = _rate;
    }

    function setTierThresholds(uint256 _bronze, uint256 _silver)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(_bronze < _silver, "Invalid thresholds");
        tierBronze = _bronze;
        tierSilver = _silver;
    }
}
```

### Security Considerations

- **Access control:** Only `COLLECTOR_ROLE` can record cleanup (GarbageCollector)
- **Reentrancy:** Protected
- **Overflow:** Solidity 0.8+ built-in protection
- **Value manipulation:** Relies on trusted `cleanupValueUSD` — must come signed from backend

## 4. ScamRegistry.sol

### Purpose
On-chain database for token status classification.

### Key Functions

```solidity
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ScamRegistry is AccessControl {

    enum TokenStatus {
        Unknown,     // 0
        Legit,       // 1
        Dust,        // 2 - low value
        Dead,        // 3 - no liquidity
        Scam,        // 4 - confirmed malicious
        Drainer,     // 5 - active threat
        Honeypot     // 6 - can buy, can't sell
    }

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct TokenInfo {
        TokenStatus status;
        uint256 lastUpdated;
        address reportedBy;
        uint256 reportCount;
    }

    mapping(address => TokenInfo) public tokenInfo;

    event StatusUpdated(
        address indexed token,
        TokenStatus oldStatus,
        TokenStatus newStatus,
        address reporter
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function setStatus(address token, TokenStatus status)
        external
        onlyRole(ORACLE_ROLE)
    {
        TokenStatus oldStatus = tokenInfo[token].status;

        tokenInfo[token] = TokenInfo({
            status: status,
            lastUpdated: block.timestamp,
            reportedBy: msg.sender,
            reportCount: tokenInfo[token].reportCount + 1
        });

        emit StatusUpdated(token, oldStatus, status, msg.sender);
    }

    function setStatusBatch(
        address[] calldata tokens,
        TokenStatus[] calldata statuses
    ) external onlyRole(ORACLE_ROLE) {
        require(tokens.length == statuses.length, "Length mismatch");
        for (uint i = 0; i < tokens.length; i++) {
            setStatus(tokens[i], statuses[i]);
        }
    }

    function getStatus(address token) external view returns (TokenStatus) {
        return tokenInfo[token].status;
    }

    function isScamOrDrainer(address token) external view returns (bool) {
        TokenStatus s = tokenInfo[token].status;
        return s == TokenStatus.Scam || s == TokenStatus.Drainer || s == TokenStatus.Honeypot;
    }
}
```

## 5. LandfillVault.sol

### Purpose
Hold collected scam/dead tokens until DAO decides their fate.

### Key Functions

```solidity
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LandfillVault is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    event TokenReceived(address indexed token, uint256 amount);
    event TokenBurned(address indexed token, uint256 amount);
    event TokenSold(address indexed token, uint256 amount, uint256 bnbReceived);
    event TokenTransferred(address indexed token, address indexed to, uint256 amount);

    constructor(address dao) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DAO_ROLE, dao);
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }

    function burnToken(address token, uint256 amount)
        external
        onlyRole(DAO_ROLE)
    {
        IERC20(token).safeTransfer(address(0xdead), amount);
        emit TokenBurned(token, amount);
    }

    function transferToken(address token, address to, uint256 amount)
        external
        onlyRole(DAO_ROLE)
    {
        IERC20(token).safeTransfer(to, amount);
        emit TokenTransferred(token, to, amount);
    }

    function emergencyWithdraw(address token, address to)
        external
        onlyRole(EMERGENCY_ROLE)
    {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(to, balance);
    }

    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
```

## Testing Strategy

### Unit Tests (Hardhat)
- 100% function coverage target
- Edge cases: zero amounts, max values, reverts

### Integration Tests (Hardhat Fork)
- Test on BSC fork dengan real PancakeSwap
- Test multi-token cleanup scenarios
- Test dengan known scam tokens (historical)

### Fuzz Tests (Foundry)
- Property testing: rewards always ≤ expected
- Invariant: totalSupply ≤ MAX_SUPPLY
- Invariant: sum of rewards = sum of cleanup values × rate

### Audit Preparation
- Slither static analysis
- Aderyn analysis
- Mythril symbolic execution
- Manual review checklist

## Deployment Order

1. `GuardiansToken.sol` (existing contract, modified)
2. `ScamRegistry.sol`
3. `CleanupMining.sol` (grant role setelah deploy GuardiansToken)
4. `LandfillVault.sol`
5. `GarbageCollector.sol` (grant role setelah deploy CleanupMining)
6. Grant roles:
   - `GuardiansToken`: grant CLEANUP_MINER_ROLE to CleanupMining
   - `CleanupMining`: grant COLLECTOR_ROLE to GarbageCollector
7. Initial liquidity add di PancakeSwap
8. Verify semua contract di BscScan
9. (Phase 2) Deploy Governor + Timelock
10. (Phase 2) Transfer admin role dari multisig ke DAO
