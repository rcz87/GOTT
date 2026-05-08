// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GuardiansToken} from "../contracts/GuardiansToken.sol";
import {ScamRegistry} from "../contracts/ScamRegistry.sol";
import {LandfillVault} from "../contracts/LandfillVault.sol";
import {CleanupMining} from "../contracts/CleanupMining.sol";
import {GarbageCollector} from "../contracts/GarbageCollector.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {MockPancakeRouter} from "../contracts/mocks/MockPancakeRouter.sol";

contract GarbageCollectorTest is Test {
    GuardiansToken token;
    ScamRegistry registry;
    LandfillVault vault;
    CleanupMining mining;
    MockPancakeRouter router;
    GarbageCollector gc;
    MockERC20 dust;

    address admin = address(0xA11CE);
    address user = address(0x0000000000000000000000000000000000005Ee5);
    address constant WBNB = address(0x000000000000000000000000000000000000000b);

    uint256 constant ONE = 1e18;

    function setUp() public {
        vm.startPrank(admin);

        token = new GuardiansToken(admin);
        registry = new ScamRegistry(admin);
        registry.grantRole(registry.ORACLE_ROLE(), admin);
        vault = new LandfillVault(admin, admin);
        mining = new CleanupMining(admin, address(token));
        token.grantRole(token.CLEANUP_MINER_ROLE(), address(mining));

        router = new MockPancakeRouter(WBNB);
        gc = new GarbageCollector(
            admin,
            address(router),
            WBNB,
            address(registry),
            address(mining),
            address(vault)
        );
        mining.grantRole(mining.COLLECTOR_ROLE(), address(gc));

        dust = new MockERC20("Dust", "DUST");
        vm.stopPrank();

        // Pre-fund router so it can pay swaps.
        vm.deal(address(router), 10_000 ether);

        // Mint and approve as user.
        dust.mint(user, 1_000 ether);
        vm.prank(user);
        dust.approve(address(gc), type(uint256).max);
    }

    // ==========================================================
    //                    Unit/integration fuzz
    // ==========================================================

    function testFuzz_cleanupBatchPaysExpectedBNB(uint256 amount) public {
        amount = bound(amount, 1 ether, 100 ether);
        // First cleanup tier 2x, epoch 0 (1x), baseRate 100. Cap value to keep reward < 1.4M GOTT:
        // reward = 100 × value × 2 → value < 7000 USD.
        uint256 valueUSD = 50 * ONE;

        address[] memory tokens = new address[](1);
        uint256[] memory amts = new uint256[](1);
        tokens[0] = address(dust);
        amts[0] = amount;

        uint256 userBnbBefore = user.balance;

        vm.prank(user);
        uint256 received = gc.cleanupBatch(tokens, amts, amount, valueUSD);

        assertEq(received, amount); // 1:1 mock rate
        assertEq(user.balance - userBnbBefore, amount);
        // Reward minted to user.
        assertGt(token.balanceOf(user), 0);
    }

    function testFuzz_scamTokenReverts(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        address scamAddr = address(new MockERC20("Scammy", "SCAM"));
        vm.prank(admin);
        registry.setStatus(scamAddr, ScamRegistry.TokenStatus.Scam);

        MockERC20(scamAddr).mint(user, amount);
        vm.prank(user);
        MockERC20(scamAddr).approve(address(gc), amount);

        address[] memory tokens = new address[](1);
        uint256[] memory amts = new uint256[](1);
        tokens[0] = scamAddr;
        amts[0] = amount;

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(GarbageCollector.TokenIsScam.selector, scamAddr));
        gc.cleanupBatch(tokens, amts, 0, 10 * ONE);
    }

    function testFuzz_swapFailureRoutesToLandfill(uint256 amount) public {
        amount = bound(amount, 1 ether, 100 ether);
        vm.prank(admin);
        router.setShouldFail(true);

        address[] memory tokens = new address[](1);
        uint256[] memory amts = new uint256[](1);
        tokens[0] = address(dust);
        amts[0] = amount;

        vm.prank(user);
        gc.cleanupBatch(tokens, amts, 0, 10 * ONE);

        assertEq(dust.balanceOf(address(vault)), amount);
    }

    function testFuzz_sendScamToLandfillNoReward(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        address[] memory tokens = new address[](1);
        uint256[] memory amts = new uint256[](1);
        tokens[0] = address(dust);
        amts[0] = amount;

        vm.prank(user);
        gc.sendScamToLandfill(tokens, amts);

        assertEq(dust.balanceOf(address(vault)), amount);
        assertEq(token.balanceOf(user), 0);
        assertEq(mining.totalCleanupsExecuted(), 0);
    }

    function test_pauseBlocksBothPaths() public {
        vm.prank(admin);
        gc.pause();

        address[] memory tokens = new address[](1);
        uint256[] memory amts = new uint256[](1);
        tokens[0] = address(dust);
        amts[0] = 1 ether;

        vm.startPrank(user);
        vm.expectRevert(); // EnforcedPause
        gc.cleanupBatch(tokens, amts, 0, 10 * ONE);
        vm.expectRevert();
        gc.sendScamToLandfill(tokens, amts);
        vm.stopPrank();
    }

    function test_withdrawStuckBNB() public {
        // Donate 5 BNB to gc.
        vm.deal(address(gc), 5 ether);

        address recipient = address(0xDEAD);
        uint256 before = recipient.balance;

        vm.prank(admin);
        gc.withdrawStuckBNB(recipient);

        assertEq(recipient.balance - before, 5 ether);
        assertEq(address(gc).balance, 0);
    }
}
