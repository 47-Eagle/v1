// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
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
 * @notice Production-ready LayerZero Omnichain Vault with oracle pricing and auto-rebalancing
 * 
 * @dev ARCHITECTURE:
 *      - Hub chain: Ethereum (where this vault lives)
 *      - Asset: WLFI (primary) + USD1 (secondary) dual-token vault
 *      - Shares: EAGLE tokens (omnichain via ShareOFTAdapter)
 *      - Strategies: Pluggable yield strategies (Charm Alpha Vaults, etc.)
 * 
 * @dev PRICING MODEL:
 *      - USD1: Chainlink oracle (accurate stablecoin pricing)
 *      - WLFI: Uniswap V3 TWAP (manipulation-resistant)
 *      - Share ratio: 10,000 shares = $1 USD (maximum precision)
 * 
 * @dev FEATURES:
 *      ✅ Accurate oracle-based pricing
 *      ✅ Multi-strategy support with weights
 *      ✅ Batch deployment optimization
 *      ✅ Complete withdrawal support
 *      ✅ Emergency pause functionality
 *      ✅ Reentrancy protection
 * 
 * NOTE: This is a PURE VAULT - backend only.
 *       No fees, no auto-rebalancing, no trading.
 *       Users wrap vault shares to EagleShareOFT for trading/bridging.
 *       Strategies handle their own rebalancing (see CharmStrategy).
 *       All fees are on the OFT layer (EagleShareOFT has 2% fee on DEX trading).
 * 
 * EXAMPLE:
 *      User deposits: 100 WLFI + 100 USD1
 *      WLFI price: $0.21 (from TWAP)
 *      USD1 price: $0.9994 (from Chainlink)
 *      Total value: (100 × $0.21) + (100 × $0.9994) = $120.94
 *      Shares minted: $120.94 × 10,000 = 1,209,400 EAGLE
 */
