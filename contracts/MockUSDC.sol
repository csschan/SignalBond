// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mock USDC for Arc testnet. Anyone can mint for testing.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint test USDC to any address. Call this from faucet or directly.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Convenience: mint 1000 USDC to caller
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** 6);
    }
}
