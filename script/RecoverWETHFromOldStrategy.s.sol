// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

interface IStrategy {
    function rescueToken(address token, uint256 amount, address to) external;
    function owner() external view returns (address);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract RecoverWETHFromOldStrategy is Script {
    address constant OLD_WETH_STRATEGY = 0x997feaa69a60c536F8449F0D5Adf997fD83aDf39;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant WLFI = 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6;
    address constant USD1 = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;
    address constant VAULT = 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        console.log("=====================================================");
        console.log("RECOVERING TOKENS FROM OLD WETH STRATEGY");
        console.log("=====================================================");
        console.log("");
        console.log("Old Strategy:", OLD_WETH_STRATEGY);
        console.log("Executor:", deployer);
        console.log("");

        // Check balances before
        uint256 wethBalance = IERC20(WETH).balanceOf(OLD_WETH_STRATEGY);
        uint256 wlfiBalance = IERC20(WLFI).balanceOf(OLD_WETH_STRATEGY);
        uint256 usd1Balance = IERC20(USD1).balanceOf(OLD_WETH_STRATEGY);

        console.log("[BALANCES IN OLD STRATEGY]");
        console.log("WETH:", wethBalance);
        console.log("WETH (decimal):", wethBalance / 1e18);
        console.log("WLFI:", wlfiBalance);
        console.log("USD1:", usd1Balance);
        console.log("");

        if (wethBalance == 0 && wlfiBalance == 0 && usd1Balance == 0) {
            console.log("No tokens to recover!");
            return;
        }

        vm.startBroadcast(pk);

        IStrategy strategy = IStrategy(OLD_WETH_STRATEGY);
        
        // Check who owns the strategy
        address owner = strategy.owner();
        console.log("Strategy Owner:", owner);
        
        if (owner != deployer) {
            console.log("ERROR: You are not the owner!");
            console.log("You:", deployer);
            console.log("Owner:", owner);
            vm.stopBroadcast();
            return;
        }

        // Recover WETH
        if (wethBalance > 0) {
            console.log("Recovering", wethBalance / 1e18, "WETH to vault...");
            strategy.rescueToken(WETH, wethBalance, VAULT);
            console.log("WETH recovered!");
        }

        // Recover WLFI (just in case)
        if (wlfiBalance > 0) {
            console.log("Recovering", wlfiBalance / 1e18, "WLFI to vault...");
            strategy.rescueToken(WLFI, wlfiBalance, VAULT);
            console.log("WLFI recovered!");
        }

        // Recover USD1 (just in case)
        if (usd1Balance > 0) {
            console.log("Recovering", usd1Balance / 1e18, "USD1 to vault...");
            strategy.rescueToken(USD1, usd1Balance, VAULT);
            console.log("USD1 recovered!");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=====================================================");
        console.log("RECOVERY COMPLETE!");
        console.log("All tokens sent to vault:", VAULT);
        console.log("=====================================================");
    }
}

