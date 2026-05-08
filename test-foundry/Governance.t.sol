// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GuardiansToken} from "../contracts/GuardiansToken.sol";
import {GuardiansTimelockController} from "../contracts/governance/GuardiansTimelockController.sol";
import {GuardiansGovernor} from "../contracts/governance/GuardiansGovernor.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract GovernanceTest is Test {
    GuardiansToken token;
    GuardiansTimelockController timelock;
    GuardiansGovernor governor;

    address admin = address(0xA11CE);
    address holder = address(0xB0B);

    uint256 constant ONE = 1e18;
    uint256 constant MIN_DELAY = 48 hours;
    uint256 constant THRESHOLD = 100_000 * ONE;
    uint256 constant QUORUM_PCT = 4;

    function setUp() public {
        vm.startPrank(admin);
        token = new GuardiansToken(admin);

        address[] memory empty = new address[](0);
        address[] memory openExec = new address[](1);
        openExec[0] = address(0);
        timelock = new GuardiansTimelockController(MIN_DELAY, empty, openExec, admin);

        governor = new GuardiansGovernor(IVotes(address(token)), timelock);

        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        vm.stopPrank();
    }

    // ==========================================================
    //                  Quorum / threshold fuzz
    // ==========================================================

    function testFuzz_quorumIsExact4PercentOfPastSupply(uint256 mintAmount) public {
        mintAmount = bound(mintAmount, 100 ether, 100_000_000 ether);
        vm.prank(admin);
        token.mint(holder, mintAmount);
        // Advance one block so getPastTotalSupply has data.
        vm.roll(block.number + 1);

        uint256 q = governor.quorum(block.number - 1);
        uint256 expected = (token.getPastTotalSupply(block.number - 1) * QUORUM_PCT) / 100;
        assertEq(q, expected);
    }

    function testFuzz_proposeRevertsBelowThreshold(uint256 mintAmount) public {
        mintAmount = bound(mintAmount, 1, THRESHOLD - 1);
        vm.prank(admin);
        token.mint(holder, mintAmount);
        vm.prank(holder);
        token.delegate(holder);
        // Snapshot needs one block to settle.
        vm.roll(block.number + 1);

        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("name()");

        vm.prank(holder);
        vm.expectRevert(); // GovernorInsufficientProposerVotes
        governor.propose(targets, values, calldatas, "below threshold");
    }

    function testFuzz_proposeAcceptsAtOrAboveThreshold(uint256 mintAmount) public {
        mintAmount = bound(mintAmount, THRESHOLD, THRESHOLD * 100);
        vm.prank(admin);
        token.mint(holder, mintAmount);
        vm.prank(holder);
        token.delegate(holder);
        vm.roll(block.number + 1);

        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("name()");

        vm.prank(holder);
        uint256 proposalId = governor.propose(targets, values, calldatas, "at threshold");
        assertGt(proposalId, 0);
    }

    function test_governorSettings() public view {
        assertEq(governor.votingDelay(), 28_800);
        assertEq(governor.votingPeriod(), 201_600);
        assertEq(governor.proposalThreshold(), THRESHOLD);
        assertEq(governor.quorumNumerator(), QUORUM_PCT);
        assertEq(timelock.getMinDelay(), MIN_DELAY);
    }

    function test_executorIsTimelock() public view {
        // Internal `_executor()` returns the timelock — proposals execute via timelock.
        // We test the external symptom: timelock holds PROPOSER and CANCELLER for governor.
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), address(governor)));
        assertTrue(timelock.hasRole(timelock.CANCELLER_ROLE(), address(governor)));
    }
}
