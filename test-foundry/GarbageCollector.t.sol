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

    /// @dev Use vm.addr() so we have a known private key for the oracle signer.
    uint256 oraclePk = 0xA11C5E0D17EAB1E5;
    address oracle;

    uint256 constant ONE = 1e18;

    bytes32 constant CLEANUP_AUTH_TYPEHASH =
        keccak256("CleanupAuthorization(address user,bytes32 batchHash,uint256 cleanupValueUSD,uint256 nonce,uint256 deadline)");

    function setUp() public {
        oracle = vm.addr(oraclePk);

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
            address(vault),
            oracle
        );
        mining.grantRole(mining.COLLECTOR_ROLE(), address(gc));

        dust = new MockERC20("Dust", "DUST");
        vm.stopPrank();

        vm.deal(address(router), 10_000 ether);

        dust.mint(user, 1_000 ether);
        vm.prank(user);
        dust.approve(address(gc), type(uint256).max);
    }

    // ============================================================
    //                       Helpers
    // ============================================================

    function _signCleanup(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256 value,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory sig) {
        bytes32 batchHash = keccak256(abi.encode(tokens, amounts));
        bytes32 structHash = keccak256(abi.encode(
            CLEANUP_AUTH_TYPEHASH, user, batchHash, value, nonce, deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            _domainSeparator(),
            structHash
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePk, digest);
        sig = abi.encodePacked(r, s, v);
    }

    function _domainSeparator() internal view returns (bytes32) {
        // Use the contract's helper to compute the digest exactly the way it does internally.
        address[] memory empty = new address[](0);
        uint256[] memory emptyAmts = new uint256[](0);
        bytes32 batchHash = keccak256(abi.encode(empty, emptyAmts));
        bytes32 structHash = keccak256(abi.encode(
            CLEANUP_AUTH_TYPEHASH, user, batchHash, uint256(0), uint256(0), uint256(0)
        ));
        bytes32 digest = gc.hashCleanupAuth(user, empty, emptyAmts, 0, 0, 0);
        // digest = keccak256("\x19\x01" || domainSep || structHash) → reverse to obtain domainSep.
        // Pre-compute manually: domainSep = keccak256(abi.encode(EIP712_TYPEHASH, name, version, chainid, verifyingContract))
        bytes32 EIP712_DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        bytes32 nameHash = keccak256(bytes("GarbageCollector"));
        bytes32 versionHash = keccak256(bytes("1"));
        bytes32 ds = keccak256(abi.encode(EIP712_DOMAIN_TYPEHASH, nameHash, versionHash, block.chainid, address(gc)));
        // Sanity: digest must equal recomputed hash.
        bytes32 recomputed = keccak256(abi.encodePacked("\x19\x01", ds, structHash));
        require(digest == recomputed, "domain mismatch");
        return ds;
    }

    function _singleAuth(uint256 amount, uint256 value)
        internal
        view
        returns (
            address[] memory tokens,
            uint256[] memory amounts,
            uint256 nonce,
            uint256 deadline,
            bytes memory sig
        )
    {
        tokens = new address[](1);
        amounts = new uint256[](1);
        tokens[0] = address(dust);
        amounts[0] = amount;
        nonce = gc.nonces(user);
        deadline = block.timestamp + 1 hours;
        sig = _signCleanup(tokens, amounts, value, nonce, deadline);
    }

    // ==========================================================
    //                    Unit/integration fuzz
    // ==========================================================

    function testFuzz_cleanupBatchPaysExpectedBNB(uint256 amount) public {
        amount = bound(amount, 1 ether, 100 ether);
        (
            address[] memory tokens,
            uint256[] memory amounts,
            uint256 nonce,
            uint256 deadline,
            bytes memory sig
        ) = _singleAuth(amount, 50 * ONE);

        uint256 userBnbBefore = user.balance;

        vm.prank(user);
        uint256 received = gc.cleanupBatch(tokens, amounts, amount, 50 * ONE, nonce, deadline, sig);

        assertEq(received, amount);
        assertEq(user.balance - userBnbBefore, amount);
        assertGt(token.balanceOf(user), 0);
        assertEq(gc.nonces(user), 1);
    }

    function testFuzz_invalidSignerReverts(uint256 badPk) public {
        badPk = bound(badPk, 1, type(uint128).max);
        vm.assume(badPk != oraclePk);

        (address[] memory tokens, uint256[] memory amounts, uint256 nonce, uint256 deadline,) =
            _singleAuth(1 ether, 50 * ONE);

        // Sign with wrong key.
        bytes32 digest = gc.hashCleanupAuth(user, tokens, amounts, 50 * ONE, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(badPk, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.prank(user);
        vm.expectRevert(GarbageCollector.InvalidSignature.selector);
        gc.cleanupBatch(tokens, amounts, 0, 50 * ONE, nonce, deadline, badSig);
    }

    function testFuzz_expiredDeadlineReverts(uint256 amount) public {
        amount = bound(amount, 1 ether, 100 ether);
        vm.warp(block.timestamp + 1 hours);

        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = address(dust);
        amounts[0] = amount;
        uint256 nonce = gc.nonces(user);
        uint256 deadline = block.timestamp - 1;
        bytes memory sig = _signCleanup(tokens, amounts, 50 * ONE, nonce, deadline);

        vm.prank(user);
        vm.expectRevert(GarbageCollector.SignatureExpired.selector);
        gc.cleanupBatch(tokens, amounts, 0, 50 * ONE, nonce, deadline, sig);
    }

    function testFuzz_replayBlocked() public {
        (
            address[] memory tokens,
            uint256[] memory amounts,
            uint256 nonce,
            uint256 deadline,
            bytes memory sig
        ) = _singleAuth(1 ether, 50 * ONE);

        vm.prank(user);
        gc.cleanupBatch(tokens, amounts, 0, 50 * ONE, nonce, deadline, sig);

        // Replay with same nonce should fail (nonce now 1, signature was for 0).
        vm.prank(user);
        vm.expectRevert(); // InvalidNonce
        gc.cleanupBatch(tokens, amounts, 0, 50 * ONE, nonce, deadline, sig);
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
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = scamAddr;
        amounts[0] = amount;
        uint256 nonce = gc.nonces(user);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signCleanup(tokens, amounts, 10 * ONE, nonce, deadline);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(GarbageCollector.TokenIsScam.selector, scamAddr));
        gc.cleanupBatch(tokens, amounts, 0, 10 * ONE, nonce, deadline, sig);
    }

    function testFuzz_swapFailureRoutesToLandfill(uint256 amount) public {
        amount = bound(amount, 1 ether, 100 ether);
        vm.prank(admin);
        router.setShouldFail(true);

        (
            address[] memory tokens,
            uint256[] memory amounts,
            uint256 nonce,
            uint256 deadline,
            bytes memory sig
        ) = _singleAuth(amount, 10 * ONE);

        vm.prank(user);
        gc.cleanupBatch(tokens, amounts, 0, 10 * ONE, nonce, deadline, sig);

        assertEq(dust.balanceOf(address(vault)), amount);
    }

    function testFuzz_sendScamToLandfillNoReward(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = address(dust);
        amounts[0] = amount;

        vm.prank(user);
        gc.sendScamToLandfill(tokens, amounts);

        assertEq(dust.balanceOf(address(vault)), amount);
        assertEq(token.balanceOf(user), 0);
        assertEq(mining.totalCleanupsExecuted(), 0);
        // sendScamToLandfill must NOT consume cleanupBatch nonce.
        assertEq(gc.nonces(user), 0);
    }

    function test_pauseBlocksBothPaths() public {
        vm.prank(admin);
        gc.pause();

        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = address(dust);
        amounts[0] = 1 ether;

        vm.startPrank(user);
        vm.expectRevert();
        gc.cleanupBatch(tokens, amounts, 0, 10 * ONE, 0, block.timestamp + 1 hours, hex"");
        vm.expectRevert();
        gc.sendScamToLandfill(tokens, amounts);
        vm.stopPrank();
    }

    function test_withdrawStuckBNB() public {
        vm.deal(address(gc), 5 ether);
        address recipient = address(0xDEAD);
        uint256 before = recipient.balance;
        vm.prank(admin);
        gc.withdrawStuckBNB(recipient);
        assertEq(recipient.balance - before, 5 ether);
    }
}
