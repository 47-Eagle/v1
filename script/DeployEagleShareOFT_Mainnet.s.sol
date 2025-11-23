// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/layerzero/oft/EagleShareOFT.sol";

/**
 * @title DeployEagleShareOFT_Mainnet
 * @notice Deploy EagleShareOFT to Ethereum Mainnet
 * 
 * @dev Usage:
 *      forge script script/DeployEagleShareOFT_Mainnet.s.sol:DeployEagleShareOFT_Mainnet \
 *        --rpc-url $ETHEREUM_RPC_URL \
 *        --broadcast \
 *        --verify \
 *        --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployEagleShareOFT_Mainnet is Script {
    // LayerZero V2 Endpoint (Ethereum Mainnet)
    address constant LZ_ENDPOINT = 0x1a44076050125825900e736c501f859c50fE728c;
    
    // Solana Mainnet EID for peer configuration
    uint32 constant SOLANA_EID = 30168;
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("DEPLOYING EAGLE OFT TO ETHEREUM MAINNET");
        console.log("==============================================");
        console.log("");
        console.log("Deployer:", deployer);
        console.log("LayerZero Endpoint:", LZ_ENDPOINT);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy EagleShareOFT
        EagleShareOFT shareOFT = new EagleShareOFT(
            "Eagle",
            "EAGLE",
            LZ_ENDPOINT,
            deployer // delegate (owner)
        );
        
        console.log("==============================================");
        console.log("DEPLOYMENT SUCCESSFUL!");
        console.log("==============================================");
        console.log("");
        console.log("EagleShareOFT:", address(shareOFT));
        console.log("Owner:", shareOFT.owner());
        console.log("Decimals:", shareOFT.decimals());
        console.log("LayerZero Endpoint:", address(shareOFT.endpoint()));
        console.log("");
        console.log("==============================================");
        console.log("NEXT STEPS");
        console.log("==============================================");
        console.log("");
        console.log("1. Configure Solana Peer:");
        console.log("   bytes32 solanaPeer = bytes32(uint256(uint160(<SOLANA_PROGRAM_ID>)));");
        console.log("   shareOFT.setPeer(", SOLANA_EID, ", solanaPeer);");
        console.log("");
        console.log("2. Solana Program ID to convert:");
        console.log("   EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU");
        console.log("");
        console.log("3. On Solana side, configure this Ethereum OFT as peer:");
        console.log("   Ethereum OFT:", address(shareOFT));
        console.log("   Ethereum EID: 30101");
        console.log("");
        console.log("==============================================");
        console.log("EXPLORER LINKS");
        console.log("==============================================");
        console.log("");
        console.log("https://etherscan.io/address/", address(shareOFT));
        console.log("");
        
        vm.stopBroadcast();
        
        // Save deployment address to file
        string memory json = "deployment";
        vm.serializeAddress(json, "eagleShareOFT", address(shareOFT));
        vm.serializeAddress(json, "layerzeroEndpoint", LZ_ENDPOINT);
        vm.serializeAddress(json, "owner", deployer);
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeUint(json, "solanaEID", SOLANA_EID);
        
        string memory finalJson = vm.serializeUint(json, "timestamp", block.timestamp);
        vm.writeJson(finalJson, "./deployments/ethereum-mainnet-oft.json");
        
        console.log("Deployment saved to: deployments/ethereum-mainnet-oft.json");
    }
}

