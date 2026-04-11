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
 * @notice Hybrid utility + governance token on BSC
 * 
 * Features:
 * - ERC20Votes: On-chain governance voting power (delegate & vote)
 * - ERC20Permit: Gasless approvals via EIP-2612 signatures
 * - ERC20Burnable: Any holder can burn their own tokens
 * - ERC20Pausable: Owner can pause all transfers (emergency)
 * - AccessControl: Role-based permissions (MINTER, PAUSER, ADMIN)
 * - Mintable: MINTER_ROLE can mint new tokens up to MAX_SUPPLY cap
 * - Anti-whale: Max wallet limit (configurable, default 2% of supply)
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

    // ============================================================
    //                      CONSTANTS
    // ============================================================
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 Billion GOTT

    // ============================================================
    //                    STATE VARIABLES
    // ============================================================
    uint256 public maxWalletAmount;
    bool public maxWalletEnabled;

    // Addresses exempt from max wallet limit (owner, pairs, routers)
    mapping(address => bool) public isExemptFromMaxWallet;

    // ============================================================
    //                       EVENTS
    // ============================================================
    event MaxWalletUpdated(uint256 oldAmount, uint256 newAmount);
    event MaxWalletToggled(bool enabled);
    event ExemptFromMaxWallet(address indexed account, bool exempt);

    // ============================================================
    //                      ERRORS
    // ============================================================
    error ExceedsMaxSupply(uint256 requested, uint256 available);
    error ExceedsMaxWallet(address account, uint256 balance, uint256 max);
    error ZeroAddress();

    // ============================================================
    //                    CONSTRUCTOR
    // ============================================================

    /**
     * @notice Deploy Guardians Token
     * @param initialOwner Address that receives all roles + initial supply
     * @param initialMintPercent Percentage of MAX_SUPPLY to mint at deploy (1-100)
     * 
     * Example: initialMintPercent = 40 → mints 400,000,000 GOTT to owner
     *          remaining 600,000,000 can be minted later by MINTER_ROLE
     */
    constructor(
        address initialOwner,
        uint8 initialMintPercent
    ) ERC20("Guardians Token", "GOTT") ERC20Permit("Guardians Token") {
        if (initialOwner == address(0)) revert ZeroAddress();
        require(initialMintPercent > 0 && initialMintPercent <= 100, "Invalid mint %");

        // Grant all roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);

        // Mint initial supply
        uint256 initialSupply = (MAX_SUPPLY * initialMintPercent) / 100;
        _mint(initialOwner, initialSupply);

        // Anti-whale: default 2% of MAX_SUPPLY
        maxWalletAmount = (MAX_SUPPLY * 2) / 100; // 20,000,000 GOTT
        maxWalletEnabled = true;

        // Exempt owner from max wallet
        isExemptFromMaxWallet[initialOwner] = true;
        isExemptFromMaxWallet[address(0)] = true;
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
    //                    PAUSE (Emergency)
    // ============================================================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ============================================================
    //                  ANTI-WHALE CONFIG
    // ============================================================

    /**
     * @notice Update max wallet amount (ADMIN only)
     * @param newMaxWallet New max wallet in wei (min 0.1% of MAX_SUPPLY)
     */
    function setMaxWalletAmount(uint256 newMaxWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMaxWallet >= MAX_SUPPLY / 1000, "Min 0.1% of supply");
        emit MaxWalletUpdated(maxWalletAmount, newMaxWallet);
        maxWalletAmount = newMaxWallet;
    }

    function toggleMaxWallet(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxWalletEnabled = enabled;
        emit MaxWalletToggled(enabled);
    }

    function setExemptFromMaxWallet(
        address account,
        bool exempt
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isExemptFromMaxWallet[account] = exempt;
        emit ExemptFromMaxWallet(account, exempt);
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

        // Anti-whale check on receiving side
        if (maxWalletEnabled && to != address(0) && !isExemptFromMaxWallet[to]) {
            if (balanceOf(to) > maxWalletAmount) {
                revert ExceedsMaxWallet(to, balanceOf(to), maxWalletAmount);
            }
        }
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
