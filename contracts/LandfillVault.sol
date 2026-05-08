// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LandfillVault
 * @author Ricoz
 * @notice Holds collected scam / dead tokens swept by GarbageCollector until DAO decides.
 * @dev Phase 2 contract. Tokens arrive via raw ERC20 transfer (push-style from collector).
 *      DAO can burn (send to 0xdEaD) or transfer to a designated address. EMERGENCY_ROLE
 *      can sweep balances out even while paused (circuit-breaker for compromised vault).
 */
contract LandfillVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================
    //                          ROLES
    // ============================================================
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============================================================
    //                          EVENTS
    // ============================================================
    event TokenBurned(address indexed token, uint256 amount);
    event TokenTransferred(address indexed token, address indexed to, uint256 amount);
    event EmergencyWithdrawn(address indexed token, address indexed to, uint256 amount);

    // ============================================================
    //                          ERRORS
    // ============================================================
    error ZeroAddress();
    error ZeroAmount();

    // ============================================================
    //                       CONSTRUCTOR
    // ============================================================

    /**
     * @param admin Address that gets DEFAULT_ADMIN_ROLE, PAUSER_ROLE, and EMERGENCY_ROLE.
     * @param dao   Address (typically Timelock or Governor) that gets DAO_ROLE for burn/transfer.
     */
    constructor(address admin, address dao) {
        if (admin == address(0)) revert ZeroAddress();
        if (dao == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
        _grantRole(DAO_ROLE, dao);
    }

    // ============================================================
    //                      DAO OPERATIONS
    // ============================================================

    /**
     * @notice Burn a token by sending to the standard 0xdEaD address.
     */
    function burnToken(address token, uint256 amount)
        external
        onlyRole(DAO_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(address(0xdEaD), amount);
        emit TokenBurned(token, amount);
    }

    /**
     * @notice Transfer a token out (e.g., to a buyback contract or victim restitution wallet).
     */
    function transferToken(address token, address to, uint256 amount)
        external
        onlyRole(DAO_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (token == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(to, amount);
        emit TokenTransferred(token, to, amount);
    }

    // ============================================================
    //                        EMERGENCY
    // ============================================================

    /**
     * @notice Sweep entire vault balance of `token` to `to`. Bypasses pause by design.
     */
    function emergencyWithdraw(address token, address to)
        external
        onlyRole(EMERGENCY_ROLE)
        nonReentrant
    {
        if (token == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();

        // Defensive zero-check — revert to avoid emitting a no-op EmergencyWithdrawn.
        // Not a security comparison; slither flags `==` against externally-sourced values.
        uint256 balance = IERC20(token).balanceOf(address(this));
        // slither-disable-next-line incorrect-equality
        if (balance == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(to, balance);
        emit EmergencyWithdrawn(token, to, balance);
    }

    // ============================================================
    //                          VIEW
    // ============================================================

    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
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
