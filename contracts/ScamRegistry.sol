// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ScamRegistry
 * @author Ricoz
 * @notice On-chain database classifying token addresses (Legit / Dust / Dead / Scam / Drainer / Honeypot).
 * @dev Phase 2 contract. Off-chain Guardians oracle holds ORACLE_ROLE and pushes classifications.
 *      GarbageCollector and other protocol contracts read getStatus / isScamOrDrainer.
 */
contract ScamRegistry is AccessControl, Pausable {
    // ============================================================
    //                          ROLES
    // ============================================================
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============================================================
    //                        TYPES & STATE
    // ============================================================
    enum TokenStatus {
        Unknown,   // 0 — never reported
        Legit,     // 1
        Dust,      // 2 — low value
        Dead,      // 3 — no liquidity
        Scam,      // 4 — confirmed malicious
        Drainer,   // 5 — active threat
        Honeypot   // 6 — can buy, can't sell
    }

    struct TokenInfo {
        TokenStatus status;
        uint256 lastUpdated;
        address reportedBy;
        uint256 reportCount;
    }

    mapping(address => TokenInfo) public tokenInfo;

    // ============================================================
    //                          EVENTS
    // ============================================================
    event StatusUpdated(
        address indexed token,
        TokenStatus oldStatus,
        TokenStatus newStatus,
        address indexed reporter
    );

    // ============================================================
    //                          ERRORS
    // ============================================================
    error ZeroAddress();
    error LengthMismatch();
    error EmptyBatch();

    // ============================================================
    //                       CONSTRUCTOR
    // ============================================================

    /**
     * @param admin Address that receives DEFAULT_ADMIN_ROLE and PAUSER_ROLE.
     * @dev ORACLE_ROLE is granted later via grantRole — typically to a backend signer.
     */
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ============================================================
    //                         WRITE PATH
    // ============================================================

    /**
     * @notice Record or update the status of a token.
     */
    function setStatus(address token, TokenStatus status)
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        _setStatus(token, status);
    }

    /**
     * @notice Bulk update — same role/pause checks, single transaction.
     */
    function setStatusBatch(
        address[] calldata tokens,
        TokenStatus[] calldata statuses
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        uint256 len = tokens.length;
        if (len == 0) revert EmptyBatch();
        if (len != statuses.length) revert LengthMismatch();

        for (uint256 i = 0; i < len; ++i) {
            _setStatus(tokens[i], statuses[i]);
        }
    }

    /// @dev Shared write path. Solidity 0.8 enum decoding already rejects out-of-range values.
    function _setStatus(address token, TokenStatus status) internal {
        if (token == address(0)) revert ZeroAddress();

        TokenInfo storage info = tokenInfo[token];
        TokenStatus oldStatus = info.status;

        info.status = status;
        info.lastUpdated = block.timestamp;
        info.reportedBy = msg.sender;
        info.reportCount += 1;

        emit StatusUpdated(token, oldStatus, status, msg.sender);
    }

    // ============================================================
    //                         READ HELPERS
    // ============================================================

    function getStatus(address token) external view returns (TokenStatus) {
        return tokenInfo[token].status;
    }

    /// @notice True for tokens flagged as Scam, Drainer, or Honeypot.
    /// @dev slither-disable-next-line incorrect-equality,timestamp — comparison is on
    ///      enum `s` (not `block.timestamp` despite slither tracing through TokenInfo).
    // slither-disable-next-line incorrect-equality,timestamp
    function isScamOrDrainer(address token) external view returns (bool) {
        TokenStatus s = tokenInfo[token].status;
        return s == TokenStatus.Scam
            || s == TokenStatus.Drainer
            || s == TokenStatus.Honeypot;
    }

    // ============================================================
    //                       PAUSE (Emergency)
    // ============================================================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
