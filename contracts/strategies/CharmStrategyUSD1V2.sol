// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CharmStrategyUSD1V2
 * @notice Improved Charm vault strategy for USD1/WLFI with slippage protection
 * 
 * @dev DEPLOY WITH CREATE2 for vanity address 0x47...
 *      1. Get bytecode: abi.encodePacked(type(CharmStrategyUSD1V2).creationCode, constructorArgs)
 *      2. Find salt: deployer.findSalt47(bytecode, 0, 100000)
 *      3. Deploy: deployer.deployWithPrefix(bytecode, salt, 0x47)
 * 
 * @dev IMPROVEMENTS OVER V1:
 *      1. Uses POOL PRICE for swap calculations (not oracle) - prevents bad swap rates
 *      2. Slippage protection on all swaps (configurable, default 3%)
 *      3. Try/catch on Charm deposits (graceful failure, returns tokens)
 *      4. Pre-deposit range check (skips if Charm vault out of range)
 *      5. Single atomic deposit (no batching - simpler & cheaper)
 *      6. Max swap percentage limits (prevents excessive swaps)
 *      7. Configurable parameters without redeployment
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
    
    // Tick range functions
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

contract CharmStrategyUSD1V2 is IStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================
    // STATE VARIABLES
    // =================================

    address public immutable EAGLE_VAULT;
    IERC20 public immutable WLFI;
    IERC20 public immutable USD1;
    ISwapRouter public immutable UNISWAP_ROUTER;

    ICharmVault public charmVault;
    IUniswapV3Pool public swapPool;  // USD1/WLFI pool for accurate pricing

    /// @notice Configurable parameters
    uint256 public maxSwapPercent = 30;          // Max 30% of tokens swapped
    uint256 public swapSlippageBps = 300;        // 3% max swap slippage
    uint256 public depositSlippageBps = 500;     // 5% deposit slippage
    uint24 public swapPoolFee = 3000;            // 0.3% fee tier

    bool public active = true;

    // =================================
    // EVENTS
    // =================================

    event StrategyDeposit(uint256 wlfiAmount, uint256 usd1Amount, uint256 shares);
    event StrategyWithdraw(uint256 shares, uint256 wlfiAmount, uint256 usd1Amount);
    event TokensSwapped(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event DepositFailed(string reason);
    event UnusedTokensReturned(uint256 usd1Amount, uint256 wlfiAmount);
    event ParametersUpdated(uint256 maxSwapPercent, uint256 swapSlippageBps);

    // =================================
    // ERRORS
    // =================================

    error NotVault();
    error NotActive();
    error ZeroAddress();
    error SlippageExceeded(uint256 expected, uint256 actual);

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
        address _usd1,
        address _uniswapRouter,
        address _swapPool,
        address _owner
    ) Ownable(_owner) {
        if (_vault == address(0) || _wlfi == address(0) || 
            _usd1 == address(0) || _uniswapRouter == address(0)) {
            revert ZeroAddress();
        }

        EAGLE_VAULT = _vault;
        WLFI = IERC20(_wlfi);
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
        
        emit ParametersUpdated(_maxSwapPercent, _swapSlippageBps);
    }

    function setActive(bool _active) external onlyOwner {
        active = _active;
    }

    function initializeApprovals() external onlyOwner {
        WLFI.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        USD1.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        if (address(charmVault) != address(0)) {
            WLFI.forceApprove(address(charmVault), type(uint256).max);
            USD1.forceApprove(address(charmVault), type(uint256).max);
        }
    }

    // =================================
    // DEPOSIT WITH SLIPPAGE PROTECTION
    // =================================

    function deposit(uint256 wlfiAmount, uint256 usd1Amount) 
        external 
        onlyVault
        whenActive
        nonReentrant
        returns (uint256 shares) 
    {
        if (address(charmVault) == address(0)) {
            _returnAllTokens();
            return 0;
        }

        // Pull tokens
        if (wlfiAmount > 0) {
            try WLFI.transferFrom(EAGLE_VAULT, address(this), wlfiAmount) {} catch {}
        }
        if (usd1Amount > 0) {
            try USD1.transferFrom(EAGLE_VAULT, address(this), usd1Amount) {} catch {}
        }

        uint256 totalWlfi = WLFI.balanceOf(address(this));
        uint256 totalUsd1 = USD1.balanceOf(address(this));

        if (totalWlfi == 0 && totalUsd1 == 0) return 0;

        // Get Charm vault ratio
        (uint256 charmUsd1, uint256 charmWlfi) = charmVault.getTotalAmounts();

        uint256 finalUsd1;
        uint256 finalWlfi;

        if (charmUsd1 > 0 && charmWlfi > 0) {
            // Calculate required WLFI for our USD1
            uint256 wlfiNeeded = (totalUsd1 * charmWlfi) / charmUsd1;

            if (totalWlfi >= wlfiNeeded) {
                // Have enough WLFI - use all USD1 and matching WLFI
                finalUsd1 = totalUsd1;
                finalWlfi = wlfiNeeded;
            } else if (totalWlfi > 0) {
                // Have some WLFI but not enough - calculate how much USD1 we can use
                uint256 usd1Usable = (totalWlfi * charmUsd1) / charmWlfi;
                
                // Check if we should swap some USD1 → WLFI to use more USD1
                uint256 excessUsd1 = totalUsd1 - usd1Usable;
                uint256 maxSwapUsd1 = (totalUsd1 * maxSwapPercent) / 100;
                uint256 usd1ToSwap = excessUsd1 > maxSwapUsd1 ? maxSwapUsd1 : excessUsd1;
                
                if (usd1ToSwap > 0) {
                    uint256 moreWlfi = _swapUsd1ToWlfiSafe(usd1ToSwap);
                    totalWlfi = totalWlfi + moreWlfi;
                    totalUsd1 = totalUsd1 - usd1ToSwap;
                    
                    // Recalculate with new balances
                    wlfiNeeded = (totalUsd1 * charmWlfi) / charmUsd1;
                    finalUsd1 = totalUsd1;
                    finalWlfi = totalWlfi > wlfiNeeded ? wlfiNeeded : totalWlfi;
                } else {
                    finalUsd1 = usd1Usable;
                    finalWlfi = totalWlfi;
                }
            } else {
                // No WLFI at all - swap some USD1 → WLFI
                uint256 maxSwapUsd1 = (totalUsd1 * maxSwapPercent) / 100;
                if (maxSwapUsd1 > 0) {
                    uint256 moreWlfi = _swapUsd1ToWlfiSafe(maxSwapUsd1);
                    totalWlfi = moreWlfi;
                    totalUsd1 = totalUsd1 - maxSwapUsd1;
                    
                    // Calculate how much USD1 we can use with new WLFI
                    uint256 usd1Usable = (totalWlfi * charmUsd1) / charmWlfi;
                    finalUsd1 = usd1Usable > totalUsd1 ? totalUsd1 : usd1Usable;
                    finalWlfi = totalWlfi;
                } else {
                    finalUsd1 = 0;
                    finalWlfi = 0;
                }
            }
        } else {
            // Charm empty - deposit both as-is
            finalUsd1 = totalUsd1;
            finalWlfi = totalWlfi;
        }

        // Deposit with graceful failure
        shares = _depositToCharmSafe(finalUsd1, finalWlfi);

        // Return unused
        _returnUnusedTokens();

        emit StrategyDeposit(finalWlfi, finalUsd1, shares);
    }

    /**
     * @notice Check if Charm vault is in range for deposits
     */
    function isCharmInRange() public view returns (bool inRange, int24 currentTick, int24 lower, int24 upper) {
        if (address(charmVault) == address(0)) return (false, 0, 0, 0);
        
        try charmVault.pool() returns (address poolAddr) {
            IUniswapV3Pool pool = IUniswapV3Pool(poolAddr);
            (, currentTick,,,,,) = pool.slot0();
            
            try charmVault.baseLower() returns (int24 _lower) {
                lower = _lower;
            } catch {
                lower = -887200;
            }
            
            try charmVault.baseUpper() returns (int24 _upper) {
                upper = _upper;
            } catch {
                upper = 887200;
            }
            
            inRange = currentTick >= lower && currentTick <= upper;
        } catch {
            inRange = true;
        }
    }

    /**
     * @notice Safe Charm deposit - SINGLE ATOMIC (no batching)
     */
    function _depositToCharmSafe(uint256 usd1Amount, uint256 wlfiAmount) 
        internal 
        returns (uint256 shares) 
    {
        if (usd1Amount == 0 && wlfiAmount == 0) return 0;

        // PRE-CHECK: Is Charm vault in range?
        (bool inRange,,,) = isCharmInRange();
        if (!inRange) {
            emit DepositFailed("Charm vault out of range");
            return 0;
        }

        // Calculate min amounts with slippage
        uint256 minUsd1 = (usd1Amount * (10000 - depositSlippageBps)) / 10000;
        uint256 minWlfi = (wlfiAmount * (10000 - depositSlippageBps)) / 10000;

        // SINGLE ATOMIC DEPOSIT
        try charmVault.deposit(usd1Amount, wlfiAmount, minUsd1, minWlfi, address(this)) 
            returns (uint256 _shares, uint256, uint256) 
        {
            shares = _shares;
        } catch Error(string memory reason) {
            emit DepositFailed(reason);
        } catch {
            emit DepositFailed("Deposit failed");
        }
    }

    /**
     * @notice Swap WLFI → USD1 with slippage protection
     */
    function _swapWlfiToUsd1Safe(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        // Calculate expected based on pool price
        uint256 wlfiPerUsd1 = _getPoolPrice();
        uint256 expectedOut = (amountIn * 1e18) / wlfiPerUsd1;
        uint256 minOut = (expectedOut * (10000 - swapSlippageBps)) / 10000;

        try UNISWAP_ROUTER.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(WLFI),
                tokenOut: address(USD1),
                fee: swapPoolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 out) {
            amountOut = out;
            emit TokensSwapped(address(WLFI), address(USD1), amountIn, amountOut);
        } catch {
            amountOut = 0;
        }
    }

    /**
     * @notice Swap USD1 → WLFI with slippage protection
     * @dev Used when we have excess USD1 and need WLFI to match Charm ratio
     */
    function _swapUsd1ToWlfiSafe(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        // Calculate expected based on pool price (wlfiPerUsd1)
        uint256 wlfiPerUsd1 = _getPoolPrice();
        uint256 expectedOut = (amountIn * wlfiPerUsd1) / 1e18;
        uint256 minOut = (expectedOut * (10000 - swapSlippageBps)) / 10000;

        try UNISWAP_ROUTER.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(USD1),
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
            emit TokensSwapped(address(USD1), address(WLFI), amountIn, amountOut);
        } catch {
            amountOut = 0;
        }
    }

    /**
     * @notice Get pool price (WLFI per USD1)
     */
    function _getPoolPrice() internal view returns (uint256 wlfiPerUsd1) {
        if (address(swapPool) == address(0)) {
            return 7e18; // Fallback ~7 WLFI per USD1
        }

        (uint160 sqrtPriceX96,,,,,,) = swapPool.slot0();
        
        uint256 price = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> 192;
        
        // Adjust for token order
        if (swapPool.token0() == address(USD1)) {
            // USD1 is token0, price is WLFI per USD1
            wlfiPerUsd1 = price * 1e18;
        } else {
            // WLFI is token0, need inverse
            if (price > 0) {
                wlfiPerUsd1 = (1e18 * 1e18) / price;
            } else {
                wlfiPerUsd1 = 7e18;
            }
        }

        // Sanity check
        if (wlfiPerUsd1 == 0) wlfiPerUsd1 = 7e18;
    }

    // =================================
    // WITHDRAW
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

        try charmVault.withdraw(sharesToWithdraw, 0, 0, address(this)) 
            returns (uint256 usd1Received, uint256 wlfiReceived) 
        {
            wlfiAmount = wlfiReceived;
            usd1Amount = usd1Received;

            if (wlfiAmount > 0) WLFI.safeTransfer(EAGLE_VAULT, wlfiAmount);
            if (usd1Amount > 0) USD1.safeTransfer(EAGLE_VAULT, usd1Amount);
        } catch {}

        emit StrategyWithdraw(sharesToWithdraw, wlfiAmount, usd1Amount);
    }

    // =================================
    // VIEW FUNCTIONS
    // =================================

    function getTotalAmounts() public view returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (address(charmVault) == address(0)) {
            return (WLFI.balanceOf(address(this)), USD1.balanceOf(address(this)));
        }

        uint256 ourShares = charmVault.balanceOf(address(this));
        uint256 totalShares = charmVault.totalSupply();
        
        if (totalShares == 0 || ourShares == 0) {
            return (WLFI.balanceOf(address(this)), USD1.balanceOf(address(this)));
        }

        (uint256 totalUsd1, uint256 totalWlfi) = charmVault.getTotalAmounts();
        
        uint256 ourUsd1 = (totalUsd1 * ourShares) / totalShares;
        uint256 ourWlfi = (totalWlfi * ourShares) / totalShares;

        // Convert USD1 to WLFI equivalent
        uint256 wlfiPerUsd1 = _getPoolPrice();
        uint256 usd1InWlfi = (ourUsd1 * wlfiPerUsd1) / 1e18;

        wlfiAmount = ourWlfi + usd1InWlfi + WLFI.balanceOf(address(this));
        usd1Amount = USD1.balanceOf(address(this));
    }

    // =================================
    // HELPERS
    // =================================

    function _returnAllTokens() internal {
        uint256 wlfiBal = WLFI.balanceOf(address(this));
        uint256 usd1Bal = USD1.balanceOf(address(this));
        
        if (wlfiBal > 0) WLFI.safeTransfer(EAGLE_VAULT, wlfiBal);
        if (usd1Bal > 0) USD1.safeTransfer(EAGLE_VAULT, usd1Bal);
    }

    function _returnUnusedTokens() internal {
        uint256 wlfiBal = WLFI.balanceOf(address(this));
        uint256 usd1Bal = USD1.balanceOf(address(this));
        
        if (wlfiBal > 0 || usd1Bal > 0) {
            if (wlfiBal > 0) WLFI.safeTransfer(EAGLE_VAULT, wlfiBal);
            if (usd1Bal > 0) USD1.safeTransfer(EAGLE_VAULT, usd1Bal);
            emit UnusedTokensReturned(usd1Bal, wlfiBal);
        }
    }

    // =================================
    // EMERGENCY
    // =================================

    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    function emergencyWithdrawFromCharm() external onlyOwner returns (uint256 usd1, uint256 wlfi) {
        if (address(charmVault) == address(0)) return (0, 0);
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares > 0) {
            (usd1, wlfi) = charmVault.withdraw(ourShares, 0, 0, address(this));
        }
    }
}

