// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

interface IEagleOVault {
    function forceDeployToStrategies() external;
    function strategyWeights(address) external view returns (uint256);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
}

contract ForceDeployIdle is Script {
    address constant VAULT = 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953;
    address constant USD1_STRATEGY = 0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f;
    address constant WETH_STRATEGY = 0x5c525Af4153B1c43f9C06c31D32a84637c617FfE; // NEW: 24hr oracle support
    address constant WLFI = 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6;
    address constant USD1 = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        
        console.log("====================================================");
        console.log("FORCE DEPLOY IDLE FUNDS TO STRATEGIES");
        console.log("====================================================");
        console.log("");
        
        // Check idle balances before
        uint256 vaultWlfi = IERC20(WLFI).balanceOf(VAULT);
        uint256 vaultUsd1 = IERC20(USD1).balanceOf(VAULT);
        
        console.log("[VAULT IDLE BALANCES - BEFORE]");
        console.log("WLFI:", vaultWlfi / 1e18);
        console.log("USD1:", vaultUsd1 / 1e18);
        console.log("");
        
        // Check strategy weights
        IEagleOVault vault = IEagleOVault(VAULT);
        uint256 usd1Weight = vault.strategyWeights(USD1_STRATEGY);
        uint256 wethWeight = vault.strategyWeights(WETH_STRATEGY);
        
        console.log("[STRATEGY WEIGHTS]");
        console.log("USD1 Strategy:", usd1Weight / 100, "%");
        console.log("WETH Strategy:", wethWeight / 100, "%");
        console.log("");
        
        vm.startBroadcast(pk);
        
        console.log("[EXECUTING]");
        console.log("Calling forceDeployToStrategies()...");
        
        try vault.forceDeployToStrategies() {
            console.log("SUCCESS: Funds deployed to strategies");
        } catch Error(string memory reason) {
            console.log("FAILED:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("FAILED with low-level error");
            console.logBytes(lowLevelData);
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("[VAULT IDLE BALANCES - AFTER]");
        vaultWlfi = IERC20(WLFI).balanceOf(VAULT);
        vaultUsd1 = IERC20(USD1).balanceOf(VAULT);
        console.log("WLFI:", vaultWlfi / 1e18);
        console.log("USD1:", vaultUsd1 / 1e18);
        
        console.log("");
        console.log("====================================================");
    }
}

