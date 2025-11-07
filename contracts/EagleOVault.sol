// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import { IUniswapV3Pool } from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import { IStrategy } from "./interfaces/IStrategy.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title EagleOVault
 * @notice LayerZero OVault-compatible ERC-4626 vault with synchronous redemptions
 * 
 * @dev LAYERZERO OVAULT COMPATIBLE - Synchronous Operations
 *      - totalAssets() returns WLFI units (strict ERC-4626)
 *      - deposit/mint/withdraw/redeem are SYNCHRONOUS (immediate transfers)
 *      - Compatible with VaultComposerSync for omnichain deposits/redemptions
 *      - USD1 converted to WLFI-equivalent for accounting
 *      - depositDual swaps USD1→WLFI before minting shares
 *      - No totalSupply() override; locked shares tracked separately
 * 
 * https://keybase.io/47eagle
 */
contract EagleOVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =================================
    // CONSTANTS
    // =================================
    
    /// @notice Maximum performance fee (50%)
    uint16 public constant MAX_FEE = 5_000;
    
    /// @notice Basis points denominator
    uint256 internal constant MAX_BPS = 10_000;
    
    /// @notice Extended precision for profit unlocking rate
    uint256 internal constant MAX_BPS_EXTENDED = 1_000_000_000_000;
    
    /// @notice Seconds per year
    uint256 internal constant SECONDS_PER_YEAR = 31_556_952;

    // =================================
    // STATE VARIABLES
    // =================================
    
    /// @notice Token contracts
    IERC20 public immutable USD1_TOKEN;
    IERC20 public immutable WLFI_TOKEN;
    
    /// @notice Oracle contracts
    AggregatorV3Interface public immutable USD1_PRICE_FEED;
    IUniswapV3Pool public immutable WLFI_USD1_POOL;
    ISwapRouter public immutable UNISWAP_ROUTER;
    
    /// @notice Current token balances held directly by vault
    uint256 public wlfiBalance;
    uint256 public usd1Balance;
    
    /// @notice Strategy management
    mapping(address => bool) public activeStrategies;
    mapping(address => uint256) public strategyWeights;
    address[] public strategyList;
    uint256 public totalStrategyWeight;
    uint256 public constant MAX_STRATEGIES = 5;
    
    // =================================
    // ADVANCED FEATURES
    // =================================
    
    /// @notice Access control roles
    address public management;
    address public pendingManagement;
    address public keeper; // Can call report() and tend()
    address public emergencyAdmin; // Can shutdown
    
    /// @notice Performance fees
    uint16 public performanceFee; // In basis points
    address public performanceFeeRecipient;
    
    /// @notice Profit unlocking (prevents PPS manipulation)
    /// @dev Locked shares are tracked separately, not excluded from totalSupply()
    uint256 public profitUnlockingRate; // Shares to unlock per second
    uint96 public fullProfitUnlockDate; // When all profits unlocked
    uint32 public profitMaxUnlockTime; // Max time to unlock
    uint256 public totalLockedShares; // Shares locked from last report (held by vault)
    
    /// @notice Reporting
    uint96 public lastReport;
    uint256 public totalAssetsAtLastReport; // In WLFI units
    
    /// @notice Shutdown flag
    bool public isShutdown;
    
    /// @notice Whitelist for deposits
    bool public whitelistEnabled;
    mapping(address => bool) public whitelist;
    
    // =================================
    // LEGACY STATE
    // =================================
    
    // With 80,000x bootstrap multiplier: 50M shares = 625 WLFI max at bootstrap
    // After injections, vault can hold much more value with same share count
    uint256 public maxTotalSupply = 50_000_000e18; // 50 million shares
    uint32 public twapInterval = 1800;
    uint256 public maxPriceAge = 86400;
    uint256 public deploymentThreshold = 1000e18; // Keep 1000 WLFI idle for redemptions (Recommendation #4)
    uint256 public minDeploymentInterval = 5 minutes;
    uint256 public lastDeployment;
    bool public paused;
    mapping(address => bool) public authorized;
    uint256 public lastRebalance;
    
    /// @notice Slippage tolerance for USD1→WLFI swaps (in basis points)
    uint256 public swapSlippageBps = 50; // 0.5% default

    // =================================
    // EVENTS
    // =================================
    
    // Standard ERC4626 events (Deposit/Withdraw) emitted via OZ base
    
    /// @notice Dual deposit event (now swaps USD1 first)
    event DualDeposit(
        address indexed user,
        uint256 wlfiAmount,
        uint256 usd1Amount,
        uint256 usd1SwappedToWlfi,
        uint256 totalWlfiDeposited,
        uint256 shares
    );
    
    event USD1Swapped(
        uint256 usd1In,
        uint256 wlfiOut,
        uint256 wlfiExpected,
        uint256 minWlfiOut,
        uint256 slippageBps
    );
    
    event Reported(
        uint256 profit,
        uint256 loss,
        uint256 performanceFees,
        uint256 totalAssets
    );
    
    event UpdateKeeper(address indexed newKeeper);
    event UpdateEmergencyAdmin(address indexed newEmergencyAdmin);
    event UpdatePerformanceFee(uint16 newPerformanceFee);
    event UpdatePerformanceFeeRecipient(address indexed newRecipient);
    event UpdateProfitMaxUnlockTime(uint256 newProfitMaxUnlockTime);
    event UpdateManagement(address indexed newManagement);
    event UpdatePendingManagement(address indexed newPendingManagement);
    event StrategyShutdown();
    event BalancesSynced(uint256 wlfiBalance, uint256 usd1Balance);
    event WhitelistEnabled(bool enabled);
    event WhitelistUpdated(address indexed account, bool status);
    event StrategyAdded(address indexed strategy, uint256 weight);
    event StrategyRemoved(address indexed strategy);
    event StrategyDeployed(address indexed strategy, uint256 wlfiDeployed, uint256 usd1Deployed);
    event Rebalanced(uint256 newWlfiBalance, uint256 newUsd1Balance);
    event EmergencyPause(bool paused);
    event CapitalInjected(address indexed from, uint256 wlfiAmount, uint256 usd1Amount);
    event EmergencyWithdraw(address indexed to, uint256 wlfiAmount, uint256 usd1Amount);
    event SwapSlippageUpdated(uint256 newSlippageBps);

    // =================================
    // ERRORS
    // =================================
    
    error ZeroAddress();
    error Unauthorized();
    error Paused();
    error InvalidAmount();
    error InsufficientBalance();
    error SlippageExceeded();
    error StrategyAlreadyActive();
    error StrategyNotActive();
    error MaxStrategiesReached();
    error InvalidWeight();
    error InvalidPrice();
    error StalePrice();
    error VaultIsShutdown();
    error VaultNotShutdown();

    // =================================
    // CONSTRUCTOR
    // =================================
    
    constructor(
        address _wlfiToken,
        address _usd1Token,
        address _usd1PriceFeed,
        address _wlfiUsd1Pool,
        address _uniswapRouter,
        address _owner
    ) 
        ERC20("Eagle Vault Shares", "vEAGLE") 
        ERC4626(IERC20(_wlfiToken)) 
        Ownable(_owner) 
    {
        if (_wlfiToken == address(0) || _usd1Token == address(0) || 
            _usd1PriceFeed == address(0) || _wlfiUsd1Pool == address(0) ||
            _uniswapRouter == address(0)) {
            revert ZeroAddress();
        }
        
        WLFI_TOKEN = IERC20(_wlfiToken);
        USD1_TOKEN = IERC20(_usd1Token);
        USD1_PRICE_FEED = AggregatorV3Interface(_usd1PriceFeed);
        WLFI_USD1_POOL = IUniswapV3Pool(_wlfiUsd1Pool);
        UNISWAP_ROUTER = ISwapRouter(_uniswapRouter);
        
        // Initialize roles
        management = _owner;
        keeper = _owner;
        emergencyAdmin = _owner;
        performanceFeeRecipient = _owner;
        performanceFee = 1000; // 10% default
        profitMaxUnlockTime = 7 days;
        
        authorized[_owner] = true;
        lastDeployment = block.timestamp;
        lastRebalance = block.timestamp;
        lastReport = uint96(block.timestamp);
    }
    
    receive() external payable {}

    // =================================
    // MODIFIERS
    // =================================
    
    modifier onlyManagement() {
        if (msg.sender != management && msg.sender != owner()) revert Unauthorized();
        _;
    }
    
    modifier onlyKeepers() {
        if (msg.sender != keeper && msg.sender != management && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }
    
    modifier onlyEmergencyAuthorized() {
        if (msg.sender != emergencyAdmin && msg.sender != management && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }
    
    modifier whenNotShutdown() {
        if (isShutdown) revert VaultIsShutdown();
        _;
    }
    
    modifier onlyWhitelisted() {
        if (whitelistEnabled && !whitelist[msg.sender]) revert Unauthorized();
        _;
    }

    // =================================
    // PRICE ORACLE FUNCTIONS (WLFI-centric)
    // =================================
    
    /**
     * @notice Get USD1 price in USD (1e18 = $1)
     */
    function getUSD1Price() public view returns (uint256 price) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = USD1_PRICE_FEED.latestRoundData();
        
        if (answer <= 0) revert InvalidPrice();
        if (updatedAt == 0) revert StalePrice();
        if (answeredInRound < roundId) revert StalePrice();
        if (block.timestamp - updatedAt > maxPriceAge) revert StalePrice();
        
        uint8 decimals = USD1_PRICE_FEED.decimals();
        price = uint256(answer) * (10 ** (18 - decimals));
        
        // Sanity check: USD1 should be close to $1
        if (price < 0.95e18 || price > 1.05e18) revert InvalidPrice();
    }
    
    /**
     * @notice Get WLFI price in USD (1e18 = $1)
     */
    function getWLFIPrice() public view returns (uint256 price) {
        uint256 usd1InUSD = getUSD1Price();
        
        uint256 wlfiInUsd1;
        if (twapInterval > 0) {
            try this._getTWAPPrice() returns (uint256 twapPrice) {
                wlfiInUsd1 = twapPrice;
            } catch {
                wlfiInUsd1 = _getSpotPrice();
            }
        } else {
            wlfiInUsd1 = _getSpotPrice();
        }
        
        // WLFI price in USD = (WLFI in USD1) * (USD1 in USD)
        price = (wlfiInUsd1 * usd1InUSD) / 1e18;
    }
    
    function _getTWAPPrice() external view returns (uint256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapInterval;
        secondsAgos[1] = 0;
        
        (int56[] memory tickCumulatives,) = WLFI_USD1_POOL.observe(secondsAgos);
        
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(twapInterval)));
        
        // Simple tick to price conversion (adjust based on pool token order)
        if (arithmeticMeanTick > -1000 && arithmeticMeanTick < 1000) {
            uint256 basePrice = 1e18;
            int256 adjustment = int256(arithmeticMeanTick) * 1e14;
            uint256 rawPrice = uint256(int256(basePrice) + adjustment);
            return rawPrice > 0 ? (1e18 * 1e18) / rawPrice : 1e18;
        } else {
            return _getSpotPrice();
        }
    }
    
    function _getSpotPrice() internal view returns (uint256 price) {
        (uint160 sqrtPriceX96,,,,,,) = WLFI_USD1_POOL.slot0();
        
        uint256 numerator = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        uint256 denominator = 1 << 192;
        uint256 rawPrice = (numerator * 1e18) / denominator;
        
        // Invert if needed (depends on pool token order)
        price = rawPrice > 0 ? (1e18 * 1e18) / rawPrice : 1e15;
        
        if (price == 0) price = 1e15;
    }

    /**
     * @notice Get WLFI per 1 USD1 (1e18 scale)
     * @dev Helper for converting USD1 amounts to WLFI-equivalent
     */
    function wlfiPerUsd1() public view returns (uint256) {
        uint256 wlfiPriceUSD = getWLFIPrice(); // 1e18 = $1
        uint256 usd1PriceUSD = getUSD1Price(); // ~1e18 = $1
        
        // WLFI per USD1 = (USD1 price) / (WLFI price)
        return (usd1PriceUSD * 1e18) / wlfiPriceUSD;
    }
    
    /**
     * @notice Convert USD1 amount to WLFI-equivalent
     * @param usd1Amount Amount of USD1
     * @return WLFI-equivalent amount (1e18 decimals)
     */
    function wlfiEquivalent(uint256 usd1Amount) public view returns (uint256) {
        if (usd1Amount == 0) return 0;
        return (usd1Amount * wlfiPerUsd1()) / 1e18;
    }
    
    /**
     * @notice Get price difference between oracle and pool price
     * @dev Useful for monitoring oracle/pool price mismatch (Issue #3 from WLFI_DENOMINATION_IMPACT.md)
     * @return deltaBps Price difference in basis points (positive = oracle higher than pool)
     */
    function getOraclePoolPriceDelta() public view returns (int256 deltaBps) {
        uint256 oraclePrice = wlfiPerUsd1();
        uint256 poolPrice = _getSpotPrice();
        
        if (oraclePrice == 0) return 0;
        
        int256 diff = int256(oraclePrice) - int256(poolPrice);
        deltaBps = (diff * 10000) / int256(oraclePrice);
    }

    // =================================
    // PROFIT UNLOCKING
    // =================================
    
    /**
     * @notice Calculate unlocked shares since last report
     * @dev Prevents PPS manipulation by gradual unlock
     */
    function unlockedShares() public view returns (uint256) {
        if (fullProfitUnlockDate <= block.timestamp || fullProfitUnlockDate == 0) {
            return totalLockedShares;
        }
        
        uint256 timeSinceLastReport = block.timestamp - lastReport;
        uint256 unlockedAmount = (profitUnlockingRate * timeSinceLastReport) / MAX_BPS_EXTENDED;
        
        return unlockedAmount > totalLockedShares ? totalLockedShares : unlockedAmount;
    }
    
    /**
     * @notice Get locked (not yet unlocked) shares
     * @dev These shares are held by the vault and don't affect ERC20 totalSupply()
     */
    function lockedShares() public view returns (uint256) {
        return totalLockedShares - unlockedShares();
    }

    // =================================
    // ERC4626 CORE OVERRIDES (WLFI-denominated, SYNCHRONOUS)
    // =================================
    
    /**
     * @notice Total assets controlled by vault in WLFI units
     * @dev Returns WLFI units, not USD value (ERC-4626 compliant)
     *      USD1 holdings are converted to WLFI-equivalent
     */
    function totalAssets() public view override returns (uint256) {
        // Direct WLFI holdings
        uint256 wlfi = wlfiBalance;
        
        // USD1 converted to WLFI-equivalent
        uint256 usd1InWlfi = wlfiEquivalent(usd1Balance);
        
        // Strategy holdings (WLFI + USD1-equivalent)
        uint256 len = strategyList.length;
        for (uint256 i; i < len; i++) {
            if (activeStrategies[strategyList[i]]) {
                (uint256 sWlfi, uint256 sUsd1) = IStrategy(strategyList[i]).getTotalAmounts();
                wlfi += sWlfi;
                usd1InWlfi += wlfiEquivalent(sUsd1);
            }
        }
        
        return wlfi + usd1InWlfi;
    }
    
    /**
     * @notice Standard ERC4626 deposit (WLFI only)
     * @dev LayerZero OVault compatible - synchronous operation
     */
    function deposit(uint256 assets, address receiver) 
        public 
        override 
        nonReentrant 
        whenNotPaused 
        whenNotShutdown
        onlyWhitelisted
        returns (uint256 shares) 
    {
        if (assets == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        // Standard ERC4626: preview shares first
        shares = previewDeposit(assets);
        
        if (shares == 0) revert InvalidAmount();
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        // Pull WLFI
        WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), assets);
        wlfiBalance += assets;
        
        // Mint shares
        _mint(receiver, shares);
        
        emit Deposit(msg.sender, receiver, assets, shares);
    }
    
    /**
     * @notice Standard ERC4626 mint (WLFI only)
     */
    function mint(uint256 shares, address receiver) 
        public 
        override 
        nonReentrant 
        whenNotPaused 
        whenNotShutdown
        onlyWhitelisted
        returns (uint256 assets)
    {
        if (shares == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        // Standard ERC4626: preview assets first
        assets = previewMint(shares);
        
        if (assets == 0) revert InvalidAmount();
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        // Pull WLFI
        WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), assets);
        wlfiBalance += assets;
        
        // Mint shares
        _mint(receiver, shares);
        
        emit Deposit(msg.sender, receiver, assets, shares);
    }
    
    /**
     * @notice Standard ERC4626 redeem - SYNCHRONOUS (LayerZero OVault compatible)
     * @dev Transfers WLFI immediately in same transaction
     * @return assets WLFI assets transferred immediately
     */
    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        returns (uint256 assets)
    {
        if (shares == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        // Standard ERC4626 approval check
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        // Calculate assets
        assets = previewRedeem(shares);
        if (assets == 0) revert InvalidAmount();
        
        // Burn shares
        _burn(owner, shares);
        
        // Ensure we have enough WLFI (pull from strategies if needed)
        _ensureWlfi(assets);
        
        // Transfer WLFI immediately (SYNCHRONOUS - critical for OVault)
        wlfiBalance -= assets;
        WLFI_TOKEN.safeTransfer(receiver, assets);
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }
    
    /**
     * @notice Standard ERC4626 withdraw - SYNCHRONOUS (LayerZero OVault compatible)
     * @dev Transfers WLFI immediately in same transaction
     * @return shares Shares burned
     */
    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        returns (uint256 shares)
    {
        if (assets == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        // Calculate shares needed (round up)
        shares = previewWithdraw(assets);
        if (shares == 0) revert InvalidAmount();
        
        // Standard ERC4626 approval check
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        // Burn shares
        _burn(owner, shares);
        
        // Ensure we have enough WLFI (pull from strategies if needed)
        _ensureWlfi(assets);
        
        // Transfer WLFI immediately (SYNCHRONOUS - critical for OVault)
        wlfiBalance -= assets;
        WLFI_TOKEN.safeTransfer(receiver, assets);
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }
    
    /**
     * @notice Preview deposit (standard ERC4626)
     */
    function previewDeposit(uint256 assets) public view override returns (uint256 shares) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            // Bootstrap: 1 WLFI = 10,000 vEAGLE shares (5,000 WLFI = 50M shares max)
            shares = assets * 10_000;
        } else {
            shares = (assets * supply) / totalAssets();
        }
    }
    
    /**
     * @notice Preview mint (standard ERC4626)
     */
    function previewMint(uint256 shares) public view override returns (uint256 assets) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            // Bootstrap: 10,000 vEAGLE shares = 1 WLFI (50M shares = 5,000 WLFI)
            assets = shares / 10_000;
        } else {
            // Round up for mint (user pays ceiling)
            assets = (shares * totalAssets() + supply - 1) / supply;
        }
    }
    
    /**
     * @notice Preview redeem (standard ERC4626)
     */
    function previewRedeem(uint256 shares) public view override returns (uint256 assets) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        assets = (shares * totalAssets()) / supply;
    }
    
    /**
     * @notice Preview withdraw (standard ERC4626)
     */
    function previewWithdraw(uint256 assets) public view override returns (uint256 shares) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        // Round up for withdraw (user burns ceiling)
        shares = (assets * supply + totalAssets() - 1) / totalAssets();
    }
    
    /**
     * @notice Max deposit (standard ERC4626)
     */
    function maxDeposit(address receiver) public view override returns (uint256) {
        if (paused || isShutdown) return 0;
        if (whitelistEnabled && !whitelist[receiver]) return 0;
        uint256 currentSupply = totalSupply();
        if (currentSupply >= maxTotalSupply) return 0;
        
        uint256 remainingShares = maxTotalSupply - currentSupply;
        uint256 supply = totalSupply();
        if (supply == 0) return remainingShares;
        
        return (remainingShares * totalAssets()) / supply;
    }
    
    /**
     * @notice Max mint (standard ERC4626)
     */
    function maxMint(address receiver) public view override returns (uint256) {
        if (paused || isShutdown) return 0;
        if (whitelistEnabled && !whitelist[receiver]) return 0;
        uint256 currentSupply = totalSupply();
        if (currentSupply >= maxTotalSupply) return 0;
        return maxTotalSupply - currentSupply;
    }
    
    /**
     * @notice Max withdraw (standard ERC4626)
     */
    function maxWithdraw(address owner) public view override returns (uint256) {
        if (paused) return 0;
        uint256 userShares = balanceOf(owner);
        if (userShares == 0) return 0;
        return previewRedeem(userShares);
    }
    
    /**
     * @notice Max redeem (standard ERC4626)
     */
    function maxRedeem(address owner) public view override returns (uint256) {
        if (paused) return 0;
        return balanceOf(owner);
    }

    // =================================
    // ENSURE WLFI HELPER (For Synchronous Redemptions)
    // =================================
    
    /**
     * @notice Ensure vault has enough WLFI for redemptions
     * @dev Internal function to source WLFI from strategies and swap USD1
     * @param wlfiNeeded Amount of WLFI needed
     */
    function _ensureWlfi(uint256 wlfiNeeded) internal {
        // Check if we already have enough
        if (wlfiBalance >= wlfiNeeded) return;
        
        uint256 deficit = wlfiNeeded - wlfiBalance;
        
        // Step 1: Withdraw WLFI from strategies
        uint256 wlfiFromStrategies = _withdrawWlfiFromStrategies(deficit);
        deficit = deficit > wlfiFromStrategies ? deficit - wlfiFromStrategies : 0;
        
        // Step 2: If still short, swap USD1 → WLFI
        if (deficit > 0 && usd1Balance > 0) {
            // Calculate how much USD1 we need to swap
            uint256 usd1Needed = (deficit * 1e18) / wlfiPerUsd1();
            
            // Cap at available USD1
            if (usd1Needed > usd1Balance) {
                usd1Needed = usd1Balance;
            }
            
            if (usd1Needed > 0) {
                _swapUSD1ForWLFI(usd1Needed);
            }
        }
        
        // Final check
        if (wlfiBalance < wlfiNeeded) {
            revert InsufficientBalance();
        }
    }
    
    /**
     * @notice Swap USD1 for WLFI using Uniswap V3
     * @param usd1Amount Amount of USD1 to swap
     * @return wlfiOut Amount of WLFI received
     */
    function _swapUSD1ForWLFI(uint256 usd1Amount)
        internal
        returns (uint256 wlfiOut)
    {
        if (usd1Amount == 0) return 0;
        if (usd1Amount > usd1Balance) revert InsufficientBalance();
        
        // Calculate minimum WLFI output based on oracle price and slippage
        uint256 expectedWlfi = wlfiEquivalent(usd1Amount);
        uint256 minWlfiOut = (expectedWlfi * (MAX_BPS - swapSlippageBps)) / MAX_BPS;
        
        // Approve router
        USD1_TOKEN.forceApprove(address(UNISWAP_ROUTER), usd1Amount);
        
        // Prepare swap params
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(USD1_TOKEN),
            tokenOut: address(WLFI_TOKEN),
            fee: 3000, // 0.3% pool
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: usd1Amount,
            amountOutMinimum: minWlfiOut,
            sqrtPriceLimitX96: 0
        });
        
        // Execute swap
        wlfiOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        // Update balances
        usd1Balance -= usd1Amount;
        wlfiBalance += wlfiOut;
        
        // Calculate actual slippage
        uint256 actualSlippage = expectedWlfi > wlfiOut 
            ? ((expectedWlfi - wlfiOut) * MAX_BPS) / expectedWlfi 
            : 0;
        
        emit USD1Swapped(usd1Amount, wlfiOut, expectedWlfi, minWlfiOut, actualSlippage);
    }

    // =================================
    // DUAL DEPOSIT (Non-standard helper)
    // =================================
    
    /**
     * @notice Dual-token deposit (WLFI + USD1)
     * @dev Swaps USD1 → WLFI first, then calls standard deposit
     * @param wlfiAmount Amount of WLFI to deposit
     * @param usd1Amount Amount of USD1 to deposit (will be swapped)
     * @param receiver Address to receive shares
     */
    function depositDual(
        uint256 wlfiAmount,
        uint256 usd1Amount,
        address receiver
    ) external nonReentrant whenNotPaused whenNotShutdown onlyWhitelisted returns (uint256 shares) {
        if (wlfiAmount == 0 && usd1Amount == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        uint256 totalWlfiToDeposit = wlfiAmount;
        uint256 usd1SwappedToWlfi = 0;
        
        // Pull WLFI if provided
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), wlfiAmount);
            wlfiBalance += wlfiAmount;
        }
        
        // Pull USD1 and swap to WLFI
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransferFrom(msg.sender, address(this), usd1Amount);
            usd1Balance += usd1Amount;
            
            // Swap USD1 → WLFI
            usd1SwappedToWlfi = _swapUSD1ForWLFI(usd1Amount);
            totalWlfiToDeposit += usd1SwappedToWlfi;
        }
        
        // Calculate shares based on total WLFI
        shares = previewDeposit(totalWlfiToDeposit);
        
        if (shares == 0) revert InvalidAmount();
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        // Mint shares
        _mint(receiver, shares);
        
        emit DualDeposit(
            msg.sender,
            wlfiAmount,
            usd1Amount,
            usd1SwappedToWlfi,
            totalWlfiToDeposit,
            shares
        );
        
        // Also emit standard Deposit event for ERC4626 compliance
        emit Deposit(msg.sender, receiver, totalWlfiToDeposit, shares);
    }

    // =================================
    // REPORT FUNCTION (WLFI-denominated)
    // =================================
    
    /**
     * @notice Report profit/loss and charge fees
     * @dev Now works in WLFI units
     */
    function report() external nonReentrant onlyKeepers returns (uint256 profit, uint256 loss) {
        uint256 currentTotalAssets = totalAssets(); // In WLFI units
        uint256 previousTotalAssets = totalAssetsAtLastReport; // In WLFI units
        
        if (currentTotalAssets > previousTotalAssets) {
            profit = currentTotalAssets - previousTotalAssets;
            
            // Charge performance fee
            uint256 performanceFees = 0;
            if (performanceFee > 0 && profit > 0) {
                performanceFees = (profit * performanceFee) / MAX_BPS;
                
                if (performanceFees > 0 && performanceFeeRecipient != address(0)) {
                    // Mint fee shares
                    uint256 supply = totalSupply();
                    uint256 feeShares = supply > 0 ? (performanceFees * supply) / currentTotalAssets : performanceFees;
                    _mint(performanceFeeRecipient, feeShares);
                }
            }
            
            // Lock remaining profit (mint to vault)
            uint256 profitAfterFees = profit - performanceFees;
            if (profitAfterFees > 0 && profitMaxUnlockTime > 0) {
                uint256 supply = totalSupply();
                uint256 profitShares = supply > 0 ? (profitAfterFees * supply) / currentTotalAssets : profitAfterFees;
                
                // Mint locked shares to vault
                _mint(address(this), profitShares);
                totalLockedShares += profitShares;
                
                fullProfitUnlockDate = uint96(block.timestamp + profitMaxUnlockTime);
                profitUnlockingRate = (profitShares * MAX_BPS_EXTENDED) / profitMaxUnlockTime;
            }
            
            emit Reported(profit, 0, performanceFees, currentTotalAssets);
        } else {
            loss = previousTotalAssets - currentTotalAssets;
            
            // Offset loss with locked shares
            if (loss > 0 && totalLockedShares > 0) {
                uint256 supply = totalSupply();
                uint256 lossShares = supply > 0 ? (loss * supply) / currentTotalAssets : 0;
                uint256 sharesToBurn = lossShares > totalLockedShares ? totalLockedShares : lossShares;
                
                if (sharesToBurn > 0) {
                    _burn(address(this), sharesToBurn);
                    totalLockedShares -= sharesToBurn;
                }
            }
            
            emit Reported(0, loss, 0, currentTotalAssets);
        }
        
        lastReport = uint96(block.timestamp);
        totalAssetsAtLastReport = currentTotalAssets;
    }

    // =================================
    // TEND FUNCTION
    // =================================
    
    /**
     * @notice Perform maintenance without full report
     */
    function tend() external nonReentrant onlyKeepers {
        uint256 idleWlfi = wlfiBalance;
        uint256 idleUsd1 = usd1Balance;
        
        if (idleWlfi > 0 || idleUsd1 > 0) {
            _deployToStrategies(idleWlfi, idleUsd1);
        }
    }
    
    function tendTrigger() external view returns (bool) {
        // Check if idle balance exceeds threshold (in WLFI-equivalent)
        uint256 idleWlfi = wlfiBalance + wlfiEquivalent(usd1Balance);
        return idleWlfi > deploymentThreshold && totalStrategyWeight > 0;
    }

    // =================================
    // STRATEGY MANAGEMENT
    // =================================
    
    function addStrategy(address strategy, uint256 weight) external onlyManagement {
        if (strategy == address(0)) revert ZeroAddress();
        if (activeStrategies[strategy]) revert StrategyAlreadyActive();
        if (strategyList.length >= MAX_STRATEGIES) revert MaxStrategiesReached();
        if (weight == 0 || weight > 10000) revert InvalidWeight();
        if (totalStrategyWeight + weight > 10000) revert InvalidWeight();
        
        require(IStrategy(strategy).isInitialized(), "Strategy not initialized");
        
        activeStrategies[strategy] = true;
        strategyWeights[strategy] = weight;
        strategyList.push(strategy);
        totalStrategyWeight += weight;
        
        emit StrategyAdded(strategy, weight);
    }
    
    function removeStrategy(address strategy) external onlyManagement {
        if (!activeStrategies[strategy]) revert StrategyNotActive();
        
        // Withdraw all funds from strategy
        (uint256 wlfi, uint256 usd1) = IStrategy(strategy).withdraw(type(uint256).max);
        wlfiBalance += wlfi;
        usd1Balance += usd1;
        
        activeStrategies[strategy] = false;
        totalStrategyWeight -= strategyWeights[strategy];
        strategyWeights[strategy] = 0;
        
        // Remove from list
        uint256 length = strategyList.length;
        for (uint256 i = 0; i < length; i++) {
            if (strategyList[i] == strategy) {
                strategyList[i] = strategyList[length - 1];
                strategyList.pop();
                break;
            }
        }
        
        emit StrategyRemoved(strategy);
    }
    
    /**
     * @notice Deploy idle assets to strategies
     */
    function _deployToStrategies(uint256 wlfiAmount, uint256 usd1Amount) internal {
        if (totalStrategyWeight == 0) return;
        
        // Calculate total value to deploy (in WLFI-equivalent)
        uint256 totalValueWlfi = wlfiAmount + wlfiEquivalent(usd1Amount);
        if (totalValueWlfi == 0) return;
        
        uint256 length = strategyList.length;
        for (uint256 i = 0; i < length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy] && strategyWeights[strategy] > 0) {
                // Calculate strategy allocation
                uint256 strategyValueWlfi = (totalValueWlfi * strategyWeights[strategy]) / totalStrategyWeight;
                
                // Proportionally split between WLFI and USD1
                uint256 strategyWlfi = wlfiAmount > 0 ? (wlfiAmount * strategyValueWlfi) / totalValueWlfi : 0;
                uint256 strategyUsd1 = usd1Amount > 0 ? (usd1Amount * strategyValueWlfi) / totalValueWlfi : 0;
                
                // Cap at available balances
                if (strategyWlfi > wlfiBalance) strategyWlfi = wlfiBalance;
                if (strategyUsd1 > usd1Balance) strategyUsd1 = usd1Balance;
                
                if (strategyWlfi > 0 || strategyUsd1 > 0) {
                    // Update balances first
                    if (strategyWlfi > 0) {
                        wlfiBalance -= strategyWlfi;
                    }
                    if (strategyUsd1 > 0) {
                        usd1Balance -= strategyUsd1;
                    }
                    
                    // Approve strategy to pull tokens
                    if (strategyWlfi > 0) {
                        WLFI_TOKEN.forceApprove(strategy, strategyWlfi);
                    }
                    if (strategyUsd1 > 0) {
                        USD1_TOKEN.forceApprove(strategy, strategyUsd1);
                    }
                    
                    // Call strategy deposit
                    IStrategy(strategy).deposit(strategyWlfi, strategyUsd1);
                    
                    emit StrategyDeployed(strategy, strategyWlfi, strategyUsd1);
                }
            }
        }
    }
    
    /**
     * @notice Withdraw WLFI from strategies
     */
    function _withdrawWlfiFromStrategies(uint256 wlfiNeeded)
        internal
        returns (uint256 wlfiTotal)
    {
        uint256 remaining = wlfiNeeded;
        uint256 length = strategyList.length;
        
        for (uint256 i = 0; i < length && remaining > 0; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy]) {
                (uint256 stratWlfi, uint256 stratUsd1) = IStrategy(strategy).getTotalAmounts();
                
                if (stratWlfi > 0 || stratUsd1 > 0) {
                    // Calculate how much to withdraw
                    uint256 stratValueWlfi = stratWlfi + wlfiEquivalent(stratUsd1);
                    uint256 withdrawValueWlfi = (remaining * strategyWeights[strategy]) / totalStrategyWeight;
                    
                    if (withdrawValueWlfi > stratValueWlfi) {
                        withdrawValueWlfi = stratValueWlfi;
                    }
                    
                    if (withdrawValueWlfi > 0) {
                        // Withdraw from strategy
                        (uint256 wlfi, uint256 usd1) = IStrategy(strategy).withdraw(withdrawValueWlfi);
                        
                        wlfiBalance += wlfi;
                        usd1Balance += usd1;
                        
                        wlfiTotal += wlfi;
                        
                        // Update remaining
                        uint256 receivedWlfi = wlfi + wlfiEquivalent(usd1);
                        remaining = receivedWlfi >= remaining ? 0 : remaining - receivedWlfi;
                    }
                }
            }
        }
    }
    
    function syncBalances() external onlyManagement {
        uint256 actualWlfi = WLFI_TOKEN.balanceOf(address(this));
        uint256 actualUsd1 = USD1_TOKEN.balanceOf(address(this));
        
        wlfiBalance = actualWlfi;
        usd1Balance = actualUsd1;
        
        emit BalancesSynced(actualWlfi, actualUsd1);
    }
    
    function forceDeployToStrategies() external onlyManagement nonReentrant {
        require(totalStrategyWeight > 0, "No strategies");
        
        _deployToStrategies(wlfiBalance, usd1Balance);
        lastDeployment = block.timestamp;
    }

    // =================================
    // EMERGENCY CONTROLS
    // =================================
    
    function shutdownStrategy() external onlyEmergencyAuthorized {
        isShutdown = true;
        emit StrategyShutdown();
    }
    
    function emergencyWithdraw(
        uint256 wlfiAmount,
        uint256 usd1Amount,
        address to
    ) external onlyEmergencyAuthorized {
        if (!isShutdown) revert VaultNotShutdown();
        if (to == address(0)) revert ZeroAddress();
        
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransfer(to, wlfiAmount);
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransfer(to, usd1Amount);
        }
        
        wlfiBalance = WLFI_TOKEN.balanceOf(address(this));
        usd1Balance = USD1_TOKEN.balanceOf(address(this));
        
        emit EmergencyWithdraw(to, wlfiAmount, usd1Amount);
    }

    // =================================
    // MANAGEMENT FUNCTIONS
    // =================================
    
    function setKeeper(address _keeper) external onlyManagement {
        if (_keeper == address(0)) revert ZeroAddress();
        keeper = _keeper;
        emit UpdateKeeper(_keeper);
    }
    
    function setEmergencyAdmin(address _emergencyAdmin) external onlyManagement {
        if (_emergencyAdmin == address(0)) revert ZeroAddress();
        emergencyAdmin = _emergencyAdmin;
        emit UpdateEmergencyAdmin(_emergencyAdmin);
    }
    
    /**
     * @notice Enable or disable whitelist for deposits
     * @param _enabled True to enable whitelist, false to allow anyone to deposit
     */
    function setWhitelistEnabled(bool _enabled) external onlyOwner {
        whitelistEnabled = _enabled;
        emit WhitelistEnabled(_enabled);
    }
    
    /**
     * @notice Add or remove address from whitelist
     * @param _account Address to update
     * @param _status True to whitelist, false to remove from whitelist
     */
    function setWhitelist(address _account, bool _status) external onlyOwner {
        if (_account == address(0)) revert ZeroAddress();
        whitelist[_account] = _status;
        emit WhitelistUpdated(_account, _status);
    }
    
    /**
     * @notice Batch update whitelist
     * @param _accounts Array of addresses to update
     * @param _status True to whitelist, false to remove from whitelist
     */
    function setWhitelistBatch(address[] calldata _accounts, bool _status) external onlyOwner {
        for (uint256 i = 0; i < _accounts.length; i++) {
            if (_accounts[i] == address(0)) revert ZeroAddress();
            whitelist[_accounts[i]] = _status;
            emit WhitelistUpdated(_accounts[i], _status);
        }
    }
    
    function setPerformanceFee(uint16 _performanceFee) external onlyManagement {
        if (_performanceFee > MAX_FEE) revert InvalidAmount();
        performanceFee = _performanceFee;
        emit UpdatePerformanceFee(_performanceFee);
    }
    
    function setPerformanceFeeRecipient(address _performanceFeeRecipient) external onlyManagement {
        if (_performanceFeeRecipient == address(0)) revert ZeroAddress();
        performanceFeeRecipient = _performanceFeeRecipient;
        emit UpdatePerformanceFeeRecipient(_performanceFeeRecipient);
    }
    
    function setProfitMaxUnlockTime(uint256 _profitMaxUnlockTime) external onlyManagement {
        if (_profitMaxUnlockTime > SECONDS_PER_YEAR) revert InvalidAmount();
        profitMaxUnlockTime = uint32(_profitMaxUnlockTime);
        emit UpdateProfitMaxUnlockTime(_profitMaxUnlockTime);
    }
    
    function setPendingManagement(address _management) external onlyManagement {
        if (_management == address(0)) revert ZeroAddress();
        pendingManagement = _management;
        emit UpdatePendingManagement(_management);
    }
    
    function acceptManagement() external {
        if (msg.sender != pendingManagement) revert Unauthorized();
        
        management = pendingManagement;
        pendingManagement = address(0);
        
        emit UpdateManagement(management);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPause(_paused);
    }
    
    function setSwapSlippage(uint256 _slippageBps) external onlyManagement {
        if (_slippageBps > 500) revert InvalidAmount(); // Max 5%
        swapSlippageBps = _slippageBps;
        emit SwapSlippageUpdated(_slippageBps);
    }

    // =================================
    // UTILITY FUNCTIONS
    // =================================
    
    /**
     * @notice Inject capital into vault to increase share value without minting new shares
     * @dev Anyone can call this (typically protocol treasury/multisig)
     *      This increases totalAssets without increasing totalSupply
     *      Result: All existing shareholders benefit proportionally
     * @param wlfiAmount Amount of WLFI to inject (use 0 if injecting only USD1)
     * @param usd1Amount Amount of USD1 to inject (use 0 if injecting only WLFI)
     * 
     * Example: If vault has 10,000 WLFI and 50M shares
     *          Injecting 10,000 WLFI doubles share value (2x)
     *          New share value: 20,000 WLFI / 50M shares = 0.0004 WLFI/share
     */
    function injectCapital(uint256 wlfiAmount, uint256 usd1Amount) external {
        if (wlfiAmount == 0 && usd1Amount == 0) revert InvalidAmount();
        
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), wlfiAmount);
            wlfiBalance += wlfiAmount;
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransferFrom(msg.sender, address(this), usd1Amount);
            usd1Balance += usd1Amount;
        }
        
        emit CapitalInjected(msg.sender, wlfiAmount, usd1Amount);
    }
    
    /**
     * @notice Preview the impact of a capital injection on share value
     * @dev View function - safe to call, doesn't change state
     * @param wlfiAmount Amount of WLFI to inject
     * @param usd1Amount Amount of USD1 to inject
     * @return newShareValue The new value per share after injection (in WLFI wei)
     * @return valueIncrease The increase in value per share (in WLFI wei)
     * @return percentageIncrease The percentage increase (in basis points, 10000 = 100%)
     */
    function previewCapitalInjection(uint256 wlfiAmount, uint256 usd1Amount) 
        external 
        view 
        returns (
            uint256 newShareValue, 
            uint256 valueIncrease, 
            uint256 percentageIncrease
        ) 
    {
        uint256 supply = totalSupply();
        if (supply == 0) {
            // No shares yet, injection would just increase initial deposit value
            return (0, 0, 0);
        }
        
        // Current share value (in WLFI wei per share)
        uint256 currentTotalAssets = totalAssets();
        uint256 currentShareValue = (currentTotalAssets * 1e18) / supply;
        
        // New total assets after injection (convert USD1 to WLFI equivalent)
        uint256 usd1InWlfi = wlfiEquivalent(usd1Amount);
        uint256 newTotalAssets = currentTotalAssets + wlfiAmount + usd1InWlfi;
        
        // New share value
        newShareValue = (newTotalAssets * 1e18) / supply;
        
        // Value increase
        valueIncrease = newShareValue - currentShareValue;
        
        // Percentage increase (in basis points)
        if (currentShareValue > 0) {
            percentageIncrease = (valueIncrease * 10000) / currentShareValue;
        }
    }
    
    function setDeploymentParams(uint256 _threshold, uint256 _interval) external onlyOwner {
        deploymentThreshold = _threshold;
        minDeploymentInterval = _interval;
    }
    
    function setTWAPInterval(uint32 _interval) external onlyOwner {
        require(_interval == 0 || (_interval >= 300 && _interval <= 7200), "Invalid interval");
        twapInterval = _interval;
    }
    
    function setMaxPriceAge(uint256 _maxPriceAge) external onlyOwner {
        require(_maxPriceAge >= 3600 && _maxPriceAge <= 172800, "Invalid age");
        maxPriceAge = _maxPriceAge;
    }
    
    function setMaxTotalSupply(uint256 _maxTotalSupply) external onlyOwner {
        require(_maxTotalSupply >= totalSupply(), "Below current supply");
        require(_maxTotalSupply <= 50_000_000e18, "Too high");
        maxTotalSupply = _maxTotalSupply;
    }
    
    function rescueETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }
    
    function rescueToken(address token, uint256 amount, address to) external onlyOwner {
        if (token == address(WLFI_TOKEN) || token == address(USD1_TOKEN)) {
            revert("Use emergency functions for vault tokens");
        }
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // =================================
    // VIEW FUNCTIONS
    // =================================
    
    function getCurrentPrices() external view returns (
        uint256 wlfiPriceUSD,
        uint256 usd1PriceUSD
    ) {
        return (getWLFIPrice(), getUSD1Price());
    }
    
    function getVaultBalances() external view returns (uint256 wlfi, uint256 usd1) {
        return (wlfiBalance, usd1Balance);
    }
    
    function getVaultBalancesWlfi() external view returns (
        uint256 wlfiAmount,
        uint256 usd1InWlfi,
        uint256 totalWlfi
    ) {
        wlfiAmount = wlfiBalance;
        usd1InWlfi = wlfiEquivalent(usd1Balance);
        totalWlfi = wlfiAmount + usd1InWlfi;
    }
    
    function getStrategies() external view returns (
        address[] memory strategies,
        uint256[] memory weights
    ) {
        uint256 length = strategyList.length;
        strategies = new address[](length);
        weights = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            strategies[i] = strategyList[i];
            weights[i] = strategyWeights[strategyList[i]];
        }
    }
    
    function getStrategyAssets() external view returns (
        address[] memory strategies,
        uint256[] memory wlfiAmounts,
        uint256[] memory usd1Amounts
    ) {
        uint256 length = strategyList.length;
        strategies = new address[](length);
        wlfiAmounts = new uint256[](length);
        usd1Amounts = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            strategies[i] = strategyList[i];
            if (activeStrategies[strategyList[i]]) {
                (wlfiAmounts[i], usd1Amounts[i]) = IStrategy(strategyList[i]).getTotalAmounts();
            }
        }
    }
    
    function previewDepositDual(uint256 wlfiAmount, uint256 usd1Amount)
        external
        view
        returns (uint256 shares, uint256 totalWlfi)
    {
        totalWlfi = wlfiAmount + wlfiEquivalent(usd1Amount);
        shares = previewDeposit(totalWlfi);
    }
}

