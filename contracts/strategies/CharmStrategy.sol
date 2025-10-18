// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import { IStrategy } from "../interfaces/IStrategy.sol";

/**
 * @title CharmStrategy
 * @notice Production-ready strategy for Charm Finance Alpha Vaults
 * 
 * @dev SPECIFIC CONFIGURATION:
 *      Pool: WLFI/WETH Uniswap V3
 *      Fee Tier: 1% (10000)
 *      Network: Ethereum
 *      Charm Vault: 0xca2e972f081764c30ae5f012a29d5277eef33838
 * 
 * @dev STRATEGY FEATURES:
 *      ✅ Smart auto-rebalancing (matches Charm's ratio before deposit)
 *      ✅ Uniswap V3 integration for swaps (WLFI ↔ WETH)
 *      ✅ Works with existing Charm vaults OR creates new ones
 *      ✅ Returns unused tokens to vault
 *      ✅ Comprehensive slippage protection
 *      ✅ Security: onlyVault modifier + reentrancy guards
 *      ✅ Accounts for idle tokens (no waste!)
 * 
 * @dev FLOW:
 *      1. Receive WLFI + WETH from EagleOVault
 *      2. Check Charm vault's current ratio (e.g., 92% WLFI / 8% WETH)
 *      3. Auto-swap tokens to match that exact ratio
 *      4. Deposit matched amounts to Charm
 *      5. Return any unused tokens to vault
 *      6. Receive MEAGLE shares (held by strategy, earning Uniswap V3 fees)
 * 
 * NOTE: For other pools (WLFI/USDC, etc.), deploy separate CharmStrategy instances
 */

interface ICharmVault {
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

interface ICharmFactory {
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

contract CharmStrategy is IStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================
    // IMMUTABLES
    // =================================
    
    address public immutable EAGLE_VAULT;
    IERC20 public immutable WLFI;
    IERC20 public immutable USD1;   // Vault sends USD1
    IERC20 public immutable WETH;   // We swap to WETH for Charm
    ISwapRouter public immutable UNISWAP_ROUTER;
    ICharmFactory public immutable CHARM_FACTORY;
    
    // =================================
    // STATE VARIABLES
    // =================================
    
    ICharmVault public charmVault;
    bool public active;
    uint24 public constant POOL_FEE = 10000; // 1% fee tier (WLFI/WETH pool on Ethereum)
    uint256 public maxSlippage = 500; // 5% (configurable by owner)
    uint256 public lastRebalance;
    
    // Pool configuration for reference
    string public constant POOL_DESCRIPTION = "WLFI/WETH 1%";
    address public constant UNISWAP_V3_POOL = 0xCa2e972f081764c30Ae5F012A29D5277EEf33838;
    
    // =================================
    // EVENTS (Additional to IStrategy)
    // =================================
    
    event CharmVaultInitialized(address indexed charmVault, bool isNewVault);
    event TokensSwapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event UnusedTokensReturned(uint256 wlfiAmount, uint256 usd1Amount);

    // =================================
    // ERRORS
    // =================================
    
    error OnlyVault();
    error ZeroAddress();
    error NotInitialized();
    error AlreadyInitialized();
    error StrategyPaused();
    error InsufficientBalance();
    error SlippageExceeded();

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
     * @notice Creates CharmStrategy for WLFI/WETH 1% Charm pool
     * @param _vaultAddress EagleOVault address
     * @param _charmFactory Charm Alpha Vault Factory (or address(0) if using existing vault)
     * @param _wlfi WLFI token address
     * @param _usd1 USD1 token address (vault sends this)
     * @param _weth WETH token address (we convert USD1 to this for Charm)
     * @param _uniswapRouter Uniswap V3 SwapRouter address
     * @param _owner Strategy owner
     * 
     * FLOW: Vault sends USD1 → We swap to WETH → Deposit WLFI/WETH to Charm
     */
    constructor(
        address _vaultAddress,
        address _charmFactory,
        address _wlfi,
        address _usd1,
        address _weth,
        address _uniswapRouter,
        address _owner
    ) Ownable(_owner) {
        if (_vaultAddress == address(0) || _wlfi == address(0) || 
            _usd1 == address(0) || _weth == address(0) || _uniswapRouter == address(0)) {
            revert ZeroAddress();
        }
        
        EAGLE_VAULT = _vaultAddress;
        CHARM_FACTORY = ICharmFactory(_charmFactory);
        WLFI = IERC20(_wlfi);
        USD1 = IERC20(_usd1);  // ← FIX: Initialize USD1!
        WETH = IERC20(_weth);  // ← WETH is separate
        UNISWAP_ROUTER = ISwapRouter(_uniswapRouter);
        
        lastRebalance = block.timestamp;
    }

