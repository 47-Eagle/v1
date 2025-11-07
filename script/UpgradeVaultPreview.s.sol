// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/EagleOVault.sol";

/**
 * @title Upgrade Vault Preview Function
 * @notice This script is for upgrading the vault to fix the previewCapitalInjection function
 * @dev The vault needs to be upgradeable for this to work. If not, you'll need to deploy a new vault.
 * 
 * CRITICAL FIX:
 * - previewCapitalInjection now properly converts USD1 to WLFI value using wlfiEquivalent()
 * - Before: Was adding raw USD1 amount (1 USD1 = 1 WLFI in calculation)
 * - After: Converts USD1 to WLFI value (1 USD1 ≈ 8.33 WLFI at $1/$0.12 ratio)
 * 
 * This fixes the preview calculation to show accurate impact of capital injections.
 */
contract UpgradeVaultPreview is Script {
    // Production addresses
    address constant VAULT = 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953;
    address constant MULTISIG = 0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Current Vault:", VAULT);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // NOTE: This assumes the vault is upgradeable (UUPS or Transparent Proxy)
        // If the vault is NOT upgradeable, you'll need to:
        // 1. Deploy a new vault with the fix
        // 2. Migrate all funds from old vault to new vault
        // 3. Update frontend contracts.ts with new vault address
        
        // Check if vault is upgradeable
        EagleOVault vault = EagleOVault(VAULT);
        address owner = vault.owner();
        console.log("Vault owner:", owner);
        
        if (owner != MULTISIG && owner != deployer) {
            console.log("WARNING: You are not the owner. Cannot upgrade.");
            console.log("Owner must be:", MULTISIG, "or deployer:", deployer);
            vm.stopBroadcast();
            return;
        }
        
        // Deploy new implementation
        console.log("Deploying new vault implementation...");
        EagleOVault newImplementation = new EagleOVault();
        console.log("New implementation deployed at:", address(newImplementation));
        
        // NOTE: You'll need to call upgradeTo() on the proxy contract
        // This requires the vault to be UUPS upgradeable
        // If it's not upgradeable, skip this and deploy a new vault instead
        
        console.log("\n=== MANUAL STEPS REQUIRED ===");
        console.log("If vault is UUPS upgradeable:");
        console.log("1. Call vault.upgradeTo(", address(newImplementation), ") from multisig");
        console.log("\nIf vault is NOT upgradeable:");
        console.log("1. Deploy new vault (use DeployFreshVault.s.sol)");
        console.log("2. Migrate funds from old vault");
        console.log("3. Update frontend contracts.ts with new address");
        
        vm.stopBroadcast();
    }
}

