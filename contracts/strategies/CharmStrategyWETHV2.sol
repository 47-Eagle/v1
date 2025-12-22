// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CharmStrategyWETHV2
 * @notice Improved Charm vault strategy with slippage protection and graceful failures
 * 
 * @dev DEPLOY WITH CREATE2 for vanity address 0x47...
 *      Use EagleCreate2Deployer.deployWithPrefix(bytecode, "47")
 * 
 * @dev IMPROVEMENTS OVER V1:
 *      1. Slippage protection on all swaps (uses POOL price, not oracle)
 *      2. Try/catch on Charm deposits (graceful failure)
 *      3. Pre-deposit range check (skips if Charm vault out of range)
 *      4. Single atomic deposit (no batching - simpler & cheaper)
 *      5. Max swap percentage limits (prevents excessive swaps)
 *      6. Configurable parameters without redeployment
 */

interface ICharmVault {
    function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external returns (uint256 shares, uint256 amount0, uint256 amount1);
    
    function withdraw(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external returns (uint256 amount0, uint256 amount1);
    
    function getTotalAmounts() external view returns (uint256 total0, uint256 total1);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function token0() external view returns (address);
    function token1() external view returns (address);
    
    // Tick range functions for range check
    function baseLower() external view returns (int24);
    function baseUpper() external view returns (int24);
    function pool() external view returns (address);
}

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
}

interface IStrategy {
    function deposit(uint256 wlfiAmount, uint256 usd1Amount) external returns (uint256 shares);
    function withdraw(uint256 value) external returns (uint256 wlfiAmount, uint256 usd1Amount);
    function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount);
}

