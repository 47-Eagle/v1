// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IVault {
    function rescueToken(address token, uint256 amount, address to) external;
    function owner() external view returns (address);
}

contract WithdrawWETHFromVault is Script {
    address constant VAULT = 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        console.log("=====================================================");
        console.log("WITHDRAWING WETH FROM VAULT");
        console.log("=====================================================");
        console.log("");
        console.log("Vault:", VAULT);
        console.log("Your Address:", deployer);
        console.log("");

        // Check WETH balance in vault
        uint256 wethBalance = IERC20(WETH).balanceOf(VAULT);
        
        console.log("[VAULT WETH BALANCE]");
        console.log("Raw:", wethBalance);
        console.log("Decimal:", wethBalance / 1e18);
        console.log("");

        if (wethBalance == 0) {
            console.log("No WETH to withdraw!");
            return;
        }

        vm.startBroadcast(pk);

        IVault vault = IVault(VAULT);
        
        // Check ownership
        address owner = vault.owner();
        console.log("Vault Owner:", owner);
        
        if (owner != deployer) {
            console.log("ERROR: You are not the owner!");
            console.log("You:", deployer);
            console.log("Owner:", owner);
            vm.stopBroadcast();
            return;
        }

        console.log("Withdrawing", wethBalance / 1e18, "WETH to your account...");
        vault.rescueToken(WETH, wethBalance, deployer);
        console.log("WETH withdrawn successfully!");

        vm.stopBroadcast();

        console.log("");
        console.log("=====================================================");
        console.log("WITHDRAWAL COMPLETE!");
        console.log("Sent to:", deployer);
        console.log("Amount:", wethBalance / 1e18, "WETH");
        console.log("=====================================================");
    }
}

