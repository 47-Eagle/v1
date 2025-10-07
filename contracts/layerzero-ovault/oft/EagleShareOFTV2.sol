// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { EagleShareOFT } from "./EagleShareOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title EagleShareOFTV2
 * @dev V3-compatible fee-on-swap implementation for EagleShareOFT
 * 
 * KEY FEATURES:
 * - V3 pool compatibility (no "Insufficient Input Amount" errors)
 * - Smart DEX detection (V2, V3, routers, pools)
 * - Dual-mode processing (V3-compatible vs traditional)
 * - Fee-on-swap only (regular transfers remain free)
 * - Configurable fee structure with multiple recipients
 * 
 */
contract EagleShareOFTV2 is EagleShareOFT {
    
    // ================================
    // CONSTANTS & ENUMS
    // ================================
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% maximum
    
    // Smart detection system
    enum OperationType {
        Unknown,        // Apply fees based on detection (default)
        SwapOnly,       // Apply fees for swaps only
        NoFees,         // Never apply fees (exempt addresses)
        LiquidityOnly   // Only liquidity operations (no fees)
    }
    
    // ================================
    // STRUCTS
    // ================================
    
    struct SwapFeeConfig {
        uint16 buyFee;          // Buy fee in basis points
        uint16 sellFee;         // Sell fee in basis points  
        uint16 treasuryShare;   // Treasury allocation (e.g., 7000 = 70%)
        uint16 burnShare;       // Burn allocation (e.g., 2000 = 20%)
        uint16 vaultShare;      // Vault injection (e.g., 1000 = 10%)
        address treasury;       // Treasury address
        address vaultBeneficiary; // Vault beneficiary address (receives vault share)
        bool feesEnabled;       // Global fee toggle
    }
    
    // ================================
    // STATE VARIABLES
    // ================================
    
    SwapFeeConfig public swapFeeConfig;
    
    // Smart detection mappings (adapted from redDRAGON)
    mapping(address => bool) public isPair;                        // V2 pair detection
    mapping(address => OperationType) public addressOperationType; // Enhanced detection
    mapping(address => bool) public isSwapRouter;                  // Router detection
    mapping(address => bool) public isV3Pool;                      // V3 pool detection 
    mapping(address => bool) public feeExempt;                     // Fee exemptions
    
    // Statistics
    uint256 public totalBuyFees;
    uint256 public totalSellFees;
    uint256 public totalBurnedAmount;
    uint256 public totalVaultInjected;
    uint256 public totalSwapsProcessed;
    
    // ================================
    // EVENTS
    // ================================
    
    event SwapFeeApplied(
        address indexed from, 
        address indexed to, 
        uint256 amount, 
        uint256 feeAmount, 
        string reason
    );
    
    event FeesDistributed(
        address indexed recipient, 
        uint256 amount, 
        string category
    );
    
    event V3PoolConfigured(address indexed pool, bool isV3);
    event OperationTypeUpdated(address indexed addr, OperationType opType);
    
    // ================================
    // ERRORS
    // ================================
    
    error FeeExceedsLimit();
    error InvalidFeeRecipient();
    error V3PoolDetectionFailed();
    
    // ================================
    // CONSTRUCTOR
    // ================================
    
    /**
     * @notice Constructor with fee-on-swap capability
     */
    constructor(
        string memory _name,
        string memory _symbol, 
        address _registry,
        address _delegate,
        SwapFeeConfig memory _feeConfig
    ) EagleShareOFT(_name, _symbol, _registry, _delegate) {
        _setSwapFeeConfig(_feeConfig);
        
        // Set deployer as fee exempt
        feeExempt[_delegate] = true;
        feeExempt[address(this)] = true;
    }
    
    // ================================
    // ENHANCED TRANSFER WITH V3 COMPATIBILITY
    // ================================
    
    /**
     * @notice Enhanced transfer with V3-compatible smart fee detection
     * @dev Dual-mode processing for V3 compatibility
     * @dev Overrides ERC20's _update function which is called by transfer, transferFrom, mint, and burn
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Skip fees for mint/burn operations or zero amount
        if (from == address(0) || to == address(0) || amount == 0) {
            super._update(from, to, amount);
            return;
        }
        
        // Skip fees if globally disabled
        if (!swapFeeConfig.feesEnabled) {
            super._update(from, to, amount);
            return;
        }
        
        // Skip fees for exempt addresses
        if (feeExempt[from] || feeExempt[to]) {
            super._update(from, to, amount);
            return;
        }
        
        // Apply smart fee detection (adapted from redDRAGON)
        if (_shouldApplyTradingFees(from, to)) {
            _processTradeWithFees(from, to, amount);
        } else {
            // Regular transfer - no fees
            super._update(from, to, amount);
        }
    }
    
    // ================================
    // SMART FEE DETECTION (REDDRAGON-INSPIRED)
    // ================================
    
    /**
     * @dev Enhanced logic to determine if trading fees should apply
     * @dev Smart detection system
     */
    function _shouldApplyTradingFees(address from, address to) internal view returns (bool) {
        // Check operation type classifications first
        OperationType fromType = addressOperationType[from];
        OperationType toType = addressOperationType[to];
        
        // No fees if either side is classified as no fees
        if (fromType == OperationType.NoFees || toType == OperationType.NoFees) {
            return false;
        }
        
        // No fees if either side is liquidity only
        if (fromType == OperationType.LiquidityOnly || toType == OperationType.LiquidityOnly) {
            return false;
        }
        
        // Apply fees if either side is swap-enabled
        if (fromType == OperationType.SwapOnly || toType == OperationType.SwapOnly) {
            return true;
        }
        
        // Enhanced detection for complex DEX operations
        return _detectTradingOperation(from, to);
    }
    
    /**
     * @dev Detect if this is a trading operation using multiple signals
     */
    function _detectTradingOperation(address from, address to) internal view returns (bool) {
        // V2 pair detection
        if (isPair[from] || isPair[to]) {
            return true;
        }
        
        // V3 pool detection
        if (isV3Pool[from] || isV3Pool[to]) {
            return true;
        }
        
        // Router detection
        if (isSwapRouter[from] || isSwapRouter[to]) {
            return true;
        }
        
        return false;
    }
    
    // ================================
    // DUAL-MODE FEE PROCESSING
    // ================================
    
    /**
     * @dev Process trading transaction with V3-compatible dual-mode fees
     * @dev Different handling for V3 pools vs traditional pools
     */
    function _processTradeWithFees(address from, address to, uint256 amount) internal {
        // Determine if this is a buy or sell
        bool isBuy = _isBuyTransaction(from, to);
        uint256 feeRate = isBuy ? swapFeeConfig.buyFee : swapFeeConfig.sellFee;
        
        if (feeRate > 0) {
            if (!isBuy && isV3Pool[to]) {
                _transferV3Compatible(from, to, amount, feeRate);
            } else {
                _transferTraditional(from, to, amount, feeRate, isBuy);
            }
        } else {
            // Fee is zero, do regular transfer without recursion
            super._update(from, to, amount);
        }
        
        totalSwapsProcessed++;
    }
    
    /**
     * @dev V3-compatible transfer that avoids balance verification issues
     * @dev Transfer exact net amount, collect fees separately
     */
    function _transferV3Compatible(address from, address to, uint256 amount, uint256 feeRate) internal {
        uint256 feeAmount = (amount * feeRate) / BASIS_POINTS;
        uint256 netAmount = amount - feeAmount;
        
        // Transfer net amount to pool, fees to this contract
        super._update(from, to, netAmount);
        super._update(from, address(this), feeAmount);
        
        // Distribute fees immediately
        _distributeFees(feeAmount, false);
        
        emit SwapFeeApplied(from, to, amount, feeAmount, "sell_v3_compatible");
        totalSellFees += feeAmount;
    }
    
    /**
     * @dev Traditional fee-on-transfer for V2/other pools
     */
    function _transferTraditional(address from, address to, uint256 amount, uint256 feeRate, bool isBuy) internal {
        uint256 feeAmount = (amount * feeRate) / BASIS_POINTS;
        uint256 transferAmount = amount - feeAmount;
        
        // Traditional fee-on-transfer (works fine for V2)
        super._update(from, address(this), feeAmount);
        super._update(from, to, transferAmount);
        
        // Distribute fees
        _distributeFees(feeAmount, isBuy);
        
        emit SwapFeeApplied(from, to, amount, feeAmount, isBuy ? "buy_traditional" : "sell_traditional");
        
        if (isBuy) {
            totalBuyFees += feeAmount;
        } else {
            totalSellFees += feeAmount;
        }
    }
    
    /**
     * @dev Determine if transaction is a buy
     */
    function _isBuyTransaction(address from, address /* to */) internal view returns (bool) {
        // If from a pair/router/pool, it's likely a buy
        return isPair[from] || isSwapRouter[from] || isV3Pool[from];
    }
    
    // ================================
    // FEE DISTRIBUTION (MULTI-RECIPIENT)
    // ================================
    
    /**
     * @dev Distribute fees with multiple recipients: Treasury + Burn + Vault
     */
    function _distributeFees(uint256 feeAmount, bool isBuy) internal {
        if (feeAmount == 0) return;
        
        // Calculate distribution amounts
        uint256 treasuryAmount = (feeAmount * swapFeeConfig.treasuryShare) / BASIS_POINTS;
        uint256 burnAmount = (feeAmount * swapFeeConfig.burnShare) / BASIS_POINTS;
        uint256 vaultAmount = feeAmount - treasuryAmount - burnAmount; // Remainder goes to vault
        
        // Distribute to treasury
        if (swapFeeConfig.treasury != address(0) && treasuryAmount > 0) {
            super._update(address(this), swapFeeConfig.treasury, treasuryAmount);
            emit FeesDistributed(swapFeeConfig.treasury, treasuryAmount, isBuy ? "buy_treasury" : "sell_treasury");
        }
        
        // 🔥 BURN tokens (reduces total supply, increases value of remaining tokens)
        if (burnAmount > 0) {
            super._update(address(this), address(0), burnAmount);
            emit FeesDistributed(address(0), burnAmount, isBuy ? "buy_burn" : "sell_burn");
            totalBurnedAmount += burnAmount;
        }
        
        // 💰 VAULT INJECTION: Send remaining fees to vault beneficiary
        // The vault beneficiary can accumulate shares and periodically bridge them to the hub chain
        // or use them to provide liquidity/incentives that benefit the vault ecosystem
        if (vaultAmount > 0) {
            if (swapFeeConfig.vaultBeneficiary != address(0)) {
                super._update(address(this), swapFeeConfig.vaultBeneficiary, vaultAmount);
                emit FeesDistributed(swapFeeConfig.vaultBeneficiary, vaultAmount, isBuy ? "buy_vault" : "sell_vault");
                totalVaultInjected += vaultAmount;
            } else {
                // Fallback: If no vault beneficiary is set, burn the tokens instead
                // This increases value of remaining shares by reducing supply
                super._update(address(this), address(0), vaultAmount);
                emit FeesDistributed(address(0), vaultAmount, isBuy ? "buy_vault_burned" : "sell_vault_burned");
                totalBurnedAmount += vaultAmount;
            }
        }
    }
    
    // ================================
    // ADMIN CONFIGURATION FUNCTIONS
    // ================================
    
    /**
     * @notice Configure swap fees
     */
    function setSwapFeeConfig(
        uint16 _buyFee,
        uint16 _sellFee,
        uint16 _treasuryShare,
        uint16 _burnShare,
        uint16 _vaultShare,
        address _treasury,
        address _vaultBeneficiary,
        bool _enabled
    ) external onlyOwner {
        SwapFeeConfig memory newConfig = SwapFeeConfig({
            buyFee: _buyFee,
            sellFee: _sellFee,
            treasuryShare: _treasuryShare,
            burnShare: _burnShare,
            vaultShare: _vaultShare,
            treasury: _treasury,
            vaultBeneficiary: _vaultBeneficiary,
            feesEnabled: _enabled
        });
        
        _setSwapFeeConfig(newConfig);
    }
    
    /**
     * @notice Set V3 pool status (🔑 CRITICAL for V3 compatibility)
     */
    function setV3Pool(address pool, bool _isV3Pool) external onlyOwner {
        if (pool == address(0)) revert InvalidFeeRecipient();
        
        isV3Pool[pool] = _isV3Pool;
        
        if (_isV3Pool) {
            addressOperationType[pool] = OperationType.SwapOnly;
        }
        
        emit V3PoolConfigured(pool, _isV3Pool);
    }
    
    /**
     * @notice Batch configure V3 pools
     */
    function setV3PoolsBatch(address[] calldata pools, bool _isV3Pool) external onlyOwner {
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i] != address(0)) {
                isV3Pool[pools[i]] = _isV3Pool;
                if (_isV3Pool) {
                    addressOperationType[pools[i]] = OperationType.SwapOnly;
                }
                emit V3PoolConfigured(pools[i], _isV3Pool);
            }
        }
    }
    
    /**
     * @notice Set DEX pair status
     */
    function setPair(address pair, bool _isPair) external onlyOwner {
        if (pair == address(0)) revert InvalidFeeRecipient();
        
        isPair[pair] = _isPair;
        if (_isPair) {
            addressOperationType[pair] = OperationType.SwapOnly;
        }
    }
    
    /**
     * @notice Set swap router status
     */
    function setSwapRouter(address router, bool _isRouter) external onlyOwner {
        if (router == address(0)) revert InvalidFeeRecipient();
        
        isSwapRouter[router] = _isRouter;
        if (_isRouter) {
            addressOperationType[router] = OperationType.SwapOnly;
        }
    }
    
    /**
     * @notice Set fee exemption status
     */
    function setFeeExempt(address account, bool _isExempt) external onlyOwner {
        if (account == address(0)) revert InvalidFeeRecipient();
        
        feeExempt[account] = _isExempt;
    }
    
    /**
     * @notice Update vault beneficiary address
     */
    function setVaultBeneficiary(address _vaultBeneficiary) external onlyOwner {
        swapFeeConfig.vaultBeneficiary = _vaultBeneficiary;
    }
    
    /**
     * @notice Set operation type for enhanced detection
     */
    function setAddressOperationType(address addr, OperationType opType) external onlyOwner {
        if (addr == address(0)) revert InvalidFeeRecipient();
        
        addressOperationType[addr] = opType;
        emit OperationTypeUpdated(addr, opType);
    }
    
    // ================================
    // INTERNAL HELPER FUNCTIONS
    // ================================
    
    /**
     * @dev Internal function to set fee config with validation
     */
    function _setSwapFeeConfig(SwapFeeConfig memory _config) internal {
        if (_config.buyFee > MAX_FEE_BPS || _config.sellFee > MAX_FEE_BPS) {
            revert FeeExceedsLimit();
        }
        
        if (_config.treasuryShare + _config.burnShare + _config.vaultShare != BASIS_POINTS) {
            revert InvalidFeeRecipient();
        }
        
        if (_config.treasury == address(0)) {
            revert InvalidFeeRecipient();
        }
        
        swapFeeConfig = _config;
    }
    
    // ================================
    // VIEW FUNCTIONS
    // ================================
    
    /**
     * @notice Calculate swap fee for a given amount
     */
    function calculateSwapFee(uint256 amount, bool isBuy) external view returns (uint256 feeAmount) {
        if (!swapFeeConfig.feesEnabled) return 0;
        
        uint256 feeRate = isBuy ? swapFeeConfig.buyFee : swapFeeConfig.sellFee;
        return (amount * feeRate) / BASIS_POINTS;
    }
    
    /**
     * @notice Get comprehensive fee statistics
     */
    function getFeeStats() external view returns (
        uint256 totalBuyFeesCollected,
        uint256 totalSellFeesCollected,
        uint256 totalBurned,
        uint256 totalVaultFees,
        uint256 totalSwaps
    ) {
        return (totalBuyFees, totalSellFees, totalBurnedAmount, totalVaultInjected, totalSwapsProcessed);
    }
    
    /**
     * @notice Check if address is configured as V3 pool
     */
    function isV3PoolConfigured(address pool) external view returns (bool) {
        return isV3Pool[pool];
    }
    
    /**
     * @notice Get contract version with fee support
     */
    function versionWithFees() external pure returns (string memory) {
        return "2.1.0-fees-v3-compatible";
    }
}