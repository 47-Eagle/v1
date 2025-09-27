// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IStrategy
 * @notice Interface for yield-generating strategies that can be used by EagleOVault
 * @dev All strategies must implement this interface for standardized integration
 */
interface IStrategy {
    // =================================
    // VIEW FUNCTIONS
    // =================================
    
    /**
     * @notice Get strategy's total value in underlying tokens
     * @return wlfiAmount Total WLFI managed by strategy
     * @return usd1Amount Total USD1 managed by strategy
     */
    function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount);
    
    /**
     * @notice Check if strategy is active and ready for operations
     * @return True if strategy is active
     */
    function isInitialized() external view returns (bool);
    
    // =================================
    // STRATEGY OPERATIONS
    // =================================
    
    /**
     * @notice Deposit tokens into the strategy
     * @param wlfiAmount Amount of WLFI to deposit
     * @param usd1Amount Amount of USD1 to deposit
     * @return shares Strategy-specific shares or receipt tokens (if any)
     */
    function deposit(uint256 wlfiAmount, uint256 usd1Amount) external returns (uint256 shares);
    
    /**
     * @notice Withdraw tokens from the strategy
     * @param shares Amount of strategy shares to withdraw (or proportional amount)
     * @return wlfiAmount Amount of WLFI withdrawn
     * @return usd1Amount Amount of USD1 withdrawn
     */
    function withdraw(uint256 shares) external returns (uint256 wlfiAmount, uint256 usd1Amount);
    
    /**
     * @notice Rebalance the strategy position if needed
     */
    function rebalance() external;
    
    // =================================
    // EVENTS
    // =================================
    
    event StrategyDeposit(uint256 wlfiAmount, uint256 usd1Amount, uint256 shares);
    event StrategyWithdraw(uint256 shares, uint256 wlfiAmount, uint256 usd1Amount);
    event StrategyRebalanced(uint256 newTotal0, uint256 newTotal1);
}
