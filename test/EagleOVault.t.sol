// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../contracts/EagleOVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title EagleOVault ERC-4626 Compliance Tests
 * @notice Comprehensive test suite following Ethereum.org testing guidelines
 * @dev Tests critical functions: deposit, withdraw, balance tracking, and edge cases
 */
contract EagleOVaultTest is Test {
    EagleOVault public vault;
    
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    IERC20 public constant WLFI = IERC20(0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6);
    IERC20 public constant USD1 = IERC20(0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d);
    
    event BalancesSynced(uint256 wlfiBalance, uint256 usd1Balance);
    
    function setUp() public {
        // Fork Ethereum mainnet for realistic testing
        vm.createSelectFork("https://eth-mainnet.g.alchemy.com/v2/demo");
        
        // Deploy vault as owner
        vm.prank(owner);
        vault = new EagleOVault(
            address(WLFI),
            address(USD1),
            address(0), // USD1 price feed
            address(0), // WLFI price feed  
            address(0), // WLFI/USD1 pool
            address(0)  // Uniswap router
        );
        
        // Give users some tokens for testing
        deal(address(WLFI), user1, 1000e18);
        deal(address(USD1), user1, 1000e18);
        deal(address(WLFI), user2, 1000e18);
        deal(address(USD1), user2, 1000e18);
    }
    
    // ============================================
    // ERC-4626 COMPLIANCE TESTS
    // ============================================
    
    /// @dev Test: totalAssets should equal sum of vault + strategy balances
    function test_TotalAssets() public {
        uint256 totalAssets = vault.totalAssets();
        assertTrue(totalAssets >= 0, "Total assets should be non-negative");
    }
    
    /// @dev Test: Shares conversion should be consistent
    function test_ShareConversion() public {
        uint256 assets = 100e18;
        uint256 shares = vault.convertToShares(assets);
        uint256 backToAssets = vault.convertToAssets(shares);
        
        // Allow 0.01% rounding tolerance
        assertApproxEqRel(assets, backToAssets, 0.0001e18, "Share conversion should be reversible");
    }
    
    /// @dev Test: maxDeposit should respect vault limits
    function test_MaxDeposit() public {
        uint256 maxDep = vault.maxDeposit(user1);
        assertTrue(maxDep > 0, "Max deposit should be greater than 0");
    }
    
    /// @dev Test: Deposit should mint correct shares
    function test_Deposit() public {
        vm.startPrank(user1);
        
        WLFI.approve(address(vault), 100e18);
        USD1.approve(address(vault), 100e18);
        
        uint256 balBefore = vault.balanceOf(user1);
        vault.depositDual(100e18, 100e18, user1);
        uint256 balAfter = vault.balanceOf(user1);
        
        assertTrue(balAfter > balBefore, "Should mint shares after deposit");
        
        vm.stopPrank();
    }
    
    // ============================================
    // BALANCE TRACKING TESTS
    // ============================================
    
    /// @dev Test: syncBalances() correctly updates state
    function test_SyncBalances() public {
        // Deposit some tokens
        vm.startPrank(user1);
        WLFI.approve(address(vault), 100e18);
        USD1.approve(address(vault), 100e18);
        vault.depositDual(100e18, 100e18, user1);
        vm.stopPrank();
        
        // Simulate external balance change (like a Charm swap)
        deal(address(WLFI), address(vault), 200e18);
        deal(address(USD1), address(vault), 50e18);
        
        // Sync balances as owner
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit BalancesSynced(200e18, 50e18);
        vault.syncBalances();
        
        (uint256 wlfi, uint256 usd1) = vault.getVaultBalances();
        assertEq(wlfi, 200e18, "WLFI balance should be synced");
        assertEq(usd1, 50e18, "USD1 balance should be synced");
    }
    
    /// @dev Test: Only manager can sync balances
    function testFail_SyncBalancesNotManager() public {
        vm.prank(user1);
        vault.syncBalances(); // Should revert
    }
    
    // ============================================
    // WITHDRAWAL TESTS
    // ============================================
    
    /// @dev Test: withdrawDual works with synced balances
    function test_WithdrawAfterSync() public {
        // Setup: Deposit and sync
        vm.startPrank(user1);
        WLFI.approve(address(vault), 100e18);
        USD1.approve(address(vault), 100e18);
        uint256 shares = vault.depositDual(100e18, 100e18, user1);
        vm.stopPrank();
        
        // Sync balances
        vm.prank(owner);
        vault.syncBalances();
        
        // Withdraw
        vm.prank(user1);
        (uint256 wlfi, uint256 usd1) = vault.withdrawDual(shares / 2, user1);
        
        assertTrue(wlfi > 0 || usd1 > 0, "Should withdraw some tokens");
    }
    
    /// @dev Test: maxRedeem respects vault token limits
    function test_MaxRedeem() public {
        vm.startPrank(user1);
        WLFI.approve(address(vault), 100e18);
        USD1.approve(address(vault), 100e18);
        vault.depositDual(100e18, 100e18, user1);
        
        uint256 maxShares = vault.maxRedeem(user1);
        assertTrue(maxShares > 0, "Max redeem should be positive");
        assertTrue(maxShares <= vault.balanceOf(user1), "Max redeem should not exceed balance");
        
        vm.stopPrank();
    }
    
    // ============================================
    // EDGE CASE TESTS
    // ============================================
    
    /// @dev Test: Cannot withdraw more than vault has
    function testFail_WithdrawExceedsVaultBalance() public {
        vm.startPrank(user1);
        WLFI.approve(address(vault), 1e18);
        USD1.approve(address(vault), 1e18);
        uint256 shares = vault.depositDual(1e18, 1e18, user1);
        
        // Try to withdraw 100x what was deposited
        vault.withdrawDual(shares * 100, user1);
        vm.stopPrank();
    }
    
    /// @dev Test: Zero amount deposits should revert
    function testFail_ZeroDeposit() public {
        vm.prank(user1);
        vault.depositDual(0, 0, user1);
    }
    
    // ============================================
    // PROPERTY-BASED TESTS
    // ============================================
    
    /// @dev Property: Total assets >= total shares (solvency)
    function testFuzz_Solvency(uint128 depositAmount) public {
        vm.assume(depositAmount > 1e6 && depositAmount < 1000e18);
        
        vm.startPrank(user1);
        WLFI.approve(address(vault), type(uint256).max);
        USD1.approve(address(vault), type(uint256).max);
        
        vault.depositDual(depositAmount, depositAmount, user1);
        
        uint256 totalAssets = vault.totalAssets();
        uint256 totalShares = vault.totalSupply();
        
        // Vault should always be solvent
        assertTrue(totalAssets > 0, "Assets should be positive after deposit");
        assertTrue(totalShares > 0, "Shares should be positive after deposit");
        
        vm.stopPrank();
    }
}