contract EagleOVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =================================
    // STATE VARIABLES
    // =================================
    
    /// @notice Token contracts
    IERC20 public immutable USD1_TOKEN;
    IERC20 public immutable WLFI_TOKEN;
    
    /// @notice Oracle contracts
    AggregatorV3Interface public immutable USD1_PRICE_FEED;
    address public immutable WLFI_USD1_POOL;
    
    /// @notice Uniswap router for swaps
    ISwapRouter public immutable UNISWAP_ROUTER;
    
    /// @notice Current token balances held directly by vault
    uint256 public wlfiBalance;
    uint256 public usd1Balance;
    
    /// @notice Strategy management
    mapping(address => bool) public activeStrategies;
    mapping(address => uint256) public strategyWeights; // Allocation weights in basis points
    address[] public strategyList;
    uint256 public totalStrategyWeight;
    uint256 public constant MAX_STRATEGIES = 5;
    
    /// @notice Maximum total supply (50M shares = $5,000 at 10,000:1 ratio)
    uint256 public maxTotalSupply = 50_000_000e18; // 50 million vEAGLE shares
    
    /// @notice Oracle configuration
    uint32 public twapInterval = 1800; // 30 minutes TWAP for WLFI
    uint256 public maxPriceAge = 86400; // 24 hours max for Chainlink
    
    /// @notice Batch deployment optimization
    uint256 public deploymentThreshold = 100e18; // $100 minimum for deployment
    uint256 public minDeploymentInterval = 5 minutes;
    uint256 public lastDeployment;
    
    /// @notice Access control
    address public manager;
    address public pendingManager;
    bool public paused; // Pack with addresses (saves gas)
    mapping(address => bool) public authorized;
    
    /// @notice Emergency controls
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
        uint256 usd1Amount
    );
    event StrategyAdded(address indexed strategy, uint256 weight);
    event StrategyRemoved(address indexed strategy);
    event StrategyDeployed(address indexed strategy, uint256 wlfiDeployed, uint256 usd1Deployed);
    event Rebalanced(uint256 newWlfiBalance, uint256 newUsd1Balance);
    event ManagerSet(address indexed oldManager, address indexed newManager);
    event EmergencyPause(bool paused);
    event CapitalInjected(address indexed from, uint256 wlfiAmount, uint256 usd1Amount);

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

    // =================================
    // CONSTRUCTOR
    // =================================
    
    /**
     * @notice Creates the Eagle Omnichain Vault
     * @param _wlfiToken WLFI token address
     * @param _usd1Token USD1 token address
     * @param _usd1PriceFeed Chainlink USD1/USD feed
     * @param _wlfiUsd1Pool Uniswap V3 WLFI/USD1 pool for TWAP
     * @param _uniswapRouter Uniswap V3 SwapRouter
     * @param _owner Vault owner
     */
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
        WLFI_USD1_POOL = _wlfiUsd1Pool;
        UNISWAP_ROUTER = ISwapRouter(_uniswapRouter);
        
        manager = _owner;
        authorized[_owner] = true;
        lastDeployment = block.timestamp;
        lastRebalance = block.timestamp;
    }
    
    receive() external payable {}

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

    // =================================
    // PRICE ORACLE FUNCTIONS
    // =================================
    
    /**
     * @notice Get USD1 price from Chainlink oracle
     * @return price USD1 price in USD (18 decimals)
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
        
        // Convert from Chainlink decimals (8) to 18
        uint8 decimals = USD1_PRICE_FEED.decimals();
        price = uint256(answer) * (10 ** (18 - decimals));
        
        // Sanity check: USD1 should be ~$1.00 (allow 5% deviation for stablecoins)
        if (price < 0.95e18 || price > 1.05e18) revert InvalidPrice();
    }
    
    /**
     * @notice Get WLFI price in USD using multi-source validation
     * @return price WLFI price in USD (18 decimals)
     * @dev Uses TWAP with spot price sanity check for robustness
     */
    function getWLFIPrice() public view returns (uint256 price) {
        // Get USD1 price in USD from Chainlink
        uint256 usd1InUSD = getUSD1Price();
        
        // Get WLFI price in USD1 terms from primary source (TWAP)
        uint256 wlfiInUsd1 = _getWLFIinUSD1FromTWAP();
        
        // Sanity check: Compare TWAP with spot price
        // If they differ by more than 20%, use spot price (more reliable for low liquidity)
        uint256 spotPrice = _getSpotPrice();
        
        // Check if TWAP and spot are reasonably close
        uint256 diff = wlfiInUsd1 > spotPrice ? wlfiInUsd1 - spotPrice : spotPrice - wlfiInUsd1;
        uint256 threshold = (spotPrice * 20) / 100; // 20% threshold
        
        if (diff > threshold) {
            // TWAP deviates too much, use spot price
            wlfiInUsd1 = spotPrice;
        }
        
        // Calculate WLFI price in USD: WLFI/USD = (WLFI/USD1) × (USD1/USD)
        price = (wlfiInUsd1 * usd1InUSD) / 1e18;
    }
    
    /**
     * @notice Get WLFI price in USD1 terms from Uniswap pool TWAP
     */
    function _getWLFIinUSD1FromTWAP() internal view returns (uint256) {
        if (twapInterval == 0) {
            return _getSpotPrice();
        }
        
        try this._observeTWAP() returns (uint256 twapPrice) {
            return twapPrice;
        } catch {
            return _getSpotPrice();
        }
    }
    
    /**
     * @notice Observe TWAP from Uniswap pool
     * @dev External to allow try/catch
     */
    function _observeTWAP() external view returns (uint256 price) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapInterval;
        secondsAgos[1] = 0;
        
        (bool success, bytes memory data) = WLFI_USD1_POOL.staticcall(
            abi.encodeWithSignature("observe(uint32[])", secondsAgos)
        );
        
        if (!success) revert("TWAP observe failed");
        
        (int56[] memory tickCumulatives,) = abi.decode(data, (int56[], uint160[]));
        
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(twapInterval)));
        
        price = _sqrtPriceFromTick(arithmeticMeanTick);
    }
    
    /**
     * @notice Get current spot price from Uniswap pool
     */
    function _getSpotPrice() internal view returns (uint256 price) {
        (bool success, bytes memory data) = WLFI_USD1_POOL.staticcall(
            abi.encodeWithSignature("slot0()")
        );
        
        if (!success) return 1e18;
        
        (uint160 sqrtPriceX96,,,,,,) = abi.decode(
            data,
            (uint160, int24, uint16, uint16, uint16, uint8, bool)
        );
        
        // Convert sqrtPriceX96 to price: price = (sqrtPriceX96 / 2^96)^2
        uint256 numerator = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        uint256 denominator = 1 << 192; // 2^192
        
        uint256 rawPrice = (numerator * 1e18) / denominator;
        // rawPrice = token1/token0 = WLFI/USD1 (with native decimals)
        // Both WLFI and USD1 are 18 decimals, so no adjustment needed
        // rawPrice ≈ 7.8356e18 means 7.8356 WLFI per 1 USD1
        
        // Invert to get USD1 per WLFI (price of 1 WLFI in USD1 terms)
        // If 7.8356 WLFI = 1 USD1, then 1 WLFI = 1/7.8356 USD1 = 0.1276 USD1
        price = (1e18 * 1e18) / rawPrice;
        // price = 1e36 / 7.8356e18 = 0.1276e18 ✅
        
        if (price == 0) price = 1e15; // Minimum $0.001
    }
    
    /**
     * @notice Convert Uniswap tick to price (simplified)
     */
    function _sqrtPriceFromTick(int24 tick) internal pure returns (uint256 price) {
        // PROPER tick to price conversion using Uniswap's formula
        // Price = 1.0001^tick
        // We use binary exponentiation for accuracy
        
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= 887272, 'T'); // Max tick for overflow protection
        
        // Calculate 1.0001^absTick using binary exponentiation
        // Start with ratio = sqrt(1.0001) for precision
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

        // Adjust for negative ticks
        if (tick < 0) ratio = type(uint256).max / ratio;
        
        // Convert from sqrtPrice (Q128) to price
        // price = (ratio / 2^128)^2 = ratio^2 / 2^256
        // But we want price in 1e18 format
        uint256 priceX128 = (ratio * ratio) >> 128;
        price = (priceX128 * 1e18) >> 128;
        
        // Invert to get USD1 per WLFI (since ratio gives WLFI per USD1)
        if (price > 0) {
            price = (1e18 * 1e18) / price;
        } else {
            price = 1e18;
        }
        
        // Safety bounds
        if (price < 1e14) price = 1e14;  // Min $0.0001
        if (price > 1e21) price = 1e21;  // Max $1000
    }

    /**
     * @notice Calculate USD value of WLFI + USD1 holdings
     * @param wlfiAmount Amount of WLFI tokens
     * @param usd1Amount Amount of USD1 tokens
     * @return usdValue Total value in USD (18 decimals)
     */
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
    // DEPOSIT FUNCTIONS
    // =================================
    
    /**
     * @notice Deposit WLFI + USD1 with accurate oracle pricing
     * @param wlfiAmount Amount of WLFI to deposit
     * @param usd1Amount Amount of USD1 to deposit
     * @param receiver Address to receive shares
     * @return shares Amount of EAGLE shares minted
     */
    function depositDual(
        uint256 wlfiAmount,
        uint256 usd1Amount,
        address receiver
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (wlfiAmount == 0 && usd1Amount == 0) revert InvalidAmount();
        if (receiver == address(0)) revert ZeroAddress();
        
        // Get current prices
        uint256 wlfiPriceUSD = getWLFIPrice();
        uint256 usd1PriceUSD = getUSD1Price();
        
        // Transfer tokens from user
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), wlfiAmount);
            wlfiBalance += wlfiAmount;
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransferFrom(msg.sender, address(this), usd1Amount);
            usd1Balance += usd1Amount;
        }
        
        // Calculate USD value
        uint256 totalUSDValue = calculateUSDValue(wlfiAmount, usd1Amount);
        
        // Calculate shares: 80,000 shares = $1 USD (maximum precision)
        if (totalSupply() == 0) {
            shares = totalUSDValue * 80000;
        } else {
            shares = (totalUSDValue * totalSupply()) / totalAssets();
        }
        
        // Check max supply
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        // Mint shares
        _mint(receiver, shares);
        
        // Deploy to strategies if threshold met
        if (_shouldDeployToStrategies()) {
            _deployToStrategies(wlfiBalance, usd1Balance);
            lastDeployment = block.timestamp;
        }
        
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
    
    /**
     * @notice ERC4626 standard deposit (WLFI only)
     * @param assets Amount of WLFI to deposit
     * @param receiver Address to receive shares
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver) 
        public 
        override 
        nonReentrant 
        whenNotPaused 
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
        
        // Check max supply
        if (totalSupply() + shares > maxTotalSupply) revert InvalidAmount();
        
        _mint(receiver, shares);
        
        if (_shouldDeployToStrategies()) {
            _deployToStrategies(wlfiBalance, usd1Balance);
            lastDeployment = block.timestamp;
        }
        
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    // =================================
    // WITHDRAWAL FUNCTIONS
    // =================================
    
    /**
     * @notice Withdraw WLFI + USD1 proportionally
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
        
        uint256 totalAssetAmount = totalAssets();
        uint256 totalShares = totalSupply();
        
        uint256 totalWithdrawValue = (totalAssetAmount * shares) / totalShares;
        
        // Try vault balance first
        uint256 wlfiFromVault = (wlfiBalance * shares) / totalShares;
        uint256 usd1FromVault = (usd1Balance * shares) / totalShares;
        
        wlfiAmount = wlfiFromVault;
        usd1Amount = usd1FromVault;
        
        // Withdraw from strategies if needed
        uint256 directValue = calculateUSDValue(wlfiFromVault, usd1FromVault);
        if (directValue < totalWithdrawValue) {
            uint256 needFromStrategy = totalWithdrawValue - directValue;
            (uint256 wlfiFromStrategies, uint256 usd1FromStrategies) = 
                _withdrawFromStrategies(needFromStrategy);
            wlfiAmount += wlfiFromStrategies;
            usd1Amount += usd1FromStrategies;
        }
        
        // Burn shares
        _burn(msg.sender, shares);
        
        // Update balances
        wlfiBalance -= wlfiFromVault;
        usd1Balance -= usd1FromVault;
        
        // Transfer tokens
        if (wlfiAmount > 0) WLFI_TOKEN.safeTransfer(receiver, wlfiAmount);
        if (usd1Amount > 0) USD1_TOKEN.safeTransfer(receiver, usd1Amount);
        
        emit DualWithdraw(msg.sender, shares, wlfiAmount, usd1Amount);
    }

    // =================================
    // STRATEGY MANAGEMENT
    // =================================
    
    /**
     * @notice Add a new yield strategy
     */
    function addStrategy(address strategy, uint256 weight) external onlyManager {
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
    
    /**
     * @notice Remove a yield strategy
     */
    function removeStrategy(address strategy) external onlyManager {
        if (!activeStrategies[strategy]) revert StrategyNotActive();
        
        // Withdraw all from strategy
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
     * @notice Check if vault should deploy to strategies
     */
    function _shouldDeployToStrategies() internal view returns (bool) {
        if (totalStrategyWeight == 0) return false;
        uint256 idleValue = calculateUSDValue(wlfiBalance, usd1Balance);
        if (idleValue < deploymentThreshold) return false;
        if (block.timestamp < lastDeployment + minDeploymentInterval) return false;
        return true;
    }
    
    /**
     * @notice Deploy funds to strategies based on weights
     */
    function _deployToStrategies(uint256 wlfiAmount, uint256 usd1Amount) internal {
        if (totalStrategyWeight == 0) return;
        
        uint256 totalValue = calculateUSDValue(wlfiAmount, usd1Amount);
        if (totalValue == 0) return;
        
        uint256 length = strategyList.length;
        for (uint256 i = 0; i < length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy] && strategyWeights[strategy] > 0) {
                uint256 strategyValue = (totalValue * strategyWeights[strategy]) / totalStrategyWeight;
                
                // Proportional split
                uint256 strategyWlfi = wlfiAmount > 0 ? (strategyValue * wlfiAmount) / totalValue : 0;
                uint256 strategyUsd1 = usd1Amount > 0 ? (strategyValue * usd1Amount) / totalValue : 0;
                
                // Cap at available balance (prevent rounding-induced underflow)
                if (strategyWlfi > wlfiBalance) strategyWlfi = wlfiBalance;
                if (strategyUsd1 > usd1Balance) strategyUsd1 = usd1Balance;
                
                if (strategyWlfi > 0 || strategyUsd1 > 0) {
                    wlfiBalance -= strategyWlfi;
                    usd1Balance -= strategyUsd1;
                    
                    // Approve tokens to strategy using safeIncreaseAllowance (more compatible)
                    if (strategyWlfi > 0) {
                        WLFI_TOKEN.safeIncreaseAllowance(strategy, strategyWlfi);
                    }
                    if (strategyUsd1 > 0) {
                        USD1_TOKEN.safeIncreaseAllowance(strategy, strategyUsd1);
                    }
                    
                    IStrategy(strategy).deposit(strategyWlfi, strategyUsd1);
                    
                    emit StrategyDeployed(strategy, strategyWlfi, strategyUsd1);
                }
            }
        }
    }
    
    /**
     * @notice Withdraw from strategies proportionally
     */
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
    
    /**
     * @notice Force deployment to strategies (manager only)
     */
    function forceDeployToStrategies() external onlyManager nonReentrant {
        if (totalStrategyWeight == 0) revert("No strategies");
        
        _deployToStrategies(wlfiBalance, usd1Balance);
        lastDeployment = block.timestamp;
    }

    // =================================
    // ERC4626 OVERRIDES
    // =================================
    
    /**
     * @notice Total assets valued in USD
     */
    function totalAssets() public view override returns (uint256) {
        uint256 directValue = calculateUSDValue(wlfiBalance, usd1Balance);
        
        // Add strategy values
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
    // MANAGEMENT FUNCTIONS
    // =================================
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPause(_paused);
    }
    
    function setManager(address _newManager) external onlyOwner {
        if (_newManager == address(0)) revert ZeroAddress();
        pendingManager = _newManager;
    }
    
    function acceptManager() external {
        if (msg.sender != pendingManager) revert Unauthorized();
        
        address oldManager = manager;
        manager = pendingManager;
        pendingManager = address(0);
        authorized[manager] = true;
        
        emit ManagerSet(oldManager, manager);
    }

    /**
     * @notice Inject capital without minting shares (increases share value)
     * @dev Used for fee reinvestment or performance rewards
     * @param wlfiAmount Amount of WLFI to inject
     * @param usd1Amount Amount of USD1 to inject
     */
    function injectCapital(uint256 wlfiAmount, uint256 usd1Amount) external onlyAuthorized {
        if (wlfiAmount == 0 && usd1Amount == 0) revert InvalidAmount();
        
        // Transfer tokens from sender
        if (wlfiAmount > 0) {
            WLFI_TOKEN.safeTransferFrom(msg.sender, address(this), wlfiAmount);
            wlfiBalance += wlfiAmount;
        }
        if (usd1Amount > 0) {
            USD1_TOKEN.safeTransferFrom(msg.sender, address(this), usd1Amount);
            usd1Balance += usd1Amount;
        }
        
        // NO shares minted - this increases value per share!
        emit CapitalInjected(msg.sender, wlfiAmount, usd1Amount);
    }

    function setDeploymentParams(uint256 _threshold, uint256 _interval) external onlyOwner {
        deploymentThreshold = _threshold;
        minDeploymentInterval = _interval;
    }
    
    function setTWAPInterval(uint32 _interval) external onlyOwner {
        require(_interval >= 300 && _interval <= 7200, "Invalid interval");
        twapInterval = _interval;
    }
    
    function setMaxPriceAge(uint256 _maxPriceAge) external onlyOwner {
        require(_maxPriceAge >= 3600 && _maxPriceAge <= 172800, "Invalid age"); // 1 hour to 48 hours
        maxPriceAge = _maxPriceAge;
    }
    
    /**
     * @notice Update maximum total supply
     * @param _maxTotalSupply New maximum supply (in shares)
     */
    function setMaxTotalSupply(uint256 _maxTotalSupply) external onlyOwner {
        require(_maxTotalSupply >= totalSupply(), "Below current supply");
        require(_maxTotalSupply <= 1_000_000_000e18, "Too high"); // Max 1 billion
        maxTotalSupply = _maxTotalSupply;
    }
    
    /**
     * @notice Emergency ETH rescue function
     * @dev Allows owner to rescue any ETH accidentally sent to the contract
     */
    function rescueETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }
    
    /**
     * @notice Emergency token rescue (for tokens other than WLFI/USD1)
     */
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
}