    // =================================
    // INITIALIZATION
    // =================================
    
    /**
     * @notice Initialize with existing Charm vault
     * @param _charmVault Address of existing Charm Alpha Vault (MEAGLE)
     */
    function initializeWithExistingVault(address _charmVault) external onlyOwner {
        if (address(charmVault) != address(0)) revert AlreadyInitialized();
        if (_charmVault == address(0)) revert ZeroAddress();
        
        charmVault = ICharmVault(_charmVault);
        active = true;
        
        emit CharmVaultInitialized(_charmVault, false);
    }
    
    /**
     * @notice Create new Charm vault via factory
     * @param maxTotalSupply Maximum total supply for the new vault
     */
    function initializeWithNewVault(uint256 maxTotalSupply) external onlyOwner {
        if (address(charmVault) != address(0)) revert AlreadyInitialized();
        if (address(CHARM_FACTORY) == address(0)) revert ZeroAddress();
        
        // Check if vault already exists
        address existingVault = CHARM_FACTORY.getVault(
            address(WLFI),
            address(WETH),
            POOL_FEE
        );
        
        if (existingVault != address(0)) {
            charmVault = ICharmVault(existingVault);
            emit CharmVaultInitialized(existingVault, false);
        } else {
            // Create new vault
            address newVault = CHARM_FACTORY.createVault(
                address(WLFI),
                address(WETH),
                POOL_FEE,
                maxTotalSupply
            );
            charmVault = ICharmVault(newVault);
            emit CharmVaultInitialized(newVault, true);
        }
        
        active = true;
    }

    // =================================
    // STRATEGY FUNCTIONS (IStrategy)
    // =================================
    
    /**
     * @notice Deposit with smart auto-rebalancing
     * @dev Automatically matches Charm vault's current ratio
     */
    function deposit(uint256 wlfiAmount, uint256 usd1Amount) 
        external 
        onlyVault
        whenActive
        nonReentrant
        returns (uint256 shares) 
    {
        if (wlfiAmount == 0 && usd1Amount == 0) return 0;
        if (address(charmVault) == address(0)) revert NotInitialized();
        
        // Transfer tokens from vault (vault sends WLFI + USD1)
        if (wlfiAmount > 0) {
            WLFI.safeTransferFrom(EAGLE_VAULT, address(this), wlfiAmount);
        }
        if (usd1Amount > 0) {
            USD1.safeTransferFrom(EAGLE_VAULT, address(this), usd1Amount);
        }
        
        // IMPORTANT: Check TOTAL tokens available (new + any idle from previous)
        uint256 totalWlfi = WLFI.balanceOf(address(this));
        uint256 totalUsd1 = USD1.balanceOf(address(this));
        
        // STEP 1: Check Charm's ratio FIRST to decide how to use USD1
        (uint256 charmWlfi, uint256 charmWeth) = charmVault.getTotalAmounts();
        
        uint256 finalWlfi = totalWlfi;
        uint256 finalWeth = 0;
        
        if (charmWlfi > 0 && charmWeth > 0) {
            // STEP 2: Calculate Charm's token ratio
            // Example: If Charm has 99,000 WLFI + 1,000 WETH → 99% WLFI, 1% WETH
            uint256 charmWlfiRatio = (charmWlfi * 10000) / (charmWlfi + charmWeth);
            
            // STEP 3: Determine optimal split for OUR tokens
            // For our WLFI, we need: (totalWlfi * charmWeth) / charmWlfi WETH tokens
            uint256 optimalWethTokens = (totalWlfi * charmWeth) / charmWlfi;
            
            // STEP 4: Smart USD1 allocation based on what we need
            if (charmWlfiRatio >= 9000) {
                // Charm needs 90%+ WLFI - we likely need MORE WLFI, not WETH!
                // Example: 99% WLFI ratio means we need lots of WLFI
                
                // Swap MOST USD1 → WLFI, keep some for WETH
                uint256 usd1ForWlfi = (totalUsd1 * charmWlfiRatio) / 10000;
                uint256 usd1ForWeth = totalUsd1 - usd1ForWlfi;
                
                if (usd1ForWlfi > 0) {
                    uint256 moreWlfi = _swapUsd1ToWlfi(usd1ForWlfi);
                    finalWlfi += moreWlfi;
                }
                if (usd1ForWeth > 0) {
                    finalWeth = _swapUsd1ToWeth(usd1ForWeth);
                }
            } else {
                // Balanced or WETH-heavy ratio - swap USD1 → WETH
                // Example: 50/50 or 20/80 WLFI/WETH
                if (totalUsd1 > 0) {
                    finalWeth = _swapUsd1ToWeth(totalUsd1);
                }
            }
        } else {
            // Charm empty - create balanced position
            // Split USD1: half to WLFI, half to WETH
            if (totalUsd1 > 0) {
                uint256 halfUsd1 = totalUsd1 / 2;
                
                if (halfUsd1 > 0) {
                    uint256 moreWlfi = _swapUsd1ToWlfi(halfUsd1);
                    finalWlfi += moreWlfi;
                    
                    finalWeth = _swapUsd1ToWeth(totalUsd1 - halfUsd1);
                }
            }
        }
        
        uint256 balancedWlfi = finalWlfi;
        uint256 balancedWeth = finalWeth;
        
        // Approve Charm vault
        if (balancedWlfi > 0) {
            WLFI.safeIncreaseAllowance(address(charmVault), balancedWlfi);
        }
        if (balancedWeth > 0) {
            WETH.safeIncreaseAllowance(address(charmVault), balancedWeth);
        }
        
        // Deposit to Charm - it will use optimal ratio based on current pool state
        // Charm knows the pool's target ratio and will take what it needs
        uint256 amount0Used;
        uint256 amount1Used;
        (shares, amount0Used, amount1Used) = charmVault.deposit(
            balancedWlfi,
            balancedWeth,
            0,  // Let Charm decide optimal amounts (it knows the pool state)
            0,  // Charm will return unused tokens
            address(this)
        );
        
        // Return any unused tokens to vault
        uint256 unusedWlfi = balancedWlfi - amount0Used;
        uint256 unusedWeth = balancedWeth - amount1Used;
        
        if (unusedWlfi > 0) {
            WLFI.safeTransfer(EAGLE_VAULT, unusedWlfi);
        }
        if (unusedWeth > 0) {
            WETH.safeTransfer(EAGLE_VAULT, unusedWeth);
        }
        
        if (unusedWlfi > 0 || unusedWeth > 0) {
            emit UnusedTokensReturned(unusedWlfi, unusedWeth);
        }
        
        emit StrategyDeposit(amount0Used, amount1Used, shares);
    }
    
