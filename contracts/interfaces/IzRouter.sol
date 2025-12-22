// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IzRouter
 * @notice Interface for zRouter - gas-efficient multi-AMM DEX aggregator
 * @dev Deployed on Ethereum: 0x00000000008892d085e0611eb8C8BDc9FD856fD3
 * @dev Source: https://github.com/zammdefi/zRouter
 */
interface IzRouter {
    /**
     * @notice Swap via Uniswap V3 pools
     * @param tokenIn Input token address
     * @param tokenOut Output token address  
     * @param fee Pool fee tier (500, 3000, 10000)
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum output (slippage protection)
     * @param deadline Transaction deadline (use type(uint256).max for no deadline)
     * @return amountOut Actual output amount
     */
    function swapV3(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Swap via Uniswap V2 / SushiSwap pools
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum output (slippage protection)
     * @param deadline Transaction deadline (use type(uint256).max for SushiSwap)
     * @return amountOut Actual output amount
     */
    function swapV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Swap via Uniswap V4 pools
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param fee Pool fee tier
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum output (slippage protection)
     * @param deadline Transaction deadline
     * @return amountOut Actual output amount
     */
    function swapV4(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Execute multiple calls atomically
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}
