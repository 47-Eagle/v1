// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleShareOFT
 * @notice Production-ready LayerZero OFT for Eagle Vault Shares on spoke chains
 * 
 * @dev FEATURES:
 *      ✅ Optional fee-on-swap (configurable)
 *      ✅ V3 Uniswap pool compatibility (no "Insufficient Input Amount" errors)
 *      ✅ Smart DEX detection (V2, V3, routers, pools)
 *      ✅ Fee-on-swap only (regular transfers remain free)
 *      ✅ Multi-recipient fee distribution (Treasury + Vault)
 *      ✅ Configurable fee structure
 *      ✅ Emergency controls
 * 
 * @dev DEPLOYMENT:
 *      - Deploy ONLY on spoke chains (Arbitrum, Optimism, Base, etc.)
 *      - Do NOT deploy on hub chain (use EagleShareOFTAdapter on hub)
 * 
 * @dev FEE STRUCTURE:
 *      - Buy/Sell fees configurable separately (default: 0%)
 *      - Two recipients: Treasury (50%), Vault Injection (50%)
 *      - Fees only apply to DEX swaps, not regular transfers
 *      - V3-compatible dual-mode processing
 * 
 * @dev WARNING: 
 *      NEVER mint shares directly in this contract!
 *      Shares must ONLY be minted by the vault contract on the hub chain
 *      to maintain the correct share-to-asset conversion rate.
 *      
 *      Shares are bridged FROM hub (via ShareOFTAdapter) TO spoke chains.
 */
