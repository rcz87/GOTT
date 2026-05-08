// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// slither-disable-start naming-convention
interface IGuardiansToken {
    function mintReward(address to, uint256 amount) external;
    /// @dev Name must match the auto-generated getter for GuardiansToken's `MAX_MINT_PER_DAY` constant.
    function MAX_MINT_PER_DAY() external view returns (uint256);
}
// slither-disable-end naming-convention

/**
 * @title CleanupMining
 * @author Ricoz
 * @notice Calculates and mints GOTT rewards for cleanup activity, with 180-day halving.
 * @dev Phase 2 contract. Receives `recordCleanup` calls from GarbageCollector
 *      (holds COLLECTOR_ROLE) and forwards minted reward via GuardiansToken.mintReward.
 *
 * Reward formula:
 *   reward = (baseRate × cleanupValueUSD × tierMult × epochMult) / 1e54
 *
 * `cleanupValueUSD` MUST be passed scaled by 1e18 (e.g., $100 → 100e18).
 *
 * Epoch indexing is 0-based:
 *   - Epoch 0 (months 0–6):   1.0x  (full reward)
 *   - Epoch 1 (months 6–12):  0.5x  (first halving)
 *   - Epoch 2 (months 12–18): 0.25x
 *   - Epoch 3 (months 18–24): 0.125x
 *   - Epoch 4+:               0     (mining ended)
 */
