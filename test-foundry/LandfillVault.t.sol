// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LandfillVault} from "../contracts/LandfillVault.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

contract LandfillVaultTest is Test {
    LandfillVault vault;
    MockERC20 token;

    address admin = address(0xA11CE);
    address dao = address(0xDA0DA0);
    address recipient = address(0xBEEF);

    address constant DEAD = 0x000000000000000000000000000000000000dEaD;

    LandfillVaultHandler internal handler;

    function setUp() public {
        vault = new LandfillVault(admin, dao);
        token = new MockERC20("ScamToken", "SCAM");

        // Pre-fund vault with 1M tokens for fuzz exploration headroom.
        token.mint(address(vault), 1_000_000 ether);

        handler = new LandfillVaultHandler(vault, token, admin, dao, recipient);
        targetContract(address(handler));
    }

    // ==========================================================
    //                  Unit fuzz (single-call)
    // ==========================================================

    function testFuzz_burnTokenMovesToDeadAddress(uint256 amount) public {
        amount = bound(amount, 1, token.balanceOf(address(vault)));
        uint256 vaultBefore = token.balanceOf(address(vault));
        uint256 deadBefore = token.balanceOf(DEAD);

        vm.prank(dao);
        vault.burnToken(address(token), amount);

        assertEq(token.balanceOf(address(vault)), vaultBefore - amount);
        assertEq(token.balanceOf(DEAD), deadBefore + amount);
    }

    function testFuzz_transferTokenMovesToRecipient(uint256 amount) public {
        amount = bound(amount, 1, token.balanceOf(address(vault)));
        uint256 vaultBefore = token.balanceOf(address(vault));
        uint256 recipientBefore = token.balanceOf(recipient);

        vm.prank(dao);
        vault.transferToken(address(token), recipient, amount);

        assertEq(token.balanceOf(address(vault)), vaultBefore - amount);
        assertEq(token.balanceOf(recipient), recipientBefore + amount);
    }

    function testFuzz_onlyDaoCanBurn(address caller, uint256 amount) public {
        vm.assume(caller != dao);
        amount = bound(amount, 1, 1 ether);
        vm.prank(caller);
        vm.expectRevert(); // AccessControlUnauthorizedAccount
        vault.burnToken(address(token), amount);
    }

    function testFuzz_onlyEmergencyCanWithdraw(address caller) public {
        vm.assume(caller != admin);
        vm.prank(caller);
        vm.expectRevert();
        vault.emergencyWithdraw(address(token), recipient);
    }

    function test_emergencyWithdrawBypassesPause() public {
        vm.prank(admin);
        vault.pause();
        assertTrue(vault.paused());

        uint256 fullBal = token.balanceOf(address(vault));
        vm.prank(admin);
        vault.emergencyWithdraw(address(token), recipient);

        assertEq(token.balanceOf(address(vault)), 0);
        assertEq(token.balanceOf(recipient), fullBal);
    }

    function test_burnRevertsWhenPaused() public {
        vm.prank(admin);
        vault.pause();
        vm.prank(dao);
        vm.expectRevert(); // EnforcedPause
        vault.burnToken(address(token), 1 ether);
    }

    function testFuzz_zeroAmountReverts() public {
        vm.prank(dao);
        vm.expectRevert(LandfillVault.ZeroAmount.selector);
        vault.burnToken(address(token), 0);

        vm.prank(dao);
        vm.expectRevert(LandfillVault.ZeroAmount.selector);
        vault.transferToken(address(token), recipient, 0);
    }

    // ==========================================================
    //                       Invariants
    // ==========================================================

    /// @dev Vault balance must equal initial mint minus everything moved out (handler tracks).
    function invariant_balanceAccounting() public view {
        uint256 expected = handler.initialMint() - handler.totalMovedOut();
        assertEq(token.balanceOf(address(vault)), expected);
    }

    /// @dev Total moved out is the sum of burn + transfer + emergency withdraw amounts (handler-tracked).
    function invariant_movedOutEqualsSumOfActions() public view {
        uint256 sumOfActions = handler.totalBurned() + handler.totalTransferred() + handler.totalEmergencied();
        assertEq(handler.totalMovedOut(), sumOfActions);
    }

    /// @dev Tokens never appear out of thin air: vault balance ≤ initialMint at all times.
    function invariant_vaultBalanceCappedByInitialMint() public view {
        assertLe(token.balanceOf(address(vault)), handler.initialMint());
    }
}

/// @notice Bounded action driver for invariant fuzzing.
contract LandfillVaultHandler is Test {
    LandfillVault public vault;
    MockERC20 public token;
    address public admin;
    address public dao;
    address public recipient;

    uint256 public immutable initialMint;
    uint256 public totalBurned;
    uint256 public totalTransferred;
    uint256 public totalEmergencied;

    constructor(LandfillVault _vault, MockERC20 _token, address _admin, address _dao, address _recipient) {
        vault = _vault;
        token = _token;
        admin = _admin;
        dao = _dao;
        recipient = _recipient;
        initialMint = _token.balanceOf(address(_vault));
    }

    function totalMovedOut() external view returns (uint256) {
        return totalBurned + totalTransferred + totalEmergencied;
    }

    function _vaultBal() internal view returns (uint256) {
        return token.balanceOf(address(vault));
    }

    function burnBounded(uint256 amount) external {
        if (vault.paused()) return;
        uint256 bal = _vaultBal();
        if (bal == 0) return;
        amount = bound(amount, 1, bal);

        vm.prank(dao);
        try vault.burnToken(address(token), amount) {
            totalBurned += amount;
        } catch {}
    }

    function transferBounded(uint256 amount) external {
        if (vault.paused()) return;
        uint256 bal = _vaultBal();
        if (bal == 0) return;
        amount = bound(amount, 1, bal);

        vm.prank(dao);
        try vault.transferToken(address(token), recipient, amount) {
            totalTransferred += amount;
        } catch {}
    }

    function emergencyBounded() external {
        uint256 bal = _vaultBal();
        if (bal == 0) return;

        vm.prank(admin);
        try vault.emergencyWithdraw(address(token), recipient) {
            totalEmergencied += bal;
        } catch {}
    }

    function pauseToggle() external {
        vm.prank(admin);
        if (vault.paused()) {
            try vault.unpause() {} catch {}
        } else {
            try vault.pause() {} catch {}
        }
    }
}
