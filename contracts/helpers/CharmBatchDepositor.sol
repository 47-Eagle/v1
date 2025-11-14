// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICharmVault {
    function deposit(
        uint256 amount0,
        uint256 amount1,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external returns (uint256 shares, uint256 amount0Used, uint256 amount1Used);
    
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/**
 * @title CharmBatchDepositor
 * @notice Helper to deposit to Charm in smaller batches to avoid "cross" errors
 */
contract CharmBatchDepositor {
    using SafeERC20 for IERC20;
    
    /**
     * @notice Deposit to Charm vault in multiple smaller batches
     * @param charmVault The Charm vault to deposit into
     * @param token0Amount Total amount of token0 to deposit
     * @param token1Amount Total amount of token1 to deposit
     * @param batchCount Number of batches to split deposit into
     * @param recipient Address to receive the LP shares
     * @return totalShares Total shares received from all deposits
     */
    function batchDeposit(
        address charmVault,
        uint256 token0Amount,
        uint256 token1Amount,
        uint256 batchCount,
        address recipient
    ) external returns (uint256 totalShares) {
        require(batchCount > 0 && batchCount <= 10, "Invalid batch count");
        
        ICharmVault vault = ICharmVault(charmVault);
        IERC20 token0 = IERC20(vault.token0());
        IERC20 token1 = IERC20(vault.token1());
        
        // Pull tokens from sender
        if (token0Amount > 0) {
            token0.safeTransferFrom(msg.sender, address(this), token0Amount);
            token0.forceApprove(charmVault, token0Amount);
        }
        if (token1Amount > 0) {
            token1.safeTransferFrom(msg.sender, address(this), token1Amount);
            token1.forceApprove(charmVault, token1Amount);
        }
        
        // Calculate per-batch amounts
        uint256 token0PerBatch = token0Amount / batchCount;
        uint256 token1PerBatch = token1Amount / batchCount;
        
        // Deposit in batches
        for (uint256 i = 0; i < batchCount; i++) {
            uint256 amount0 = (i == batchCount - 1) ? token0.balanceOf(address(this)) : token0PerBatch;
            uint256 amount1 = (i == batchCount - 1) ? token1.balanceOf(address(this)) : token1PerBatch;
            
            (uint256 shares, , ) = vault.deposit(
                amount0,
                amount1,
                0,
                0,
                address(this)
            );
            
            totalShares += shares;
        }
        
        // Transfer all shares to recipient
        IERC20(charmVault).safeTransfer(recipient, totalShares);
        
        // Return any leftover tokens
        uint256 leftover0 = token0.balanceOf(address(this));
        uint256 leftover1 = token1.balanceOf(address(this));
        if (leftover0 > 0) token0.safeTransfer(msg.sender, leftover0);
        if (leftover1 > 0) token1.safeTransfer(msg.sender, leftover1);
    }
}



