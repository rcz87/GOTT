// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GuardiansToken} from "../contracts/GuardiansToken.sol";

contract GuardiansTokenTest is Test {
    GuardiansToken token;
    address owner = address(0xA11CE);
    address alice = address(0xB0B);
    address miner = address(0x1117E2);

    uint256 constant MAX_SUPPLY = 1_000_000_000 ether;

    MintRewardHandler internal handler;

    function setUp() public {
        vm.prank(owner);
        token = new GuardiansToken(owner);

        bytes32 cleanupRole = token.CLEANUP_MINER_ROLE();
        vm.prank(owner);
        token.grantRole(cleanupRole, miner);

        handler = new MintRewardHandler(token, miner, owner);
        targetContract(address(handler));
    }

    // ==========================================================
    //                  Unit fuzz (single-call)
    // ==========================================================

    function testFuzz_mintRespectsMaxSupply(uint256 amount) public {
        uint256 remaining = token.mintableSupply();
        vm.prank(owner);
        if (amount > remaining) {
            vm.expectRevert();
            token.mint(alice, amount);
        } else {
            token.mint(alice, amount);
            assertLe(token.totalSupply(), MAX_SUPPLY);
        }
    }

    function testFuzz_burnDecreasesTotalSupply(uint256 mintAmount, uint256 burnAmount) public {
        mintAmount = bound(mintAmount, 1, MAX_SUPPLY);
        burnAmount = bound(burnAmount, 1, mintAmount);
        vm.prank(owner);
        token.mint(alice, mintAmount);

        uint256 supplyBefore = token.totalSupply();
        vm.prank(alice);
        token.burn(burnAmount);
        assertEq(token.totalSupply(), supplyBefore - burnAmount);
    }

    function testFuzz_onlyMinterCanMint(address caller, uint256 amount) public {
        vm.assume(caller != owner && caller != address(0));
        amount = bound(amount, 0, token.mintableSupply());
        vm.prank(caller);
        vm.expectRevert();
        token.mint(alice, amount);
    }

    function testFuzz_delegateSetsVotingPower(uint256 transferAmount) public {
        transferAmount = bound(transferAmount, 1, MAX_SUPPLY);
        vm.prank(owner);
        token.mint(alice, transferAmount);

        assertEq(token.getVotes(alice), 0);
        vm.prank(alice);
        token.delegate(alice);
        assertEq(token.getVotes(alice), transferAmount);
    }

    function testFuzz_mintRewardRespectsDailyCap(uint256 amount) public {
        uint256 cap = token.MAX_MINT_PER_DAY();
        amount = bound(amount, 1, cap * 2); // half range above cap
        vm.prank(miner);
        if (amount > cap) {
            // partial match: error has args, only selector is fixed
            vm.expectPartialRevert(GuardiansToken.DailyMintCapExceeded.selector);
            token.mintReward(alice, amount);
        } else {
            token.mintReward(alice, amount);
            assertLe(token.currentDayMinted(), cap);
        }
    }

    function testFuzz_mintRewardZeroAmountReverts(address to) public {
        vm.assume(to != address(0));
        vm.prank(miner);
        vm.expectRevert(GuardiansToken.ZeroAmount.selector);
        token.mintReward(to, 0);
    }

    function testFuzz_distributeInitialOneShot(uint256 amount) public {
        amount = bound(amount, 1, MAX_SUPPLY);
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = alice;
        amounts[0] = amount;

        vm.prank(owner);
        token.distributeInitial(recipients, amounts);
        assertTrue(token.initialized());

        // Second call always reverts regardless of input
        vm.prank(owner);
        vm.expectRevert(GuardiansToken.AlreadyInitialized.selector);
        token.distributeInitial(recipients, amounts);
    }

    // ==========================================================
    //                       Invariants
    // ==========================================================

    function invariant_totalSupplyNeverExceedsMaxSupply() public view {
        assertLe(token.totalSupply(), MAX_SUPPLY);
    }

    function invariant_mintableSupplyPlusTotalEqualsMaxSupply() public view {
        assertEq(token.mintableSupply() + token.totalSupply(), MAX_SUPPLY);
    }

    function invariant_dailyCapNeverExceeded() public view {
        uint256 cap = token.MAX_MINT_PER_DAY();
        uint256 len = handler.seenDaysLength();
        for (uint256 i = 0; i < len; ++i) {
            assertLe(token.mintedPerDay(handler.seenDays(i)), cap);
        }
    }

    function invariant_initializedMonotonic() public view {
        // Once handler observed initialized==true, the live state must still be true.
        if (handler.everInitialized()) {
            assertTrue(token.initialized());
        }
    }
}

/// @notice Bounded action driver for invariant fuzzing of mintReward + distributeInitial.
contract MintRewardHandler is Test {
    GuardiansToken public token;
    address public miner;
    address public owner;

    uint256[] public seenDays;
    mapping(uint256 => bool) public seen;
    bool public everInitialized;

    constructor(GuardiansToken _token, address _miner, address _owner) {
        token = _token;
        miner = _miner;
        owner = _owner;
    }

    function _markDay() internal {
        uint256 d = block.timestamp / 1 days;
        if (!seen[d]) {
            seen[d] = true;
            seenDays.push(d);
        }
    }

    function seenDaysLength() external view returns (uint256) {
        return seenDays.length;
    }

    function mintRewardBounded(uint256 amount, address to, uint256 warpSecs) external {
        if (to == address(0)) to = address(0xBEEF);
        warpSecs = bound(warpSecs, 0, 7 days);
        amount = bound(amount, 1, token.MAX_MINT_PER_DAY());

        if (warpSecs > 0) vm.warp(block.timestamp + warpSecs);
        _markDay();

        vm.prank(miner);
        try token.mintReward(to, amount) {} catch {}
    }

    function distributeInitialBounded(uint256 amount, address to) external {
        if (to == address(0)) to = address(0xCAFE);
        amount = bound(amount, 1, token.mintableSupply());
        if (amount == 0) return;

        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = to;
        amounts[0] = amount;

        vm.prank(owner);
        try token.distributeInitial(recipients, amounts) {
            everInitialized = true;
        } catch {
            // Will catch AlreadyInitialized after first success — that's expected.
            if (token.initialized()) everInitialized = true;
        }
    }

    function warpForward(uint256 secs) external {
        secs = bound(secs, 1 hours, 30 days);
        vm.warp(block.timestamp + secs);
        _markDay();
    }
}
