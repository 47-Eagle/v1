import { ethers } from "hardhat";

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";

async function tryAllRegistryFunctions() {
    console.log("🔍 TRYING ALL POSSIBLE REGISTRY FUNCTIONS");
    console.log("=========================================");
    
    const [deployer] = await ethers.getSigners();
    
    // Since we know slot 6 = 0x38 (BSC chain ID), let's try different ways to access it
    const possibleFunctions = [
        // Getters that might work
        "function getChainId() external view returns (uint256)",
        "function chainId() external view returns (uint256)", 
        "function currentChainId() external view returns (uint256)",
        "function getEndpoint() external view returns (address)",
        "function endpoint() external view returns (address)",
        "function lzEndpoint() external view returns (address)",
        "function layerZeroEndpoint() external view returns (address)",
        "function getLayerZeroEndpoint() external view returns (address)",
        "function getLZEndpoint() external view returns (address)",
        "function eid() external view returns (uint32)",
        "function endpointId() external view returns (uint32)",
        "function getEndpointId() external view returns (uint32)",
        "function getEid() external view returns (uint32)",
        "function getEID() external view returns (uint32)",
        
        // Setters that might work  
        "function setEndpoint(address) external",
        "function setLzEndpoint(address) external",
        "function setLayerZeroEndpoint(address) external",
        "function setEid(uint32) external",
        "function setEID(uint32) external", 
        "function configure(address,uint32) external",
        "function setup(address,uint32) external",
        "function init(address,uint32) external",
        
        // Check if it needs specific initialization
        "function isInitialized() external view returns (bool)",
        "function ready() external view returns (bool)",
        "function active() external view returns (bool)",
        
        // Maybe it stores by chain
        "function getEndpointForChain(uint256) external view returns (address)",
        "function getEidForChain(uint256) external view returns (uint32)",
        "function endpoints(uint256) external view returns (address)",
        "function eids(uint256) external view returns (uint32)"
    ];
    
    let workingFunctions = [];
    
    for (const funcSig of possibleFunctions) {
        try {
            const contract = await ethers.getContractAt([funcSig], REGISTRY_ADDRESS);
            const funcName = funcSig.split('(')[0].replace('function ', '');
            
            try {
                let result;
                if (funcSig.includes('(uint256)') && funcSig.includes('view')) {
                    // Try with BSC chain ID
                    result = await contract[funcName](56);
                } else if (funcSig.includes('view')) {
                    result = await contract[funcName]();
                } else {
                    // Skip setters for now, just testing getters
                    continue;
                }
                
                if (result !== undefined && result !== null) {
                    console.log(`✅ ${funcName}: ${result}`);
                    workingFunctions.push(funcSig);
                }
            } catch (error) {
                console.log(`❌ ${funcName}: ${error.message.substring(0, 50)}`);
            }
        } catch (error) {
            // Invalid function signature
        }
    }
    
    if (workingFunctions.length > 0) {
        console.log(`\n🎉 Found ${workingFunctions.length} working functions:`);
        workingFunctions.forEach(func => console.log(`   ${func}`));
        
        // If we found working functions, try to configure
        console.log("\n🔧 Attempting configuration with working functions...");
        
        // Try setting endpoint if we have a setter
        const BSC_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
        const BSC_EID = 30102;
        
        for (const setter of ["setEndpoint", "setLzEndpoint", "setLayerZeroEndpoint"]) {
            try {
                const contract = await ethers.getContractAt([
                    `function ${setter}(address) external`
                ], REGISTRY_ADDRESS);
                
                console.log(`Trying ${setter}(${BSC_ENDPOINT})...`);
                const tx = await contract[setter](BSC_ENDPOINT);
                await tx.wait();
                console.log(`✅ ${setter} successful!`);
                break;
            } catch (error) {
                console.log(`❌ ${setter} failed: ${error.message.substring(0, 50)}`);
            }
        }
        
    } else {
        console.log("\n❌ No working functions found. Registry interface is unknown.");
        console.log("💡 Recommendation: Deploy EagleShareOFT with direct endpoint instead of registry");
    }
    
    // Final test - see if we can make the original EagleShareOFT work now
    console.log("\n🧪 TESTING EAGLESHARSOFT DEPLOYMENT...");
    try {
        const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT");
        
        // Test the constructor call that was failing
        const deployTx = await EagleShareOFT.getDeployTransaction(
            "Eagle",
            "EAGLE", 
            REGISTRY_ADDRESS,
            deployer.address
        );
        
        const gasEstimate = await ethers.provider.estimateGas({
            from: deployer.address,
            data: deployTx.data
        });
        
        console.log(`✅ EagleShareOFT gas estimate: ${gasEstimate}`);
        console.log("🎉 EagleShareOFT should work now!");
        
    } catch (error) {
        console.log(`❌ EagleShareOFT still failing: ${error.message.substring(0, 100)}`);
        console.log("Registry configuration may still be incomplete");
    }
}

tryAllRegistryFunctions()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
