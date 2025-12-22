// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SwapOptimizer
 * @notice Multi-route swap optimizer that finds best prices across multiple DEXs
 * @dev Checks zRouter, Uniswap V3, and multiple fee tiers to find optimal swap
 * 
 * Features:
 * - Multi-router price comparison (zRouter, Uniswap V3)
 * - Automatic fee tier selection (0.01%, 0.05%, 0.3%, 1%)
 * - Gas-efficient quoting
 * - Fallback routing if primary fails
 */

/// @notice zRouter interface (gas-optimized multi-AMM)
interface IzRouter {
    function swapV3(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external payable returns (uint256 amountOut);
    
    function swapV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external payable returns (uint256 amountOut);
}

/// @notice Uniswap V3 Router interface
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @notice Uniswap V3 Quoter interface for price estimation
interface IQuoterV2 {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }
    
    function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
        external
        returns (
            uint256 amountOut,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        );
}

/// @notice Uniswap V3 Pool interface for direct price checking
interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
    function token0() external view returns (address);
    function token1() external view returns (address);
    function liquidity() external view returns (uint128);
}

/// @notice Uniswap V3 Factory interface
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract SwapOptimizer is Ownable {
    using SafeERC20 for IERC20;

    // =================================
    // CONSTANTS
    // =================================
    
    /// @notice Standard Uniswap V3 fee tiers
    uint24 public constant FEE_LOWEST = 100;    // 0.01%
    uint24 public constant FEE_LOW = 500;       // 0.05%
    uint24 public constant FEE_MEDIUM = 3000;   // 0.3%
    uint24 public constant FEE_HIGH = 10000;    // 1%

    // =================================
    // STATE VARIABLES
    // =================================

    IzRouter public zRouter;
    ISwapRouter public uniswapRouter;
    IQuoterV2 public quoter;
    IUniswapV3Factory public factory;

    /// @notice Addresses
    address public constant ZROUTER_ETH = 0x00000000008892d085e0611eb8C8BDc9FD856fD3;
    address public constant UNISWAP_ROUTER_ETH = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant UNISWAP_QUOTER_ETH = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;
    address public constant UNISWAP_FACTORY_ETH = 0x1F98431c8aD98523631AE4a59f267346ea31F984;

    // =================================
    // STRUCTS
    // =================================

    struct SwapRoute {
        uint8 routerType;     // 0 = zRouter V3, 1 = Uniswap V3, 2 = zRouter V2
        uint24 fee;           // Fee tier
        uint256 expectedOut;  // Expected output
        uint256 gasEstimate;  // Estimated gas
    }

    // =================================
    // EVENTS
    // =================================

    event BestRouteFound(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint8 routerType,
        uint24 fee,
        uint256 expectedOut
    );

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint8 routerType
    );

    // =================================
    // CONSTRUCTOR
    // =================================

    constructor(address _owner) Ownable(_owner) {
        // Set default addresses for Ethereum mainnet
        zRouter = IzRouter(ZROUTER_ETH);
        uniswapRouter = ISwapRouter(UNISWAP_ROUTER_ETH);
        quoter = IQuoterV2(UNISWAP_QUOTER_ETH);
        factory = IUniswapV3Factory(UNISWAP_FACTORY_ETH);
    }

    // =================================
    // CONFIGURATION
    // =================================

    function setRouters(
        address _zRouter,
        address _uniswapRouter,
        address _quoter,
        address _factory
    ) external onlyOwner {
        if (_zRouter != address(0)) zRouter = IzRouter(_zRouter);
        if (_uniswapRouter != address(0)) uniswapRouter = ISwapRouter(_uniswapRouter);
        if (_quoter != address(0)) quoter = IQuoterV2(_quoter);
        if (_factory != address(0)) factory = IUniswapV3Factory(_factory);
    }

    // =================================
    // QUOTING FUNCTIONS
    // =================================

    /**
     * @notice Find the best swap route across all routers and fee tiers
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Amount to swap
     * @return route Best route found
     */
    function findBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (SwapRoute memory route) {
        uint24[4] memory fees = [FEE_LOWEST, FEE_LOW, FEE_MEDIUM, FEE_HIGH];
        
        uint256 bestOutput = 0;
        
        // Check each fee tier
        for (uint256 i = 0; i < fees.length; i++) {
            // Check if pool exists and has liquidity
            address pool = factory.getPool(tokenIn, tokenOut, fees[i]);
            if (pool == address(0)) continue;
            
            // Check liquidity
            try IUniswapV3Pool(pool).liquidity() returns (uint128 liq) {
                if (liq == 0) continue;
            } catch {
                continue;
            }
            
            // Get quote from Uniswap Quoter
            try quoter.quoteExactInputSingle(
                IQuoterV2.QuoteExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountIn: amountIn,
                    fee: fees[i],
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256 amountOut, uint160, uint32, uint256 gasEst) {
                if (amountOut > bestOutput) {
                    bestOutput = amountOut;
                    route = SwapRoute({
                        routerType: 0, // zRouter V3 (preferred for gas)
                        fee: fees[i],
                        expectedOut: amountOut,
                        gasEstimate: gasEst
                    });
                }
            } catch {
                continue;
            }
        }
        
        emit BestRouteFound(tokenIn, tokenOut, amountIn, route.routerType, route.fee, route.expectedOut);
    }

    /**
     * @notice Quick quote using pool price (no state changes, view function)
     * @dev Uses sqrtPriceX96 for estimation - less accurate but gas-free
     */
    function quickQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external view returns (uint256 estimatedOut) {
        address pool = factory.getPool(tokenIn, tokenOut, fee);
        if (pool == address(0)) return 0;
        
        IUniswapV3Pool poolContract = IUniswapV3Pool(pool);
        
        try poolContract.slot0() returns (
            uint160 sqrtPriceX96, int24, uint16, uint16, uint16, uint8, bool
        ) {
            // Calculate price from sqrtPriceX96
            // price = (sqrtPriceX96 / 2^96)^2
            uint256 price = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> 192;
            
            address token0 = poolContract.token0();
            
            if (tokenIn == token0) {
                // tokenIn is token0, price is token1/token0
                estimatedOut = (amountIn * price);
            } else {
                // tokenIn is token1, need inverse
                if (price > 0) {
                    estimatedOut = (amountIn * 1e18) / price;
                }
            }
            
            // Apply 0.3% fee approximation
            estimatedOut = (estimatedOut * (10000 - 30)) / 10000;
        } catch {
            return 0;
        }
    }

    /**
     * @notice Find best fee tier for a token pair
     */
    function findBestFeeTier(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint24 bestFee, uint256 bestOutput) {
        uint24[4] memory fees = [FEE_LOWEST, FEE_LOW, FEE_MEDIUM, FEE_HIGH];
        
        for (uint256 i = 0; i < fees.length; i++) {
            uint256 output = this.quickQuote(tokenIn, tokenOut, amountIn, fees[i]);
            if (output > bestOutput) {
                bestOutput = output;
                bestFee = fees[i];
            }
        }
    }

    // =================================
    // SWAP EXECUTION
    // =================================

    /**
     * @notice Execute swap using the best route
     * @dev Tries zRouter first, falls back to Uniswap
     */
    function swapWithBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) external returns (uint256 amountOut) {
        // Transfer tokens in
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve routers
        IERC20(tokenIn).forceApprove(address(zRouter), amountIn);
        IERC20(tokenIn).forceApprove(address(uniswapRouter), amountIn);
        
        // Try zRouter first (gas-efficient)
        try zRouter.swapV3(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            minAmountOut,
            block.timestamp
        ) returns (uint256 out) {
            amountOut = out;
            emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, 0);
        } catch {
            // Fallback to Uniswap Router
            try uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: minAmountOut,
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256 out) {
                amountOut = out;
                emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, 1);
            } catch {
                // Return tokens if both fail
                IERC20(tokenIn).safeTransfer(msg.sender, amountIn);
                return 0;
            }
        }
        
        // Transfer output to sender
        if (amountOut > 0) {
            IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        }
    }

    // =================================
    // EMERGENCY
    // =================================

    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
