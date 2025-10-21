// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/EagleOVault.sol";
import "../contracts/mocks/MockPriceFeed.sol";

/**
 * @title RedeployVault
 * @notice Redeploys EagleOVault with correct Uniswap pool address
 * @dev Run after pool creation to fix the pool address issue
 */
contract RedeployVault is Script {
    // Deployed contract addresses (LIVE on Sepolia - Block 9460340)
    address constant WLFI = 0x33fB8387d4C6F5B344ca6C6C68e4576db10BDEa3;
    address constant USD1 = 0xdDC8061BB5e2caE36E27856620086bc6d59C2242;
    address constant UNISWAP_POOL = 0x9Ea7103b374Aa8be79a5BBa065bF48e7EbFc53Dc;
    address constant EAGLE_SHARE_OFT = 0x532Ec3711C9E219910045e2bBfA0280ae0d8457e;
    address constant WRAPPER = 0x577D6cc9B905e628F6fBB9D1Ac6279709654b44f;

    // Uniswap router
    address constant UNISWAP_V3_ROUTER = 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD;

    address public deployer;
    address public owner;
    MockPriceFeed public wlfiPriceFeed;
    MockPriceFeed public usd1PriceFeed;
    EagleOVault public vault;

    function setUp() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(privateKey);
        owner = deployer;
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("=================================================");
        console.log("REDEPLOYING EAGLE OVAULT WITH CORRECT POOL");
        console.log("=================================================");
        console.log("");
        console.log("Deployer:", deployer);
        console.log("Owner:", owner);
        console.log("");
        console.log("Using addresses:");
        console.log("  WLFI:", WLFI);
        console.log("  USD1:", USD1);
        console.log("  Uniswap Pool:", UNISWAP_POOL);
        console.log("");

        // Deploy mock price feeds
        console.log("Deploying mock price feeds...");
        usd1PriceFeed = new MockPriceFeed(1e8, 8); // $1.00 (8 decimals)
        console.log("  USD1 Price Feed:", address(usd1PriceFeed));
        console.log("");

        // Deploy new vault with correct pool address
        console.log("Deploying EagleOVault...");
        vault = new EagleOVault(
            WLFI,                      // _wlfiToken
            USD1,                      // _usd1Token
            address(usd1PriceFeed),    // _usd1PriceFeed (MOCK)
            UNISWAP_POOL,              // _wlfiUsd1Pool (CORRECT!)
            UNISWAP_V3_ROUTER,         // _uniswapRouter
            owner                      // _owner
        );
        console.log("  EagleOVault deployed at:", address(vault));
        console.log("");

        // Configure roles
        console.log("Configuring roles...");
        vault.setKeeper(owner);
        console.log("  Keeper set");
        
        vault.setEmergencyAdmin(owner);
        console.log("  Emergency Admin set");
        
        vault.setPerformanceFeeRecipient(owner);
        console.log("  Performance Fee Recipient set");
        console.log("");

        // Grant approvals for wrapper
        console.log("Setting up approvals...");
        IERC20(WLFI).approve(address(vault), type(uint256).max);
        IERC20(USD1).approve(address(vault), type(uint256).max);
        console.log("  Tokens approved for vault");
        console.log("");

        console.log("=================================================");
        console.log("VAULT REDEPLOYMENT COMPLETE!");
        console.log("=================================================");
        console.log("");
        console.log("NEW VAULT ADDRESS:", address(vault));
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Update PostDeployment2_TestVault.s.sol with new vault address");
        console.log("2. Run vault flow tests");
        console.log("3. Update frontend VaultView.tsx with new vault address");
        console.log("");

        vm.stopBroadcast();
    }
}

