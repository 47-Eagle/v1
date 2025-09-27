// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Simple mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint 1 billion tokens to deployer
        _mint(msg.sender, 1_000_000_000 * 10**decimals());
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
