// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Test-only PancakeRouter mock with deterministic 1:1 swap and toggleable failure.
 *         Pre-fund this contract with native BNB before running tests.
 */
contract MockPancakeRouter {
    address public immutable wbnb;

    /// @dev BNB units per 1 wei of input token (1e18-scaled). Default 1e18 → 1:1.
    uint256 public rate = 1e18;

    /// @dev If true, swapExactTokensForETH always reverts (test landfill fallback).
    bool public shouldFail;

    /// @dev Optional per-token override of `shouldFail`.
    mapping(address => bool) public failForToken;

    constructor(address _wbnb) {
        wbnb = _wbnb;
    }

    receive() external payable {}

    function WETH() external view returns (address) {
        return wbnb;
    }

    function setRate(uint256 newRate) external {
        rate = newRate;
    }

    function setShouldFail(bool v) external {
        shouldFail = v;
    }

    function setFailForToken(address token, bool v) external {
        failForToken[token] = v;
    }

    /// @notice Pull `amountIn` of `path[0]` and pay `rate * amountIn / 1e18` BNB to `to`.
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "path");
        if (shouldFail || failForToken[path[0]]) revert("MockRouter: forced failure");

        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

        uint256 bnbOut = (amountIn * rate) / 1e18;
        require(bnbOut >= amountOutMin, "slippage");

        (bool sent,) = to.call{value: bnbOut}("");
        require(sent, "bnb send");

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = bnbOut;
    }
}
