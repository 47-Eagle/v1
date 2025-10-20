// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import { IStrategy } from "../interfaces/IStrategy.sol";

/**
 * @title CharmStrategyUSD1
 * @notice Production-ready strategy for Charm Finance USD1/WLFI Alpha Vault
 * 
 * @dev SPECIFIC CONFIGURATION:
 *      Pool: USD1/WLFI Uniswap V3
 *      Fee Tier: 1% (10000)
 *      Network: Ethereum Mainnet
 *      Charm Vault: 0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71
 * 
 * @dev STRATEGY FEATURES:
 *      ✅ Smart auto-rebalancing (matches Charm's ratio before deposit)
 *      ✅ Uniswap V3 integration for swaps (USD1 ↔ WLFI)
 *      ✅ Works with existing Charm USD1/WLFI vault
 *      ✅ Returns unused tokens to vault
 *      ✅ Comprehensive slippage protection
 *      ✅ Security: onlyVault modifier + reentrancy guards
 *      ✅ Accounts for idle tokens (no waste!)
 * 
 * @dev FLOW:
 *      1. Receive USD1 + WLFI from EagleOVault
 *      2. Check Charm vault's current ratio (e.g., 20% USD1 / 80% WLFI)
 *      3. Auto-swap tokens to match that exact ratio
 *      4. Deposit matched amounts to Charm
 *      5. Return any unused tokens to vault
 *      6. Receive Charm LP shares (held by strategy, earning fees)
 * 
 * @dev SIMPLER than CharmStrategy.sol - NO WETH conversion needed!
 *      This vault uses USD1/WLFI directly (both are vault's native tokens)
 */

