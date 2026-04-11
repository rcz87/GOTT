// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GuardiansToken} from "../contracts/GuardiansToken.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract GuardiansTokenTest is Test {
    GuardiansToken token;
    address owner = address(0xA11CE);
    address alice = address(0xB0B);
    address bob = address(0xCAFE);

    uint256 constant MAX_SUPPLY = 1_000_000_000 ether;
    uint256 constant INITIAL_PCT = 40;

    function setUp() public {
        vm.prank(owner);
        token = new GuardiansToken(owner, uint8(INITIAL_PCT));
    }

    // ---------- Unit fuzz ----------

    function testFuzz_mintRespectsMaxSupply(uint256 amount) public {
        // Exempt alice so test isolates supply cap from anti-whale
        vm.prank(owner);
        token.setExemptFromMaxWallet(alice, true);

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

    function testFuzz_transferAntiWhale(uint256 amount) public {
        uint256 maxWallet = token.maxWalletAmount();
        vm.assume(amount > 0 && amount <= token.balanceOf(owner));
        vm.prank(owner);
        if (amount > maxWallet && !token.isExemptFromMaxWallet(alice)) {
            vm.expectRevert();
            token.transfer(alice, amount);
        } else {
            token.transfer(alice, amount);
            assertLe(token.balanceOf(alice), maxWallet);
        }
    }

    function testFuzz_burnDecreasesTotalSupply(uint256 amount) public {
        vm.assume(amount > 0 && amount <= token.balanceOf(owner));
        uint256 supplyBefore = token.totalSupply();
        vm.prank(owner);
        token.burn(amount);
        assertEq(token.totalSupply(), supplyBefore - amount);
    }

    function testFuzz_onlyMinterCanMint(address caller, uint256 amount) public {
        vm.assume(caller != owner && caller != address(0));
        vm.assume(amount < token.mintableSupply());
        vm.prank(caller);
        vm.expectRevert();
        token.mint(alice, amount);
    }

    function testFuzz_delegateSetsVotingPower(uint256 transferAmount) public {
        vm.assume(transferAmount > 0 && transferAmount <= token.maxWalletAmount());
        vm.prank(owner);
        token.transfer(alice, transferAmount);

        assertEq(token.getVotes(alice), 0);
        vm.prank(alice);
        token.delegate(alice);
        assertEq(token.getVotes(alice), transferAmount);
    }

    // ---------- Invariants ----------

    function invariant_totalSupplyNeverExceedsMaxSupply() public view {
        assertLe(token.totalSupply(), MAX_SUPPLY);
    }

    function invariant_mintableSupplyPlusTotalEqualsMaxSupply() public view {
        assertEq(token.mintableSupply() + token.totalSupply(), MAX_SUPPLY);
    }
}
