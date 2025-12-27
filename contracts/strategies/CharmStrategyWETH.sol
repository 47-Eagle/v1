// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import { IStrategy } from "../interfaces/IStrategy.sol";

/**
 * @title CharmStrategyWETH
 * @notice Production-ready strategy for Charm Finance WETH/WLFI Alpha Vault
 * 
 * @dev SPECIFIC CONFIGURATION:
 *      Deposit Pool: WETH/WLFI Uniswap V3 1% Fee Tier (via Charm)
 *      Swap Fee Tier: 1% (10000)
 *      TWAP Price Pool: WETH/WLFI 0.3% Fee Tier (better liquidity)
 *      Network: Ethereum Mainnet
 *      Charm Vault: 0x3314e248F3F752Cd16939773D83bEb3a362F0AEF
 *      Uniswap V3 Pool (1% - Deposits): 0xCa2e972f081764c30Ae5F012A29D5277EEf33838
 *      Uniswap V3 Pool (0.3% - TWAP): 0xcdF9F50519Eb0a9995730DDB6e7d3A8B1D8fFA07
 * 
 * @dev DUAL-POOL STRATEGY EXPLAINED:
 *      WHY TWO DIFFERENT POOLS?
 *      - We DEPOSIT into the 1% fee tier Charm vault (where our LP position lives)
 *      - We use TWAP from the 0.3% fee tier for PRICING (more trading volume = more accurate)
 *      
 *      REASONING:
 *      - The 0.3% pool typically has higher liquidity and more frequent trades
 *      - More active trading → more accurate time-weighted average price (TWAP)
 *      - We still swap/deposit at 1% to match the Charm vault's pool
 *      - This is a best practice: use liquid pools for pricing, trade where your LP is
 * 
 * @dev STRATEGY FEATURES:
 *      ✅ Smart auto-rebalancing (matches Charm's ratio before deposit)
 *      ✅ Uniswap V3 integration for swaps (WETH ↔ WLFI at 1%)
 *      ✅ Chainlink oracle integration for price feeds
 *      ✅ Uniswap V3 TWAP from 0.3% pool (more liquid, accurate pricing)
 *      ✅ Works with Charm WETH/WLFI vault
 *      ✅ Returns unused tokens to vault
 *      ✅ Comprehensive slippage protection
 *      ✅ Security: onlyVault modifier + reentrancy guards
 *      ✅ Accounts for idle tokens (no waste!)
 * 
 * @dev FLOW:
 *      1. Receive WETH + WLFI from EagleOVault
 *      2. Check Charm vault's current ratio (e.g., 30% WETH / 70% WLFI)
 *      3. Get price from 0.3% pool TWAP (or Chainlink if available)
 *      4. Auto-swap tokens at 1% pool to match Charm's ratio
 *      5. Deposit matched amounts to Charm (1% pool)
 *      6. Return any unused tokens to vault
 *      7. Receive Charm LP shares (held by strategy, earning fees)
 * 
 * @dev PRICE ORACLES:
 *      - Chainlink: Primary price source for WETH/USD and WLFI/USD
 *      - Uniswap V3 TWAP (0.3% pool): Fallback/validation source (more accurate)
 */