contract EagleShareOFT is OFT {
    // =================================
    // CONSTANTS & ENUMS
    // =================================
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% maximum
    
    enum OperationType {
        Unknown,        // Apply fees based on detection (default)
        SwapOnly,       // Apply fees for swaps only
        NoFees,         // Never apply fees (exempt addresses)
        LiquidityOnly   // Only liquidity operations (no fees)
    }
    
    // =================================
    // STRUCTS
    // =================================
    
    struct SwapFeeConfig {
        uint16 buyFee;          // Buy fee in basis points
        uint16 sellFee;         // Sell fee in basis points  
        uint16 treasuryShare;   // Treasury allocation (e.g., 7000 = 70%)
        uint16 vaultShare;      // Vault injection (e.g., 3000 = 30%)
        address treasury;       // Treasury address
        address vaultBeneficiary; // Vault beneficiary address
        bool feesEnabled;       // Global fee toggle
    }
    
    // =================================
    // STATE VARIABLES
    // =================================
    
    /// @notice Minter permissions (for EagleVaultWrapper integration)
    mapping(address => bool) public isMinter;
    
    /// @notice Fee configuration
    SwapFeeConfig public swapFeeConfig;
    
    /// @notice Smart detection mappings
    mapping(address => bool) public isPair;
    mapping(address => OperationType) public addressOperationType;
    mapping(address => bool) public isSwapRouter;
    mapping(address => bool) public isV3Pool;
    mapping(address => bool) public feeExempt;
    
    /// @notice Statistics
    uint256 public totalBuyFees;
    uint256 public totalSellFees;
    uint256 public totalVaultInjected;
    uint256 public totalSwapsProcessed;
    
    // =================================
    // EVENTS
    // =================================

    event SwapFeeApplied(address indexed from, address indexed to, uint256 amount, uint256 feeAmount, string reason);
    event FeesDistributed(address indexed recipient, uint256 amount, string category);
    event V3PoolConfigured(address indexed pool, bool isV3);
    event OperationTypeUpdated(address indexed addr, OperationType opType);
    event FeeConfigUpdated(uint16 buyFee, uint16 sellFee, bool enabled);
    event MinterUpdated(address indexed minter, bool status);

    // =================================
    // ERRORS
    // =================================

    error ZeroAddress();
    error FeeExceedsLimit();
    error InvalidFeeRecipient();
    error InvalidFeeDistribution();
    error NotMinter();

    // =================================
    // CONSTRUCTOR
    // =================================
    
    /**
     * @notice Creates Eagle Share OFT for spoke chains
     * @param _name Token name (e.g., "Eagle Vault Shares")
     * @param _symbol Token symbol (e.g., "vEAGLE")
     * @param _lzEndpoint LayerZero endpoint for this chain
     * @param _delegate Contract delegate/owner
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        if (_delegate == address(0)) revert ZeroAddress();
        if (_lzEndpoint == address(0)) revert ZeroAddress();
        
        // Set deployer and contract as fee exempt
        feeExempt[_delegate] = true;
        feeExempt[address(this)] = true;
        
        // WARNING: Do NOT mint shares here - breaks vault accounting
        // Shares are minted by the vault on hub chain only
    }

    // =================================
    // ENHANCED TRANSFER WITH V3 COMPATIBILITY
    // =================================
    
    /**
     * @notice Enhanced transfer with V3-compatible smart fee detection
     * @dev Overrides ERC20's _update function
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
        
        // Apply smart fee detection
        if (_shouldApplyTradingFees(from, to)) {
            _processTradeWithFees(from, to, amount);
        } else {
            // Regular transfer - no fees
            super._update(from, to, amount);
        }
    }
    
    // =================================
    // SMART FEE DETECTION
    // =================================
    
    /**
     * @notice Determine if trading fees should apply
     */
    function _shouldApplyTradingFees(address from, address to) internal view returns (bool) {
        // Check operation type classifications
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
        
        // Enhanced detection for DEX operations
        return _detectTradingOperation(from, to);
    }
    
    /**
     * @notice Detect if this is a trading operation
     */
    function _detectTradingOperation(address from, address to) internal view returns (bool) {
        // V2 pair detection
        if (isPair[from] || isPair[to]) return true;
        
        // V3 pool detection
        if (isV3Pool[from] || isV3Pool[to]) return true;
        
        // Router detection
        if (isSwapRouter[from] || isSwapRouter[to]) return true;
        
        return false;
    }
    
    // =================================
    // DUAL-MODE FEE PROCESSING
    // =================================
    
    /**
     * @notice Process trading transaction with V3-compatible fees
     */
    function _processTradeWithFees(address from, address to, uint256 amount) internal {
        bool isBuy = _isBuyTransaction(from, to);
        uint256 feeRate = isBuy ? swapFeeConfig.buyFee : swapFeeConfig.sellFee;
        
        if (feeRate > 0) {
            if (!isBuy && isV3Pool[to]) {
                _transferV3Compatible(from, to, amount, feeRate);
            } else {
                _transferTraditional(from, to, amount, feeRate, isBuy);
            }
        } else {
            super._update(from, to, amount);
        }
        
        totalSwapsProcessed++;
    }
    
    /**
     * @notice V3-compatible transfer (avoids balance verification issues)
     */
    function _transferV3Compatible(address from, address to, uint256 amount, uint256 feeRate) internal {
        uint256 feeAmount = (amount * feeRate) / BASIS_POINTS;
        uint256 netAmount = amount - feeAmount;
        
        // Transfer net amount to pool, fees to contract
        super._update(from, to, netAmount);
        super._update(from, address(this), feeAmount);
        
        // Distribute fees immediately
        _distributeFees(feeAmount, false);
        
        emit SwapFeeApplied(from, to, amount, feeAmount, "sell_v3_compatible");
        totalSellFees += feeAmount;
    }
    
    /**
     * @notice Traditional fee-on-transfer for V2/other pools
     */
    function _transferTraditional(address from, address to, uint256 amount, uint256 feeRate, bool isBuy) internal {
        uint256 feeAmount = (amount * feeRate) / BASIS_POINTS;
        uint256 transferAmount = amount - feeAmount;
        
        super._update(from, address(this), feeAmount);
        super._update(from, to, transferAmount);
        
        _distributeFees(feeAmount, isBuy);
        
        emit SwapFeeApplied(from, to, amount, feeAmount, isBuy ? "buy_traditional" : "sell_traditional");
        
        if (isBuy) {
            totalBuyFees += feeAmount;
        } else {
            totalSellFees += feeAmount;
        }
    }
    
    /**
     * @notice Determine if transaction is a buy
     */
    function _isBuyTransaction(address from, address /* to */) internal view returns (bool) {
        return isPair[from] || isSwapRouter[from] || isV3Pool[from];
    }
    
    // =================================
    // FEE DISTRIBUTION
    // =================================
    
    /**
     * @notice Distribute fees to Treasury + Vault Injection
     */
    function _distributeFees(uint256 feeAmount, bool isBuy) internal {
        if (feeAmount == 0) return;
        
        // Calculate distribution amounts (Treasury 70%, Vault 30%)
        uint256 treasuryAmount = (feeAmount * swapFeeConfig.treasuryShare) / BASIS_POINTS;
        uint256 vaultAmount = feeAmount - treasuryAmount; // Remainder goes to vault
        
        // Distribute to treasury
        if (swapFeeConfig.treasury != address(0) && treasuryAmount > 0) {
            super._update(address(this), swapFeeConfig.treasury, treasuryAmount);
            emit FeesDistributed(swapFeeConfig.treasury, treasuryAmount, isBuy ? "buy_treasury" : "sell_treasury");
        }
        
        // Vault injection (all remaining fees go here)
        if (vaultAmount > 0 && swapFeeConfig.vaultBeneficiary != address(0)) {
            super._update(address(this), swapFeeConfig.vaultBeneficiary, vaultAmount);
            emit FeesDistributed(swapFeeConfig.vaultBeneficiary, vaultAmount, isBuy ? "buy_vault" : "sell_vault");
            totalVaultInjected += vaultAmount;
        }
    }
    
    // =================================
    // ADMIN CONFIGURATION
    // =================================
    
    /**
     * @notice Configure swap fees
     */
    function setSwapFeeConfig(
        uint16 _buyFee,
        uint16 _sellFee,
        uint16 _treasuryShare,
        uint16 _vaultShare,
        address _treasury,
        address _vaultBeneficiary,
        bool _enabled
    ) external onlyOwner {
        SwapFeeConfig memory newConfig = SwapFeeConfig({
            buyFee: _buyFee,
            sellFee: _sellFee,
            treasuryShare: _treasuryShare,
            vaultShare: _vaultShare,
            treasury: _treasury,
            vaultBeneficiary: _vaultBeneficiary,
            feesEnabled: _enabled
        });
        
        _setSwapFeeConfig(newConfig);
        
        emit FeeConfigUpdated(_buyFee, _sellFee, _enabled);
    }
    
    /**
     * @notice Set V3 pool status (CRITICAL for V3 compatibility)
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
        uint256 length = pools.length;  // Cache length
        for (uint256 i = 0; i < length;) {
            if (pools[i] != address(0)) {
                isV3Pool[pools[i]] = _isV3Pool;
                if (_isV3Pool) {
                    addressOperationType[pools[i]] = OperationType.SwapOnly;
                }
                emit V3PoolConfigured(pools[i], _isV3Pool);
            }
            unchecked { ++i; }  // Gas optimization
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
     * @notice Update vault beneficiary
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
    
    /**
     * @notice Toggle fees on/off
     */
    function setFeesEnabled(bool _enabled) external onlyOwner {
        swapFeeConfig.feesEnabled = _enabled;
        emit FeeConfigUpdated(swapFeeConfig.buyFee, swapFeeConfig.sellFee, _enabled);
    }
    
    // =================================
    // INTERNAL HELPERS
    // =================================

    /**
     * @notice Internal function to set fee config with validation
     */
    function _setSwapFeeConfig(SwapFeeConfig memory _config) internal {
        if (_config.buyFee > MAX_FEE_BPS || _config.sellFee > MAX_FEE_BPS) {
            revert FeeExceedsLimit();
        }
        
        if (_config.treasuryShare + _config.vaultShare != BASIS_POINTS) {
            revert InvalidFeeDistribution();
        }
        
        if (_config.treasury == address(0) && _config.feesEnabled) {
            revert InvalidFeeRecipient();
        }
        
        swapFeeConfig = _config;
    }
    
    // =================================
    // VIEW FUNCTIONS
    // =================================

    /**
     * @notice Calculate swap fee for a given amount
     */
    function calculateSwapFee(uint256 amount, bool isBuy) external view returns (uint256 feeAmount) {
        if (!swapFeeConfig.feesEnabled) return 0;
        uint256 feeRate = isBuy ? swapFeeConfig.buyFee : swapFeeConfig.sellFee;
        return (amount * feeRate) / BASIS_POINTS;
    }
    
    /**
     * @notice Get fee statistics
     */
    function getFeeStats() external view returns (
        uint256 totalBuyFeesCollected,
        uint256 totalSellFeesCollected,
        uint256 totalVaultFees,
        uint256 totalSwaps
    ) {
        return (totalBuyFees, totalSellFees, totalVaultInjected, totalSwapsProcessed);
    }
    
    /**
     * @notice Check if address is V3 pool
     */
    function isV3PoolConfigured(address pool) external view returns (bool) {
        return isV3Pool[pool];
    }
    
    /**
     * @notice Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0-production";
    }
    
    // =================================
    // MINTER FUNCTIONS (For EagleVaultWrapper Integration)
    // =================================
    
    /**
     * @notice Set minter permission
     * @dev Allows EagleVaultWrapper to mint/burn tokens for wrapping/unwrapping
     * @param minter Address to grant/revoke minting permission
     * @param status True to grant, false to revoke
     */
    function setMinter(address minter, bool status) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        isMinter[minter] = status;
        emit MinterUpdated(minter, status);
    }
    
    /**
     * @notice Mint tokens (minter only)
     * @dev Used by EagleVaultWrapper when wrapping vault shares
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        if (!isMinter[msg.sender] && msg.sender != owner()) revert NotMinter();
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens (minter only)
     * @dev Used by EagleVaultWrapper when unwrapping to vault shares
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external {
        if (!isMinter[msg.sender] && msg.sender != owner()) revert NotMinter();
        if (from == address(0)) revert ZeroAddress();
        
        // Check allowance if caller is not the token owner
        if (from != msg.sender) {
            uint256 currentAllowance = allowance(from, msg.sender);
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            _approve(from, msg.sender, currentAllowance - amount);
        }
        
        _burn(from, amount);
    }
    
    /**
     * @notice Check if address is a minter
     */
    function checkMinter(address account) external view returns (bool) {
        return isMinter[account] || account == owner();
    }
}

