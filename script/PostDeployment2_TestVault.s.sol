// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/EagleOVault.sol";
import "../contracts/EagleVaultWrapper.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PostDeployment2_TestVault
 * @notice Tests vault deposit, withdraw, wrap, and unwrap flows
 * @dev Run after pool creation is complete
 */
contract PostDeployment2_TestVault is Script {
    // Deployed contract addresses (LIVE on Sepolia - Block 9460340)
    address constant WLFI = 0x33fB8387d4C6F5B344ca6C6C68e4576db10BDEa3;
    address constant USD1 = 0xdDC8061BB5e2caE36E27856620086bc6d59C2242;
    address payable constant VAULT = payable(0xb7D1044Aa912AE4BC95099E8027dD26B1506F261); // FINAL: with pool + mock feed
    address constant SHARE_OFT = 0x532Ec3711C9E219910045e2bBfA0280ae0d8457e;
    address constant WRAPPER = 0x577D6cc9B905e628F6fBB9D1Ac6279709654b44f;
    
    // Test amounts
    uint256 constant DEPOSIT_WLFI = 1000 ether;
    uint256 constant DEPOSIT_USD1 = 1000 ether;
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=================================================");
        console.log("POST-DEPLOYMENT: TEST VAULT FLOWS");
        console.log("=================================================");
        console.log("");
        console.log("Tester:", deployer);
        console.log("");
        
        console.log("Initial balances:");
        console.log("  WLFI:", IERC20(WLFI).balanceOf(deployer) / 1 ether);
        console.log("  USD1:", IERC20(USD1).balanceOf(deployer) / 1 ether);
        console.log("");
        
        // =================================
        // TEST 1: DEPOSIT TO VAULT
        // =================================
        
        console.log("Test 1: Depositing to vault...");
        console.log("  Amount: 1000 WLFI + 1000 USD1");
        
        IERC20(WLFI).approve(address(VAULT), DEPOSIT_WLFI);
        IERC20(USD1).approve(address(VAULT), DEPOSIT_USD1);
        
        uint256 sharesBefore = IERC20(VAULT).balanceOf(deployer);
        EagleOVault(VAULT).depositDual(DEPOSIT_WLFI, DEPOSIT_USD1, deployer);
        uint256 sharesReceived = IERC20(VAULT).balanceOf(deployer) - sharesBefore;
        
        console.log("  SUCCESS: Deposit successful!");
        console.log("  Shares received:", sharesReceived / 1 ether);
        console.log("");
        
        // =================================
        // TEST 2: WRAP VAULT SHARES
        // =================================
        
        console.log("Test 2: Wrapping 100 vEAGLE -> EagleShareOFT...");
        
        uint256 wrapAmount = 100 ether;
        IERC20(VAULT).approve(address(WRAPPER), wrapAmount);
        
        uint256 oftBefore = IERC20(SHARE_OFT).balanceOf(deployer);
        EagleVaultWrapper(WRAPPER).wrap(wrapAmount);
        uint256 oftReceived = IERC20(SHARE_OFT).balanceOf(deployer) - oftBefore;
        
        console.log("  SUCCESS: Wrap successful!");
        console.log("  OFT received:", oftReceived / 1 ether);
        console.log("  Fee paid:", (wrapAmount - oftReceived) / 1 ether);
        console.log("");
        
        // =================================
        // TEST 3: UNWRAP OFT SHARES
        // =================================
        
        console.log("Test 3: Unwrapping 50 EagleShareOFT -> vEAGLE...");
        
        uint256 unwrapAmount = 50 ether;
        IERC20(SHARE_OFT).approve(address(WRAPPER), unwrapAmount);
        
        uint256 vEagleBefore = IERC20(VAULT).balanceOf(deployer);
        EagleVaultWrapper(WRAPPER).unwrap(unwrapAmount);
        uint256 vEagleReceived = IERC20(VAULT).balanceOf(deployer) - vEagleBefore;
        
        console.log("  SUCCESS: Unwrap successful!");
        console.log("  vEAGLE received:", vEagleReceived / 1 ether);
        console.log("  Fee paid:", (unwrapAmount - vEagleReceived) / 1 ether);
        console.log("");
        
        // =================================
        // TEST 4: WITHDRAW FROM VAULT
        // =================================
        
        console.log("Test 4: Withdrawing 100 vEAGLE shares...");
        
        EagleOVault(VAULT).withdrawDual(100 ether, deployer, 500);
        
        console.log("  SUCCESS: Withdraw successful!");
        console.log("");
        
        // =================================
        // FINAL SUMMARY
        // =================================
        
        console.log("=================================================");
        console.log("ALL TESTS PASSED!");
        console.log("=================================================");
        console.log("");
        console.log("All vault flows working!");
        console.log("  - Deposit WLFI/USD1 -> vEAGLE shares");
        console.log("  - Wrap vEAGLE -> EagleShareOFT");
        console.log("  - Unwrap EagleShareOFT -> vEAGLE");
        console.log("  - Withdraw vEAGLE -> WLFI/USD1");
        console.log("");
        console.log("Next: Configure LayerZero peers");
        
        vm.stopBroadcast();
    }
}

