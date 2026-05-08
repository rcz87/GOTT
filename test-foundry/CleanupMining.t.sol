// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GuardiansToken} from "../contracts/GuardiansToken.sol";
import {CleanupMining} from "../contracts/CleanupMining.sol";

contract CleanupMiningTest is Test {
    GuardiansToken token;
    CleanupMining mining;

    address admin = address(0xA11CE);
    address collector = address(0xC011EC);

    uint256 constant EPOCH = 180 days;
    uint256 constant ONE = 1e18;

    CleanupMiningHandler internal handler;

    function setUp() public {
        vm.prank(admin);
        token = new GuardiansToken(admin);

        vm.prank(admin);
        mining = new CleanupMining(admin, address(token));

        // Wire up roles.
        vm.startPrank(admin);
        token.grantRole(token.CLEANUP_MINER_ROLE(), address(mining));
        mining.grantRole(mining.COLLECTOR_ROLE(), collector);
        vm.stopPrank();

        handler = new CleanupMiningHandler(mining, token, collector);
        targetContract(address(handler));
    }

    // ==========================================================
    //                  Unit fuzz (bounded)
    // ==========================================================

    function testFuzz_rewardScalesLinearlyWithValue(uint256 valueA, uint256 valueB) public {
        // First-cleanup bonus burned via a separate user so multipliers are stable.
        address user = address(0xBEEF);
        vm.prank(collector);
        mining.recordCleanup(user, 1 * ONE, 1);

        // Bound to bronze-tier band (100, 1000) USD so tier multiplier is constant 1.5x.
        valueA = bound(valueA, 100 * ONE, 999 * ONE);
        valueB = bound(valueB, 100 * ONE, 999 * ONE);

        uint256 rewardA = mining.calculateReward(user, valueA);
        uint256 rewardB = mining.calculateReward(user, valueB);

        // reward = baseRate × value × tier × epoch / 1e54 — strictly proportional to value.
        if (valueA == valueB) {
            assertEq(rewardA, rewardB);
        } else if (valueA < valueB) {
            assertLt(rewardA, rewardB);
        } else {
            assertGt(rewardA, rewardB);
        }
    }

    function testFuzz_epochAdvancesMonotonic(uint256 warpSecs) public {
        warpSecs = bound(warpSecs, 1, 5 * EPOCH);
        uint256 before = mining.getCurrentEpoch();
        vm.warp(block.timestamp + warpSecs);
        assertGe(mining.getCurrentEpoch(), before);
    }

    function testFuzz_postMiningRewardIsZero(uint256 value, address user) public {
        vm.assume(user != address(0));
        value = bound(value, 0, 1_000_000 * ONE);
        vm.warp(block.timestamp + 4 * EPOCH);
        assertEq(mining.calculateReward(user, value), 0);
    }

    function testFuzz_onlyCollectorCanRecord(address caller) public {
        vm.assume(caller != collector);
        vm.prank(caller);
        vm.expectRevert(); // AccessControlUnauthorizedAccount
        mining.recordCleanup(address(0xBEEF), 100 * ONE, 1);
    }

    function testFuzz_setBaseRateBounded(uint256 newRate) public {
        newRate = bound(newRate, 1, mining.MAX_BASE_RATE());
        vm.prank(admin);
        mining.setBaseRate(newRate);
        assertEq(mining.baseRate(), newRate);
    }

    function testFuzz_setBaseRateRejectsOutOfBounds(uint256 badRate) public {
        vm.assume(badRate == 0 || badRate > mining.MAX_BASE_RATE());
        vm.prank(admin);
        vm.expectRevert(CleanupMining.InvalidBaseRate.selector);
        mining.setBaseRate(badRate);
    }

    // ==========================================================
    //                       Invariants
    // ==========================================================

    /// @dev User totalRewardsEarned never decreases.
    function invariant_userRewardsMonotonic() public view {
        uint256 len = handler.seenUsersLength();
        for (uint256 i = 0; i < len; ++i) {
            address u = handler.seenUsers(i);
            assertGe(mining.totalRewardsEarned(u), handler.lastSeenRewards(u));
        }
    }

    /// @dev Sum of all per-user totalRewardsEarned == user GOTT balances minted via mining.
    function invariant_totalRewardsMatchTokenBalance() public view {
        uint256 len = handler.seenUsersLength();
        uint256 sumRewards;
        uint256 sumBalances;
        for (uint256 i = 0; i < len; ++i) {
            address u = handler.seenUsers(i);
            sumRewards += mining.totalRewardsEarned(u);
            sumBalances += token.balanceOf(u);
        }
        assertEq(sumRewards, sumBalances);
    }

    /// @dev totalCleanupsExecuted equals sum of cleanupCountPerEpoch[u][e] across the tracked set.
    function invariant_globalCountMatchesPerEpochSum() public view {
        uint256 maxEpoch = mining.getCurrentEpoch();
        uint256 len = handler.seenUsersLength();
        uint256 sum;
        for (uint256 i = 0; i < len; ++i) {
            address u = handler.seenUsers(i);
            for (uint256 e = 0; e <= maxEpoch; ++e) {
                sum += mining.cleanupCountPerEpoch(u, e);
            }
        }
        assertEq(mining.totalCleanupsExecuted(), sum);
    }

    /// @dev currentEpoch never decreases over time.
    function invariant_epochMonotonic() public view {
        assertGe(mining.getCurrentEpoch(), handler.lastSeenEpoch());
    }
}

/// @notice Bounded action driver for invariant fuzzing.
contract CleanupMiningHandler is Test {
    CleanupMining public mining;
    GuardiansToken public token;
    address public collector;

    address[] public seenUsers;
    mapping(address => bool) internal seen;
    mapping(address => uint256) public lastSeenRewards;
    uint256 public lastSeenEpoch;

    constructor(CleanupMining _mining, GuardiansToken _token, address _collector) {
        mining = _mining;
        token = _token;
        collector = _collector;
    }

    function seenUsersLength() external view returns (uint256) {
        return seenUsers.length;
    }

    function _track(address u) internal {
        if (!seen[u]) {
            seen[u] = true;
            seenUsers.push(u);
        }
        lastSeenRewards[u] = mining.totalRewardsEarned(u);
        uint256 e = mining.getCurrentEpoch();
        if (e > lastSeenEpoch) lastSeenEpoch = e;
    }

    function recordBounded(uint256 valueRaw, uint256 tokenCount, uint256 userSeed) external {
        // Cap value so reward never exceeds the daily mint cap (1.4M GOTT):
        // worst case multipliers = first-cleanup (2x) × epoch 0 (1x) → reward = 100 × value × 2.
        // We cap value at 1500 USD so reward ≤ 300k GOTT << 1.4M cap.
        uint256 value = bound(valueRaw, 0, 1500 * 1e18);
        // Distinct user pool (8 addresses) so we exercise both first-cleanup and repeat paths.
        address user = address(uint160(uint256(keccak256(abi.encode(userSeed))) & 7) | uint160(0x1000));
        _track(user);

        vm.prank(collector);
        try mining.recordCleanup(user, value, tokenCount) {} catch {}
    }

    function warpEpoch(uint256 secs) external {
        secs = bound(secs, 1 days, 90 days);
        vm.warp(block.timestamp + secs);
    }

    function adminPause() external {
        // Simulated by an admin actor outside the handler in setUp; skip here.
    }
}
