// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// slither-disable-start naming-convention
interface IPancakeRouter {
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /// @dev Name must match PancakeRouter's deployed `WETH()` getter.
    function WETH() external pure returns (address);
}
// slither-disable-end naming-convention

interface ICleanupMining {
    function recordCleanup(address user, uint256 cleanupValueUSD, uint256 tokenCount) external;
}

interface IScamRegistry {
    function isScamOrDrainer(address token) external view returns (bool);
}

/**
 * @title GarbageCollector
 * @author Ricoz
 * @notice Main cleanup orchestrator. Pulls user's tokens, swaps to BNB via PancakeRouter,
 *         and forwards reward tracking to CleanupMining. Tokens flagged in ScamRegistry
 *         are blocked from the swap path; user must use sendScamToLandfill explicitly.
 *         Tokens that fail to swap fall through to LandfillVault.
 *
 * @dev TODO: cleanupValueUSD is currently user-supplied — needs signed commitment from
 *      backend oracle before mainnet to prevent self-reported reward gaming.
 */
contract GarbageCollector is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================
    //                          ROLES
    // ============================================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============================================================
    //                       IMMUTABLES
    // ============================================================
    IPancakeRouter public immutable router;
    /// @dev Mirror of WBNB ticker case from PancakeSwap convention.
    // slither-disable-next-line naming-convention
    address public immutable WBNB;
    IScamRegistry public immutable scamRegistry;

    // ============================================================
    //                   MUTABLE PROTOCOL WIRING
    // ============================================================
    ICleanupMining public miningContract;
    address public landfillVault;

    // ============================================================
    //                     MUTABLE CONFIG
    // ============================================================
    uint256 public maxTokensPerCleanup = 20;
    uint256 public swapDeadlineBuffer = 10 minutes;
    uint256 public minCleanupValueUSD = 1e18;          // $1 minimum (1e18-scaled)
    uint256 public constant MAX_TOKENS_HARD_CAP = 50;  // sanity bound for setMaxTokensPerCleanup

    // ============================================================
    //                          EVENTS
    // ============================================================
    event CleanupExecuted(
        address indexed user,
        address[] tokens,
        uint256[] amounts,
        uint256 bnbReceived,
        uint256 cleanupValueUSD
    );
    event ScamTokenSent(address indexed user, address indexed token, uint256 amount);
    event SwapFallbackToLandfill(address indexed user, address indexed token, uint256 amount);

    event MiningContractChanged(address indexed oldAddr, address indexed newAddr);
    event LandfillVaultChanged(address indexed oldAddr, address indexed newAddr);
    event MaxTokensChanged(uint256 oldMax, uint256 newMax);
    event MinCleanupValueChanged(uint256 oldValue, uint256 newValue);
    event SwapDeadlineBufferChanged(uint256 oldBuffer, uint256 newBuffer);
    event StuckBNBWithdrawn(address indexed to, uint256 amount);

    // ============================================================
    //                          ERRORS
    // ============================================================
    error ZeroAddress();
    error InvalidLength();
    error TooManyTokens();
    error BelowMinThreshold();
    error InsufficientBnbOut(uint256 received, uint256 minOut);
    error BnbTransferFailed();
    error InvalidMaxTokens();
    error InvalidMinCleanupValue();
    error InvalidSwapDeadlineBuffer();
    error TokenIsScam(address token);

    // ============================================================
    //                       CONSTRUCTOR
    // ============================================================
    constructor(
        address admin,
        address _router,
        address _wbnb,
        address _scamRegistry,
        address _mining,
        address _vault
    ) {
        if (admin == address(0)) revert ZeroAddress();
        if (_router == address(0)) revert ZeroAddress();
        if (_wbnb == address(0)) revert ZeroAddress();
        if (_scamRegistry == address(0)) revert ZeroAddress();
        if (_mining == address(0)) revert ZeroAddress();
        if (_vault == address(0)) revert ZeroAddress();

        router = IPancakeRouter(_router);
        WBNB = _wbnb;
        scamRegistry = IScamRegistry(_scamRegistry);
        miningContract = ICleanupMining(_mining);
        landfillVault = _vault;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ============================================================
    //                     CORE: cleanupBatch
    // ============================================================

    /**
     * @notice Swap a batch of user-owned tokens to BNB and trigger reward.
     * @param tokens           Token addresses to swap.
     * @param amounts          Amount per token (parallel to `tokens`).
     * @param minBnbOut        Minimum total BNB the user expects (slippage guard).
     * @param cleanupValueUSD  Off-chain-computed USD value, 1e18-scaled.
     */
    function cleanupBatch(
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint256 minBnbOut,
        uint256 cleanupValueUSD
    ) external nonReentrant whenNotPaused returns (uint256 totalBnbReceived) {
        uint256 len = tokens.length;
        if (len != amounts.length) revert InvalidLength();
        if (len == 0) revert InvalidLength();
        if (len > maxTokensPerCleanup) revert TooManyTokens();
        if (cleanupValueUSD < minCleanupValueUSD) revert BelowMinThreshold();

        // Pre-check: scam-classified tokens must use sendScamToLandfill explicitly.
        // calls-loop is intentional — gas bounded by maxTokensPerCleanup (≤ MAX_TOKENS_HARD_CAP).
        for (uint256 i = 0; i < len; ++i) {
            // slither-disable-next-line calls-loop
            if (scamRegistry.isScamOrDrainer(tokens[i])) revert TokenIsScam(tokens[i]);
        }

        uint256 bnbBefore = address(this).balance;

        for (uint256 i = 0; i < len; ++i) {
            _swapTokenToBNB(tokens[i], amounts[i], msg.sender);
        }

        totalBnbReceived = address(this).balance - bnbBefore;
        if (totalBnbReceived < minBnbOut) revert InsufficientBnbOut(totalBnbReceived, minBnbOut);

        // Effects: forward reward bookkeeping (reverts if mining is paused / role revoked).
        miningContract.recordCleanup(msg.sender, cleanupValueUSD, len);

        emit CleanupExecuted(msg.sender, tokens, amounts, totalBnbReceived, cleanupValueUSD);

        // Interaction: pay the user last (CEI ordering). Low-level call is the canonical
        // way to forward native BNB; nonReentrant guards re-entry from msg.sender.
        if (totalBnbReceived > 0) {
            // slither-disable-next-line low-level-calls
            (bool sent,) = msg.sender.call{value: totalBnbReceived}("");
            if (!sent) revert BnbTransferFailed();
        }
    }

    // ============================================================
    //                  EXPLICIT LANDFILL DEPOSIT
    // ============================================================

    /**
     * @notice Push known scam/dust tokens to LandfillVault — no reward.
     */
    function sendScamToLandfill(address[] calldata tokens, uint256[] calldata amounts)
        external
        nonReentrant
        whenNotPaused
    {
        uint256 len = tokens.length;
        if (len != amounts.length) revert InvalidLength();
        if (len == 0) revert InvalidLength();

        for (uint256 i = 0; i < len; ++i) {
            IERC20(tokens[i]).safeTransferFrom(msg.sender, landfillVault, amounts[i]);
            emit ScamTokenSent(msg.sender, tokens[i], amounts[i]);
        }
    }

    // ============================================================
    //                     INTERNAL SWAP
    // ============================================================

    /**
     * @dev Pull `amount` of `token` from `from`, swap on Pancake. On router failure,
     *      forward the tokens to the landfill vault instead of reverting.
     */
    function _swapTokenToBNB(address token, uint256 amount, address from) internal {
        IERC20 t = IERC20(token);
        t.safeTransferFrom(from, address(this), amount);
        t.forceApprove(address(router), amount);

        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = WBNB;

        // calls-loop / unused-return are intentional: BNB delta is measured at the batch level
        // via address(this).balance instead of relying on the returned amounts array.
        // slither-disable-next-line calls-loop,unused-return
        try router.swapExactTokensForETH(
            amount,
            0,                                    // per-token slippage 0 — guarded at batch level
            path,
            address(this),
            block.timestamp + swapDeadlineBuffer
        ) returns (uint256[] memory) {
            // BNB landed in this contract via receive(); accounted at batch level.
        } catch {
            // Router didn't take the tokens — clear the approval, then forward to landfill.
            t.forceApprove(address(router), 0);
            t.safeTransfer(landfillVault, amount);
            emit SwapFallbackToLandfill(from, token, amount);
        }
    }

    // ============================================================
    //                     ADMIN / DAO TUNING
    // ============================================================

    function setMiningContract(address newMining) external onlyRole(ADMIN_ROLE) {
        if (newMining == address(0)) revert ZeroAddress();
        address old = address(miningContract);
        miningContract = ICleanupMining(newMining);
        emit MiningContractChanged(old, newMining);
    }

    function setLandfillVault(address newVault) external onlyRole(ADMIN_ROLE) {
        if (newVault == address(0)) revert ZeroAddress();
        address old = landfillVault;
        landfillVault = newVault;
        emit LandfillVaultChanged(old, newVault);
    }

    function setMaxTokensPerCleanup(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        if (newMax == 0 || newMax > MAX_TOKENS_HARD_CAP) revert InvalidMaxTokens();
        uint256 old = maxTokensPerCleanup;
        maxTokensPerCleanup = newMax;
        emit MaxTokensChanged(old, newMax);
    }

    function setMinCleanupValueUSD(uint256 newMin) external onlyRole(ADMIN_ROLE) {
        if (newMin == 0) revert InvalidMinCleanupValue();
        uint256 old = minCleanupValueUSD;
        minCleanupValueUSD = newMin;
        emit MinCleanupValueChanged(old, newMin);
    }

    function setSwapDeadlineBuffer(uint256 newBuffer) external onlyRole(ADMIN_ROLE) {
        if (newBuffer == 0 || newBuffer > 1 days) revert InvalidSwapDeadlineBuffer();
        uint256 old = swapDeadlineBuffer;
        swapDeadlineBuffer = newBuffer;
        emit SwapDeadlineBufferChanged(old, newBuffer);
    }

    /**
     * @notice Recover BNB stuck in this contract from donations / dust.
     * @dev Admin-gated. Send target is admin-chosen — slither's `arbitrary-send-eth` is a
     *      false positive for an explicitly admin-only sweep.
     */
    // slither-disable-next-line arbitrary-send-eth
    function withdrawStuckBNB(address to) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = address(this).balance;
        // slither-disable-next-line incorrect-equality
        if (amount == 0) return;
        emit StuckBNBWithdrawn(to, amount);
        // slither-disable-next-line low-level-calls
        (bool sent,) = to.call{value: amount}("");
        if (!sent) revert BnbTransferFailed();
    }

    // ============================================================
    //                          PAUSE
    // ============================================================

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ============================================================
    //                      RECEIVE BNB
    // ============================================================
    receive() external payable {}
}
