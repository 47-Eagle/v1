// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Simple mock ERC20 for testing deployment without real tokens
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _decimals = 18; // Default to 18 decimals
        
        // Mint 1M tokens to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @notice Mint tokens for testing (anyone can call for testing purposes)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}