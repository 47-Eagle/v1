// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC4626} from "solmate/src/tokens/ERC4626.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../interfaces/lottery/IOmniDragonLotteryManager.sol";

// Custom Errors
error ZeroAddress();
error InvalidAmount();
error TradingDisabled();
error NotInitialized();
error AlreadyInitialized();
error InvalidFeeConfiguration();
error TransferFailed();

// Event Categories for gas optimization
enum EventCategory {
  BUY_JACKPOT,
  BUY_REVENUE,
  BUY_BURN,
  SELL_JACKPOT,
  SELL_REVENUE,
  SELL_BURN
}

/**
 * @title redDRAGON
 * @author 0xakita.eth
 * @notice Improved ERC-4626 vault with clean architecture inspired by omniDRAGON
 * @dev Features:
 * - Smart fee detection with operation types
 * - Clean lottery delegation to lottery manager
 * - 6.9% trading fees: 69% jackpot, 24.1% revenue, 6.9% share burn
 * - Share burning reduces total supply, increasing value for remaining holders
 * - Configurable fee structure and destinations
 * - Pausable lottery and fees
 * - Separation of concerns
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract redDRAGON is ERC4626, Ownable, ReentrancyGuard, Pausable {
  using SafeTransferLib for ERC20;

  // ================================
  // CONSTANTS & ENUMS
  // ================================

  uint256 public constant BASIS_POINTS = 10000;
  uint256 public constant MAX_FEE_BPS = 2500; // 25% maximum

  // Smart fee detection system (inspired by omniDRAGON)
  enum OperationType {
    Unknown,        // Apply fees based on detection (default)
    SwapOnly,       // Apply fees for swaps only
    NoFees,         // Never apply fees (exempt addresses)
    LiquidityOnly   // Only liquidity operations (no fees)
  }

  // ================================
  // STRUCTS
  // ================================

  struct Fees {
    uint16 jackpot;     // Basis points for jackpot
    uint16 revenue;     // Basis points for revenue distributor
    uint16 burn;        // Basis points to burn
    uint16 total;       // Total basis points
  }

  struct SystemConfig {
    address jackpotVault;        // Jackpot vault address
    address revenueDistributor;  // Revenue distributor address
    address lotteryManager;      // Lottery manager address
    bool feesEnabled;           // Master fee toggle
    bool lotteryEnabled;        // Master lottery toggle
    bool initialized;           // Initialization status
  }

  struct TransactionContext {
    address initiator;
    bool isSwap;
    bool isLiquidity;
    uint256 blockNumber;
    uint256 timestamp;
  }

  // ================================
  // STATE VARIABLES
  // ================================

  // Core system configuration
  SystemConfig public config;

  // Fee configuration - 6.9% total fee
  Fees public buyFees = Fees(476, 166, 48, 690);   // 6.9% total: 4.76% jackpot, 1.66% revenue, 0.48% burn
  Fees public sellFees = Fees(476, 166, 48, 690);  // 6.9% total: 4.76% jackpot, 1.66% revenue, 0.48% burn

  // Smart detection mappings (inspired by omniDRAGON)
  mapping(address => bool) public isPair;                        // Legacy pair detection
  mapping(address => OperationType) public addressOperationType; // Enhanced operation type detection
  mapping(address => bool) public isSwapRouter;                  // Swap router classification
  mapping(address => bool) public isPositionManager;             // Position manager classification
  mapping(address => bool) public isV3Pool;                      // V3 pool detection for compatibility

  // Transaction context tracking
  mapping(bytes32 => TransactionContext) private txContexts;
  mapping(address => uint256) private lastTxBlock;

  // Statistics
  uint256 public totalJackpotFees;
  uint256 public totalRevenueFees;
  uint256 public totalBurnedFees;
  uint256 public totalTradesProcessed;
  uint256 public totalLotteryTriggers;

  // ================================
  // EVENTS
  // ================================
  
  event FeesDistributed(address indexed recipient, uint256 amount, EventCategory indexed category);
  event LotteryTriggered(address indexed user, uint256 amount, uint256 estimatedUSDValue);
  event SystemConfigUpdated(address indexed component, string componentName);
  event FeeConfigUpdated(string feeType, uint16 jackpot, uint16 revenue, uint16 burn, uint16 total);
  event SmartFeeApplied(address indexed from, address indexed to, uint256 amount, uint256 feeAmount, string reason);
  event OperationTypeUpdated(address indexed addr, OperationType operationType);

  // ================================
  // MODIFIERS
  // ================================

  modifier onlyInitialized() {
    if (!config.initialized) revert NotInitialized();
    _;
  }

  modifier validAddress(address addr) {
    if (addr == address(0)) revert ZeroAddress();
    _;
  }

  // ================================
  // CONSTRUCTOR
  // ================================

  constructor(
    ERC20 _asset,
    string memory _name,
    string memory _symbol
  ) ERC4626(_asset, _name, _symbol) Ownable(msg.sender) {
    // Contract starts uninitialized for security
  }

  // ================================
  // CORE ERC4626 OVERRIDES WITH FEE LOGIC
  // ================================

  /**
   * @notice Enhanced transfer with smart fee detection
   */
  function transfer(address to, uint256 amount) public override returns (bool) {
    return _transferWithSmartDetection(msg.sender, to, amount);
  }

  /**
   * @notice Enhanced transferFrom with smart fee detection
   */
  function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
    return _transferWithSmartDetection(from, to, amount);
  }

  /**
   * @dev Smart transfer logic with enhanced detection (inspired by omniDRAGON)
   */
  function _transferWithSmartDetection(address from, address to, uint256 amount) internal returns (bool) {
    if (from == address(0) || to == address(0)) revert ZeroAddress();
    if (!config.initialized) revert NotInitialized();

    // Determine if fees should be applied using smart detection
    if (config.feesEnabled && _shouldApplyTradingFees(from, to, amount)) {
      return _processTradeWithFees(from, to, amount);
    } else {
      // No fees - direct transfer using ERC20 base
      balanceOf[from] -= amount;
      unchecked {
        balanceOf[to] += amount;
      }
      emit Transfer(from, to, amount);
      return true;
    }
  }

  // ================================
  // SMART FEE DETECTION (INSPIRED BY OMNIDRAGON)
  // ================================
  
  /**
   * @dev Enhanced logic to determine if trading fees should apply
   */
  function _shouldApplyTradingFees(address from, address to, uint256 /* amount */) 
    internal 
    view
    returns (bool) 
  {
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
    // Legacy pair detection (Uniswap V2 style)
    if (isPair[from] || isPair[to]) {
      return true;
    }

    // Router detection
    if (isSwapRouter[from] || isSwapRouter[to]) {
      return true;
    }

    // Default to false for normal transfers
    return false;
  }

  /**
   * @dev Process trading transaction with fees
   */
  function _processTradeWithFees(address from, address to, uint256 amount) internal returns (bool) {
    // Determine if this is a buy or sell
    bool isBuy = _isBuyTransaction(from, to);
    Fees memory currentFees = isBuy ? buyFees : sellFees;
    
    if (currentFees.total > 0) {
      // Check if this is a sell to V3 pool that needs special handling
      if (!isBuy && isV3Pool[to]) {
        // Selling to V3 pool - use V3-compatible transfer
        return _transferV3Compatible(from, to, amount, currentFees);
      } else {
        // Normal fee-on-transfer logic
        uint256 feeAmount = (amount * currentFees.total) / BASIS_POINTS;
        uint256 transferAmount = amount - feeAmount;

        // Transfer fees to contract first, then distribute
        balanceOf[from] -= amount;
        unchecked {
          balanceOf[address(this)] += feeAmount;
          balanceOf[to] += transferAmount;
        }
        emit Transfer(from, address(this), feeAmount);
        emit Transfer(from, to, transferAmount);
        
        // Distribute fees immediately
        _distributeFees(feeAmount, currentFees, isBuy);
        
        emit SmartFeeApplied(from, to, amount, feeAmount, isBuy ? "buy_detected" : "sell_detected");
        
        // Trigger lottery for buys only
        if (isBuy && config.lotteryEnabled && config.lotteryManager != address(0)) {
          _safeTriggerLottery(to, amount);
        }
        
        totalTradesProcessed++;
      }
    } else {
      balanceOf[from] -= amount;
      unchecked {
        balanceOf[to] += amount;
      }
      emit Transfer(from, to, amount);
    }

    return true;
  }

  /**
   * @dev V3-compatible transfer that avoids balance verification issues
   */
  function _transferV3Compatible(address from, address to, uint256 amount, Fees memory fees) internal returns (bool) {
    uint256 feeAmount = (amount * fees.total) / BASIS_POINTS;
    uint256 netAmount = amount - feeAmount;
    
    // Transfer net amount directly to V3 pool (pool gets exactly what it expects)
    balanceOf[from] -= amount;
    unchecked {
      balanceOf[to] += netAmount;
      balanceOf[address(this)] += feeAmount;
    }
    emit Transfer(from, to, netAmount);
    emit Transfer(from, address(this), feeAmount);
    
    // Distribute fees immediately
    _distributeFees(feeAmount, fees, false);
    
    emit SmartFeeApplied(from, to, amount, feeAmount, "sell_v3_compatible");
    
    totalTradesProcessed++;
    return true;
  }

  /**
   * @dev Determine if transaction is a buy (simplified logic)
   */
  function _isBuyTransaction(address from, address /* to */) internal view returns (bool) {
    // If from a pair/router, it's likely a buy
    return isPair[from] || isSwapRouter[from];
  }

  // ================================
  // FEE DISTRIBUTION (SIMPLIFIED & CLEAN)
  // ================================
  
  /**
   * @dev Distribute fees immediately (no accumulation)
   */
  function _distributeFees(uint256 feeAmount, Fees memory fees, bool isBuy) internal {
    if (feeAmount == 0) return;

    uint256 jackpotAmount = (feeAmount * fees.jackpot) / fees.total;
    uint256 revenueAmount = (feeAmount * fees.revenue) / fees.total;
    uint256 burnAmount = (feeAmount * fees.burn) / fees.total;

    // Distribute to jackpot vault
    if (config.jackpotVault != address(0) && jackpotAmount > 0) {
      ERC20(address(this)).transfer(config.jackpotVault, jackpotAmount);
      emit FeesDistributed(config.jackpotVault, jackpotAmount, isBuy ? EventCategory.BUY_JACKPOT : EventCategory.SELL_JACKPOT);
      totalJackpotFees += jackpotAmount;
    }

    // Distribute to revenue distributor
    if (config.revenueDistributor != address(0) && revenueAmount > 0) {
      ERC20(address(this)).transfer(config.revenueDistributor, revenueAmount);
      emit FeesDistributed(config.revenueDistributor, revenueAmount, isBuy ? EventCategory.BUY_REVENUE : EventCategory.SELL_REVENUE);
      totalRevenueFees += revenueAmount;
    }

    // BURN REDDRAGON SHARES (reduces total supply, increases value of remaining shares)
    if (burnAmount > 0) {
      // Burn the redDRAGON tokens directly from contract balance
      balanceOf[address(this)] -= burnAmount;
      totalSupply -= burnAmount;
      emit Transfer(address(this), address(0), burnAmount);
      emit FeesDistributed(address(0), burnAmount, isBuy ? EventCategory.BUY_BURN : EventCategory.SELL_BURN);
      totalBurnedFees += burnAmount;
    }
  }

  // ================================
  // LOTTERY INTEGRATION (CLEAN DELEGATION)
  // ================================
  
  /**
   * @dev Safely trigger lottery with error handling (inspired by omniDRAGON)
   */
  function _safeTriggerLottery(address user, uint256 amount) internal {
    if (config.lotteryManager == address(0)) return;
    
    try IOmniDragonLotteryManager(config.lotteryManager).processSwapLottery(
      user,
      address(this),
      amount,
      0 // Let lottery manager calculate USD value
    ) returns (uint256 /* lotteryEntryId */) {
      emit LotteryTriggered(user, amount, 0);
      totalLotteryTriggers++;
    } catch {
      // Lottery trigger failed, but transaction should continue
      // This prevents lottery issues from blocking token transfers
    }
  }

  // ================================
  // ADMIN CONFIGURATION FUNCTIONS
  // ================================

  /**
   * @notice Initialize the contract (one-time setup)
   */
  function initialize(
    address _jackpotVault,
    address _revenueDistributor,
    address _lotteryManager
  ) external onlyOwner {
    if (config.initialized) revert AlreadyInitialized();

    config.jackpotVault = _jackpotVault;
    config.revenueDistributor = _revenueDistributor;
    config.lotteryManager = _lotteryManager;
    config.feesEnabled = true;
    config.lotteryEnabled = true;
    config.initialized = true;

    emit SystemConfigUpdated(_jackpotVault, "jackpotVault");
    emit SystemConfigUpdated(_revenueDistributor, "revenueDistributor");
    emit SystemConfigUpdated(_lotteryManager, "lotteryManager");
  }

  /**
   * @notice Enable/disable fees
   */
  function setFeesEnabled(bool enabled) external onlyOwner {
    config.feesEnabled = enabled;
  }

  /**
   * @notice Enable/disable lottery
   */
  function setLotteryEnabled(bool enabled) external onlyOwner {
    config.lotteryEnabled = enabled;
  }

  /**
   * @notice Update jackpot vault address
   */
  function setJackpotVault(address _jackpotVault) external onlyOwner validAddress(_jackpotVault) {
    config.jackpotVault = _jackpotVault;
    emit SystemConfigUpdated(_jackpotVault, "jackpotVault");
  }

  /**
   * @notice Update revenue distributor address
   */
  function setRevenueDistributor(address _revenueDistributor) external onlyOwner validAddress(_revenueDistributor) {
    config.revenueDistributor = _revenueDistributor;
    emit SystemConfigUpdated(_revenueDistributor, "revenueDistributor");
  }

  /**
   * @notice Update lottery manager address
   */
  function setLotteryManager(address _lotteryManager) external onlyOwner validAddress(_lotteryManager) {
    config.lotteryManager = _lotteryManager;
    emit SystemConfigUpdated(_lotteryManager, "lotteryManager");
  }

  /**
   * @notice Configure buy fees
   * @dev Default: 6.9% total (690 bps) = 476 jackpot (69%) + 166 revenue (24.1%) + 48 burn (6.9%)
   */
  function setBuyFees(uint16 jackpot, uint16 revenue, uint16 burn) external onlyOwner {
    uint16 total = jackpot + revenue + burn;
    if (total > MAX_FEE_BPS) revert InvalidFeeConfiguration();
    
    buyFees = Fees(jackpot, revenue, burn, total);
    emit FeeConfigUpdated("buy", jackpot, revenue, burn, total);
  }

  /**
   * @notice Configure sell fees  
   * @dev Default: 6.9% total (690 bps) = 476 jackpot (69%) + 166 revenue (24.1%) + 48 burn (6.9%)
   */
  function setSellFees(uint16 jackpot, uint16 revenue, uint16 burn) external onlyOwner {
    uint16 total = jackpot + revenue + burn;
    if (total > MAX_FEE_BPS) revert InvalidFeeConfiguration();
    
    sellFees = Fees(jackpot, revenue, burn, total);
    emit FeeConfigUpdated("sell", jackpot, revenue, burn, total);
  }

  /**
   * @notice Set operation type for an address (inspired by omniDRAGON)
   */
  function setAddressOperationType(address addr, OperationType opType) external onlyOwner validAddress(addr) {
    addressOperationType[addr] = opType;
    emit OperationTypeUpdated(addr, opType);
  }

  /**
   * @notice Set DEX pair status
   */
  function setPair(address pair, bool _isPair) external onlyOwner validAddress(pair) {
    isPair[pair] = _isPair;
    if (_isPair) {
      addressOperationType[pair] = OperationType.SwapOnly;
    }
  }

  /**
   * @notice Set swap router status
   */
  function setSwapRouter(address router, bool _isRouter) external onlyOwner validAddress(router) {
    isSwapRouter[router] = _isRouter;
    if (_isRouter) {
      addressOperationType[router] = OperationType.SwapOnly;
    }
  }

  /**
   * @notice Set position manager status
   */
  function setPositionManager(address manager, bool _isManager) external onlyOwner validAddress(manager) {
    isPositionManager[manager] = _isManager;
    if (_isManager) {
      addressOperationType[manager] = OperationType.LiquidityOnly;
    }
  }

  /**
   * @notice Set V3 pool status for special handling
   */
  function setV3Pool(address pool, bool _isV3Pool) external onlyOwner validAddress(pool) {
    isV3Pool[pool] = _isV3Pool;
    if (_isV3Pool) {
      addressOperationType[pool] = OperationType.SwapOnly;
    }
  }

  // ========== ERC4626 IMPLEMENTATION ==========

  /**
   * @notice Total amount of underlying LP tokens held by vault
   * @dev This increases over time as LP tokens auto-compound from trading fees
   */
  function totalAssets() public view override returns (uint256) {
    return asset.balanceOf(address(this));
  }

  /**
   * @notice Deposit LP tokens and receive redDRAGON shares
   * @param assets Amount of LP tokens to deposit
   * @param receiver Address to receive shares
   * @return shares Amount of shares minted
   */
  function deposit(
    uint256 assets,
    address receiver
  ) public override onlyInitialized nonReentrant returns (uint256 shares) {
    // Check for sufficient assets and valid receiver
    if (assets == 0) revert InvalidAmount();
    if (receiver == address(0)) revert ZeroAddress();

    // Calculate shares to mint
    shares = previewDeposit(assets);

    // Deposit assets from sender
    asset.safeTransferFrom(msg.sender, address(this), assets);

    // Mint shares to receiver
    _mint(receiver, shares);

    emit Deposit(msg.sender, receiver, assets, shares);
  }

  /**
   * @notice Withdraw LP tokens by burning redDRAGON shares
   * @param assets Amount of LP tokens to withdraw
   * @param receiver Address to receive assets
   * @param owner Address that owns the shares
   * @return shares Amount of shares burned
   */
  function withdraw(
    uint256 assets,
    address receiver,
    address owner
  ) public override onlyInitialized nonReentrant returns (uint256 shares) {
    if (assets == 0) revert InvalidAmount();
    if (receiver == address(0)) revert ZeroAddress();

    shares = previewWithdraw(assets);

    if (msg.sender != owner) {
      uint256 allowed = allowance[owner][msg.sender]; // Saves gas for limited approvals.

      if (allowed != type(uint256).max) allowance[owner][msg.sender] = allowed - shares;
    }

    // Burn shares from owner
    _burn(owner, shares);

    // Transfer assets to receiver
    asset.safeTransfer(receiver, assets);

    emit Withdraw(msg.sender, receiver, owner, assets, shares);
  }

  // Note: transfer() function is implemented above in CORE ERC4626 OVERRIDES section

  // Note: transferFrom() function is implemented above in CORE ERC4626 OVERRIDES section

  // Note: Fee processing handled by _processTradeWithFees above

  // Note: Fee distribution handled by _distributeFees with Fees struct above

  // Note: Initialization handled by initialize() function above

  // Note: Admin functions handled above in ADMIN CONFIGURATION FUNCTIONS section

  // ========== FEEM INTEGRATION ==========

  /**
   * @notice Register with Sonic FeeM system
   * @dev Register my contract on Sonic FeeM for network benefits
   */
  function registerMe() external onlyOwner {
    (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
        abi.encodeWithSignature("selfRegister(uint256)", 143)
    );
    require(_success, "FeeM registration failed");
  }

  // ========== VIEW FUNCTIONS ==========

  /**
   * @notice Get current swap configuration
   * @return swapConfiguration Current swap configuration
   */
  function getSwapConfig() external view returns (SystemConfig memory swapConfiguration) {
    return config;
  }

  /**
   * @notice Get current lottery configuration
   * @return lotteryConfiguration Current lottery configuration
   */
  function getLotteryConfig() external view returns (SystemConfig memory lotteryConfiguration) {
    return config;
  }

  /**
   * @notice Get USD value of redDRAGON shares (simplified - no oracle needed)
   * @return usdValue Always returns 0 (price oracle removed for simplicity)
   */
  function getUSDValue(address /* token */, uint256 /* amount */) public pure returns (uint256 usdValue) {
    return 0; // Simplified - no price oracle integration
  }

  /**
   * @notice Check if address is authorized swap contract
   * @dev Deprecated in pair-based model
   * @return authorized Always returns false
   */
  function isAuthorizedSwapContract(address /* swapContract */) external pure returns (bool authorized) {
    return false; // Deprecated in pair-based model
  }

  /**
   * @notice Get total fees collected
   * @return jackpotFees Total fees sent to jackpot
   * @return revenueFees Total fees sent to revenue distributor
   */
  function getTotalFees() external view returns (uint256 jackpotFees, uint256 revenueFees) {
    return (totalJackpotFees, totalRevenueFees);
  }

  /**
   * @notice Check if contract is initialized
   * @return initialized Whether contract is initialized
   */
  function isInitialized() external view returns (bool) {
    return config.initialized;
  }

  /**
   * @notice Get underlying LP token address
   * @return lpToken Address of underlying LP token
   */
  function getUnderlyingLPToken() external view returns (address lpToken) {
    return address(asset);
  }

  /**
   * @notice Get comprehensive vault statistics
   * @return stats Array of key statistics
   */
  function getStats() external view returns (uint256[7] memory stats) {
    return
      [
        totalSupply, // Total redDRAGON shares
        totalAssets(), // Total LP tokens in vault
        totalJackpotFees,
        totalRevenueFees,
        totalBurnedFees,
        totalTradesProcessed,
        totalLotteryTriggers
      ];
  }
}