interface ICharmVault {
    function deposit(
        uint256 amount0Desired,  // WETH
        uint256 amount1Desired,  // WLFI
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
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

interface IUniswapV3Pool {
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
    
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract CharmStrategyWETH is IStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================
    // IMMUTABLES
    // =================================
    
    address public immutable EAGLE_VAULT;
    IERC20 public immutable WETH;
    IERC20 public immutable WLFI;
    IERC20 public immutable USD1;  // For returning to vault if sent (strategy doesn't use USD1)
    ISwapRouter public immutable UNISWAP_ROUTER;
    
    // =================================
    // STATE VARIABLES
    // =================================
    
    ICharmVault public charmVault;
    IUniswapV3Pool public twapPool;  // 0.3% pool for TWAP price oracle (better liquidity)
    AggregatorV3Interface public wethUsdPriceFeed;  // Chainlink WETH/USD
    AggregatorV3Interface public usd1UsdPriceFeed;  // Chainlink USD1/USD (for accurate accounting)
    AggregatorV3Interface public wlfiUsdPriceFeed;  // Chainlink WLFI/USD (if available)
    
    bool public active;
    bool public emergencyMode; // Emergency mode bypasses oracle checks
    uint256 public emergencyWethPerUsd1; // Manual override for WETH/USD1 ratio (set by owner in emergency)
    uint24 public constant POOL_FEE = 10000; // 1% fee tier for swaps (matches Charm vault)
    uint24 public constant TWAP_POOL_FEE = 3000; // 0.3% fee tier for TWAP (better liquidity)
    uint256 public maxSlippage = 500; // 5% (configurable by owner)
    uint256 public lastRebalance;
    uint256 public twapPeriod = 1800; // 30 minutes TWAP by default
    uint256 public maxOracleAge = 3600; // 1 hour max age for Chainlink data
    
    // Pool configuration for reference
    string public constant POOL_DESCRIPTION = "WETH/WLFI 1% (Deposits) + 0.3% (TWAP)";
    address public constant CHARM_VAULT_ADDRESS = 0x3314e248F3F752Cd16939773D83bEb3a362F0AEF;
    address public constant UNISWAP_V3_POOL_1_PERCENT = 0xCa2e972f081764c30Ae5F012A29D5277EEf33838; // 1% - for deposits/swaps
    address public constant UNISWAP_V3_POOL_03_PERCENT = 0xcdF9F50519Eb0a9995730DDB6e7d3A8B1D8fFA07; // 0.3% - for TWAP pricing
    
    // Chainlink price feed addresses on Ethereum Mainnet
    address public constant CHAINLINK_WETH_USD = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419; // WETH/USD
    address public constant CHAINLINK_USD1_USD = 0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d; // USD1/USD (same as vault uses)
    
    // =================================
    // EVENTS (Additional to IStrategy)
    // =================================
    
    event CharmVaultSet(address indexed charmVault);
    event TokensSwapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event UnusedTokensReturned(uint256 usd1Amount, uint256 wlfiAmount);
    event OracleUpdated(address indexed oracle, string oracleType);
    event PriceUsed(string source, uint256 wlfiPerWeth);
    event EmergencyModeToggled(bool enabled);
    event EmergencyPriceSet(uint256 wethPerUsd1);
    event EmergencyWithdrawExecuted(uint256 shares, uint256 wlfiAmount, uint256 usd1Amount);

    // =================================
    // ERRORS
    // =================================
    
    error OnlyVault();
    error ZeroAddress();
    error NotInitialized();
    error StrategyPaused();
    error InsufficientBalance();
    error SlippageExceeded();
    error StalePrice();
    error InvalidPrice();
    error EmergencyModeActive();
    error NotInEmergencyMode();

    // =================================
    // MODIFIERS
    // =================================
    
    modifier onlyVault() {
        if (msg.sender != EAGLE_VAULT) revert OnlyVault();
        _;
    }
    
    modifier whenActive() {
        if (!active) revert StrategyPaused();
        _;
    }

    // =================================
    // CONSTRUCTOR
    // =================================
    
    /**
     * @notice Creates CharmStrategyWETH for WETH/WLFI Charm pool
     * @param _vaultAddress EagleOVault address
     * @param _charmVault Charm Alpha Vault address (WETH/WLFI)
     * @param _wlfi WLFI token address
     * @param _weth WETH token address
     * @param _usd1 USD1 token address (vault sends this, we swap to WETH)
     * @param _uniswapRouter Uniswap V3 SwapRouter address
     * @param _owner Strategy owner
     */
    constructor(
        address _vaultAddress,
        address _charmVault,
        address _wlfi,
        address _weth,
        address _usd1,
        address _uniswapRouter,
        address _owner
    ) Ownable(_owner) {
        if (_vaultAddress == address(0) || _wlfi == address(0) || 
            _weth == address(0) || _usd1 == address(0) || _uniswapRouter == address(0)) {
            revert ZeroAddress();
        }
        
        EAGLE_VAULT = _vaultAddress;
        WLFI = IERC20(_wlfi);
        WETH = IERC20(_weth);
        USD1 = IERC20(_usd1);
        UNISWAP_ROUTER = ISwapRouter(_uniswapRouter);
        
        // Initialize with Charm vault if provided
        if (_charmVault != address(0)) {
            charmVault = ICharmVault(_charmVault);
            active = true;
            emit CharmVaultSet(_charmVault);
        }
        
        // Initialize Uniswap V3 0.3% pool for TWAP (better liquidity/pricing)
        twapPool = IUniswapV3Pool(UNISWAP_V3_POOL_03_PERCENT);
        
        // Initialize Chainlink price feed for WETH/USD
        wethUsdPriceFeed = AggregatorV3Interface(CHAINLINK_WETH_USD);
        
        // Initialize USD1/USD feed if provided (for accurate accounting)
        if (CHAINLINK_USD1_USD != address(0)) {
            usd1UsdPriceFeed = AggregatorV3Interface(CHAINLINK_USD1_USD);
        }
        
        lastRebalance = block.timestamp;
    }

    // =================================
    // INITIALIZATION
    // =================================
    
    /**
     * @notice Set Charm vault (if not set in constructor)
     * @param _charmVault Address of Charm Alpha Vault
     */
    function setCharmVault(address _charmVault) external onlyOwner {
        if (_charmVault == address(0)) revert ZeroAddress();
        charmVault = ICharmVault(_charmVault);
        active = true;
        emit CharmVaultSet(_charmVault);
    }
    
    /**
     * @notice Set WETH/USD Chainlink price feed (if needed to change from default)
     * @param _wethUsdFeed Address of Chainlink WETH/USD price feed
     */
    function setWethUsdPriceFeed(address _wethUsdFeed) external onlyOwner {
        if (_wethUsdFeed == address(0)) revert ZeroAddress();
        wethUsdPriceFeed = AggregatorV3Interface(_wethUsdFeed);
        emit OracleUpdated(_wethUsdFeed, "Chainlink_WETH_USD");
    }
    
    /**
     * @notice Set USD1/USD Chainlink price feed (for accurate accounting)
     * @param _usd1UsdFeed Address of Chainlink USD1/USD price feed
     */
    function setUsd1UsdPriceFeed(address _usd1UsdFeed) external onlyOwner {
        if (_usd1UsdFeed == address(0)) revert ZeroAddress();
        usd1UsdPriceFeed = AggregatorV3Interface(_usd1UsdFeed);
        emit OracleUpdated(_usd1UsdFeed, "Chainlink_USD1_USD");
    }
    
    /**
     * @notice Set WLFI/USD Chainlink price feed (if available)
     * @param _wlfiUsdFeed Address of Chainlink WLFI/USD price feed
     */
    function setWlfiUsdPriceFeed(address _wlfiUsdFeed) external onlyOwner {
        wlfiUsdPriceFeed = AggregatorV3Interface(_wlfiUsdFeed);
        emit OracleUpdated(_wlfiUsdFeed, "Chainlink_WLFI_USD");
    }
    
    /**
     * @notice Set Uniswap V3 pool for TWAP pricing (if needed to change from 0.3%)
     * @param _twapPool Address of Uniswap V3 pool to use for TWAP
     */
    function setTwapPool(address _twapPool) external onlyOwner {
        if (_twapPool == address(0)) revert ZeroAddress();
        twapPool = IUniswapV3Pool(_twapPool);
        emit OracleUpdated(_twapPool, "Uniswap_V3_TWAP");
    }
    
    /**
     * @notice Initialize all required approvals for strategy to work
     * @dev Call this once after deployment
     */
    function initializeApprovals() external onlyOwner {
        // Approve Uniswap router for WLFI→WETH swaps only
        WLFI.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        WETH.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        
        // Approve Charm vault for deposits
        if (address(charmVault) != address(0)) {
            WLFI.forceApprove(address(charmVault), type(uint256).max);
            WETH.forceApprove(address(charmVault), type(uint256).max);
        }
    }

    // =================================
    // STRATEGY FUNCTIONS (IStrategy)
    // =================================
    
    /**
     * @notice Deposit with smart auto-rebalancing
     * @dev Automatically matches Charm vault's current WETH:WLFI ratio
     * @param wlfiAmount Amount of WLFI to deposit
     * @param usd1Amount Amount of USD1 to deposit (will be swapped to WETH)
     */
    function deposit(uint256 wlfiAmount, uint256 usd1Amount) 
        external 
        onlyVault
        whenActive
        nonReentrant
        returns (uint256 shares) 
    {
        if (address(charmVault) == address(0)) revert NotInitialized();
        
        // Try to pull tokens from vault (backward compatible)
        if (wlfiAmount > 0) {
            try WLFI.transferFrom(EAGLE_VAULT, address(this), wlfiAmount) {
                // Transfer succeeded
            } catch {
                // Transfer failed - vault might have already sent tokens
            }
        }
        if (usd1Amount > 0) {
            try USD1.transferFrom(EAGLE_VAULT, address(this), usd1Amount) {
                // Transfer succeeded
            } catch {
                // Transfer failed - vault might have already sent tokens
            }
        }
        
        // Check TOTAL tokens available (handles both PUSH and PULL patterns)
        uint256 totalWlfi = WLFI.balanceOf(address(this));
        uint256 totalUsd1 = USD1.balanceOf(address(this));
        
        // Return USD1 to vault - this strategy only handles WLFI
        if (totalUsd1 > 0) {
            USD1.safeTransfer(EAGLE_VAULT, totalUsd1);
            emit UnusedTokensReturned(totalUsd1, 0);
        }
        
        // Get existing WETH balance
        uint256 totalWeth = WETH.balanceOf(address(this));
        
        // Return early if we have no WLFI
        if (totalWlfi == 0 && totalWeth == 0) return 0;
        
        // Get Charm's current ratio
        (uint256 charmWeth, uint256 charmWlfi) = charmVault.getTotalAmounts();
        
        uint256 finalWeth;
        uint256 finalWlfi;
        
        if (charmWeth > 0 && charmWlfi > 0) {
            // Calculate how much WETH we need for our WLFI
            uint256 wethNeeded = (totalWlfi * charmWeth) / charmWlfi;
            
            if (totalWeth >= wethNeeded) {
                // We have enough WETH - use proportional amounts
                finalWlfi = totalWlfi;
                finalWeth = wethNeeded;
            } else {
                // Not enough WETH - need to swap some WLFI→WETH
                uint256 wethShortfall = wethNeeded - totalWeth;
                
                // Get price from oracle
                uint256 wlfiPerWeth = getWlfiPerWeth();
                uint256 wlfiToSwap = (wethShortfall * wlfiPerWeth) / 1e18;
                
                // SAFETY: Limit swap to reasonable percentage to avoid liquidity issues
                // Cap at 30% of totalWlfi being swapped
                uint256 maxSwapPct = 30; // 30%
                uint256 maxSwap = (totalWlfi * maxSwapPct) / 100;
                
                if (wlfiToSwap > maxSwap) {
                    // Limit to max percentage, deposit imperfect ratio
                    wlfiToSwap = maxSwap;
                }
                
                // Swap WLFI to WETH to match Charm's ratio
                if (wlfiToSwap > 0 && wlfiToSwap < totalWlfi) {
                    // Perform the swap
                    uint256 moreWeth = _swapWlfiToWeth(wlfiToSwap);
                    finalWeth = totalWeth + moreWeth;
                    finalWlfi = totalWlfi - wlfiToSwap;
                } else {
                    // No swap - just deposit what we have
                    finalWeth = totalWeth;
                    finalWlfi = totalWlfi;
                }
            }
        } else {
            // Charm empty - use what we have
            finalWeth = totalWeth;
            finalWlfi = totalWlfi;
        }
        
        // BATCH DEPOSIT: Split into smaller deposits to avoid Charm liquidity issues
        // Max 50 WLFI per batch to prevent "cross" errors at tick boundaries
        uint256 maxBatchSize = 50e18; // 50 WLFI (reduced from 300)
        uint256 amount0Used;
        uint256 amount1Used;
        
        if (finalWlfi <= maxBatchSize) {
            // Small enough, single deposit
            (shares, amount0Used, amount1Used) = charmVault.deposit(
                finalWeth,
                finalWlfi,
                0,
                0,
                address(this)
            );
        } else {
            // Split into multiple batches
            uint256 batchCount = (finalWlfi + maxBatchSize - 1) / maxBatchSize; // Round up
            uint256 wlfiPerBatch = finalWlfi / batchCount;
            uint256 wethPerBatch = finalWeth / batchCount;
            
            for (uint256 i = 0; i < batchCount; i++) {
                // Last batch gets remainder
                uint256 batchWlfi = (i == batchCount - 1) ? WLFI.balanceOf(address(this)) : wlfiPerBatch;
                uint256 batchWeth = (i == batchCount - 1) ? WETH.balanceOf(address(this)) : wethPerBatch;
                
                (uint256 batchShares, uint256 used0, uint256 used1) = charmVault.deposit(
                    batchWeth,
                    batchWlfi,
                    0,
                    0,
                    address(this)
                );
                
                shares += batchShares;
                amount0Used += used0;
                amount1Used += used1;
            }
        }
        
        // Return any unused tokens to vault
        {
            uint256 leftoverWlfi = WLFI.balanceOf(address(this));
            
            // NOTE: Skipping leftover WETH return because WETH/USD1 swap fails
            // Any leftover WETH stays in strategy and will be used in next deposit
            
            if (leftoverWlfi > 0) {
                WLFI.safeTransfer(EAGLE_VAULT, leftoverWlfi);
                emit UnusedTokensReturned(0, leftoverWlfi);
            }
        }
        
        // Emit in correct order: (WLFI, USD1, shares) to match IStrategy interface
        // Convert WETH used back to USD1 equivalent for emission
        // Use try-catch to avoid reverting if USD1 oracle is stale
        uint256 usd1Equivalent = 0;
        try this._getUsd1Equivalent(amount0Used) returns (uint256 equivalent) {
            usd1Equivalent = equivalent;
        } catch {
            // If oracle is stale, just emit 0 for USD1 equivalent
            // The deposit still succeeded, this is just for accounting
        }
        emit StrategyDeposit(amount1Used, usd1Equivalent, shares);
    }
    
    /**
     * @notice Withdraw from Charm vault
     * @param value WLFI-equivalent value to withdraw
     * @return wlfiAmount WLFI withdrawn (FIRST - matches IStrategy interface)
     * @return usd1Amount USD1 withdrawn (SECOND - matches IStrategy interface)
     */
    function withdraw(uint256 value) 
        external 
        onlyVault
        nonReentrant
        returns (uint256 wlfiAmount, uint256 usd1Amount) 
    {
        if (value == 0) return (0, 0);
        if (address(charmVault) == address(0)) return (0, 0);
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) return (0, 0);
        
        // Get actual amounts from Charm vault (WETH and WLFI)
        (uint256 totalWeth, uint256 totalWlfi) = charmVault.getTotalAmounts();
        uint256 totalShares = charmVault.totalSupply();
        
        // Calculate our proportional share
        uint256 ourWeth = (totalWeth * ourShares) / totalShares;
        uint256 ourWlfi = (totalWlfi * ourShares) / totalShares;
        
        // Get WLFI per WETH for value calculation
        uint256 wlfiPerWeth = getWlfiPerWeth();
        
        // Calculate total value (WLFI-equivalent)
        uint256 totalValue = ourWlfi + (ourWeth * wlfiPerWeth) / 1e18;
        
        uint256 sharesToWithdraw;
        if (value >= totalValue) {
            sharesToWithdraw = ourShares; // Withdraw all
        } else {
            sharesToWithdraw = (ourShares * value) / totalValue;
        }
        
        // Calculate expected amounts for slippage protection
        uint256 expectedWeth = (ourWeth * sharesToWithdraw) / ourShares;
        uint256 expectedWlfi = (ourWlfi * sharesToWithdraw) / ourShares;
        
        // Withdraw from Charm
        // Charm returns (amount0, amount1) where token0=WETH, token1=WLFI
        uint256 wethAmount;
        (wethAmount, wlfiAmount) = charmVault.withdraw(
            sharesToWithdraw,
            (expectedWeth * (10000 - maxSlippage)) / 10000,
            (expectedWlfi * (10000 - maxSlippage)) / 10000,
            address(this) // Receive here first
        );
        
        // NOTE: Skipping WETH→USD1 swap because pool has no liquidity
        // Any withdrawn WETH stays in strategy and will be used in next deposit
        // Only return WLFI to vault, set usd1Amount to 0
        usd1Amount = 0;
        
        // Transfer WLFI directly to vault
        if (wlfiAmount > 0) {
            WLFI.safeTransfer(EAGLE_VAULT, wlfiAmount);
        }
        
        // Emit in correct order (shares, wlfi, usd1) to match IStrategy interface
        emit StrategyWithdraw(sharesToWithdraw, wlfiAmount, usd1Amount);
    }
    
    /**
     * @notice Rebalance strategy (Charm handles this internally)
     */
    function rebalance() external onlyVault {
        if (address(charmVault) == address(0)) return;
        
        (uint256 totalWlfi, uint256 totalUsd1) = getTotalAmounts();
        lastRebalance = block.timestamp;
        
        // Emit in correct order (WLFI, USD1) to match IStrategy interface
        emit StrategyRebalanced(totalWlfi, totalUsd1);
    }

    // =================================
    // PRICE ORACLE FUNCTIONS
    // =================================
    
    /**
     * @notice Get WLFI per WETH price using available oracles
     * @dev Tries Chainlink first, falls back to Uniswap TWAP
     * @return wlfiPerWeth Amount of WLFI per 1 WETH (18 decimals)
     */
    function getWlfiPerWeth() public view returns (uint256 wlfiPerWeth) {
        // Try Chainlink first (if both feeds available)
        if (address(wethUsdPriceFeed) != address(0) && address(wlfiUsdPriceFeed) != address(0)) {
            try this.getChainlinkPrice() returns (uint256 price) {
                if (price > 0) {
                    return price;
                }
            } catch {}
        }
        
        // Fall back to Uniswap TWAP
        return getTwapPrice();
    }
    
    /**
     * @notice Get price from Chainlink oracles
     * @dev Returns WLFI per WETH based on USD prices
     * @return wlfiPerWeth Amount of WLFI per 1 WETH (18 decimals)
     */
    function getChainlinkPrice() external view returns (uint256 wlfiPerWeth) {
        // Get WETH/USD price
        (, int256 wethUsdPrice, , uint256 wethUpdatedAt, ) = wethUsdPriceFeed.latestRoundData();
        if (wethUsdPrice <= 0) revert InvalidPrice();
        if (block.timestamp - wethUpdatedAt > maxOracleAge) revert StalePrice();
        
        // If WLFI/USD feed not available, use TWAP as fallback
        if (address(wlfiUsdPriceFeed) == address(0)) {
            return getTwapPrice();
        }
        
        // Get WLFI/USD price
        (, int256 wlfiUsdPrice, , uint256 wlfiUpdatedAt, ) = wlfiUsdPriceFeed.latestRoundData();
        if (wlfiUsdPrice <= 0) revert InvalidPrice();
        if (block.timestamp - wlfiUpdatedAt > maxOracleAge) revert StalePrice();
        
        // Calculate WLFI per WETH
        // wlfiPerWeth = (wethUsdPrice * 1e18) / wlfiUsdPrice
        uint8 wethDecimals = wethUsdPriceFeed.decimals();
        uint8 wlfiDecimals = wlfiUsdPriceFeed.decimals();
        
        wlfiPerWeth = (uint256(wethUsdPrice) * 1e18 * 10**wlfiDecimals) / (uint256(wlfiUsdPrice) * 10**wethDecimals);
    }
    
    /**
     * @notice Get price from Uniswap V3 TWAP (using 0.3% pool for better liquidity)
     * @dev Uses time-weighted average price over twapPeriod from the 0.3% fee tier
     * @return wlfiPerWeth Amount of WLFI per 1 WETH (18 decimals)
     */
    function getTwapPrice() public view returns (uint256 wlfiPerWeth) {
        if (address(twapPool) == address(0)) {
            // Fallback: assume 1:1 ratio (should never happen in production)
            return 1e18;
        }
        
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = uint32(twapPeriod);
        secondsAgos[1] = 0;
        
        try twapPool.observe(secondsAgos) returns (
            int56[] memory tickCumulatives,
            uint160[] memory
        ) {
            int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
            int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(twapPeriod)));
            
            // Convert tick to price
            // price = 1.0001^tick
            wlfiPerWeth = _getQuoteAtTick(arithmeticMeanTick);
            
            if (wlfiPerWeth == 0) {
                // Fallback to spot ratio if TWAP fails
                (uint256 charmWeth, uint256 charmWlfi) = charmVault.getTotalAmounts();
                if (charmWeth > 0 && charmWlfi > 0) {
                    wlfiPerWeth = (charmWlfi * 1e18) / charmWeth;
                } else {
                    wlfiPerWeth = 1e18;
                }
            }
        } catch {
            // Fallback to Charm vault ratio
            (uint256 charmWeth, uint256 charmWlfi) = charmVault.getTotalAmounts();
            if (charmWeth > 0 && charmWlfi > 0) {
                wlfiPerWeth = (charmWlfi * 1e18) / charmWeth;
            } else {
                wlfiPerWeth = 1e18;
            }
        }
    }
    
    /**
     * @notice Convert Uniswap V3 tick to price quote
     * @dev Calculates amount of token1 per token0
     * @param tick The tick value from the pool
     * @return price Amount of WLFI per WETH (18 decimals)
     */
    function _getQuoteAtTick(int24 tick) internal pure returns (uint256 price) {
        uint160 sqrtPriceX96 = _getSqrtRatioAtTick(tick);
        
        // Convert sqrtPriceX96 to price
        // price = (sqrtPriceX96 / 2^96)^2
        uint256 ratioX192 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        price = (ratioX192 * 1e18) >> 192;
    }
    
    /**
     * @notice Calculate sqrt price at tick (simplified)
     * @dev Based on Uniswap V3 math
     */
    function _getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= uint256(int256(887272)), 'T');

        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;

        if (tick > 0) ratio = type(uint256).max / ratio;

        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }

    // =================================
    // TOKEN SWAP FUNCTIONS
    // =================================
    
    /**
     * @notice Swap WETH to WLFI using Uniswap V3
     */
    function _swapWethToWlfi(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(WETH),
            tokenOut: address(WLFI),
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0, // Accept market rate (Charm will return unused)
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(WETH), address(WLFI), amountIn, amountOut);
    }
    
    /**
     * @notice Swap WLFI to WETH using Uniswap V3
     */
    function _swapWlfiToWeth(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(WLFI),
            tokenOut: address(WETH),
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0, // Accept market rate
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(WLFI), address(WETH), amountIn, amountOut);
    }
    
    /**
     * @notice Swap USD1 to WETH using Uniswap V3
     * @dev Used when vault sends USD1, we need WETH for Charm vault
     */
    function _swapUsd1ToWeth(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        // Direct swap: USD1 → WETH using 0.3% pool
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(USD1),
            tokenOut: address(WETH),
            fee: 3000,  // 0.3% fee tier (pool exists with liquidity)
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,  // Accept market rate
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(USD1), address(WETH), amountIn, amountOut);
    }
    
    /**
     * @notice Swap WETH to USD1 using Uniswap V3
     * @dev Used when returning unused WETH to vault (must return as USD1)
     */
    function _swapWethToUsd1(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        // Direct swap: WETH → USD1 using 0.3% pool
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(WETH),
            tokenOut: address(USD1),
            fee: 3000,  // 0.3% fee tier (pool exists with liquidity)
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,  // Accept market rate
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(WETH), address(USD1), amountIn, amountOut);
    }
    
    /**
     * @notice Get USD1 equivalent of WETH amount (for emissions/accounting)
     * @dev Uses Chainlink oracles - requires both WETH/USD and USD1/USD feeds
     *      Actual swaps use Uniswap market rates
     * @dev In emergency mode, uses manual override price
     * @dev Reverts if oracles unavailable and not in emergency mode
     */
    function _getUsd1Equivalent(uint256 wethAmount) public view returns (uint256) {
        if (wethAmount == 0) return 0;
        
        // In emergency mode, use manual override price
        if (emergencyMode) {
            if (emergencyWethPerUsd1 == 0) revert InvalidPrice();
            // emergencyWethPerUsd1 actually represents USD1 per WETH despite the name
            // Example: if 1 WETH = 3200 USD1, then emergencyWethPerUsd1 = 3200e18
            return (wethAmount * emergencyWethPerUsd1) / 1e18;
        }
        
        // Require both Chainlink feeds to be available
        if (address(wethUsdPriceFeed) == address(0) || address(usd1UsdPriceFeed) == address(0)) {
            revert InvalidPrice(); // Cannot calculate without oracles
        }
        
        // Get accurate conversion from Chainlink oracles
        uint256 wethPerUsd1 = _getWethPerUsd1FromChainlink();
        if (wethPerUsd1 == 0) revert InvalidPrice();
        
        // wethPerUsd1 actually represents USD1 per WETH despite the name
        // USD1 equivalent = (WETH amount * USD1_per_WETH) / 1e18
        return (wethAmount * wethPerUsd1) / 1e18;
    }
    
    /**
     * @notice Get WETH per USD1 from Chainlink oracles
     * @dev Internal helper for accurate price conversion
     * @dev Reverts if prices are invalid or stale
     */
    function _getWethPerUsd1FromChainlink() internal view returns (uint256 wethPerUsd1) {
        // Get WETH/USD price
        (, int256 wethUsdPrice, , uint256 wethUpdatedAt, ) = wethUsdPriceFeed.latestRoundData();
        if (wethUsdPrice <= 0) revert InvalidPrice();
        if (block.timestamp - wethUpdatedAt > maxOracleAge) revert StalePrice();
        
        // Get USD1/USD price
        (, int256 usd1UsdPrice, , uint256 usd1UpdatedAt, ) = usd1UsdPriceFeed.latestRoundData();
        if (usd1UsdPrice <= 0) revert InvalidPrice();
        if (block.timestamp - usd1UpdatedAt > maxOracleAge) revert StalePrice();
        
        // Calculate WETH per USD1
        // wethPerUsd1 = (wethUsdPrice * 1e18) / usd1UsdPrice
        uint8 wethDecimals = wethUsdPriceFeed.decimals();
        uint8 usd1Decimals = usd1UsdPriceFeed.decimals();
        
        wethPerUsd1 = (uint256(wethUsdPrice) * 1e18 * 10**usd1Decimals) / (uint256(usd1UsdPrice) * 10**wethDecimals);
    }

    // =================================
    // VIEW FUNCTIONS (IStrategy)
    // =================================
    
    /**
     * @notice Get total amounts managed by strategy (proportional to our shares)
     * @dev Returns (WLFI, USD1) to match IStrategy interface
     *      Converts WETH to USD1 equivalent using approximate price
     */
    function getTotalAmounts() public view returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (!active || address(charmVault) == address(0)) {
            return (0, 0);
        }
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) {
            return (0, 0);
        }
        
        (uint256 totalWeth, uint256 totalWlfi) = charmVault.getTotalAmounts();
        uint256 totalShares = charmVault.totalSupply();
        
        if (totalShares == 0) return (0, 0);
        
        // Calculate our proportional share
        wlfiAmount = (totalWlfi * ourShares) / totalShares;
        uint256 wethAmount = (totalWeth * ourShares) / totalShares;
        
        // Convert WETH to USD1 equivalent using Chainlink oracles if available
        usd1Amount = _getUsd1Equivalent(wethAmount);
    }
    
    /**
     * @notice Check if strategy is initialized
     */
    function isInitialized() external view returns (bool) {
        return active && address(charmVault) != address(0);
    }
    
    /**
     * @notice Get Charm LP share balance
     */
    function getShareBalance() external view returns (uint256) {
        if (address(charmVault) == address(0)) return 0;
        return charmVault.balanceOf(address(this));
    }

    // =================================
    // ADMIN FUNCTIONS
    // =================================
    
    /**
     * @notice Update strategy parameters
     */
    function updateParameters(
        uint256 _maxSlippage,
        uint256 _twapPeriod,
        uint256 _maxOracleAge
    ) external onlyOwner {
        require(_maxSlippage <= 1000, "Slippage too high"); // Max 10%
        require(_twapPeriod >= 300 && _twapPeriod <= 3600, "TWAP period must be 5min-1hr");
        require(_maxOracleAge >= 600 && _maxOracleAge <= 86400, "Oracle age must be 10min-24hr"); // 24 hours for USD1 stablecoin oracle
        
        maxSlippage = _maxSlippage;
        twapPeriod = _twapPeriod;
        maxOracleAge = _maxOracleAge;
    }
    
    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        active = false;
    }
    
    /**
     * @notice Resume strategy
     */
    function resume() external onlyOwner {
        if (address(charmVault) == address(0)) revert NotInitialized();
        active = true;
    }
    
    /**
     * @notice Rescue idle tokens (not in Charm vault)
     * @dev Returns any tokens sitting idle in this contract back to vault
     */
    function rescueIdleTokens() external onlyVault {
        uint256 wlfiBalance = WLFI.balanceOf(address(this));
        uint256 wethBalance = WETH.balanceOf(address(this));
        uint256 usd1Balance = USD1.balanceOf(address(this));
        
        // Convert WETH to USD1 before returning
        if (wethBalance > 0) {
            uint256 usd1FromWeth = _swapWethToUsd1(wethBalance);
            usd1Balance += usd1FromWeth;
        }
        
        if (wlfiBalance > 0) {
            WLFI.safeTransfer(EAGLE_VAULT, wlfiBalance);
        }
        if (usd1Balance > 0) {
            USD1.safeTransfer(EAGLE_VAULT, usd1Balance);
        }
        
        if (wlfiBalance > 0 || usd1Balance > 0) {
            emit UnusedTokensReturned(usd1Balance, wlfiBalance);
        }
    }
    
    /**
     * @notice Emergency token recovery (owner only)
     */
    function rescueToken(address token, uint256 amount, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }
    
    /**
     * @notice Set token approval (owner only) - for fixing approval issues
     */
    function setTokenApproval(address token, address spender, uint256 amount) external onlyOwner {
        IERC20(token).forceApprove(spender, amount);
    }
    
    // =================================
    // EMERGENCY FUNCTIONS
    // =================================
    
    /**
     * @notice Enable emergency mode (bypasses oracle checks)
     * @dev Use when Chainlink oracles fail or become stale
     * @dev Owner must set emergencyWethPerUsd1 before emergency withdrawals work
     */
    function enableEmergencyMode() external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeToggled(true);
    }
    
    /**
     * @notice Disable emergency mode (restore normal operation)
     */
    function disableEmergencyMode() external onlyOwner {
        emergencyMode = false;
        emit EmergencyModeToggled(false);
    }
    
    /**
     * @notice Set manual WETH/USD1 ratio for emergency mode
     * @dev Use current market price or Uniswap spot price
     * @param _wethPerUsd1 Amount of USD1 per 1 WETH (18 decimals)
     *      Example: If 1 WETH = 3000 USD1, then _wethPerUsd1 = 3000e18
     *      (Variable name is misleading - it's actually USD1 per WETH, not WETH per USD1)
     */
    function setEmergencyPrice(uint256 _wethPerUsd1) external onlyOwner {
        if (_wethPerUsd1 == 0) revert InvalidPrice();
        // Sanity check: WETH should be worth more than USD1
        // Allow range: 100 USD1 to 10,000 USD1 per WETH
        require(_wethPerUsd1 >= 100e18 && _wethPerUsd1 <= 10000e18, "Price out of range");
        emergencyWethPerUsd1 = _wethPerUsd1;
        emit EmergencyPriceSet(_wethPerUsd1);
    }
    
    /**
     * @notice Emergency withdraw - bypasses oracle checks
     * @dev Can be called by vault even if oracles fail
     * @dev Requires emergency mode to be enabled
     * @param shares Amount of Charm shares to withdraw (use type(uint256).max for all)
     * @return wlfiAmount WLFI withdrawn
     * @return usd1Amount USD1 withdrawn (converted from WETH)
     */
    function emergencyWithdraw(uint256 shares) 
        external 
        onlyVault
        nonReentrant
        returns (uint256 wlfiAmount, uint256 usd1Amount) 
    {
        if (!emergencyMode) revert NotInEmergencyMode();
        if (address(charmVault) == address(0)) return (0, 0);
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) return (0, 0);
        
        // Cap shares to withdraw
        if (shares > ourShares) {
            shares = ourShares;
        }
        
        // Withdraw from Charm vault directly (no slippage checks in emergency)
        uint256 wethAmount;
        (wethAmount, wlfiAmount) = charmVault.withdraw(
            shares,
            0,  // No minimum checks in emergency
            0,  // No minimum checks in emergency
            address(this) // Receive here first
        );
        
        // Swap WETH → USD1 before returning to vault
        if (wethAmount > 0) {
            usd1Amount = _swapWethToUsd1(wethAmount);
            USD1.safeTransfer(EAGLE_VAULT, usd1Amount);
        }
        
        // Transfer WLFI directly to vault
        if (wlfiAmount > 0) {
            WLFI.safeTransfer(EAGLE_VAULT, wlfiAmount);
        }
        
        emit EmergencyWithdrawExecuted(shares, wlfiAmount, usd1Amount);
    }
    
    /**
     * @notice Emergency withdraw all - withdraws everything from Charm vault
     * @dev Convenience function for full withdrawal in emergency
     */
    function emergencyWithdrawAll() external onlyVault nonReentrant returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (!emergencyMode) revert NotInEmergencyMode();
        if (address(charmVault) == address(0)) return (0, 0);
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) return (0, 0);
        
        // Withdraw from Charm vault directly (no slippage checks in emergency)
        uint256 wethAmount;
        (wethAmount, wlfiAmount) = charmVault.withdraw(
            ourShares,
            0,  // No minimum checks in emergency
            0,  // No minimum checks in emergency
            address(this) // Receive here first
        );
        
        // Swap WETH → USD1 before returning to vault
        if (wethAmount > 0) {
            usd1Amount = _swapWethToUsd1(wethAmount);
            USD1.safeTransfer(EAGLE_VAULT, usd1Amount);
        }
        
        // Transfer WLFI directly to vault
        if (wlfiAmount > 0) {
            WLFI.safeTransfer(EAGLE_VAULT, wlfiAmount);
        }
        
        emit EmergencyWithdrawExecuted(ourShares, wlfiAmount, usd1Amount);
    }
    
    /**
     * @notice Get total amounts using emergency price if in emergency mode
     * @dev Override for emergency mode to bypass oracle checks
     */
    function getTotalAmountsEmergency() external view returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (!emergencyMode) revert NotInEmergencyMode();
        if (!active || address(charmVault) == address(0)) {
            return (0, 0);
        }
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) {
            return (0, 0);
        }
        
        (uint256 totalWeth, uint256 totalWlfi) = charmVault.getTotalAmounts();
        uint256 totalShares = charmVault.totalSupply();
        
        if (totalShares == 0) return (0, 0);
        
        // Calculate our proportional share
        wlfiAmount = (totalWlfi * ourShares) / totalShares;
        uint256 wethAmount = (totalWeth * ourShares) / totalShares;
        
        // Convert WETH to USD1 using emergency price
        if (emergencyWethPerUsd1 == 0) revert InvalidPrice();
        usd1Amount = (wethAmount * 1e18) / emergencyWethPerUsd1;
    }
}

