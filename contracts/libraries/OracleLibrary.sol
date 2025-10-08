// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';

/**
 * @title OracleLibrary
 * @notice Library for getting TWAP prices from Uniswap V3 pools
 * @dev Used to get fair WLFI price in USD1 terms
 */
library OracleLibrary {
    /**
     * @notice Get TWAP price of token0 in terms of token1
     * @param pool Uniswap V3 pool address
     * @param twapInterval Time interval for TWAP (e.g., 1800 = 30 minutes)
     * @return price Price of token0 in token1 terms (18 decimals)
     */
    function getTWAP(address pool, uint32 twapInterval) internal view returns (uint256 price) {
        if (twapInterval == 0) {
            return 1e18; // Default 1:1 if no TWAP
        }

        IUniswapV3Pool uniswapPool = IUniswapV3Pool(pool);
        
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapInterval;
        secondsAgos[1] = 0;

        try uniswapPool.observe(secondsAgos) returns (
            int56[] memory tickCumulatives,
            uint160[] memory
        ) {
            int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
            int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(twapInterval)));

            // Calculate price from tick
            price = _getPriceFromTick(arithmeticMeanTick);
        } catch {
            // Fallback to spot price if TWAP fails
            (uint160 sqrtPriceX96,,,,,,) = uniswapPool.slot0();
            price = _getPriceFromSqrtPriceX96(sqrtPriceX96);
        }
    }

    /**
     * @notice Convert tick to price
     * @param tick The tick value
     * @return price Price in 18 decimals
     */
    function _getPriceFromTick(int24 tick) internal pure returns (uint256 price) {
        // price = 1.0001^tick
        // Simplified calculation for this example
        // In production, use TickMath library or more precise calculation
        
        if (tick < 0) {
            price = (1e18 * 1e18) / uint256(int256(1e18 + (int256(tick) * 1e14)));
        } else {
            price = 1e18 + (uint256(int256(tick)) * 1e14);
        }
    }

    /**
     * @notice Convert sqrtPriceX96 to price
     * @param sqrtPriceX96 Square root price from pool
     * @return price Price in 18 decimals
     */
    function _getPriceFromSqrtPriceX96(uint160 sqrtPriceX96) internal pure returns (uint256 price) {
        // price = (sqrtPriceX96 / 2^96)^2
        uint256 priceX192 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        price = (priceX192 * 1e18) / (2**192);
    }

    /**
     * @notice Simple helper to get current spot price
     * @param pool Uniswap V3 pool
     * @return price Current price of token0 in token1 terms
     */
    function getSpotPrice(address pool) internal view returns (uint256 price) {
        IUniswapV3Pool uniswapPool = IUniswapV3Pool(pool);
        (uint160 sqrtPriceX96,,,,,,) = uniswapPool.slot0();
        price = _getPriceFromSqrtPriceX96(sqrtPriceX96);
    }
}

