// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

interface IVault {
    function syncBalances() external;
    function forceDeployToStrategies() external;
    function wlfiBalance() external view returns (uint256);
    function usd1Balance() external view returns (uint256);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
}

contract SyncAndDeploy is Script {
    address constant VAULT = 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953;
    address constant WLFI = 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6;
    address constant USD1 = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        
        console.log("====================================================");
        console.log("SYNC BALANCES AND DEPLOY TO STRATEGIES");
        console.log("====================================================");
        console.log("");

        IVault vault = IVault(VAULT);
        
        // Check before
        console.log("[BEFORE SYNC]");
        console.log("Internal wlfiBalance:", vault.wlfiBalance() / 1e18);
        console.log("Internal usd1Balance:", vault.usd1Balance() / 1e18);
        console.log("Actual WLFI balance:", IERC20(WLFI).balanceOf(VAULT) / 1e18);
        console.log("Actual USD1 balance:", IERC20(USD1).balanceOf(VAULT) / 1e18);
        console.log("");

        vm.startBroadcast(pk);

        // Step 1: Sync balances
        console.log("[SYNCING BALANCES]");
        vault.syncBalances();
        console.log("Balances synced!");
        console.log("");

        // Check after sync
        console.log("[AFTER SYNC]");
        console.log("Internal wlfiBalance:", vault.wlfiBalance() / 1e18);
        console.log("Internal usd1Balance:", vault.usd1Balance() / 1e18);
        console.log("");

        // Step 2: Force deploy
        console.log("[DEPLOYING TO STRATEGIES]");
        vault.forceDeployToStrategies();
        console.log("Deployment complete!");
        console.log("");

        // Check final state
        console.log("[FINAL STATE]");
        console.log("Actual WLFI balance:", IERC20(WLFI).balanceOf(VAULT) / 1e18);
        console.log("Actual USD1 balance:", IERC20(USD1).balanceOf(VAULT) / 1e18);

        vm.stopBroadcast();

        console.log("");
        console.log("====================================================");
        console.log("SUCCESS: Balances synced and funds deployed!");
        console.log("====================================================");
    }
}