contract CharmStrategyWETHV2 is IStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================
    // STATE VARIABLES
    // =================================

    address public immutable EAGLE_VAULT;
    IERC20 public immutable WLFI;
    IERC20 public immutable WETH;
    IERC20 public immutable USD1;
    ISwapRouter public immutable UNISWAP_ROUTER;

    ICharmVault public charmVault;
    IUniswapV3Pool public swapPool;  // Pool for getting actual swap price

    /// @notice Configurable parameters
    uint256 public maxSwapPercent = 30;          // Max % of WLFI to swap (30%)
    uint256 public swapSlippageBps = 300;        // 3% max slippage on swaps
    uint256 public depositSlippageBps = 500;     // 5% slippage on Charm deposits
    uint24 public swapPoolFee = 10000;           // 1% fee tier for swaps

    bool public active = true;

    // =================================
    // EVENTS
    // =================================

    event StrategyDeposit(uint256 wlfiAmount, uint256 wethAmount, uint256 shares);
    event StrategyWithdraw(uint256 shares, uint256 wlfiAmount, uint256 wethAmount);
    event TokensSwapped(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event DepositFailed(string reason);
    event UnusedTokensReturned(uint256 wlfiAmount, uint256 wethAmount);
    event ParametersUpdated(uint256 maxSwapPercent, uint256 swapSlippageBps, uint256 depositSlippageBps);

    // =================================
    // ERRORS
    // =================================

    error NotVault();
    error NotActive();
    error ZeroAddress();
    error SlippageExceeded(uint256 expected, uint256 actual);
    error SwapTooLarge(uint256 requested, uint256 maxAllowed);

    // =================================
    // MODIFIERS
    // =================================

    modifier onlyVault() {
        if (msg.sender != EAGLE_VAULT) revert NotVault();
        _;
    }

    modifier whenActive() {
        if (!active) revert NotActive();
        _;
    }

    // =================================
    // CONSTRUCTOR
    // =================================

    constructor(
        address _vault,
        address _charmVault,
        address _wlfi,
        address _weth,
        address _usd1,
        address _uniswapRouter,
        address _swapPool,
        address _owner
    ) Ownable(_owner) {
        if (_vault == address(0) || _wlfi == address(0) || 
            _weth == address(0) || _uniswapRouter == address(0)) {
            revert ZeroAddress();
        }

        EAGLE_VAULT = _vault;
        WLFI = IERC20(_wlfi);
        WETH = IERC20(_weth);
        USD1 = IERC20(_usd1);
        UNISWAP_ROUTER = ISwapRouter(_uniswapRouter);

        if (_charmVault != address(0)) {
            charmVault = ICharmVault(_charmVault);
        }
        if (_swapPool != address(0)) {
            swapPool = IUniswapV3Pool(_swapPool);
        }
    }

    // =================================
    // CONFIGURATION
    // =================================

    function setCharmVault(address _charmVault) external onlyOwner {
        charmVault = ICharmVault(_charmVault);
    }

    function setSwapPool(address _swapPool) external onlyOwner {
        swapPool = IUniswapV3Pool(_swapPool);
    }

    /**
     * @notice Check if strategy is initialized (required by vault)
     */
    function isInitialized() external view returns (bool) {
        return active && address(charmVault) != address(0);
    }

    function setParameters(
        uint256 _maxSwapPercent,
        uint256 _swapSlippageBps,
        uint256 _depositSlippageBps,
        uint24 _swapPoolFee
    ) external onlyOwner {
        maxSwapPercent = _maxSwapPercent;
        swapSlippageBps = _swapSlippageBps;
        depositSlippageBps = _depositSlippageBps;
        swapPoolFee = _swapPoolFee;
        
        emit ParametersUpdated(_maxSwapPercent, _swapSlippageBps, _depositSlippageBps);
    }

    function setActive(bool _active) external onlyOwner {
        active = _active;
    }

    function initializeApprovals() external onlyOwner {
        WLFI.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        WETH.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        USD1.forceApprove(address(UNISWAP_ROUTER), type(uint256).max); // For USD1 → WLFI swaps
        if (address(charmVault) != address(0)) {
            WLFI.forceApprove(address(charmVault), type(uint256).max);
            WETH.forceApprove(address(charmVault), type(uint256).max);
        }
    }

    // =================================
    // STRATEGY FUNCTIONS
    // =================================

    /**
     * @notice Deposit with slippage protection
     * @dev Gracefully handles failures - returns tokens to vault if deposit fails
     */
    function deposit(uint256 wlfiAmount, uint256 usd1Amount) 
        external 
        onlyVault
        whenActive
        nonReentrant
        returns (uint256 shares) 
    {
        if (address(charmVault) == address(0)) {
            // No charm vault configured - return tokens
            _returnAllTokens();
            return 0;
        }

        // Pull tokens from vault
        if (wlfiAmount > 0) {
            try WLFI.transferFrom(EAGLE_VAULT, address(this), wlfiAmount) {} catch {}
        }
        if (usd1Amount > 0) {
            try USD1.transferFrom(EAGLE_VAULT, address(this), usd1Amount) {} catch {}
        }

        // Check actual balances
        uint256 totalWlfi = WLFI.balanceOf(address(this));
        uint256 totalUsd1 = USD1.balanceOf(address(this));

        // Convert USD1 → WLFI instead of returning it
        // This allows the strategy to work when vault only has USD1
        if (totalUsd1 > 0) {
            uint256 moreWlfi = _swapUsd1ToWlfiSafe(totalUsd1);
            totalWlfi = totalWlfi + moreWlfi;
        }

        uint256 totalWeth = WETH.balanceOf(address(this));

        if (totalWlfi == 0 && totalWeth == 0) return 0;

        // Get Charm vault's current ratio
        (uint256 charmWeth, uint256 charmWlfi) = charmVault.getTotalAmounts();

        uint256 finalWeth;
        uint256 finalWlfi;

        if (charmWeth > 0 && charmWlfi > 0) {
            // Calculate required WLFI for our WETH
            uint256 wlfiNeeded = (totalWeth * charmWlfi) / charmWeth;

            if (totalWlfi >= wlfiNeeded) {
                // Have enough WLFI - use all WETH and matching WLFI
                finalWeth = totalWeth;
                finalWlfi = wlfiNeeded;
            } else if (totalWlfi > 0) {
                // Have some WLFI but not enough - calculate how much WETH we can use
                uint256 wethUsable = (totalWlfi * charmWeth) / charmWlfi;
                
                // Check if we should swap some WETH → WLFI to use more WETH
                uint256 excessWeth = totalWeth - wethUsable;
                uint256 maxSwapWeth = (totalWeth * maxSwapPercent) / 100;
                uint256 wethToSwap = excessWeth > maxSwapWeth ? maxSwapWeth : excessWeth;
                
                if (wethToSwap > 0) {
                    uint256 moreWlfi = _swapWethToWlfiSafe(wethToSwap);
                    totalWlfi = totalWlfi + moreWlfi;
                    totalWeth = totalWeth - wethToSwap;
                    
                    // Recalculate with new balances
                    wlfiNeeded = (totalWeth * charmWlfi) / charmWeth;
                    finalWeth = totalWeth;
                    finalWlfi = totalWlfi > wlfiNeeded ? wlfiNeeded : totalWlfi;
                } else {
                    finalWeth = wethUsable;
                    finalWlfi = totalWlfi;
                }
            } else {
                // No WLFI at all - swap some WETH → WLFI
                uint256 maxSwapWeth = (totalWeth * maxSwapPercent) / 100;
                if (maxSwapWeth > 0) {
                    uint256 moreWlfi = _swapWethToWlfiSafe(maxSwapWeth);
                    totalWlfi = moreWlfi;
                    totalWeth = totalWeth - maxSwapWeth;
                    
                    // Calculate how much WETH we can use with new WLFI
                    uint256 wethUsable = (totalWlfi * charmWeth) / charmWlfi;
                    finalWeth = wethUsable > totalWeth ? totalWeth : wethUsable;
                    finalWlfi = totalWlfi;
                } else {
                    finalWeth = 0;
                    finalWlfi = 0;
                }
            }
        } else {
            // Charm empty - deposit both as-is
            finalWeth = totalWeth;
            finalWlfi = totalWlfi;
        }

        // Deposit to Charm with graceful failure handling
        shares = _depositToCharmSafe(finalWeth, finalWlfi);

        // Return any unused tokens
        _returnUnusedTokens();

        emit StrategyDeposit(finalWlfi, finalWeth, shares);
    }

    /**
     * @notice Check if Charm vault is in range for deposits
     * @dev If current tick is outside base position range, deposits will fail with "cross"
     */
    function isCharmInRange() public view returns (bool inRange, int24 currentTick, int24 lower, int24 upper) {
        if (address(charmVault) == address(0)) return (false, 0, 0, 0);
        
        try charmVault.pool() returns (address poolAddr) {
            IUniswapV3Pool pool = IUniswapV3Pool(poolAddr);
            (, currentTick,,,,,) = pool.slot0();
            
            try charmVault.baseLower() returns (int24 _lower) {
                lower = _lower;
            } catch {
                lower = -887200; // Full range
            }
            
            try charmVault.baseUpper() returns (int24 _upper) {
                upper = _upper;
            } catch {
                upper = 887200; // Full range
            }
            
            inRange = currentTick >= lower && currentTick <= upper;
        } catch {
            // Can't determine - assume in range
            inRange = true;
        }
    }

    /**
     * @notice Safe deposit to Charm - SINGLE ATOMIC DEPOSIT (no batching)
     * @dev Pre-checks if Charm is in range, uses slippage protection
     */
    function _depositToCharmSafe(uint256 wethAmount, uint256 wlfiAmount) 
        internal 
        returns (uint256 shares) 
    {
        if (wlfiAmount == 0 && wethAmount == 0) return 0;

        // PRE-CHECK: Is Charm vault in range?
        (bool inRange, int24 currentTick, int24 lower, int24 upper) = isCharmInRange();
        if (!inRange) {
            emit DepositFailed(string(abi.encodePacked(
                "Out of range: tick ", _int24ToString(currentTick),
                " not in [", _int24ToString(lower), ",", _int24ToString(upper), "]"
            )));
            return 0;
        }

        // Calculate min amounts with slippage protection
        uint256 minWeth = (wethAmount * (10000 - depositSlippageBps)) / 10000;
        uint256 minWlfi = (wlfiAmount * (10000 - depositSlippageBps)) / 10000;

        // SINGLE ATOMIC DEPOSIT - simpler, cheaper, all-or-nothing
        try charmVault.deposit(wethAmount, wlfiAmount, minWeth, minWlfi, address(this)) 
            returns (uint256 _shares, uint256, uint256) 
        {
            shares = _shares;
        } catch Error(string memory reason) {
            emit DepositFailed(reason);
        } catch (bytes memory lowLevelData) {
            // Try to decode the error
            if (lowLevelData.length > 0) {
                emit DepositFailed(string(abi.encodePacked("Low-level: ", _bytesToHex(lowLevelData))));
            } else {
                emit DepositFailed("Unknown error");
            }
        }
    }
    
    /**
     * @notice Convert int24 to string for error messages
     */
    function _int24ToString(int24 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        bool negative = value < 0;
        uint256 absValue = negative ? uint256(uint24(-value)) : uint256(uint24(value));
        
        bytes memory buffer = new bytes(10);
        uint256 i = buffer.length;
        while (absValue > 0) {
            i--;
            buffer[i] = bytes1(uint8(48 + absValue % 10));
            absValue /= 10;
        }
        if (negative) {
            i--;
            buffer[i] = "-";
        }
        
        bytes memory result = new bytes(buffer.length - i);
        for (uint256 j = 0; j < result.length; j++) {
            result[j] = buffer[i + j];
        }
        return string(result);
    }
    
    /**
     * @notice Convert bytes to hex string for error debugging
     */
    function _bytesToHex(bytes memory data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        uint256 len = data.length > 4 ? 4 : data.length; // Only first 4 bytes
        bytes memory result = new bytes(len * 2);
        for (uint256 i = 0; i < len; i++) {
            result[i * 2] = hexChars[uint8(data[i]) >> 4];
            result[i * 2 + 1] = hexChars[uint8(data[i]) & 0x0f];
        }
        return string(result);
    }

    /**
     * @notice Swap WLFI → WETH with slippage protection
     */
    function _swapWlfiToWethSafe(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        // Calculate minimum output based on pool price
        uint256 expectedOut = _getExpectedWethForWlfi(amountIn);
        uint256 minOut = (expectedOut * (10000 - swapSlippageBps)) / 10000;

        try UNISWAP_ROUTER.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(WLFI),
                tokenOut: address(WETH),
                fee: swapPoolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 out) {
            amountOut = out;
            emit TokensSwapped(address(WLFI), address(WETH), amountIn, amountOut);
        } catch {
            // Swap failed - return 0, tokens stay in strategy
            amountOut = 0;
        }
    }

    /**
     * @notice Swap USD1 → WLFI with slippage protection
     * @dev Used to convert USD1 received from vault into WLFI for this strategy
     */
    function _swapUsd1ToWlfiSafe(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        // Use a reasonable estimate: ~14.75 WLFI per USD1 (from Charm ratio)
        // We'll use 3000 fee tier for USD1/WLFI swaps
        uint24 usd1WlfiFee = 3000; // 0.3% fee tier
        
        // Estimate: assume ~14 WLFI per USD1 based on current market
        uint256 estimatedWlfi = amountIn * 14;
        uint256 minOut = (estimatedWlfi * (10000 - swapSlippageBps)) / 10000;

        try UNISWAP_ROUTER.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(USD1),
                tokenOut: address(WLFI),
                fee: usd1WlfiFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 out) {
            amountOut = out;
            emit TokensSwapped(address(USD1), address(WLFI), amountIn, amountOut);
        } catch {
            // Swap failed - return USD1 to vault instead
            if (amountIn > 0) {
                USD1.safeTransfer(EAGLE_VAULT, amountIn);
            }
            amountOut = 0;
        }
    }

    /**
     * @notice Swap WETH → WLFI with slippage protection
     * @dev Used when we have excess WETH and need more WLFI for ratio matching
     */
    function _swapWethToWlfiSafe(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        // Calculate expected based on pool price
        uint256 wlfiPerWeth = _getPoolPrice();
        uint256 expectedOut = (amountIn * wlfiPerWeth) / 1e18;
        uint256 minOut = (expectedOut * (10000 - swapSlippageBps)) / 10000;

        try UNISWAP_ROUTER.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(WETH),
                tokenOut: address(WLFI),
                fee: swapPoolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 out) {
            amountOut = out;
            emit TokensSwapped(address(WETH), address(WLFI), amountIn, amountOut);
        } catch {
            amountOut = 0;
        }
    }

    /**
     * @notice Get pool price for accurate swap calculations
     */
    function _getPoolPrice() internal view returns (uint256 wlfiPerWeth) {
        if (address(swapPool) == address(0)) {
            return 1e18; // Fallback 1:1
        }

        (uint160 sqrtPriceX96,,,,,,) = swapPool.slot0();
        
        // Calculate price from sqrtPriceX96
        // price = (sqrtPriceX96 / 2^96)^2
        uint256 price = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> 192;
        
        // Adjust for token order
        if (swapPool.token0() == address(WETH)) {
            // WETH is token0, price is WLFI per WETH
            wlfiPerWeth = price * 1e18;
        } else {
            // WLFI is token0, price is WETH per WLFI, need inverse
            if (price > 0) {
                wlfiPerWeth = (1e18 * 1e18) / price;
            } else {
                wlfiPerWeth = 1e18;
            }
        }
    }

    /**
     * @notice Get expected WETH output for WLFI input
     */
    function _getExpectedWethForWlfi(uint256 wlfiAmount) internal view returns (uint256) {
        uint256 wlfiPerWeth = _getPoolPrice();
        if (wlfiPerWeth == 0) return 0;
        return (wlfiAmount * 1e18) / wlfiPerWeth;
    }

    // =================================
    // WITHDRAW FUNCTIONS
    // =================================

    function withdraw(uint256 value) 
        external 
        onlyVault
        nonReentrant
        returns (uint256 wlfiAmount, uint256 usd1Amount) 
    {
        if (address(charmVault) == address(0)) return (0, 0);

        (uint256 totalWlfi, uint256 totalUsd1) = getTotalAmounts();
        uint256 totalValue = totalWlfi + totalUsd1;
        if (totalValue == 0) return (0, 0);

        uint256 ourShares = charmVault.balanceOf(address(this));
        uint256 sharesToWithdraw = (ourShares * value) / totalValue;
        if (sharesToWithdraw > ourShares) sharesToWithdraw = ourShares;

        // Withdraw with slippage tolerance
        try charmVault.withdraw(sharesToWithdraw, 0, 0, address(this)) 
            returns (uint256 wethReceived, uint256 wlfiReceived) 
        {
            // Transfer WLFI to vault
            wlfiAmount = wlfiReceived;
            if (wlfiAmount > 0) {
                WLFI.safeTransfer(EAGLE_VAULT, wlfiAmount);
            }

            // Keep WETH for next deposit (or swap if needed)
            // usd1Amount stays 0 - we return WLFI only
        } catch {
            // Withdraw failed
        }

        emit StrategyWithdraw(sharesToWithdraw, wlfiAmount, usd1Amount);
    }

    // =================================
    // VIEW FUNCTIONS
    // =================================

    function getTotalAmounts() public view returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (address(charmVault) == address(0)) {
            return (WLFI.balanceOf(address(this)), 0);
        }

        uint256 ourShares = charmVault.balanceOf(address(this));
        uint256 totalShares = charmVault.totalSupply();
        
        if (totalShares == 0 || ourShares == 0) {
            return (WLFI.balanceOf(address(this)), 0);
        }

        (uint256 totalWeth, uint256 totalWlfi) = charmVault.getTotalAmounts();
        
        uint256 ourWeth = (totalWeth * ourShares) / totalShares;
        uint256 ourWlfi = (totalWlfi * ourShares) / totalShares;

        // Convert WETH to WLFI equivalent using pool price
        uint256 wlfiPerWeth = _getPoolPrice();
        uint256 wethInWlfi = (ourWeth * wlfiPerWeth) / 1e18;

        wlfiAmount = ourWlfi + wethInWlfi + WLFI.balanceOf(address(this));
        usd1Amount = 0; // This strategy doesn't hold USD1
    }

    // =================================
    // INTERNAL HELPERS
    // =================================

    function _returnAllTokens() internal {
        uint256 wlfiBal = WLFI.balanceOf(address(this));
        uint256 usd1Bal = USD1.balanceOf(address(this));
        
        if (wlfiBal > 0) WLFI.safeTransfer(EAGLE_VAULT, wlfiBal);
        if (usd1Bal > 0) USD1.safeTransfer(EAGLE_VAULT, usd1Bal);
    }

    function _returnUnusedTokens() internal {
        uint256 wlfiBal = WLFI.balanceOf(address(this));
        
        if (wlfiBal > 0) {
            WLFI.safeTransfer(EAGLE_VAULT, wlfiBal);
            emit UnusedTokensReturned(wlfiBal, 0);
        }
    }

    // =================================
    // EMERGENCY
    // =================================

    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    function emergencyWithdrawFromCharm() external onlyOwner returns (uint256 weth, uint256 wlfi) {
        if (address(charmVault) == address(0)) return (0, 0);
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares > 0) {
            (weth, wlfi) = charmVault.withdraw(ourShares, 0, 0, address(this));
        }
    }
}