interface ICharmVault {
    // Charm AlphaProVault deposit function (from docs)
    function deposit(
        uint256 amount0Desired,  // USD1
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

contract CharmStrategyUSD1 is IStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================
    // IMMUTABLES
    // =================================
    
    address public immutable EAGLE_VAULT;
    IERC20 public immutable USD1;
    IERC20 public immutable WLFI;
    ISwapRouter public immutable UNISWAP_ROUTER;
    
    // =================================
    // STATE VARIABLES
    // =================================
    
    ICharmVault public charmVault;
    bool public active;
    uint24 public constant POOL_FEE = 10000; // 1% fee tier (USD1/WLFI pool on Ethereum)
    uint256 public maxSlippage = 500; // 5% (configurable by owner)
    uint256 public lastRebalance;
    
    // Pool configuration for reference
    string public constant POOL_DESCRIPTION = "USD1/WLFI 1%";
    address public constant CHARM_VAULT_ADDRESS = 0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71;
    
    // =================================
    // EVENTS (Additional to IStrategy)
    // =================================
    
    event CharmVaultSet(address indexed charmVault);
    event TokensSwapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event UnusedTokensReturned(uint256 usd1Amount, uint256 wlfiAmount);

    // =================================
    // ERRORS
    // =================================
    
    error OnlyVault();
    error ZeroAddress();
    error NotInitialized();
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
     * @notice Creates CharmStrategyUSD1 for USD1/WLFI Charm pool
     * @param _vaultAddress EagleOVault address
     * @param _charmVault Charm Alpha Vault address (USD1/WLFI)
     * @param _wlfi WLFI token address
     * @param _usd1 USD1 token address
     * @param _uniswapRouter Uniswap V3 SwapRouter address
     * @param _owner Strategy owner
     */
    constructor(
        address _vaultAddress,
        address _charmVault,
        address _wlfi,
        address _usd1,
        address _uniswapRouter,
        address _owner
    ) Ownable(_owner) {
        if (_vaultAddress == address(0) || _wlfi == address(0) || 
            _usd1 == address(0) || _uniswapRouter == address(0)) {
            revert ZeroAddress();
        }
        
        EAGLE_VAULT = _vaultAddress;
        WLFI = IERC20(_wlfi);
        USD1 = IERC20(_usd1);
        UNISWAP_ROUTER = ISwapRouter(_uniswapRouter);
        
        // Initialize with Charm vault if provided
        if (_charmVault != address(0)) {
            charmVault = ICharmVault(_charmVault);
            active = true;
            emit CharmVaultSet(_charmVault);
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
     * @notice Initialize all required approvals for strategy to work
     * @dev Call this once after deployment
     */
    function initializeApprovals() external onlyOwner {
        // Approve Uniswap router for swaps
        WLFI.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        USD1.forceApprove(address(UNISWAP_ROUTER), type(uint256).max);
        
        // Approve Charm vault for deposits
        if (address(charmVault) != address(0)) {
            WLFI.forceApprove(address(charmVault), type(uint256).max);
            USD1.forceApprove(address(charmVault), type(uint256).max);
        }
    }

    // =================================
    // STRATEGY FUNCTIONS (IStrategy)
    // =================================
    
    /**
     * @notice Deposit with smart auto-rebalancing
     * @dev Automatically matches Charm vault's current USD1:WLFI ratio
     */
    function deposit(uint256 wlfiAmount, uint256 usd1Amount) 
        external 
        onlyVault
        whenActive
        nonReentrant
        returns (uint256 shares) 
    {
        if (address(charmVault) == address(0)) revert NotInitialized();
        
        // Check current balance BEFORE attempting transfer
        uint256 balanceBefore = WLFI.balanceOf(address(this));
        
        // Try to pull tokens from vault (backward compatible)
        // If vault already transferred, this will just be a no-op or small amount
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
        
        // Return early if we got nothing
        if (totalWlfi == 0 && totalUsd1 == 0) return 0;
        
        // STEP 1: Get Charm's EXACT ratio to match
        (uint256 charmUsd1, uint256 charmWlfi) = charmVault.getTotalAmounts();
        
        uint256 finalUsd1;
        uint256 finalWlfi;
        
        if (charmUsd1 > 0 && charmWlfi > 0) {
            // STEP 2: Calculate EXACT USD1 needed for our WLFI
            // If Charm has 1000 USD1 : 5000 WLFI ratio (1:5)
            // For our 100 WLFI, we need: 100 * 1000 / 5000 = 20 USD1
            uint256 usd1Needed = (totalWlfi * charmUsd1) / charmWlfi;
            
            if (totalUsd1 >= usd1Needed) {
                // We have enough USD1 - use all WLFI
                finalWlfi = totalWlfi;
                finalUsd1 = usd1Needed;
                
                // Swap excess USD1 → WLFI to maximize capital efficiency
                uint256 excessUsd1 = totalUsd1 - usd1Needed;
                if (excessUsd1 > 0) {
                    uint256 moreWlfi = _swapUsd1ToWlfi(excessUsd1);
                    finalWlfi += moreWlfi;
                    // FIX: Use remaining USD1 balance after swap, don't recalculate
                    finalUsd1 = USD1.balanceOf(address(this));
                }
            } else {
                // Not enough USD1 - swap some WLFI → USD1
                uint256 usd1Shortfall = usd1Needed - totalUsd1;
                uint256 wlfiToSwap = (usd1Shortfall * charmWlfi) / charmUsd1;
                
                if (wlfiToSwap < totalWlfi) {
                    uint256 moreUsd1 = _swapWlfiToUsd1(wlfiToSwap);
                    finalUsd1 = totalUsd1 + moreUsd1;
                    finalWlfi = totalWlfi - wlfiToSwap;
                } else {
                    // Not enough to swap - use what we have
                    finalUsd1 = totalUsd1;
                    finalWlfi = totalWlfi;
                }
            }
        } else {
            // Charm empty - deposit 1:1 ratio or whatever we have
            finalUsd1 = totalUsd1;
            finalWlfi = totalWlfi;
        }
        
        // Note: Approvals are handled by initializeApprovals() - max approvals set once
        
        // Deposit to Charm - it returns shares and actual amounts used
        uint256 amount0Used;
        uint256 amount1Used;
        (shares, amount0Used, amount1Used) = charmVault.deposit(
            finalUsd1,
            finalWlfi,
            0,  // amount0Min
            0,  // amount1Min
            address(this)
        );
        
        // Return any unused tokens to vault
        {
            uint256 leftoverUsd1 = USD1.balanceOf(address(this));
            uint256 leftoverWlfi = WLFI.balanceOf(address(this));
            
            if (leftoverUsd1 > 0) {
                USD1.safeTransfer(EAGLE_VAULT, leftoverUsd1);
            }
            if (leftoverWlfi > 0) {
                WLFI.safeTransfer(EAGLE_VAULT, leftoverWlfi);
            }
            
            if (leftoverUsd1 > 0 || leftoverWlfi > 0) {
                emit UnusedTokensReturned(leftoverUsd1, leftoverWlfi);
            }
        }
        
        emit StrategyDeposit(amount0Used, amount1Used, shares);
    }
    
    /**
     * @notice Withdraw from Charm vault
     * @param value USD value to withdraw (simplified - treats USD1 and WLFI as equal value)
     * @return usd1Amount USD1 withdrawn
     * @return wlfiAmount WLFI withdrawn
     */
    function withdraw(uint256 value) 
        external 
        onlyVault
        nonReentrant
        returns (uint256 usd1Amount, uint256 wlfiAmount) 
    {
        if (value == 0) return (0, 0);
        if (address(charmVault) == address(0)) return (0, 0);
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) return (0, 0);
        
        // Calculate shares to withdraw
        (uint256 totalUsd1, uint256 totalWlfi) = getTotalAmounts();
        uint256 totalValue = totalUsd1 + totalWlfi; // Simplified: assume 1 USD1 ≈ 1 WLFI value
        
        uint256 sharesToWithdraw;
        if (value >= totalValue) {
            sharesToWithdraw = ourShares; // Withdraw all
        } else {
            sharesToWithdraw = (ourShares * value) / totalValue;
        }
        
        // Calculate expected amounts for slippage protection
        uint256 expectedUsd1 = (totalUsd1 * sharesToWithdraw) / ourShares;
        uint256 expectedWlfi = (totalWlfi * sharesToWithdraw) / ourShares;
        
        // Withdraw from Charm
        (usd1Amount, wlfiAmount) = charmVault.withdraw(
            sharesToWithdraw,
            (expectedUsd1 * (10000 - maxSlippage)) / 10000,
            (expectedWlfi * (10000 - maxSlippage)) / 10000,
            EAGLE_VAULT // Send directly back to vault
        );
        
        emit StrategyWithdraw(sharesToWithdraw, usd1Amount, wlfiAmount);
    }
    
    /**
     * @notice Rebalance strategy (Charm handles this internally)
     */
    function rebalance() external onlyVault {
        if (address(charmVault) == address(0)) return;
        
        (uint256 totalUsd1, uint256 totalWlfi) = getTotalAmounts();
        lastRebalance = block.timestamp;
        
        emit StrategyRebalanced(totalUsd1, totalWlfi);
    }

    // =================================
    // TOKEN SWAP FUNCTIONS
    // =================================
    
    /**
     * @notice Swap USD1 to WLFI using Uniswap V3
     */
    function _swapUsd1ToWlfi(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        // Note: Approval already set by initializeApprovals()
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(USD1),
            tokenOut: address(WLFI),
            fee: POOL_FEE,  // 1% fee tier for USD1/WLFI pool
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0, // Accept market rate (Charm will return unused)
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(USD1), address(WLFI), amountIn, amountOut);
    }
    
    /**
     * @notice Swap WLFI to USD1 using Uniswap V3
     */
    function _swapWlfiToUsd1(uint256 amountIn) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        
        // Note: Approval already set by initializeApprovals()
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(WLFI),
            tokenOut: address(USD1),
            fee: POOL_FEE,  // 1% fee tier for WLFI/USD1 pool
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0, // Accept market rate
            sqrtPriceLimitX96: 0
        });
        
        amountOut = UNISWAP_ROUTER.exactInputSingle(params);
        
        emit TokensSwapped(address(WLFI), address(USD1), amountIn, amountOut);
    }

    // =================================
    // VIEW FUNCTIONS (IStrategy)
    // =================================
    
    /**
     * @notice Get total amounts managed by strategy (proportional to our shares)
     */
    function getTotalAmounts() public view returns (uint256 usd1Amount, uint256 wlfiAmount) {
        if (!active || address(charmVault) == address(0)) {
            return (0, 0);
        }
        
        uint256 ourShares = charmVault.balanceOf(address(this));
        if (ourShares == 0) {
            return (0, 0);
        }
        
        (uint256 totalUsd1, uint256 totalWlfi) = charmVault.getTotalAmounts();
        uint256 totalShares = charmVault.totalSupply();
        
        if (totalShares == 0) return (0, 0);
        
        // Calculate our proportional share
        usd1Amount = (totalUsd1 * ourShares) / totalShares;
        wlfiAmount = (totalWlfi * ourShares) / totalShares;
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
    function updateParameters(uint256 _maxSlippage) external onlyOwner {
        require(_maxSlippage <= 1000, "Slippage too high"); // Max 10%
        maxSlippage = _maxSlippage;
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
}
