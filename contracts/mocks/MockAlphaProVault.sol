// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockAlphaProVaultFactory
 * @notice Mock implementation of Charm's AlphaProVaultFactory for testing
 */
contract MockAlphaProVaultFactory {
    using SafeERC20 for IERC20;
    
    mapping(bytes32 => address) public vaults;
    
    function createVault(
        address token0,
        address token1,
        uint24 fee,
        uint256 maxTotalSupply
    ) external returns (address vault) {
        bytes32 key = keccak256(abi.encodePacked(token0, token1, fee));
        require(vaults[key] == address(0), "Vault already exists");
        
        // Deploy mock vault
        MockAlphaProVault newVault = new MockAlphaProVault(token0, token1, maxTotalSupply);
        vault = address(newVault);
        vaults[key] = vault;
    }
    
    function getVault(
        address token0,
        address token1,
        uint24 fee
    ) external view returns (address) {
        bytes32 key = keccak256(abi.encodePacked(token0, token1, fee));
        return vaults[key];
    }
}

/**
 * @title MockAlphaProVault
 * @notice Mock implementation of Charm's AlphaProVault for testing
 */
contract MockAlphaProVault {
    using SafeERC20 for IERC20;
    
    address public immutable token0;
    address public immutable token1;
    uint256 public immutable maxTotalSupply;
    
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;
    
    uint256 private token0Balance;
    uint256 private token1Balance;
    
    constructor(address _token0, address _token1, uint256 _maxTotalSupply) {
        token0 = _token0;
        token1 = _token1;
        maxTotalSupply = _maxTotalSupply;
    }
    
    function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient
    ) external returns (uint256 shares, uint256 amount0Used, uint256 amount1Used) {
        // Simplified logic for testing - use desired amounts
        amount0Used = amount0Desired;
        amount1Used = amount1Desired;
        shares = amount0Used + amount1Used; // 1:1 for simplicity
        
        require(totalSupply + shares <= maxTotalSupply, "Max supply exceeded");
        require(amount0Used >= amount0Min && amount1Used >= amount1Min, "Slippage exceeded");
        
        // Transfer tokens in
        if (amount0Used > 0) {
            IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0Used);
            token0Balance += amount0Used;
        }
        if (amount1Used > 0) {
            IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1Used);
            token1Balance += amount1Used;
        }
        
        // Mint shares
        balanceOf[recipient] += shares;
        totalSupply += shares;
    }
    
    function withdraw(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient
    ) external returns (uint256 amount0, uint256 amount1) {
        require(balanceOf[msg.sender] >= shares, "Insufficient shares");
        require(totalSupply > 0, "No shares to withdraw");
        
        // Calculate proportional amounts
        amount0 = (token0Balance * shares) / totalSupply;
        amount1 = (token1Balance * shares) / totalSupply;
        
        require(amount0 >= amount0Min && amount1 >= amount1Min, "Slippage exceeded");
        
        // Burn shares
        balanceOf[msg.sender] -= shares;
        totalSupply -= shares;
        
        // Update balances and transfer
        token0Balance -= amount0;
        token1Balance -= amount1;
        
        if (amount0 > 0) IERC20(token0).safeTransfer(recipient, amount0);
        if (amount1 > 0) IERC20(token1).safeTransfer(recipient, amount1);
    }
    
    function getTotalAmounts() external view returns (uint256 total0, uint256 total1) {
        total0 = token0Balance;
        total1 = token1Balance;
    }
}
