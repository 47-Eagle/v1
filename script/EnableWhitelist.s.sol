// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/EagleOVault.sol";
import "../contracts/EagleVaultWrapper.sol";

/**
 * @title EnableWhitelist
 * @notice Enable whitelist mode - only multisig can deposit/withdraw initially
 * 
 * This restricts vault access to only the multisig for initial testing.
 * Can be disabled later to open to public.
 */
contract EnableWhitelist is Script {
    // Deployed contract addresses
    address constant EAGLE_VAULT = 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953;
    address constant EAGLE_WRAPPER = 0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5;
    address constant MULTISIG = 0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3;
    
    function run() external {
        console.log("===============================================");
        console.log("ENABLING WHITELIST MODE");
        console.log("===============================================");
        console.log("");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Multisig:", MULTISIG);
        console.log("");
        
        console.log("WARNING: This will restrict vault access to ONLY the multisig!");
        console.log("Only the multisig will be able to deposit/withdraw.");
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
        
        console.log("Step 1: Enabling whitelist on Vault...");
        vault.setWhitelistEnabled(true);
        console.log("  [OK] Whitelist enabled");
        
        console.log("");
        console.log("Step 2: Adding multisig to whitelist...");
        vault.setWhitelist(MULTISIG, true);
        console.log("  [OK] Multisig whitelisted");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("===============================================");
        console.log("WHITELIST MODE ENABLED!");
        console.log("===============================================");
        console.log("");
        console.log("Current Status:");
        console.log("  - Vault: RESTRICTED (multisig only)");
        console.log("  - Whitelisted Address:", MULTISIG);
        console.log("");
        console.log("NOTE: Wrapper doesn't need whitelist - it just wraps vault shares");
        console.log("");
        console.log("To open to public later, run:");
        console.log("  forge script script/DisableWhitelist.s.sol");
        console.log("");
    }
}