contract CleanupMining is AccessControl, Pausable, ReentrancyGuard {
    // ============================================================
    //                          ROLES
    // ============================================================
    bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============================================================
    //                      IMMUTABLES & CONSTANTS
    // ============================================================
    IGuardiansToken public immutable gott;
    /// @dev SCREAMS_CASE for visual parity with EPOCH_DURATION — both are deploy-time fixed.
    // slither-disable-next-line naming-convention
    uint256 public immutable LAUNCH_TIMESTAMP;
    uint256 public constant EPOCH_DURATION = 180 days;

    /// @dev Hard ceiling for setBaseRate (sanity bound).
    uint256 public constant MAX_BASE_RATE = 1000 ether;

    // ============================================================
    //                       MUTABLE CONFIG
    // ============================================================
    uint256 public baseRate = 100 ether;       // 100 GOTT per $1 USD
    uint256 public tierBronze = 100e18;        // $100 (scaled by 1e18)
    uint256 public tierSilver = 1000e18;       // $1000

    // ============================================================
    //                        USER STATE
    // ============================================================
    mapping(address => bool) public hasCleanedBefore;
    mapping(address => uint256) public totalCleanupValue;
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public lastCleanupTimestamp;
    /// @dev cleanupCountPerEpoch[user][epoch]
    mapping(address => mapping(uint256 => uint256)) public cleanupCountPerEpoch;

    // ============================================================
    //                        GLOBAL STATE
    // ============================================================
    uint256 public totalCleanupsExecuted;
    uint256 public totalValueCleaned;

    // ============================================================
    //                          EVENTS
    // ============================================================
    event RewardCalculated(
        address indexed user,
        uint256 cleanupValueUSD,
        uint256 tokenCount,
        uint256 rewardAmount,
        uint256 indexed epoch
    );
    event BaseRateChanged(uint256 oldRate, uint256 newRate);
    event TierThresholdsChanged(uint256 oldBronze, uint256 oldSilver, uint256 newBronze, uint256 newSilver);

    // ============================================================
    //                          ERRORS
    // ============================================================
    error ZeroAddress();
    error InvalidBaseRate();
    error InvalidTierThresholds();

    // ============================================================
    //                       CONSTRUCTOR
    // ============================================================

    /**
     * @param admin Address granted DEFAULT_ADMIN_ROLE, ADMIN_ROLE, and PAUSER_ROLE.
     * @param _gott GuardiansToken address (immutable). Must already exist.
     */
    constructor(address admin, address _gott) {
        if (admin == address(0)) revert ZeroAddress();
        if (_gott == address(0)) revert ZeroAddress();

        gott = IGuardiansToken(_gott);
        LAUNCH_TIMESTAMP = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ============================================================
    //                       CORE WRITE PATH
    // ============================================================

    /**
     * @notice Called by GarbageCollector to record a cleanup and mint the reward.
     * @param user             Cleanup actor (reward recipient).
     * @param cleanupValueUSD  USD value cleaned, scaled by 1e18.
     * @param tokenCount       Number of distinct tokens in this cleanup batch (analytics only).
     */
    function recordCleanup(
        address user,
        uint256 cleanupValueUSD,
        uint256 tokenCount
    )
        external
        onlyRole(COLLECTOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (user == address(0)) revert ZeroAddress();

        uint256 reward = calculateReward(user, cleanupValueUSD);
        uint256 currentEpoch = getCurrentEpoch();

        if (reward > 0) {
            totalRewardsEarned[user] += reward;
        }

        // Effects: update all bookkeeping BEFORE the external mint call.
        hasCleanedBefore[user] = true;
        totalCleanupValue[user] += cleanupValueUSD;
        lastCleanupTimestamp[user] = block.timestamp;
        cleanupCountPerEpoch[user][currentEpoch] += 1;

        totalCleanupsExecuted += 1;
        totalValueCleaned += cleanupValueUSD;

        emit RewardCalculated(user, cleanupValueUSD, tokenCount, reward, currentEpoch);

        // Interaction last (CEI). Reentrancy already guarded; gott is immutable & trusted.
        if (reward > 0) {
            gott.mintReward(user, reward);
        }
    }

    // ============================================================
    //                    REWARD CALCULATION
    // ============================================================

    /**
     * @notice Pure-view reward calc. cleanupValueUSD must be 1e18-scaled.
     */
    function calculateReward(address user, uint256 cleanupValueUSD)
        public
        view
        returns (uint256)
    {
        uint256 tierMult = getTierMultiplier(user, cleanupValueUSD);
        uint256 epochMult = getEpochMultiplier();
        // Divide early to keep intermediates well under uint256 max — multiplying all
        // four 1e18-scaled factors first overflows for cleanupValueUSD >> $1k. The
        // divide-before-multiply pattern below is intentional; precision is preserved
        // because all inputs are 1e18-scaled multiples (no truncation in practice).
        // slither-disable-start divide-before-multiply
        uint256 r = (baseRate * cleanupValueUSD) / 1e18;
        r = (r * tierMult) / 1e18;
        r = (r * epochMult) / 1e18;
        // slither-disable-end divide-before-multiply
        return r;
    }

    /**
     * @notice Tier multiplier (1e18-scaled).
     *   First-cleanup bonus:    2.0x
     *   value ≥ tierSilver:     1.25x
     *   value ≥ tierBronze:     1.5x
     *   default:                1.0x
     */
    function getTierMultiplier(address user, uint256 value) public view returns (uint256) {
        if (!hasCleanedBefore[user]) return 2e18;
        if (value >= tierSilver) return 1.25e18;
        if (value >= tierBronze) return 1.5e18;
        return 1e18;
    }

    /**
     * @notice Halving multiplier (1e18-scaled). 0 means mining ended.
     */
    /// @dev Halving table — strict equality on epoch index is idiomatic, not a security
    ///      comparison. Slither traces `epoch` back to `block.timestamp` arithmetic and
    ///      treats every `==` as a "timestamp comparison" — false positive in this context.
    // slither-disable-start incorrect-equality,timestamp
    function getEpochMultiplier() public view returns (uint256) {
        uint256 epoch = getCurrentEpoch();
        if (epoch == 0) return 1e18;
        if (epoch == 1) return 0.5e18;
        if (epoch == 2) return 0.25e18;
        if (epoch == 3) return 0.125e18;
        return 0;
    }
    // slither-disable-end incorrect-equality,timestamp

    function getCurrentEpoch() public view returns (uint256) {
        return (block.timestamp - LAUNCH_TIMESTAMP) / EPOCH_DURATION;
    }

    // ============================================================
    //                     ADMIN / DAO TUNING
    // ============================================================

    function setBaseRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        if (newRate == 0 || newRate > MAX_BASE_RATE) revert InvalidBaseRate();
        uint256 old = baseRate;
        baseRate = newRate;
        emit BaseRateChanged(old, newRate);
    }

    function setTierThresholds(uint256 newBronze, uint256 newSilver) external onlyRole(ADMIN_ROLE) {
        if (newBronze == 0 || newBronze >= newSilver) revert InvalidTierThresholds();
        uint256 oldB = tierBronze;
        uint256 oldS = tierSilver;
        tierBronze = newBronze;
        tierSilver = newSilver;
        emit TierThresholdsChanged(oldB, oldS, newBronze, newSilver);
    }

    // ============================================================
    //                          PAUSE
    // ============================================================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