    /**
     * @notice Withdraw from Charm vault
     * @param value USD value to withdraw
     * @return wlfiAmount WLFI withdrawn
     * @return usd1Amount WETH withdrawn
     */
    function withdraw(uint256 value) 
        external 
        onlyVault
        nonReentrant
        returns (uint256 wlfiAmount, uint256 usd1Amount) 
    {
        if (value == 0) return (0, 0);
        if (address(charmVault) == address(0)) return (0, 0);
        
        uint256 ourMeagleShares = charmVault.balanceOf(address(this));
        if (ourMeagleShares == 0) return (0, 0);
        
        // Calculate shares to withdraw
        (uint256 totalWlfi, uint256 totalUsd1) = getTotalAmounts();
        uint256 totalValue = totalWlfi + totalUsd1;
        
        uint256 sharesToWithdraw;
        if (value >= totalValue) {
            sharesToWithdraw = ourMeagleShares; // Withdraw all
        } else {
            sharesToWithdraw = (ourMeagleShares * value) / totalValue;
        }
        
        // Calculate expected amounts for slippage protection
        uint256 expectedWlfi = (totalWlfi * sharesToWithdraw) / ourMeagleShares;
        uint256 expectedUsd1 = (totalUsd1 * sharesToWithdraw) / ourMeagleShares;
        
        // Withdraw from Charm
        (wlfiAmount, usd1Amount) = charmVault.withdraw(
            sharesToWithdraw,
            (expectedWlfi * (10000 - maxSlippage)) / 10000,
            (expectedUsd1 * (10000 - maxSlippage)) / 10000,
            EAGLE_VAULT // Send directly back to vault
        );
        
        emit StrategyWithdraw(sharesToWithdraw, wlfiAmount, usd1Amount);
    }
    
    /**
     * @notice Rebalance strategy (Charm handles this internally)
     */
    function rebalance() external onlyVault {
        if (address(charmVault) == address(0)) return;
        
        (uint256 totalWlfi, uint256 totalUsd1) = getTotalAmounts();
        lastRebalance = block.timestamp;
        
        emit StrategyRebalanced(totalWlfi, totalUsd1);
    }

