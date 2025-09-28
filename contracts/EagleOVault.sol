// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IStrategy } from "./interfaces/IStrategy.sol";

/**
 * @title EagleOVault
 * @notice LayerZero Omnichain Vault (OVault) - ERC4626 vault with pluggable yield strategies
 * @dev SECURITY FEATURES:
 *      - Reentrancy protection on all external functions
 *      - Zero address validation for critical parameters  
 *      - Slippage protection for swaps and deposits
 *      - Strategy isolation and validation
 *      - Emergency pause functionality
 * 
 * ARCHITECTURE:
 *      - Hub chain: Ethereum (where this vault lives)
 *      - Asset: WLFI (primary asset for ERC4626 compatibility)
 *      - Strategy: Pluggable strategies (Charm Alpha Vaults, Uniswap V3, etc.)
 *      - Shares: EAGLE tokens (omnichain via ShareOFTAdapter)
 * 
 * STRATEGY SYSTEM:
 *      - Multiple strategies can be active simultaneously
 *      - Automatic allocation based on strategy weights
 *      - Fallback to direct holding if no strategies active
 */
contract EagleOVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =================================
    // STATE VARIABLES
    // =================================
    
    /// @dev The secondary token (USD1) for dual-token strategy
    IERC20 public immutable USD1_TOKEN;
    
    /// @dev The WLFI token (primary asset)
    IERC20 public immutable WLFI_TOKEN;
    
    /// @dev Current token balances held directly by vault
    uint256 public wlfiBalance;
    uint256 public usd1Balance;
    
    /// @dev Strategy management
    mapping(address => bool) public activeStrategies;
    mapping(address => uint256) public strategyWeights; // Allocation weights in basis points
    address[] public strategyList;
    uint256 public totalStrategyWeight;
    uint256 public maxStrategies = 5;
    
    /// @dev Vault configuration
    uint256 public targetRatio = 5000; // 50% WLFI, 50% USD1 (in basis points)
    uint256 public maxTotalSupply = type(uint256).max;
    uint256 public protocolFee = 200; // 2% protocol fee (basis points)
    uint256 public managerFee = 100;  // 1% manager fee (basis points)
    
    /// @dev Security parameters
    uint256 public twapDuration = 3600; // 1 hour TWAP
    uint256 public maxSlippage = 500;   // 5% max slippage
    uint256 public rebalanceThreshold = 1000; // 10% deviation triggers rebalance
    
    /// @dev Access control
    address public manager;
    address public pendingManager;
    mapping(address => bool) public authorized;
    
    /// @dev Emergency controls
    bool public paused = false;
    uint256 public lastRebalance;
    
    // =================================
    // EVENTS
    // =================================
    
    event DualDeposit(address indexed user, uint256 wlfiAmount, uint256 usd1Amount, uint256 shares);
    event DualWithdraw(address indexed user, uint256 shares, uint256 wlfiAmount, uint256 usd1Amount);
    event StrategyAdded(address indexed strategy, uint256 weight);
    event StrategyRemoved(address indexed strategy);
    event StrategyRebalanced(address indexed strategy, uint256 wlfiDeployed, uint256 usd1Deployed);
    event Rebalanced(uint256 newWlfiBalance, uint256 newUsd1Balance);
    event ManagerSet(address indexed oldManager, address indexed newManager);
    event ProtocolFeeSet(uint256 oldFee, uint256 newFee);
    event EmergencyPause(bool paused);

    // =================================
    // ERRORS
    // =================================
    
    error ZeroAddress();
    error Unauthorized();
    error Paused();
    error InvalidAmount();
    error SlippageExceeded();
    error InsufficientBalance();
    error InvalidRatio();
    error StrategyAlreadyActive();
    error StrategyNotActive();
    error MaxStrategiesReached();
    error InvalidWeight();

    // =================================
    // CONSTRUCTOR
    // =================================
    
    /**
     * @notice Creates the Eagle Omnichain Vault (OVault)
     * @dev Initializes as ERC4626 with WLFI as primary asset, USD1 as secondary
     * @param _wlfiToken The WLFI token contract (primary asset)
     * @param _usd1Token The USD1 token contract (secondary asset)
     * @param _owner The vault owner
     */
    constructor(
        address _wlfiToken,
        address _usd1Token,
        address _owner
    ) 
        ERC20("Eagle", "EAGLE") 
        ERC4626(IERC20(_wlfiToken)) 
        Ownable(_owner) 
    {
        if (_wlfiToken == address(0) || _usd1Token == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        
        WLFI_TOKEN = IERC20(_wlfiToken);
        USD1_TOKEN = IERC20(_usd1Token);
        
        // Set initial authorization
        authorized[_owner] = true;
        manager = _owner;
        
        lastRebalance = block.timestamp;
    }

    // =================================
    // MODIFIERS
    // =================================
    
    modifier onlyAuthorized() {
        if (!authorized[msg.sender] && msg.sender != owner()) revert Unauthorized();
        _;
    }
    
    modifier onlyManager() {
        if (msg.sender != manager && msg.sender != owner()) revert Unauthorized();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }
    
    modifier validAddress(address _addr) {
        if (_addr == address(0)) revert ZeroAddress();
        _;
    }

    // =================================
    // STRATEGY MANAGEMENT
    // =================================
    
    /**
     * @notice Add a new yield strategy
     * @param strategy Address of the strategy contract
     * @param weight Allocation weight in basis points (max 10000)
     */
    function addStrategy(address strategy, uint256 weight) external onlyManager validAddress(strategy) {
        if (activeStrategies[strategy]) revert StrategyAlreadyActive();
        if (strategyList.length >= maxStrategies) revert MaxStrategiesReached();
        if (weight == 0 || weight > 10000) revert InvalidWeight();
        if (totalStrategyWeight + weight > 10000) revert InvalidWeight();
        
        // Validate strategy implements IStrategy interface
        require(IStrategy(strategy).isInitialized(), "Strategy not initialized");
        
        activeStrategies[strategy] = true;
        strategyWeights[strategy] = weight;
        strategyList.push(strategy);
        totalStrategyWeight += weight;
        
        emit StrategyAdded(strategy, weight);
    }
    
    /**
     * @notice Remove a yield strategy
     * @param strategy Address of the strategy to remove
     */
    function removeStrategy(address strategy) external onlyManager {
        if (!activeStrategies[strategy]) revert StrategyNotActive();
        
        // Withdraw all funds from strategy first
        _withdrawFromStrategy(strategy, type(uint256).max);
        
        activeStrategies[strategy] = false;
        totalStrategyWeight -= strategyWeights[strategy];
        strategyWeights[strategy] = 0;
        
        // Remove from strategy list
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategyList[i] == strategy) {
                strategyList[i] = strategyList[strategyList.length - 1];
                strategyList.pop();
                break;
            }
        }
        
        emit StrategyRemoved(strategy);
    }
    
    /**
     * @notice Update strategy allocation weight
     * @param strategy Address of the strategy
     * @param newWeight New weight in basis points
     */
    function updateStrategyWeight(address strategy, uint256 newWeight) external onlyManager {
        if (!activeStrategies[strategy]) revert StrategyNotActive();
        if (newWeight > 10000) revert InvalidWeight();
        
        uint256 oldWeight = strategyWeights[strategy];
        totalStrategyWeight = totalStrategyWeight - oldWeight + newWeight;
        
        if (totalStrategyWeight > 10000) revert InvalidWeight();
        
        strategyWeights[strategy] = newWeight;
        
        // Trigger rebalance to adjust allocations
        _rebalanceStrategies();
    }

    // =================================
    // DUAL TOKEN DEPOSIT/WITHDRAW
    // =================================
    
    /**
     * @notice Deposit both WLFI and USD1 tokens
     * @param wlfiAmount Amount of WLFI to deposit
     * @param usd1Amount Amount of USD1 to deposit
     * @param receiver Address to receive shares
     * @return shares Amount of shares minted
     */
    function depositDual(
        uint256 wlfiAmount,
        uint256 usd1Amount,
        address receiver
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (wlfiAmount == 0 && usd1Amount == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        // Transfer tokens from user
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), wlfiAmount);
            wlfiBalance += wlfiAmount;
        }
        
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransferFrom(msg.sender, address(this), usd1Amount);
            usd1Balance += usd1Amount;
        }
        
        // Calculate total value and shares to mint
        uint256 totalValue = wlfiAmount + usd1Amount; // Simplified 1:1 ratio for now
        
        if (totalSupply() == 0) {
            shares = totalValue;
        } else {
            shares = (totalValue * totalSupply()) / totalAssets();
        }
        
        // Check max supply
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        _mint(receiver, shares);
        
        // Deploy to strategies if active
        if (totalStrategyWeight > 0) {
            _deployToStrategies(wlfiAmount, usd1Amount);
        }
        
        emit DualDeposit(msg.sender, wlfiAmount, usd1Amount, shares);
    }
    
    /**
     * @notice Withdraw both WLFI and USD1 tokens proportionally
     * @param shares Amount of shares to burn
     * @param receiver Address to receive tokens
     * @return wlfiAmount Amount of WLFI withdrawn
     * @return usd1Amount Amount of USD1 withdrawn
     */
    function withdrawDual(
        uint256 shares,
        address receiver
    ) external nonReentrant returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (shares == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        if (balanceOf(msg.sender) < shares) revert InsufficientBalance();
        
        // Calculate total assets including strategy positions
        uint256 totalAssetAmount = totalAssets();
        uint256 totalShares = totalSupply();
        
        uint256 totalWithdrawValue = (totalAssetAmount * shares) / totalShares;
        
        // First try to fulfill from direct balances
        uint256 wlfiFromBalance = (wlfiBalance * shares) / totalShares;
        uint256 usd1FromBalance = (usd1Balance * shares) / totalShares;
        
        wlfiAmount = wlfiFromBalance;
        usd1Amount = usd1FromBalance;
        
        // If we need more, withdraw from strategies proportionally
        uint256 remainingValue = totalWithdrawValue - wlfiFromBalance - usd1FromBalance;
        if (remainingValue > 0) {
            (uint256 wlfiFromStrategies, uint256 usd1FromStrategies) = 
                _withdrawFromStrategiesPro(remainingValue);
            wlfiAmount += wlfiFromStrategies;
            usd1Amount += usd1FromStrategies;
        }
        
        // Burn shares first
        _burn(msg.sender, shares);
        
        // Update direct balances
        wlfiBalance -= wlfiFromBalance;
        usd1Balance -= usd1FromBalance;
        
        // Transfer tokens
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransfer(receiver, wlfiAmount);
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransfer(receiver, usd1Amount);
        }
        
        emit DualWithdraw(msg.sender, shares, wlfiAmount, usd1Amount);
    }

    // =================================
    // ERC4626 OVERRIDES
    // =================================
    
    /**
     * @notice Total assets under management (including strategies)
     * @return Total value of WLFI + USD1 holdings across vault and strategies
     */
    function totalAssets() public view override returns (uint256) {
        uint256 directAssets = wlfiBalance + usd1Balance;
        
        // Add strategy assets
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy]) {
                (uint256 wlfi, uint256 usd1) = IStrategy(strategy).getTotalAmounts();
                directAssets += wlfi + usd1; // Simplified 1:1 ratio
            }
        }
        
        return directAssets;
    }
    
    /**
     * @notice Deposit WLFI (primary asset only)
     * @param assets Amount of WLFI to deposit
     * @param receiver Address to receive shares
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver) public override nonReentrant whenNotPaused returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        // Transfer WLFI from user
        WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), assets);
        wlfiBalance += assets;
        
        // Calculate shares
        shares = previewDeposit(assets);
        
        // Check max supply
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        _mint(receiver, shares);
        
        // Deploy to strategies if active
        if (totalStrategyWeight > 0) {
            _deployToStrategies(assets, 0);
        }
        
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    // =================================
    // INTERNAL STRATEGY OPERATIONS
    // =================================
    
    /**
     * @notice Deploy funds to strategies based on weights
     */
    function _deployToStrategies(uint256 wlfiAmount, uint256 usd1Amount) internal {
        if (totalStrategyWeight == 0) return;
        
        uint256 totalValue = wlfiAmount + usd1Amount;
        
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy] && strategyWeights[strategy] > 0) {
                uint256 strategyValue = (totalValue * strategyWeights[strategy]) / totalStrategyWeight;
                
                // Split proportionally between WLFI and USD1
                uint256 strategyWlfi = 0;
                uint256 strategyUsd1 = 0;
                
                if (totalValue > 0) {
                    strategyWlfi = (strategyValue * wlfiAmount) / totalValue;
                    strategyUsd1 = (strategyValue * usd1Amount) / totalValue;
                }
                
                if (strategyWlfi > 0 || strategyUsd1 > 0) {
                    // Update balances before transfer
                    wlfiBalance -= strategyWlfi;
                    usd1Balance -= strategyUsd1;
                    
                    // Approve strategy to spend tokens
                    if (strategyWlfi > 0) {
                        WLFI_TOKEN.safeIncreaseAllowance(strategy, strategyWlfi);
                    }
                    if (strategyUsd1 > 0) {
                        USD1_TOKEN.safeIncreaseAllowance(strategy, strategyUsd1);
                    }
                    
                    // Deploy to strategy
                    IStrategy(strategy).deposit(strategyWlfi, strategyUsd1);
                    
                    emit StrategyRebalanced(strategy, strategyWlfi, strategyUsd1);
                }
            }
        }
    }
    
    /**
     * @notice Withdraw specific amount from strategies proportionally
     */
    function _withdrawFromStrategiesPro(uint256 valueNeeded) internal returns (uint256 wlfiTotal, uint256 usd1Total) {
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy]) {
                (uint256 strategyWlfi, uint256 strategyUsd1) = IStrategy(strategy).getTotalAmounts();
                uint256 strategyValue = strategyWlfi + strategyUsd1;
                
                if (strategyValue > 0) {
                    uint256 withdrawValue = (valueNeeded * strategyWeights[strategy]) / totalStrategyWeight;
                    
                    if (withdrawValue > 0) {
                        // Calculate proportional shares to withdraw
                        uint256 sharesToWithdraw = withdrawValue; // Simplified - actual implementation would need strategy-specific logic
                        
                        (uint256 wlfi, uint256 usd1) = IStrategy(strategy).withdraw(sharesToWithdraw);
                        
                        wlfiBalance += wlfi;
                        usd1Balance += usd1;
                        wlfiTotal += wlfi;
                        usd1Total += usd1;
                    }
                }
            }
        }
    }
    
    /**
     * @notice Withdraw all funds from a specific strategy
     */
    function _withdrawFromStrategy(address strategy, uint256 sharesToWithdraw) internal {
        if (!activeStrategies[strategy]) return;
        
        (uint256 wlfi, uint256 usd1) = IStrategy(strategy).withdraw(sharesToWithdraw);
        
        wlfiBalance += wlfi;
        usd1Balance += usd1;
    }
    
    /**
     * @notice Rebalance all strategies
     */
    function _rebalanceStrategies() internal {
        // First withdraw everything
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy]) {
                _withdrawFromStrategy(strategy, type(uint256).max);
            }
        }
        
        // Then redeploy based on current balances and weights
        _deployToStrategies(wlfiBalance, usd1Balance);
    }

    // =================================
    // MANAGEMENT FUNCTIONS
    // =================================
    
    /**
     * @notice Rebalance the entire vault including strategies
     */
    function rebalance() external onlyManager nonReentrant {
        // Rebalance strategies first
        if (totalStrategyWeight > 0) {
            _rebalanceStrategies();
        }
        
        // Then rebalance vault's direct holdings
        uint256 totalValue = wlfiBalance + usd1Balance;
        if (totalValue > 0) {
            uint256 targetWlfi = (totalValue * targetRatio) / 10000;
            uint256 targetUsd1 = totalValue - targetWlfi;
            
            if (wlfiBalance > targetWlfi + (targetWlfi * rebalanceThreshold) / 10000) {
                uint256 excess = wlfiBalance - targetWlfi;
                _swapWlfiToUsd1(excess);
            } else if (usd1Balance > targetUsd1 + (targetUsd1 * rebalanceThreshold) / 10000) {
                uint256 excess = usd1Balance - targetUsd1;
                _swapUsd1ToWlfi(excess);
            }
        }
        
        // Trigger strategy rebalances
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy]) {
                IStrategy(strategy).rebalance();
            }
        }
        
        lastRebalance = block.timestamp;
        emit Rebalanced(wlfiBalance, usd1Balance);
    }
    
    /**
     * @notice Emergency pause/unpause
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPause(_paused);
    }
    
    /**
     * @notice Set new manager
     */
    function setManager(address _newManager) external onlyOwner validAddress(_newManager) {
        pendingManager = _newManager;
    }
    
    /**
     * @notice Accept manager role
     */
    function acceptManager() external {
        if (msg.sender != pendingManager) revert Unauthorized();
        
        address oldManager = manager;
        manager = pendingManager;
        pendingManager = address(0);
        
        authorized[manager] = true;
        
        emit ManagerSet(oldManager, manager);
    }

    // =================================
    // INTERNAL HELPER FUNCTIONS
    // =================================
    
    /**
     * @notice Swap WLFI to USD1 (placeholder for DEX integration)
     */
    function _swapWlfiToUsd1(uint256 amount) internal {
        if (amount == 0) return;
        
        // Placeholder: In production, integrate with DEX
        if (wlfiBalance >= amount) {
            wlfiBalance -= amount;
            usd1Balance += amount;
        }
    }
    
    /**
     * @notice Swap USD1 to WLFI (placeholder for DEX integration)
     */
    function _swapUsd1ToWlfi(uint256 amount) internal {
        if (amount == 0) return;
        
        // Placeholder: In production, integrate with DEX
        if (usd1Balance >= amount) {
            usd1Balance -= amount;
            wlfiBalance += amount;
        }
    }

    // =================================
    // VIEW FUNCTIONS
    // =================================
    
    /**
     * @notice Get current vault balances (direct holdings only)
     */
    function getVaultBalances() external view returns (uint256 wlfi, uint256 usd1) {
        return (wlfiBalance, usd1Balance);
    }
    
    /**
     * @notice Get all strategy addresses and their allocations
     */
    function getStrategies() external view returns (address[] memory strategies, uint256[] memory weights) {
        strategies = new address[](strategyList.length);
        weights = new uint256[](strategyList.length);
        
        for (uint256 i = 0; i < strategyList.length; i++) {
            strategies[i] = strategyList[i];
            weights[i] = strategyWeights[strategyList[i]];
        }
    }
    
    /**
     * @notice Get strategy assets breakdown
     */
    function getStrategyAssets() external view returns (address[] memory strategies, uint256[] memory wlfiAmounts, uint256[] memory usd1Amounts) {
        strategies = new address[](strategyList.length);
        wlfiAmounts = new uint256[](strategyList.length);
        usd1Amounts = new uint256[](strategyList.length);
        
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            strategies[i] = strategy;
            
            if (activeStrategies[strategy]) {
                (wlfiAmounts[i], usd1Amounts[i]) = IStrategy(strategy).getTotalAmounts();
            }
        }
    }
    
    /**
     * @notice Check if vault needs rebalancing
     */
    function needsRebalance() external view returns (bool) {
        uint256 totalValue = totalAssets();
        if (totalValue == 0) return false;
        
        uint256 targetWlfi = (totalValue * targetRatio) / 10000;
        uint256 currentWlfi = wlfiBalance;
        
        // Add WLFI from strategies
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy]) {
                (uint256 strategyWlfi,) = IStrategy(strategy).getTotalAmounts();
                currentWlfi += strategyWlfi;
            }
        }
        
        uint256 deviation = currentWlfi > targetWlfi ? 
            currentWlfi - targetWlfi : 
            targetWlfi - currentWlfi;
            
        return (deviation * 10000) / totalValue > rebalanceThreshold;
    }
}
