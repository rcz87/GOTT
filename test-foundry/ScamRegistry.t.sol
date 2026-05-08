// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ScamRegistry} from "../contracts/ScamRegistry.sol";

contract ScamRegistryTest is Test {
    ScamRegistry registry;

    address admin = address(0xA11CE);
    address oracle = address(0x07AC1E);

    ScamRegistryHandler internal handler;

    function setUp() public {
        vm.prank(admin);
        registry = new ScamRegistry(admin);

        bytes32 oracleRole = registry.ORACLE_ROLE();
        vm.prank(admin);
        registry.grantRole(oracleRole, oracle);

        handler = new ScamRegistryHandler(registry, oracle);
        targetContract(address(handler));
    }

    // ==========================================================
    //                  Unit fuzz (single call)
    // ==========================================================

    function testFuzz_setStatusWritesAndIncrementsCount(
        address token,
        uint8 statusRaw
    ) public {
        vm.assume(token != address(0));
        // Bound to valid enum range [0, 6].
        ScamRegistry.TokenStatus status = ScamRegistry.TokenStatus(uint8(bound(statusRaw, 0, 6)));

        vm.prank(oracle);
        registry.setStatus(token, status);

        (
            ScamRegistry.TokenStatus s,
            uint256 lastUpdated,
            address reportedBy,
            uint256 reportCount
        ) = registry.tokenInfo(token);

        assertEq(uint8(s), uint8(status));
        assertEq(lastUpdated, block.timestamp);
        assertEq(reportedBy, oracle);
        assertEq(reportCount, 1);
    }

    function testFuzz_onlyOracleCanWrite(address caller, address token) public {
        vm.assume(caller != oracle);
        vm.assume(token != address(0));
        vm.prank(caller);
        vm.expectRevert(); // AccessControlUnauthorizedAccount
        registry.setStatus(token, ScamRegistry.TokenStatus.Scam);
    }

    function testFuzz_zeroTokenReverts(uint8 statusRaw) public {
        ScamRegistry.TokenStatus status = ScamRegistry.TokenStatus(uint8(bound(statusRaw, 0, 6)));
        vm.prank(oracle);
        vm.expectRevert(ScamRegistry.ZeroAddress.selector);
        registry.setStatus(address(0), status);
    }

    function testFuzz_isScamOrDrainerMatchesEnum(uint8 statusRaw) public {
        statusRaw = uint8(bound(statusRaw, 0, 6));
        ScamRegistry.TokenStatus status = ScamRegistry.TokenStatus(statusRaw);

        address token = address(0xDEADBEEF);
        vm.prank(oracle);
        registry.setStatus(token, status);

        bool expected = (status == ScamRegistry.TokenStatus.Scam)
            || (status == ScamRegistry.TokenStatus.Drainer)
            || (status == ScamRegistry.TokenStatus.Honeypot);
        assertEq(registry.isScamOrDrainer(token), expected);
    }

    function testFuzz_reportCountTracksCallCount(address token, uint8 calls) public {
        vm.assume(token != address(0));
        uint256 n = bound(calls, 1, 20);
        for (uint256 i = 0; i < n; ++i) {
            vm.prank(oracle);
            registry.setStatus(token, ScamRegistry.TokenStatus.Scam);
        }
        (, , , uint256 reportCount) = registry.tokenInfo(token);
        assertEq(reportCount, n);
    }

    // ==========================================================
    //                       Invariants
    // ==========================================================

    /// @dev Status field must always be a valid enum (cast back into range [0, 6]).
    function invariant_statusInEnumRange() public view {
        uint256 len = handler.seenTokensLength();
        for (uint256 i = 0; i < len; ++i) {
            address t = handler.seenTokens(i);
            (ScamRegistry.TokenStatus s, , , ) = registry.tokenInfo(t);
            assertLe(uint8(s), 6);
        }
    }

    /// @dev reportCount only ever increases — handler tracks last observed value per token.
    function invariant_reportCountMonotonic() public view {
        uint256 len = handler.seenTokensLength();
        for (uint256 i = 0; i < len; ++i) {
            address t = handler.seenTokens(i);
            (, , , uint256 live) = registry.tokenInfo(t);
            assertGe(live, handler.lastSeenCount(t));
        }
    }

    /// @dev lastUpdated only ever advances (tied to block.timestamp on every write).
    function invariant_lastUpdatedMonotonic() public view {
        uint256 len = handler.seenTokensLength();
        for (uint256 i = 0; i < len; ++i) {
            address t = handler.seenTokens(i);
            (, uint256 ts, , ) = registry.tokenInfo(t);
            assertGe(ts, handler.lastSeenTs(t));
        }
    }

    /// @dev reportCount must match number of successful writes recorded by handler.
    function invariant_reportCountMatchesWrites() public view {
        uint256 len = handler.seenTokensLength();
        for (uint256 i = 0; i < len; ++i) {
            address t = handler.seenTokens(i);
            (, , , uint256 reportCount) = registry.tokenInfo(t);
            assertEq(reportCount, handler.writeCount(t));
        }
    }
}

/// @notice Bounded action driver for ScamRegistry invariant fuzzing.
contract ScamRegistryHandler is Test {
    ScamRegistry public registry;
    address public oracle;

    address[] public seenTokens;
    mapping(address => bool) internal seen;
    mapping(address => uint256) public writeCount;
    mapping(address => uint256) public lastSeenCount;
    mapping(address => uint256) public lastSeenTs;

    constructor(ScamRegistry _registry, address _oracle) {
        registry = _registry;
        oracle = _oracle;
    }

    function seenTokensLength() external view returns (uint256) {
        return seenTokens.length;
    }

    function _track(address t) internal {
        if (!seen[t]) {
            seen[t] = true;
            seenTokens.push(t);
        }
        (, uint256 ts, , uint256 c) = registry.tokenInfo(t);
        lastSeenTs[t] = ts;
        lastSeenCount[t] = c;
    }

    function setStatusBounded(address token, uint8 statusRaw, uint256 warpSecs) external {
        if (token == address(0)) token = address(0xBEEF);
        statusRaw = uint8(bound(statusRaw, 0, 6));
        warpSecs = bound(warpSecs, 0, 1 days);
        if (warpSecs > 0) vm.warp(block.timestamp + warpSecs);

        _track(token);
        vm.prank(oracle);
        try registry.setStatus(token, ScamRegistry.TokenStatus(statusRaw)) {
            writeCount[token] += 1;
        } catch {}
    }

    function setStatusBatchBounded(uint8 size, uint256 seed, uint256 warpSecs) external {
        size = uint8(bound(size, 1, 5));
        warpSecs = bound(warpSecs, 0, 1 days);
        if (warpSecs > 0) vm.warp(block.timestamp + warpSecs);

        address[] memory tokens = new address[](size);
        ScamRegistry.TokenStatus[] memory statuses = new ScamRegistry.TokenStatus[](size);
        for (uint256 i = 0; i < size; ++i) {
            tokens[i] = address(uint160(uint256(keccak256(abi.encode(seed, i))) | 1));
            statuses[i] = ScamRegistry.TokenStatus(uint8(uint256(keccak256(abi.encode(seed, i, "s"))) % 7));
            _track(tokens[i]);
        }

        vm.prank(oracle);
        try registry.setStatusBatch(tokens, statuses) {
            for (uint256 i = 0; i < size; ++i) {
                writeCount[tokens[i]] += 1;
            }
        } catch {}
    }
}
