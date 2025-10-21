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
 * @title EagleOVaultV2
 * @notice Yearn-inspired dual-token vault with profit unlocking and loss protection
 * 
 * @dev Key improvements from Yearn TokenizedStrategy:
 *      - maxLoss parameter on withdrawals (prevents surprise losses)
 *      - Profit unlocking over time (prevents PPS manipulation)
 *      - Keeper role for automated operations
 *      - Tend function for maintenance between reports
 *      - Proper report() for profit/loss accounting
 *      - Emergency withdraw only post-shutdown
 */
contract EagleOVaultV2 is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =================================
    // CONSTANTS (Yearn-inspired)
    // =================================
    
    /// @notice Maximum performance fee in basis points (50%)
    uint16 public constant MAX_FEE = 5_000;
    
    /// @notice Basis points denominator
    uint256 internal constant MAX_BPS = 10_000;
    
    /// @notice Extended basis points for profit unlocking rate
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
    // YEARN-INSPIRED ADDITIONS
    // =================================
    
    /// @notice Access control roles (Yearn pattern)
    address public management;
    address public pendingManagement;
    address public keeper; // Can call report() and tend()
    address public emergencyAdmin; // Can shutdown
    
    /// @notice Performance fees (Yearn pattern)
    uint16 public performanceFee; // In basis points (e.g., 1000 = 10%)
    address public performanceFeeRecipient;
    
    /// @notice Profit unlocking (Yearn pattern - prevents PPS manipulation)
    uint256 public profitUnlockingRate; // Shares to unlock per second
    uint96 public fullProfitUnlockDate; // When all profits unlocked
    uint32 public profitMaxUnlockTime; // Max time to unlock (default 7 days)
    uint256 public totalLockedShares; // Shares locked from last report
    
    /// @notice Reporting
    uint96 public lastReport;
    uint256 public totalAssetsAtLastReport;
    
    /// @notice Shutdown flag
    bool public isShutdown;
    
    // =================================
    // LEGACY STATE (keep for compatibility)
    // =================================
    
    uint256 public maxTotalSupply = 50_000_000e18;
    uint32 public twapInterval = 1800;
    uint256 public maxPriceAge = 86400;
    uint256 public deploymentThreshold = 100e18;
    uint256 public minDeploymentInterval = 5 minutes;
    uint256 public lastDeployment;
    bool public paused;
    mapping(address => bool) public authorized;
    uint256 public lastRebalance;

    // =================================
    // EVENTS
    // =================================
    
    event DualDeposit(
        address indexed user,
        uint256 wlfiAmount,
        uint256 usd1Amount,
        uint256 wlfiPriceUSD,
        uint256 usd1PriceUSD,
        uint256 totalUSDValue,
        uint256 shares
    );
    
    event DualWithdraw(
        address indexed user,
        uint256 shares,
        uint256 wlfiAmount,
        uint256 usd1Amount,
        uint256 loss
    );
    
    // Yearn-inspired events
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
    
    // Legacy events
    event BalancesSynced(uint256 wlfiBalance, uint256 usd1Balance);
    event StrategyAdded(address indexed strategy, uint256 weight);
    event StrategyRemoved(address indexed strategy);
    event StrategyDeployed(address indexed strategy, uint256 wlfiDeployed, uint256 usd1Deployed);
    event Rebalanced(uint256 newWlfiBalance, uint256 newUsd1Balance);
    event EmergencyPause(bool paused);
    event CapitalInjected(address indexed from, uint256 wlfiAmount, uint256 usd1Amount);
    event EmergencyWithdraw(address indexed to, uint256 wlfiAmount, uint256 usd1Amount);

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
    error LossExceeded(); // New: For maxLoss checks
    error VaultIsShutdown(); // New: For shutdown checks
    error VaultNotShutdown(); // New: emergencyWithdraw only post-shutdown

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
        ERC20("Eagle Vault Shares V2", "vEAGLE") 
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
        
        // Initialize Yearn-style roles
        management = _owner;
        keeper = _owner; // Default to owner
        emergencyAdmin = _owner;
        performanceFeeRecipient = _owner;
        performanceFee = 1000; // 10% default
        profitMaxUnlockTime = 7 days; // Unlock profits over 7 days
        
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

    // =================================
    // PRICE ORACLE FUNCTIONS (unchanged)
    // =================================
    
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
        
        if (price < 0.95e18 || price > 1.05e18) revert InvalidPrice();
    }
    
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
        
        price = (wlfiInUsd1 * usd1InUSD) / 1e18;
    }
    
    function _getTWAPPrice() external view returns (uint256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapInterval;
        secondsAgos[1] = 0;
        
        (int56[] memory tickCumulatives,) = WLFI_USD1_POOL.observe(secondsAgos);
        
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(twapInterval)));
        
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
        
        price = rawPrice > 0 ? (1e18 * 1e18) / rawPrice : 1e15;
        
        if (price == 0) price = 1e15;
    }

    function calculateUSDValue(uint256 wlfiAmount, uint256 usd1Amount) 
        public 
        view 
        returns (uint256 usdValue) 
    {
        uint256 wlfiPriceUSD = getWLFIPrice();
        uint256 usd1PriceUSD = getUSD1Price();
        
        uint256 wlfiValueUSD = (wlfiAmount * wlfiPriceUSD) / 1e18;
        uint256 usd1ValueUSD = (usd1Amount * usd1PriceUSD) / 1e18;
        
        return wlfiValueUSD + usd1ValueUSD;
    }

    // =================================
    // YEARN-INSPIRED: UNLOCKED SHARES
    // =================================
    
    /**
     * @notice Calculate how many shares have unlocked since last report
     * @dev Following Yearn's profit unlocking pattern
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
     * @notice Get total supply accounting for locked shares
     * @dev Locked shares reduce circulating supply (increases PPS)
     */
    function totalSupply() public view override returns (uint256) {
        return super.totalSupply() - (totalLockedShares - unlockedShares());
    }

    // =================================
    // DEPOSIT FUNCTIONS (enhanced)
    // =================================
    
    function depositDual(
        uint256 wlfiAmount,
        uint256 usd1Amount,
        address receiver
    ) external nonReentrant whenNotPaused whenNotShutdown returns (uint256 shares) {
        if (wlfiAmount == 0 && usd1Amount == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        uint256 wlfiPriceUSD = getWLFIPrice();
        uint256 usd1PriceUSD = getUSD1Price();
        
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), wlfiAmount);
            wlfiBalance += wlfiAmount;
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransferFrom(msg.sender, address(this), usd1Amount);
            usd1Balance += usd1Amount;
        }
        
        uint256 totalUSDValue = calculateUSDValue(wlfiAmount, usd1Amount);
        
        if (totalSupply() == 0) {
            shares = totalUSDValue * 80000;
        } else {
            shares = (totalUSDValue * totalSupply()) / totalAssets();
        }
        
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        _mint(receiver, shares);
        
        emit DualDeposit(
            msg.sender,
            wlfiAmount,
            usd1Amount,
            wlfiPriceUSD,
            usd1PriceUSD,
            totalUSDValue,
            shares
        );
    }
    
    function deposit(uint256 assets, address receiver) 
        public 
        override 
        nonReentrant 
        whenNotPaused 
        whenNotShutdown
        returns (uint256 shares) 
    {
        if (assets == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), assets);
        wlfiBalance += assets;
        
        uint256 usdValue = calculateUSDValue(assets, 0);
        shares = totalSupply() == 0 ? 
                 usdValue * 80000 : 
                 (usdValue * totalSupply()) / totalAssets();
        
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        _mint(receiver, shares);
        
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    // =================================
    // WITHDRAWAL FUNCTIONS (Yearn-inspired maxLoss)
    // =================================
    
    /**
     * @notice Withdraw with loss protection (Yearn pattern)
     * @param shares Amount of shares to burn
     * @param receiver Address to receive tokens
     * @param maxLoss Maximum acceptable loss in basis points (e.g., 100 = 1%)
     */
    function withdrawDual(
        uint256 shares,
        address receiver,
        uint256 maxLoss
    ) external nonReentrant returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (shares == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        if (balanceOf(msg.sender) < shares) revert InsufficientBalance();
        if (maxLoss > MAX_BPS) revert InvalidAmount();
        
        uint256 totalAssetAmount = totalAssets();
        uint256 totalShares = totalSupply();
        
        // Expected value based on share proportion
        uint256 expectedValue = (totalAssetAmount * shares) / totalShares;
        
        // Try vault balance first
        uint256 wlfiFromVault = (wlfiBalance * shares) / totalShares;
        uint256 usd1FromVault = (usd1Balance * shares) / totalShares;
        
        wlfiAmount = wlfiFromVault;
        usd1Amount = usd1FromVault;
        
        // Withdraw from strategies if needed
        uint256 directValue = calculateUSDValue(wlfiFromVault, usd1FromVault);
        if (directValue < expectedValue) {
            uint256 needFromStrategy = expectedValue - directValue;
            (uint256 wlfiFromStrategies, uint256 usd1FromStrategies) = 
                _withdrawFromStrategies(needFromStrategy);
            wlfiAmount += wlfiFromStrategies;
            usd1Amount += usd1FromStrategies;
        }
        
        // Calculate actual value received
        uint256 actualValue = calculateUSDValue(wlfiAmount, usd1Amount);
        
        // Check loss tolerance (Yearn pattern)
        uint256 loss = 0;
        if (actualValue < expectedValue) {
            loss = expectedValue - actualValue;
            uint256 lossInBps = (loss * MAX_BPS) / expectedValue;
            
            if (lossInBps > maxLoss) {
                revert LossExceeded();
            }
        }
        
        // Burn shares
        _burn(msg.sender, shares);
        
        // Update balances
        wlfiBalance -= wlfiFromVault;
        usd1Balance -= usd1FromVault;
        
        // Transfer tokens
        if (wlfiAmount > 0) WLFI_TOKEN.safeTransfer(receiver, wlfiAmount);
        if (usd1Amount > 0) USD1_TOKEN.safeTransfer(receiver, usd1Amount);
        
        emit DualWithdraw(msg.sender, shares, wlfiAmount, usd1Amount, loss);
    }
    
    /**
     * @notice Redeem with max loss parameter (Yearn pattern)
     */
    function redeemDual(
        uint256 shares,
        address receiver,
        uint256 maxLoss
    ) external nonReentrant returns (uint256 wlfiAmount, uint256 usd1Amount) {
        return this.withdrawDual(shares, receiver, maxLoss);
    }
    
    /**
     * @notice Legacy withdrawDual (defaults to 100% loss tolerance)
     */
    function withdrawDual(
        uint256 shares,
        address receiver
    ) external nonReentrant returns (uint256 wlfiAmount, uint256 usd1Amount) {
        return this.withdrawDual(shares, receiver, MAX_BPS);
    }

    // =================================
    // YEARN-INSPIRED: REPORT FUNCTION
    // =================================
    
    /**
     * @notice Report profit/loss and charge fees (Yearn pattern)
     * @dev Called by keeper to harvest rewards and update accounting
     * @return profit The amount of profit since last report
     * @return loss The amount of loss since last report
     */
    function report() external nonReentrant onlyKeepers returns (uint256 profit, uint256 loss) {
        uint256 currentTotalAssets = totalAssets();
        uint256 previousTotalAssets = totalAssetsAtLastReport;
        
        // Calculate profit or loss
        if (currentTotalAssets > previousTotalAssets) {
            profit = currentTotalAssets - previousTotalAssets;
            
            // Charge performance fee on profit
            uint256 performanceFees = 0;
            if (performanceFee > 0 && profit > 0) {
                performanceFees = (profit * performanceFee) / MAX_BPS;
                
                // Mint fee shares to recipient
                if (performanceFees > 0 && performanceFeeRecipient != address(0)) {
                    uint256 feeShares = (performanceFees * totalSupply()) / currentTotalAssets;
                    _mint(performanceFeeRecipient, feeShares);
                }
            }
            
            // Lock remaining profit (Yearn pattern)
            uint256 profitAfterFees = profit - performanceFees;
            if (profitAfterFees > 0 && profitMaxUnlockTime > 0) {
                uint256 profitShares = (profitAfterFees * totalSupply()) / currentTotalAssets;
                
                // Mint locked shares to vault
                _mint(address(this), profitShares);
                totalLockedShares += profitShares;
                
                // Calculate unlock rate
                fullProfitUnlockDate = uint96(block.timestamp + profitMaxUnlockTime);
                profitUnlockingRate = (profitShares * MAX_BPS_EXTENDED) / profitMaxUnlockTime;
            }
            
            emit Reported(profit, 0, performanceFees, currentTotalAssets);
        } else {
            loss = previousTotalAssets - currentTotalAssets;
            
            // Offset loss with locked shares (Yearn pattern)
            if (loss > 0 && totalLockedShares > 0) {
                uint256 lossShares = (loss * totalSupply()) / currentTotalAssets;
                uint256 sharesToBurn = lossShares > totalLockedShares ? totalLockedShares : lossShares;
                
                _burn(address(this), sharesToBurn);
                totalLockedShares -= sharesToBurn;
            }
            
            emit Reported(0, loss, 0, currentTotalAssets);
        }
        
        // Update state
        lastReport = uint96(block.timestamp);
        totalAssetsAtLastReport = currentTotalAssets;
    }

    // =================================
    // YEARN-INSPIRED: TEND FUNCTION
    // =================================
    
    /**
     * @notice Perform maintenance without full report (Yearn pattern)
     * @dev Useful for compounding rewards or rebalancing
     */
    function tend() external nonReentrant onlyKeepers {
        // Rebalance strategies or compound rewards
        // This doesn't affect PPS, just optimizes deployment
        
        uint256 idleWlfi = wlfiBalance;
        uint256 idleUsd1 = usd1Balance;
        
        if (idleWlfi > 0 || idleUsd1 > 0) {
            _deployToStrategies(idleWlfi, idleUsd1);
        }
    }
    
    /**
     * @notice Check if tend should be called
     */
    function tendTrigger() external view returns (bool) {
        uint256 idleValue = calculateUSDValue(wlfiBalance, usd1Balance);
        return idleValue > deploymentThreshold && totalStrategyWeight > 0;
    }

    // =================================
    // STRATEGY MANAGEMENT (unchanged)
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
        
        (uint256 wlfi, uint256 usd1) = IStrategy(strategy).withdraw(type(uint256).max);
        wlfiBalance += wlfi;
        usd1Balance += usd1;
        
        activeStrategies[strategy] = false;
        totalStrategyWeight -= strategyWeights[strategy];
        strategyWeights[strategy] = 0;
        
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
    
    function _deployToStrategies(uint256 wlfiAmount, uint256 usd1Amount) internal {
        if (totalStrategyWeight == 0) return;
        
        uint256 totalValue = calculateUSDValue(wlfiAmount, usd1Amount);
        if (totalValue == 0) return;
        
        uint256 length = strategyList.length;
        for (uint256 i = 0; i < length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy] && strategyWeights[strategy] > 0) {
                uint256 strategyValue = (totalValue * strategyWeights[strategy]) / totalStrategyWeight;
                
                uint256 strategyWlfi = wlfiAmount > 0 ? (strategyValue * wlfiAmount) / totalValue : 0;
                uint256 strategyUsd1 = usd1Amount > 0 ? (strategyValue * usd1Amount) / totalValue : 0;
                
                if (strategyWlfi > wlfiBalance) strategyWlfi = wlfiBalance;
                if (strategyUsd1 > usd1Balance) strategyUsd1 = usd1Balance;
                
                if (strategyWlfi > 0 || strategyUsd1 > 0) {
                    if (strategyWlfi > 0) {
                        WLFI_TOKEN.safeTransfer(strategy, strategyWlfi);
                    }
                    if (strategyUsd1 > 0) {
                        USD1_TOKEN.safeTransfer(strategy, strategyUsd1);
                    }
                    
                    wlfiBalance -= strategyWlfi;
                    usd1Balance -= strategyUsd1;
                    
                    IStrategy(strategy).deposit(strategyWlfi, strategyUsd1);
                    
                    emit StrategyDeployed(strategy, strategyWlfi, strategyUsd1);
                }
            }
        }
    }
    
    function _withdrawFromStrategies(uint256 valueNeeded) 
        internal 
        returns (uint256 wlfiTotal, uint256 usd1Total) 
    {
        uint256 length = strategyList.length;
        for (uint256 i = 0; i < length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy] && valueNeeded > 0) {
                (uint256 stratWlfi, uint256 stratUsd1) = IStrategy(strategy).getTotalAmounts();
                uint256 stratValue = calculateUSDValue(stratWlfi, stratUsd1);
                
                if (stratValue > 0) {
                    uint256 withdrawValue = (valueNeeded * strategyWeights[strategy]) / totalStrategyWeight;
                    
                    if (withdrawValue > 0) {
                        (uint256 wlfi, uint256 usd1) = IStrategy(strategy).withdraw(withdrawValue);
                        
                        wlfiBalance += wlfi;
                        usd1Balance += usd1;
                        wlfiTotal += wlfi;
                        usd1Total += usd1;
                        
                        uint256 received = calculateUSDValue(wlfi, usd1);
                        valueNeeded = received >= valueNeeded ? 0 : valueNeeded - received;
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
        if (totalStrategyWeight == 0) revert("No strategies");
        
        _deployToStrategies(wlfiBalance, usd1Balance);
        lastDeployment = block.timestamp;
    }

    // =================================
    // ERC4626 OVERRIDES
    // =================================
    
    function totalAssets() public view override returns (uint256) {
        uint256 directValue = calculateUSDValue(wlfiBalance, usd1Balance);
        
        uint256 length = strategyList.length;
        for (uint256 i = 0; i < length; i++) {
            if (activeStrategies[strategyList[i]]) {
                (uint256 wlfi, uint256 usd1) = IStrategy(strategyList[i]).getTotalAmounts();
                directValue += calculateUSDValue(wlfi, usd1);
            }
        }
        
        return directValue;
    }

    // =================================
    // YEARN-INSPIRED: SHUTDOWN & EMERGENCY
    // =================================
    
    /**
     * @notice Shutdown the vault (one-way, irreversible)
     * @dev Following Yearn pattern - can only be called by emergencyAdmin
     */
    function shutdownStrategy() external onlyEmergencyAuthorized {
        isShutdown = true;
        emit StrategyShutdown();
    }
    
    /**
     * @notice Emergency withdraw (Yearn pattern - only post-shutdown)
     * @param wlfiAmount Amount of WLFI to withdraw
     * @param usd1Amount Amount of USD1 to withdraw
     * @param to Recipient address
     * @dev Can only be called after shutdown
     */
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
        
        // Sync balances after emergency withdraw
        wlfiBalance = WLFI_TOKEN.balanceOf(address(this));
        usd1Balance = USD1_TOKEN.balanceOf(address(this));
        
        emit EmergencyWithdraw(to, wlfiAmount, usd1Amount);
    }

    // =================================
    // MANAGEMENT FUNCTIONS (Yearn-inspired)
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

    // =================================
    // LEGACY FUNCTIONS (for compatibility)
    // =================================
    
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
        require(_maxTotalSupply <= 1_000_000_000e18, "Too high");
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
            revert("Use withdrawDual for vault tokens");
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
    
    function getVaultBalancesUSD() external view returns (
        uint256 wlfiValueUSD,
        uint256 usd1ValueUSD,
        uint256 totalValueUSD
    ) {
        wlfiValueUSD = (wlfiBalance * getWLFIPrice()) / 1e18;
        usd1ValueUSD = (usd1Balance * getUSD1Price()) / 1e18;
        totalValueUSD = wlfiValueUSD + usd1ValueUSD;
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
        returns (uint256 shares, uint256 usdValue)
    {
        usdValue = calculateUSDValue(wlfiAmount, usd1Amount);
        shares = totalSupply() == 0 ? 
                 usdValue * 80000 : 
                 (usdValue * totalSupply()) / totalAssets();
    }
    
    /**
     * @notice Get max amount that can be withdrawn with given loss tolerance
     * @param owner Owner of shares
     * @param maxLoss Max acceptable loss in basis points
     */
    function maxWithdraw(address owner, uint256 maxLoss) external view returns (uint256) {
        uint256 userShares = balanceOf(owner);
        if (userShares == 0) return 0;
        
        uint256 expectedValue = (totalAssets() * userShares) / totalSupply();
        uint256 availableValue = calculateUSDValue(wlfiBalance, usd1Balance);
        
        // Add strategy liquidity (simplified)
        uint256 length = strategyList.length;
        for (uint256 i = 0; i < length; i++) {
            if (activeStrategies[strategyList[i]]) {
                (uint256 wlfi, uint256 usd1) = IStrategy(strategyList[i]).getTotalAmounts();
                availableValue += calculateUSDValue(wlfi, usd1);
            }
        }
        
        // Calculate max shares withdrawable
        if (availableValue >= expectedValue) {
            return userShares;
        }
        
        // Account for maxLoss
        uint256 maxAcceptableLoss = (expectedValue * maxLoss) / MAX_BPS;
        uint256 minAcceptableValue = expectedValue - maxAcceptableLoss;
        
        if (availableValue < minAcceptableValue) {
            // Not enough liquidity even with loss tolerance
            return (availableValue * userShares) / expectedValue;
        }
        
        return userShares;
    }
}

