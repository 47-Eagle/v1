// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/layerzero/oft/WLFIAssetOFT.sol";
import "../contracts/layerzero/oft/USD1AssetOFT.sol";
import "../contracts/layerzero/oft/EagleShareOFT.sol";

/**
 * @title DeployArbitrumSepolia
 * @notice Deploy Eagle OVault contracts on Arbitrum Sepolia (spoke chain)
 * 
 * @dev SPOKE CHAIN DEPLOYMENT:
 *      Only deploy OFT tokens (no vault, no composer, no wrapper)
 *      These will be connected to hub via LayerZero
 * 
 * @dev USAGE:
 *      forge script script/DeployArbitrumSepolia.s.sol:DeployArbitrumSepolia \
 *        --rpc-url arbitrum_sepolia \
 *        --broadcast \
 *        --verify \
 *        -vvvv
 */
contract DeployArbitrumSepolia is Script {
    // LayerZero V2 Arbitrum Sepolia Endpoint
    address constant LZ_ENDPOINT_ARBITRUM_SEPOLIA = 0x6EDCE65403992e310A62460808c4b910D972f10f;
    
    // Deployed contracts
    WLFIAssetOFT public wlfiOFT;
    USD1AssetOFT public usd1OFT;
    EagleShareOFT public shareOFT;
    
    address public deployer;
    address public owner;
    address public treasury;
    address public vaultBeneficiary;
    
    function setUp() public {
        deployer = vm.envAddress("DEPLOYER_ADDRESS");
        owner = vm.envOr("OWNER_ADDRESS", deployer);
        treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        vaultBeneficiary = vm.envOr("VAULT_BENEFICIARY", deployer);
    }
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=================================================");
        console.log("DEPLOYING TO ARBITRUM SEPOLIA (SPOKE CHAIN)");
        console.log("=================================================");
        console.log("");
        console.log("Deployer:", deployer);
        console.log("Owner:", owner);
        console.log("LayerZero Endpoint:", LZ_ENDPOINT_ARBITRUM_SEPOLIA);
        console.log("");
        
        // Deploy Asset OFTs
        console.log("Step 1: Deploying Asset OFTs...");
        
        wlfiOFT = new WLFIAssetOFT(
            "Wrapped LFI",
            "WLFI",
            LZ_ENDPOINT_ARBITRUM_SEPOLIA,
            owner
        );
        console.log("  WLFI OFT deployed at:", address(wlfiOFT));
        
        usd1OFT = new USD1AssetOFT(
            "USD1 Stablecoin",
            "USD1",
            LZ_ENDPOINT_ARBITRUM_SEPOLIA,
            owner
        );
        console.log("  USD1 OFT deployed at:", address(usd1OFT));
        console.log("");
        
        // Deploy Share OFT
        console.log("Step 2: Deploying EagleShareOFT (spoke)...");
        
        shareOFT = new EagleShareOFT(
            "Eagle Vault Shares",
            "vEAGLE",
            LZ_ENDPOINT_ARBITRUM_SEPOLIA,
            owner
        );
        console.log("  EagleShareOFT deployed at:", address(shareOFT));
        console.log("");
        
        // Configure ShareOFT fees
        console.log("Step 3: Configuring ShareOFT fees...");
        
        shareOFT.setSwapFeeConfig(
            100,              // 1% buy fee
            200,              // 2% sell fee
            5000,             // 50% to treasury
            5000,             // 50% to vault
            treasury,         // Treasury address
            vaultBeneficiary, // Vault beneficiary
            true              // Fees enabled
        );
        console.log("  Swap fees configured: 1% buy, 2% sell, 50/50 split");
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("=================================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("=================================================");
        console.log("");
        console.log("DEPLOYED CONTRACTS:");
        console.log("-------------------");
        console.log("WLFI OFT:      ", address(wlfiOFT));
        console.log("USD1 OFT:      ", address(usd1OFT));
        console.log("EagleShareOFT: ", address(shareOFT));
        console.log("");
        console.log("NEXT STEPS:");
        console.log("-----------");
        console.log("1. Wire LayerZero peers to Sepolia hub");
        console.log("2. Set V3 pools for fee-on-swap");
        console.log("3. Test cross-chain deposits");
        console.log("");
        
        // Save deployment
        _saveDeployment();
    }
    
    function _saveDeployment() internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "deployer", deployer);
        vm.serializeAddress(json, "owner", owner);
        vm.serializeAddress(json, "wlfiOFT", address(wlfiOFT));
        vm.serializeAddress(json, "usd1OFT", address(usd1OFT));
        string memory finalJson = vm.serializeAddress(json, "shareOFT", address(shareOFT));
        
        vm.writeJson(finalJson, "./deployments/arbitrum-sepolia.json");
        console.log("Deployment saved to: deployments/arbitrum-sepolia.json");
    }
}