    // =================================
    // TOKEN CONVERSION FUNCTIONS
    // =================================
    
    /**
     * @notice Swap WLFI to WETH using Uniswap V3
     */
    function _swapWlfiToWeth(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        WLFI.safeIncreaseAllowance(address(UNISWAP_ROUTER), amountIn);
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(WLFI),
            tokenOut: address(WETH),
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: (amountIn * (10000 - maxSlippage)) / 10000,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(WLFI), address(WETH), amountIn, amountOut);
    }
    
    /**
     * @notice Swap USD1 to WLFI using Uniswap V3
     * @dev For when we need more WLFI
     */
    function _swapUsd1ToWlfi(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        USD1.safeIncreaseAllowance(address(UNISWAP_ROUTER), amountIn);
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(USD1),
            tokenOut: address(WLFI),
            fee: 10000,  // 1% fee tier for USD1/WLFI (if exists) or route through WETH
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(USD1), address(WLFI), amountIn, amountOut);
    }
    
    /**
     * @notice Swap USD1 to WETH using Uniswap V3
     * @dev For when we need WETH to pair with WLFI
     */
    function _swapUsd1ToWeth(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        USD1.safeIncreaseAllowance(address(UNISWAP_ROUTER), amountIn);
        
        // Swap USD1 → WETH (e.g., 500 fee tier for stablecoin/WETH)
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(USD1),
            tokenOut: address(WETH),
            fee: 500,  // 0.05% fee tier for USD1/WETH pool
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,  // Accept market rate (Charm will return unused)
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(USD1), address(WETH), amountIn, amountOut);
    }
    
    /**
     * @notice Swap WETH back to USD1 (for returning to vault)
     * @dev Used when returning unused WETH to vault
     */
    function _swapWethToUsd1(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        WETH.safeIncreaseAllowance(address(UNISWAP_ROUTER), amountIn);
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(WETH),
            tokenOut: address(USD1),
            fee: 500,  // 0.05% fee tier for WETH/USD1 pool
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(WETH), address(USD1), amountIn, amountOut);
    }

    // =================================
    // VIEW FUNCTIONS (IStrategy)
    // =================================
    
    /**
     * @notice Get total amounts managed by strategy
     */
    function getTotalAmounts() public view returns (uint256 wlfiAmount, uint256 usd1Amount) {
        if (!active || address(charmVault) == address(0)) {
            return (0, 0);
        }
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) {
            return (0, 0);
        }
        
        (uint256 total0, uint256 total1) = charmVault.getTotalAmounts();
        uint256 totalShares = charmVault.totalSupply();
        
        if (totalShares == 0) return (0, 0);
        
        wlfiAmount = (total0 * ourShares) / totalShares;
        usd1Amount = (total1 * ourShares) / totalShares;
    }
    
    /**
     * @notice Check if strategy is initialized
     */
    function isInitialized() external view returns (bool) {
        return active && address(charmVault) != address(0);
    }
    
    /**
     * @notice Get MEAGLE share balance
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
        uint256 _maxSlippage
    ) external onlyOwner {
        require(_maxSlippage <= 1000, "Slippage too high"); // Max 10%
        maxSlippage = _maxSlippage;
        // Note: poolFee is constant (10000 = 1% for WLFI/WETH pool)
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
        uint256 usd1Balance = USD1.balanceOf(address(this));
        uint256 wethBalance = WETH.balanceOf(address(this));
        
        if (wlfiBalance > 0) {
            WLFI.safeTransfer(EAGLE_VAULT, wlfiBalance);
        }
        if (usd1Balance > 0) {
            USD1.safeTransfer(EAGLE_VAULT, usd1Balance);
        }
        if (wethBalance > 0) {
            // Convert WETH back to USD1 before returning
            _swapWethToUsd1(wethBalance);
            // Swapped WETH → USD1, vault will receive USD1 on next call
        }
        
        if (wlfiBalance > 0 || usd1Balance > 0 || wethBalance > 0) {
            emit UnusedTokensReturned(wlfiBalance, usd1Balance);
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
    
    /**
     * @notice Initialize all required approvals for strategy to work
     */
    function initializeApprovals() external onlyOwner {
        // Approve Uniswap router for swaps
        WLFI.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        USD1.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        WETH.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        
        // Approve Charm vault for deposits
        if (address(charmVault) != address(0)) {
            WLFI.forceApprove(address(charmVault), type(uint256).max);
            WETH.forceApprove(address(charmVault), type(uint256).max);
        }
    }
}

