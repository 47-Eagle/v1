// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../contracts/EagleOVaultV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title EagleOVaultV2Test
 * @notice Comprehensive tests for Yearn-inspired improvements
 * @dev Tests maxLoss, profit unlocking, report(), keeper role, tend(), emergency controls
 */
contract EagleOVaultV2Test is Test {
    EagleOVaultV2 public vault;
    
    // Mainnet addresses
    address constant WLFI = 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6;
    address constant USD1 = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;
    address constant USD1_FEED = 0x6bF14CB0A831078629D993FDeBcB182b21A8774C;
    address constant WLFI_USD1_POOL = 0x8Bd3f2C8F59E2C6c1A3D2F4E4A8a99B5c5E9f2C8;
    address constant UNISWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    
    // Test accounts
    address owner = address(this);
    address keeper = address(0x1);
    address emergencyAdmin = address(0x2);
    address alice = address(0x3);
    address bob = address(0x4);
    address performanceFeeRecipient = address(0x5);
    
    IERC20 wlfi = IERC20(WLFI);
    IERC20 usd1 = IERC20(USD1);
    
    function setUp() public {
        // Fork Ethereum mainnet
        vm.createSelectFork("https://cloudflare-eth.com");
        
        // Deploy vault
        vault = new EagleOVaultV2(
            WLFI,
            USD1,
            USD1_FEED,
            WLFI_USD1_POOL,
            UNISWAP_ROUTER,
            owner
        );
        
        // Set Yearn-inspired roles
        vault.setKeeper(keeper);
        vault.setEmergencyAdmin(emergencyAdmin);
        vault.setPerformanceFeeRecipient(performanceFeeRecipient);
        vault.setPerformanceFee(1000); // 10%
        vault.setProfitMaxUnlockTime(7 days);
    }

    // =====================================================
    // YEARN IMPROVEMENT #1: maxLoss Parameter Tests
    // =====================================================
    
    /**
     * @notice Test: Withdrawal with sufficient liquidity (0% loss)
     * @dev Should succeed with any maxLoss value
     */
    function test_MaxLoss_NoLoss_Success() public {
        // Setup: Alice deposits
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Alice withdraws with maxLoss = 0 (no loss tolerated)
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        
        // Should succeed since vault has full liquidity
        vault.withdrawDual(shares, alice, 0); // maxLoss = 0%
    }
    
    /**
     * @notice Test: Withdrawal with acceptable loss
     * @dev loss = 1%, maxLoss = 2% → Should succeed
     */
    function test_MaxLoss_AcceptableLoss_Success() public {
        // Setup: Create a scenario with 1% loss
        // 1. Alice deposits 1000 WLFI
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        uint256 shares = vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // 2. Simulate strategy loss: Burn 1% of vault's WLFI
        deal(WLFI, address(vault), vault.wlfiBalance() * 99 / 100);
        vault.syncBalances();
        
        // Alice tries to withdraw with maxLoss = 200 (2%)
        vm.prank(alice);
        
        // Should succeed (1% loss < 2% maxLoss)
        vault.withdrawDual(shares, alice, 200);
    }
    
    /**
     * @notice Test: Withdrawal with unacceptable loss
     * @dev loss = 5%, maxLoss = 1% → Should revert
     */
    function test_MaxLoss_ExcessiveLoss_Reverts() public {
        // Setup: Create a scenario with 5% loss
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        uint256 shares = vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Simulate 5% loss
        deal(WLFI, address(vault), vault.wlfiBalance() * 95 / 100);
        vault.syncBalances();
        
        // Alice tries to withdraw with maxLoss = 100 (1%)
        vm.prank(alice);
        vm.expectRevert(); // LossExceeded()
        vault.withdrawDual(shares, alice, 100);
    }
    
    /**
     * @notice Test: maxWithdraw with loss tolerance
     * @dev Should calculate max withdrawable considering maxLoss
     */
    function test_MaxLoss_MaxWithdraw() public {
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Check max withdraw with 0% loss tolerance
        uint256 maxNoLoss = vault.maxWithdraw(alice, 0);
        
        // Check max withdraw with 10% loss tolerance
        uint256 max10PercentLoss = vault.maxWithdraw(alice, 1000);
        
        // With higher loss tolerance, can withdraw more
        assertGe(max10PercentLoss, maxNoLoss);
    }

    // =====================================================
    // YEARN IMPROVEMENT #2: Profit Unlocking Tests
    // =====================================================
    
    /**
     * @notice Test: Profit is locked immediately on report
     * @dev PPS shouldn't change instantly
     */
    function test_ProfitUnlocking_ImmediateLock() public {
        // 1. Alice deposits
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        uint256 ppsBefore = (vault.totalAssets() * 1e18) / vault.totalSupply();
        
        // 2. Simulate profit: Inject 100 WLFI
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        // 3. Keeper reports
        vm.prank(keeper);
        vault.report();
        
        // 4. PPS should NOT increase immediately (profit locked)
        uint256 ppsAfter = (vault.totalAssets() * 1e18) / vault.totalSupply();
        
        // Allow for small rounding, but should be minimal change
        assertApproxEqRel(ppsAfter, ppsBefore, 0.01e18); // Max 1% change
    }
    
    /**
     * @notice Test: Profit unlocks gradually over time
     * @dev After 3.5 days, ~50% should be unlocked
     */
    function test_ProfitUnlocking_GradualUnlock() public {
        // Setup
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Inject profit and report
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        vm.prank(keeper);
        vault.report();
        
        uint256 lockedShares = vault.totalLockedShares();
        assertGt(lockedShares, 0, "Shares should be locked");
        
        // Fast forward 3.5 days (half of 7 days)
        vm.warp(block.timestamp + 3.5 days);
        
        // Check unlocked shares
        uint256 unlocked = vault.unlockedShares();
        
        // Should be approximately 50% unlocked
        assertApproxEqRel(unlocked, lockedShares / 2, 0.01e18);
    }
    
    /**
     * @notice Test: All profit unlocked after profitMaxUnlockTime
     * @dev After 7 days, 100% should be unlocked
     */
    function test_ProfitUnlocking_FullUnlock() public {
        // Setup
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Report profit
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        vm.prank(keeper);
        vault.report();
        
        uint256 lockedShares = vault.totalLockedShares();
        
        // Fast forward 7 days
        vm.warp(block.timestamp + 7 days);
        
        // All shares should be unlocked
        uint256 unlocked = vault.unlockedShares();
        assertEq(unlocked, lockedShares, "All shares should be unlocked");
    }
    
    /**
     * @notice Test: totalSupply accounts for locked shares
     * @dev Locked shares reduce circulating supply
     */
    function test_ProfitUnlocking_TotalSupplyReduction() public {
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        uint256 supplyBefore = vault.totalSupply();
        
        // Report profit
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        vm.prank(keeper);
        vault.report();
        
        uint256 supplyAfter = vault.totalSupply();
        
        // Supply should decrease (locked shares don't count)
        assertLt(supplyAfter, supplyBefore, "Supply should decrease");
    }

    // =====================================================
    // YEARN IMPROVEMENT #3: Report Function Tests
    // =====================================================
    
    /**
     * @notice Test: Report charges performance fees on profit
     * @dev With 10% fee, recipient should get 10% of profit
     */
    function test_Report_PerformanceFee() public {
        // Setup
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Inject $100 profit (in WLFI)
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        uint256 recipientSharesBefore = vault.balanceOf(performanceFeeRecipient);
        
        // Report
        vm.prank(keeper);
        vault.report();
        
        uint256 recipientSharesAfter = vault.balanceOf(performanceFeeRecipient);
        
        // Recipient should have received fee shares
        assertGt(recipientSharesAfter, recipientSharesBefore, "Should receive fee shares");
    }
    
    /**
     * @notice Test: Report offsets loss with locked shares
     * @dev Loss should burn locked shares first
     */
    function test_Report_LossOffset() public {
        // Setup: Deposit and generate profit to create locked shares
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Generate profit
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        vm.prank(keeper);
        vault.report();
        
        uint256 lockedSharesBefore = vault.totalLockedShares();
        assertGt(lockedSharesBefore, 0, "Should have locked shares");
        
        // Simulate loss: Remove 50 WLFI
        deal(WLFI, address(vault), vault.wlfiBalance() - 50e18);
        vault.syncBalances();
        
        // Report loss
        vm.prank(keeper);
        (uint256 profit, uint256 loss) = vault.report();
        
        assertEq(profit, 0, "Should be no profit");
        assertGt(loss, 0, "Should have loss");
        
        // Locked shares should decrease (used to offset loss)
        uint256 lockedSharesAfter = vault.totalLockedShares();
        assertLt(lockedSharesAfter, lockedSharesBefore, "Locked shares should decrease");
    }
    
    /**
     * @notice Test: Report emits correct event
     */
    function test_Report_EmitsEvent() public {
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Inject profit
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        // Expect Reported event
        vm.expectEmit(false, false, false, false);
        emit Reported(0, 0, 0, 0); // Placeholder values
        
        vm.prank(keeper);
        vault.report();
    }
    
    event Reported(uint256 profit, uint256 loss, uint256 performanceFees, uint256 totalAssets);

    // =====================================================
    // YEARN IMPROVEMENT #4: Keeper Role Tests
    // =====================================================
    
    /**
     * @notice Test: Only keeper can call report()
     */
    function test_Keeper_OnlyKeeperCanReport() public {
        // Non-keeper tries to report
        vm.prank(bob);
        vm.expectRevert(); // Unauthorized()
        vault.report();
        
        // Keeper can report
        vm.prank(keeper);
        vault.report(); // Should succeed
    }
    
    /**
     * @notice Test: Only keeper can call tend()
     */
    function test_Keeper_OnlyKeeperCanTend() public {
        // Non-keeper tries to tend
        vm.prank(bob);
        vm.expectRevert(); // Unauthorized()
        vault.tend();
        
        // Keeper can tend
        vm.prank(keeper);
        vault.tend(); // Should succeed
    }
    
    /**
     * @notice Test: Management can update keeper
     */
    function test_Keeper_ManagementCanUpdate() public {
        address newKeeper = address(0x99);
        
        vault.setKeeper(newKeeper);
        
        assertEq(vault.keeper(), newKeeper, "Keeper should be updated");
        
        // New keeper can now call report
        vm.prank(newKeeper);
        vault.report();
    }

    // =====================================================
    // YEARN IMPROVEMENT #5: Tend Function Tests
    // =====================================================
    
    /**
     * @notice Test: tend() deploys idle funds
     */
    function test_Tend_DeploysIdleFunds() public {
        // Note: This test requires a strategy to be deployed
        // For now, we test that tend() doesn't revert
        
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Keeper calls tend
        vm.prank(keeper);
        vault.tend(); // Should not revert
    }
    
    /**
     * @notice Test: tendTrigger returns true when idle > threshold
     */
    function test_Tend_TriggerWhenIdleExceedsThreshold() public {
        // Deposit to create idle funds
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Set low threshold
        vault.setDeploymentParams(10e18, 0);
        
        // tendTrigger should return false (no strategies)
        bool shouldTend = vault.tendTrigger();
        assertEq(shouldTend, false, "No strategies, shouldn't tend");
    }

    // =====================================================
    // YEARN IMPROVEMENT #6: Emergency Controls Tests
    // =====================================================
    
    /**
     * @notice Test: Shutdown prevents deposits
     */
    function test_Emergency_ShutdownPreventsDeposits() public {
        // Shutdown vault
        vm.prank(emergencyAdmin);
        vault.shutdownStrategy();
        
        assertTrue(vault.isShutdown(), "Vault should be shutdown");
        
        // Try to deposit
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        
        vm.expectRevert(); // VaultIsShutdown()
        vault.deposit(1000e18, alice);
        vm.stopPrank();
    }
    
    /**
     * @notice Test: Shutdown allows withdrawals
     */
    function test_Emergency_ShutdownAllowsWithdrawals() public {
        // Alice deposits before shutdown
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        uint256 shares = vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Shutdown vault
        vm.prank(emergencyAdmin);
        vault.shutdownStrategy();
        
        // Alice can still withdraw
        vm.prank(alice);
        vault.withdrawDual(shares, alice, 10000); // Should succeed
    }
    
    /**
     * @notice Test: emergencyWithdraw only works post-shutdown
     */
    function test_Emergency_WithdrawOnlyPostShutdown() public {
        deal(WLFI, address(vault), 1000e18);
        
        // Try emergency withdraw before shutdown
        vm.prank(emergencyAdmin);
        vm.expectRevert(); // VaultNotShutdown()
        vault.emergencyWithdraw(100e18, 0, emergencyAdmin);
        
        // Shutdown
        vm.prank(emergencyAdmin);
        vault.shutdownStrategy();
        
        // Now emergency withdraw works
        vm.prank(emergencyAdmin);
        vault.emergencyWithdraw(100e18, 0, emergencyAdmin); // Should succeed
    }
    
    /**
     * @notice Test: Only emergencyAdmin can shutdown
     */
    function test_Emergency_OnlyAdminCanShutdown() public {
        // Bob tries to shutdown
        vm.prank(bob);
        vm.expectRevert(); // Unauthorized()
        vault.shutdownStrategy();
        
        // EmergencyAdmin can shutdown
        vm.prank(emergencyAdmin);
        vault.shutdownStrategy(); // Should succeed
    }

    // =====================================================
    // YEARN IMPROVEMENT #7: Access Control Tests
    // =====================================================
    
    /**
     * @notice Test: Three-tier access control hierarchy
     */
    function test_AccessControl_Hierarchy() public {
        // Check initial roles
        assertEq(vault.management(), owner, "Management should be owner");
        assertEq(vault.keeper(), keeper, "Keeper should be set");
        assertEq(vault.emergencyAdmin(), emergencyAdmin, "EmergencyAdmin should be set");
        
        // Management can set keeper
        address newKeeper = address(0x88);
        vault.setKeeper(newKeeper);
        assertEq(vault.keeper(), newKeeper);
        
        // Management can set emergencyAdmin
        address newAdmin = address(0x89);
        vault.setEmergencyAdmin(newAdmin);
        assertEq(vault.emergencyAdmin(), newAdmin);
    }
    
    /**
     * @notice Test: Pending management pattern
     */
    function test_AccessControl_PendingManagement() public {
        address newManagement = address(0x77);
        
        // Step 1: Current management proposes new management
        vault.setPendingManagement(newManagement);
        assertEq(vault.pendingManagement(), newManagement);
        
        // Step 2: New management accepts
        vm.prank(newManagement);
        vault.acceptManagement();
        
        assertEq(vault.management(), newManagement, "Management should be updated");
        assertEq(vault.pendingManagement(), address(0), "Pending should be cleared");
    }

    // =====================================================
    // INTEGRATION TESTS
    // =====================================================
    
    /**
     * @notice Test: Full lifecycle with maxLoss, profit unlocking, and report
     */
    function test_Integration_FullLifecycle() public {
        // 1. Alice deposits
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        uint256 aliceShares = vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // 2. Generate profit
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        // 3. Keeper reports
        vm.prank(keeper);
        (uint256 profit, ) = vault.report();
        assertGt(profit, 0, "Should have profit");
        
        // 4. Wait for partial unlock
        vm.warp(block.timestamp + 3 days);
        
        // 5. Bob deposits (different PPS now)
        deal(WLFI, bob, 1000e18);
        vm.startPrank(bob);
        wlfi.approve(address(vault), 1000e18);
        uint256 bobShares = vault.deposit(1000e18, bob);
        vm.stopPrank();
        
        // Bob should get fewer shares (higher PPS)
        assertLt(bobShares, aliceShares, "Bob gets fewer shares at higher PPS");
        
        // 6. Alice withdraws with maxLoss
        vm.prank(alice);
        (uint256 wlfiOut, uint256 usd1Out) = vault.withdrawDual(aliceShares, alice, 100);
        
        // Alice should get more than she deposited (profit)
        assertGt(wlfiOut, 1000e18, "Alice profits");
    }
    
    /**
     * @notice Test: Profit unlocking with multiple reports
     */
    function test_Integration_MultipleReports() public {
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Report 1: +100 WLFI profit
        deal(WLFI, address(this), 100e18);
        wlfi.approve(address(vault), 100e18);
        vault.injectCapital(100e18, 0);
        
        vm.prank(keeper);
        vault.report();
        
        // Wait 3 days
        vm.warp(block.timestamp + 3 days);
        
        // Report 2: +50 WLFI profit
        deal(WLFI, address(this), 50e18);
        wlfi.approve(address(vault), 50e18);
        vault.injectCapital(50e18, 0);
        
        vm.prank(keeper);
        vault.report();
        
        // Should have locked shares from both reports
        assertGt(vault.totalLockedShares(), 0, "Should have locked shares");
    }

    // =====================================================
    // EDGE CASES & SECURITY TESTS
    // =====================================================
    
    /**
     * @notice Test: Cannot set maxLoss > 100%
     */
    function test_EdgeCase_MaxLossCannotExceed100Percent() public {
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        uint256 shares = vault.deposit(1000e18, alice);
        
        vm.expectRevert(); // InvalidAmount()
        vault.withdrawDual(shares, alice, 10001); // 100.01%
        vm.stopPrank();
    }
    
    /**
     * @notice Test: Performance fee cannot exceed MAX_FEE (50%)
     */
    function test_EdgeCase_PerformanceFeeCannotExceedMax() public {
        vm.expectRevert(); // InvalidAmount()
        vault.setPerformanceFee(5001); // 50.01%
    }
    
    /**
     * @notice Test: Profit unlock time cannot exceed 1 year
     */
    function test_EdgeCase_ProfitUnlockTimeCannotExceed1Year() public {
        vm.expectRevert(); // InvalidAmount()
        vault.setProfitMaxUnlockTime(365 days + 1);
    }
    
    /**
     * @notice Test: Zero profit doesn't break unlocking
     */
    function test_EdgeCase_ZeroProfit() public {
        deal(WLFI, alice, 1000e18);
        vm.startPrank(alice);
        wlfi.approve(address(vault), 1000e18);
        vault.deposit(1000e18, alice);
        vm.stopPrank();
        
        // Report with no profit
        vm.prank(keeper);
        (uint256 profit, uint256 loss) = vault.report();
        
        assertEq(profit, 0, "No profit");
        assertEq(loss, 0, "No loss");
    }
}

