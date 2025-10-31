// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/EagleOVault.sol";

/**
 * @title DisableWhitelist
 * @notice Disable whitelist mode - open vault to public
 * 
 * This removes restrictions and allows anyone to deposit/withdraw.
 * Run this after initial testing is complete.
 */
contract DisableWhitelist is Script {
    // Deployed contract addresses
    address constant EAGLE_VAULT = 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953;
    
    function run() external {
        console.log("===============================================");
        console.log("DISABLING WHITELIST MODE");
        console.log("===============================================");
        console.log("");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("");
        
        console.log("WARNING: This will OPEN the vault to the PUBLIC!");
        console.log("Anyone will be able to deposit/withdraw.");
        console.log("");
        
        // Check if deployer is the owner
        EagleOVault vault = EagleOVault(payable(EAGLE_VAULT));
        address vaultOwner = vault.owner();
        
        if (vaultOwner != deployer) {
            console.log("ERROR: Deployer is not the vault owner!");
            console.log("Current owner:", vaultOwner);
            console.log("This script must be run by the current owner (multisig)");
            revert("Not authorized");
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Disabling whitelist on Vault...");
        vault.setWhitelistEnabled(false);
        console.log("  [OK] Whitelist disabled");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("===============================================");
        console.log("WHITELIST MODE DISABLED!");
        console.log("===============================================");
        console.log("");
        console.log("Current Status:");
        console.log("  - Vault: OPEN TO PUBLIC");
        console.log("  - Anyone can now deposit/withdraw");
        console.log("");
        console.log("The vault is now fully permissionless!");
        console.log("");
    }
}

