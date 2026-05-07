// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Guardians Token (GOTT)
 * @author Ricoz
 * @notice Hybrid utility + governance token on BSC (v2: cleanup mining enabled)
 *
 * Features:
 * - ERC20Votes: On-chain governance voting power (delegate & vote)
 * - ERC20Permit: Gasless approvals via EIP-2612 signatures
 * - ERC20Burnable: Any holder can burn their own tokens
 * - ERC20Pausable: Owner can pause all transfers (emergency)
 * - AccessControl: Role-based permissions (MINTER, PAUSER, CLEANUP_MINER, ADMIN)
 * - Mintable: MINTER_ROLE for general mint, CLEANUP_MINER_ROLE for cleanup rewards
 * - Cleanup mining: mintReward() with 1.4M GOTT/day cap (anti-exploit)
 * - TGE distribution: distributeInitial() one-shot for split allocation
 * - Max supply cap: 1,000,000,000 GOTT (hard cap, cannot be exceeded)
 */
contract GuardiansToken is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    ERC20Votes,
    AccessControl
{
    // ============================================================
    //                        ROLES
    // ============================================================
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CLEANUP_MINER_ROLE = keccak256("CLEANUP_MINER_ROLE");

    // ============================================================
    //                      CONSTANTS
    // ============================================================
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1B GOTT hard cap
    uint256 public constant MAX_MINT_PER_DAY = 1_400_000 ether;     // mintReward daily cap

    // ============================================================
    //                    STATE VARIABLES
    // ============================================================
    // key = block.timestamp / 1 days; value = total minted via mintReward that day
    mapping(uint256 => uint256) public mintedPerDay;

    // distributeInitial() one-shot guard
    bool public initialized;

    // ============================================================
    //                       EVENTS
    // ============================================================
    event RewardMinted(address indexed to, uint256 amount, uint256 indexed day);
    event InitialDistributed(address[] recipients, uint256[] amounts);

    // ============================================================
    //                      ERRORS
    // ============================================================
    error ExceedsMaxSupply(uint256 requested, uint256 available);
    error DailyMintCapExceeded(uint256 requested, uint256 available);
    error AlreadyInitialized();
    error LengthMismatch();
    error EmptyDistribution();
    error ZeroDistributionAmount();
    error ZeroAmount();
    error ZeroAddress();

    // ============================================================
    //                    CONSTRUCTOR
    // ============================================================

    /**
     * @notice Deploy Guardians Token
     * @param initialOwner Address that receives all initial roles (DEFAULT_ADMIN, MINTER, PAUSER)
     * @dev No initial mint — call distributeInitial() post-deploy for TGE allocation.
     */
    constructor(address initialOwner)
        ERC20("Guardians Token", "GOTT")
        ERC20Permit("Guardians Token")
    {
        if (initialOwner == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
    }

    // ============================================================
    //                  TGE INITIAL DISTRIBUTION
    // ============================================================

    /**
     * @notice One-shot TGE distribution. Splits initial allocation across multiple recipients.
     * @param recipients Addresses receiving initial allocation (LP, marketing, airdrop, etc.)
     * @param amounts    Amounts in wei, parallel to recipients.
     * @dev DEFAULT_ADMIN_ROLE only. Single use guarded by `initialized`. Respects MAX_SUPPLY.
     */
    function distributeInitial(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (initialized) revert AlreadyInitialized();
        if (recipients.length == 0) revert EmptyDistribution();
        if (recipients.length != amounts.length) revert LengthMismatch();

        uint256 total = 0;
        uint256 len = recipients.length;
        for (uint256 i = 0; i < len; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            total += amounts[i];
        }
        if (total == 0) revert ZeroDistributionAmount();
        if (totalSupply() + total > MAX_SUPPLY) {
            revert ExceedsMaxSupply(total, MAX_SUPPLY - totalSupply());
        }

        // Effects: flip the one-shot flag after all validation, before external state writes.
        initialized = true;

        for (uint256 i = 0; i < len; ++i) {
            _mint(recipients[i], amounts[i]);
        }

        emit InitialDistributed(recipients, amounts);
    }

    // ============================================================
    //                   MINTING (Capped)
    // ============================================================

    /**
     * @notice Mint new tokens (only MINTER_ROLE, respects MAX_SUPPLY cap)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedsMaxSupply(amount, MAX_SUPPLY - totalSupply());
        }
        _mint(to, amount);
    }

    /**
     * @notice Check how many tokens can still be minted
     */
    function mintableSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    // ============================================================
    //                CLEANUP MINING REWARD MINT
    // ============================================================

    /**
     * @notice Mint reward to cleanup miner. Daily-capped + supply-capped.
     * @dev CLEANUP_MINER_ROLE granted exclusively to CleanupMining.sol contract.
     */
    function mintReward(address to, uint256 amount)
        external
        onlyRole(CLEANUP_MINER_ROLE)
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 day = block.timestamp / 1 days;
        uint256 newDailyTotal = mintedPerDay[day] + amount;
        if (newDailyTotal > MAX_MINT_PER_DAY) {
            revert DailyMintCapExceeded(amount, MAX_MINT_PER_DAY - mintedPerDay[day]);
        }
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedsMaxSupply(amount, MAX_SUPPLY - totalSupply());
        }

        mintedPerDay[day] = newDailyTotal;
        _mint(to, amount);

        emit RewardMinted(to, amount, day);
    }

    /**
     * @notice Total GOTT minted via mintReward today (block.timestamp / 1 days bucket)
     */
    function currentDayMinted() external view returns (uint256) {
        return mintedPerDay[block.timestamp / 1 days];
    }

    /**
     * @notice GOTT still mintable via mintReward today before daily cap is hit
     */
    function remainingDailyMintCapacity() external view returns (uint256) {
        return MAX_MINT_PER_DAY - mintedPerDay[block.timestamp / 1 days];
    }

    // ============================================================
    //                    PAUSE (Emergency)
    // ============================================================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ============================================================
    //              REQUIRED OVERRIDES (Solidity)
    // ============================================================

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
