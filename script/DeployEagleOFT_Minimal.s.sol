// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/layerzero/oft/EagleOFTMinimal.sol";

/**
 * @title DeployEagleOFT_Minimal
 * @notice Deploy a minimal LayerZero OFT for Eagle token on Ethereum Mainnet
 * 
 * @dev Uses standard LayerZero OFT without any custom features
 *      This matches the Solana OFT implementation (simple, no registry)
 * 
 * Usage:
 *      forge script script/DeployEagleOFT_Minimal.s.sol:DeployEagleOFT_Minimal \
 *        --rpc-url $ETHEREUM_RPC_URL \
 *        --broadcast \
 *        --verify \
 *        --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployEagleOFT_Minimal is Script {
    // LayerZero V2 Endpoint (Ethereum Mainnet)
    address constant LZ_ENDPOINT = 0x1a44076050125825900e736c501f859c50fE728c;
    
    // Solana Mainnet EID
    uint32 constant SOLANA_EID = 30168;
    
    // Ethereum Mainnet EID
    uint32 constant ETHEREUM_EID = 30101;
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("  EAGLE OFT - MINIMAL DEPLOYMENT");
        console.log("  Ethereum Mainnet");
        console.log("==============================================");
        console.log("");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("LayerZero Endpoint:", LZ_ENDPOINT);
        console.log("");
        
        // Safety check - Ethereum mainnet only
        require(block.chainid == 1, "ERROR: This script is for Ethereum Mainnet only!");
        
        // Check deployer has ETH
        uint256 balance = deployer.balance;
        console.log("Deployer ETH balance:", balance);
        require(balance > 0.01 ether, "ERROR: Insufficient ETH for deployment (need > 0.01 ETH)");
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying Eagle OFT contract...");
        
        // Deploy Eagle OFT
        EagleOFTMinimal oft = new EagleOFTMinimal(
            LZ_ENDPOINT,    // LayerZero endpoint
            deployer        // owner/delegate
        );
        
        console.log("");
        console.log("==============================================");
        console.log("  DEPLOYMENT SUCCESSFUL!");
        console.log("==============================================");
        console.log("");
        console.log("Contract Address:", address(oft));
        console.log("Name:", oft.name());
        console.log("Symbol:", oft.symbol());
        console.log("Decimals:", oft.decimals());
        console.log("Owner:", oft.owner());
        console.log("LayerZero Endpoint:", address(oft.endpoint()));
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("==============================================");
        console.log("  CONFIGURATION DETAILS");
        console.log("==============================================");
        console.log("");
        console.log("Solana Program ID:");
        console.log("  EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU");
        console.log("");
        console.log("Endpoint IDs:");
        console.log("  Ethereum:", ETHEREUM_EID);
        console.log("  Solana:", SOLANA_EID);
        console.log("");
        
        console.log("==============================================");
        console.log("  NEXT STEPS");
        console.log("==============================================");
        console.log("");
        console.log("1. Verify contract on Etherscan:");
        console.log("   forge verify-contract", address(oft), "OFT");
        console.log("");
        console.log("2. Configure Solana peer on Ethereum:");
        console.log("   // Convert Solana program ID to bytes32");
        console.log("   // Solana: EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU");
        console.log("   bytes32 solanaPeer = <converted_bytes32>;");
        console.log("   oft.setPeer(", SOLANA_EID, ", solanaPeer);");
        console.log("");
        console.log("3. Configure Ethereum peer on Solana:");
        console.log("   pnpm set-peer:mainnet --eth-oft", address(oft));
        console.log("");
        console.log("4. Test with small amount:");
        console.log("   Bridge 0.01 EAGLE tokens");
        console.log("   Monitor at: https://layerzeroscan.com/");
        console.log("");
        
        console.log("==============================================");
        console.log("  EXPLORER LINKS");
        console.log("==============================================");
        console.log("");
        console.log("Etherscan:");
        console.log("  https://etherscan.io/address/", address(oft));
        console.log("");
        console.log("LayerZero Scan:");
        console.log("  https://layerzeroscan.com/");
        console.log("");
        
        // Save deployment info
        string memory json = "deployment";
        vm.serializeString(json, "network", "ethereum-mainnet");
        vm.serializeAddress(json, "oftAddress", address(oft));
        vm.serializeAddress(json, "layerzeroEndpoint", LZ_ENDPOINT);
        vm.serializeAddress(json, "owner", deployer);
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeUint(json, "ethereumEID", ETHEREUM_EID);
        vm.serializeUint(json, "solanaEID", SOLANA_EID);
        vm.serializeString(json, "solanaProgramId", "EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU");
        
        string memory finalJson = vm.serializeUint(json, "timestamp", block.timestamp);
        
        string memory path = "./deployments/ethereum-mainnet-oft.json";
        vm.writeJson(finalJson, path);
        
        console.log("Deployment saved to:", path);
        console.log("");
        console.log("==============================================");
        console.log("");
    }
}

