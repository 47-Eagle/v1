// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CharmAlphaVaultStrategy
 * @notice Strategy wrapper for integrating Charm Finance Alpha Vaults with EagleOVault
 * @dev This contract acts as an adapter between EagleOVault and Charm's AlphaProVault
 * 
 * FEATURES:
 * - Manages Uniswap V3 LP positions through Charm Alpha Vaults (1% fee tier)
 * - Provides standardized interface for EagleOVault integration
 * - Handles token swaps and rebalancing through Charm's optimized strategies
 * - Maintains compatibility with omnichain LayerZero architecture
 */

// Charm Finance Alpha Vault interfaces (simplified)
interface IAlphaProVault {
    function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient
    ) external returns (uint256 shares, uint256 amount0Used, uint256 amount1Used);
    
    function withdraw(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient
    ) external returns (uint256 amount0, uint256 amount1);
    
    function getTotalAmounts() external view returns (uint256 total0, uint256 total1);
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IAlphaProVaultFactory {
    function createVault(
        address token0,
        address token1,
        uint24 fee,
        uint256 maxTotalSupply
    ) external returns (address vault);
    
    function getVault(
        address token0,
        address token1,
        uint24 fee
    ) external view returns (address);
}

contract CharmAlphaVaultStrategy is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================
    // STATE VARIABLES
    // =================================
    
    /// @dev Reference to the EagleOVault that owns this strategy
    address public immutable EAGLE_VAULT;
    
    /// @dev The Charm Alpha Vault we're interfacing with
    IAlphaProVault public alphaVault;
    
    /// @dev Charm Factory for creating vaults
    IAlphaProVaultFactory public immutable ALPHA_FACTORY;
    
    /// @dev Strategy tokens
    IERC20 public immutable WLFI_TOKEN;
    IERC20 public immutable USD1_TOKEN;
    
    /// @dev Strategy parameters
    uint24 public poolFee = 3000; // 0.3% fee tier
    uint256 public maxSlippage = 500; // 5% max slippage
    uint256 public rebalanceThreshold = 1000; // 10% deviation triggers rebalance
    
    /// @dev Strategy status
    bool public active = false;
    uint256 public lastRebalance;
    
    // =================================
    // EVENTS
    // =================================
    
    event VaultCreated(address indexed alphaVault, address token0, address token1, uint24 fee);
    event StrategyDeposit(uint256 wlfiAmount, uint256 usd1Amount, uint256 shares);
    event StrategyWithdraw(uint256 shares, uint256 wlfiAmount, uint256 usd1Amount);
    event StrategyRebalanced(uint256 newTotal0, uint256 newTotal1);
    
    // =================================
    // ERRORS
    // =================================
    
    error OnlyVault();
    error ZeroAddress();
    error VaultNotActive();
    error SlippageExceeded();
    error InsufficientBalance();

    // =================================
    // MODIFIERS
    // =================================
    
    modifier onlyVault() {
        if (msg.sender != EAGLE_VAULT) revert OnlyVault();
        _;
    }
    
    modifier whenActive() {
        if (!active) revert VaultNotActive();
        _;
    }

    // =================================
    // CONSTRUCTOR
    // =================================
    
    /**
     * @notice Creates a new Charm Alpha Vault Strategy
     * @param _eagleVault The EagleOVault that will use this strategy
     * @param _alphaFactory The Charm Alpha Vault Factory
     * @param _wlfiToken WLFI token address
     * @param _usd1Token USD1 token address
     * @param _owner Strategy owner (should be same as vault owner)
     */
    constructor(
        address _eagleVault,
        address _alphaFactory,
        address _wlfiToken,
        address _usd1Token,
        address _owner
    ) Ownable(_owner) {
        if (_eagleVault == address(0) || _alphaFactory == address(0) || 
            _wlfiToken == address(0) || _usd1Token == address(0)) {
            revert ZeroAddress();
        }
        
        EAGLE_VAULT = _eagleVault;
        ALPHA_FACTORY = IAlphaProVaultFactory(_alphaFactory);
        WLFI_TOKEN = IERC20(_wlfiToken);
        USD1_TOKEN = IERC20(_usd1Token);
        
        lastRebalance = block.timestamp;
    }

    // =================================
    // VAULT MANAGEMENT
    // =================================
    
    /**
     * @notice Initialize the Charm Alpha Vault
     * @param maxTotalSupply Maximum total supply for the Alpha Vault
     */
    function initializeVault(uint256 maxTotalSupply) external onlyOwner {
        require(address(alphaVault) == address(0), "Vault already initialized");
        
        // Get or create the Alpha Vault for WLFI/USD1 pair
        address existingVault = ALPHA_FACTORY.getVault(
            address(WLFI_TOKEN),
            address(USD1_TOKEN),
            poolFee
        );
        
        if (existingVault != address(0)) {
            alphaVault = IAlphaProVault(existingVault);
        } else {
            // Create new vault if it doesn't exist
            address newVault = ALPHA_FACTORY.createVault(
                address(WLFI_TOKEN),
                address(USD1_TOKEN),
                poolFee,
                maxTotalSupply
            );
            alphaVault = IAlphaProVault(newVault);
            
            emit VaultCreated(newVault, address(WLFI_TOKEN), address(USD1_TOKEN), poolFee);
        }
        
        // Activate strategy
        active = true;
    }

    // =================================
    // STRATEGY OPERATIONS
    // =================================
    
    /**
     * @notice Deposit tokens into Charm Alpha Vault
     * @param wlfiAmount Amount of WLFI to deposit
     * @param usd1Amount Amount of USD1 to deposit
     * @return shares Amount of Alpha Vault shares received
     */
    function deposit(
        uint256 wlfiAmount,
        uint256 usd1Amount
    ) external onlyVault whenActive nonReentrant returns (uint256 shares) {
        if (wlfiAmount == 0 && usd1Amount == 0) return 0;
        
        // Transfer tokens from EagleOVault
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransferFrom(EAGLE_VAULT, address(this), wlfiAmount);
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransferFrom(EAGLE_VAULT, address(this), usd1Amount);
        }
        
        // Approve Alpha Vault to spend tokens
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeIncreaseAllowance(address(alphaVault), wlfiAmount);
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeIncreaseAllowance(address(alphaVault), usd1Amount);
        }
        
        // Calculate minimum amounts with slippage protection
        uint256 amount0Min = (wlfiAmount * (10000 - maxSlippage)) / 10000;
        uint256 amount1Min = (usd1Amount * (10000 - maxSlippage)) / 10000;
        
        // Deposit into Alpha Vault
        (shares, , ) = alphaVault.deposit(
            wlfiAmount,
            usd1Amount,
            amount0Min,
            amount1Min,
            address(this)
        );
        
        emit StrategyDeposit(wlfiAmount, usd1Amount, shares);
    }
    
    /**
     * @notice Withdraw tokens from Charm Alpha Vault
     * @param shares Amount of Alpha Vault shares to withdraw
     * @return wlfiAmount Amount of WLFI received
     * @return usd1Amount Amount of USD1 received
     */
    function withdraw(
        uint256 shares
    ) external onlyVault whenActive nonReentrant returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (shares == 0) return (0, 0);
        
        require(alphaVault.balanceOf(address(this)) >= shares, "Insufficient shares");
        
        // Calculate minimum amounts with slippage protection
        (uint256 total0, uint256 total1) = alphaVault.getTotalAmounts();
        uint256 totalShares = alphaVault.totalSupply();
        
        uint256 expectedAmount0 = (total0 * shares) / totalShares;
        uint256 expectedAmount1 = (total1 * shares) / totalShares;
        
        uint256 amount0Min = (expectedAmount0 * (10000 - maxSlippage)) / 10000;
        uint256 amount1Min = (expectedAmount1 * (10000 - maxSlippage)) / 10000;
        
        // Withdraw from Alpha Vault
        (wlfiAmount, usd1Amount) = alphaVault.withdraw(
            shares,
            amount0Min,
            amount1Min,
            EAGLE_VAULT // Send directly back to EagleOVault
        );
        
        emit StrategyWithdraw(shares, wlfiAmount, usd1Amount);
    }
    
    /**
     * @notice Rebalance the Alpha Vault position
     */
    function rebalance() external onlyVault whenActive nonReentrant {
        // Charm Alpha Vaults handle rebalancing internally
        // This function can be used to trigger manual rebalancing if needed
        
        (uint256 total0, uint256 total1) = alphaVault.getTotalAmounts();
        lastRebalance = block.timestamp;
        
        emit StrategyRebalanced(total0, total1);
    }

    // =================================
    // VIEW FUNCTIONS
    // =================================
    
    /**
     * @notice Get strategy's total value in underlying tokens
     * @return wlfiAmount Total WLFI managed by strategy
     * @return usd1Amount Total USD1 managed by strategy  
     */
    function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (!active || address(alphaVault) == address(0)) {
            return (0, 0);
        }
        
        uint256 ourShares = alphaVault.balanceOf(address(this));
        if (ourShares == 0) {
            return (0, 0);
        }
        
        (uint256 total0, uint256 total1) = alphaVault.getTotalAmounts();
        uint256 totalShares = alphaVault.totalSupply();
        
        wlfiAmount = (total0 * ourShares) / totalShares;
        usd1Amount = (total1 * ourShares) / totalShares;
    }
    
    /**
     * @notice Get our Alpha Vault shares balance
     */
    function getShares() external view returns (uint256) {
        if (!active || address(alphaVault) == address(0)) {
            return 0;
        }
        return alphaVault.balanceOf(address(this));
    }
    
    /**
     * @notice Check if strategy is properly initialized
     */
    function isInitialized() external view returns (bool) {
        return active && address(alphaVault) != address(0);
    }

    // =================================
    // ADMIN FUNCTIONS
    // =================================
    
    /**
     * @notice Update strategy parameters
     */
    function updateParameters(
        uint256 _maxSlippage,
        uint256 _rebalanceThreshold
    ) external onlyOwner {
        require(_maxSlippage <= 1000, "Slippage too high"); // Max 10%
        require(_rebalanceThreshold <= 2000, "Threshold too high"); // Max 20%
        
        maxSlippage = _maxSlippage;
        rebalanceThreshold = _rebalanceThreshold;
    }
    
    /**
     * @notice Emergency pause strategy
     */
    function pause() external onlyOwner {
        active = false;
    }
    
    /**
     * @notice Resume strategy
     */
    function resume() external onlyOwner {
        require(address(alphaVault) != address(0), "Vault not initialized");
        active = true;
    }
    
    /**
     * @notice Emergency token recovery
     */
    function rescueToken(address token, uint256 amount, address to) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
