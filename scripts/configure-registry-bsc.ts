import { ethers } from "hardhat";

/**
 * Configure registry for BSC chain
 * Registry: 0x472656c76f45e8a8a63fffd32ab5888898eea91e
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";

// BSC LayerZero V2 Configuration
const BSC_CONFIG = {
    chainId: 56,
    eid: 30102,
    lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    active: true
};

async function configureRegistryForBSC() {
    console.log("🔧 CONFIGURING REGISTRY FOR BSC");
    console.log("================================");
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    console.log(`BSC Chain ID: ${BSC_CONFIG.chainId}`);
    console.log(`BSC EID: ${BSC_CONFIG.eid}`);
    console.log(`BSC Endpoint: ${BSC_CONFIG.lzEndpoint}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Get registry contract
        const registry = await ethers.getContractAt("IChainRegistry", REGISTRY_ADDRESS);
        
        // Check if we're the owner
        try {
            console.log("\n🔍 Checking registry ownership...");
            
            // Try a simple view call first to see if registry is responsive
            const code = await ethers.provider.getCode(REGISTRY_ADDRESS);
            if (code === "0x") {
                throw new Error("Registry contract does not exist");
            }
            console.log("✅ Registry contract exists");
            
            // Try to call owner function with different possible interfaces
            let isOwner = false;
            try {
                // Try standard Ownable interface
                const ownerContract = await ethers.getContractAt(
                    ["function owner() external view returns (address)"],
                    REGISTRY_ADDRESS
                );
                const owner = await ownerContract.owner();
                console.log(`Registry owner: ${owner}`);
                isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
            } catch (e) {
                console.log("⚠️  Could not check owner, proceeding anyway...");
                isOwner = true; // Assume we can configure
            }
            
            if (!isOwner && deployer.address !== "0x7310Dd6EF89b7f829839F140C6840bc929ba2031") {
                throw new Error(`Not authorized to configure registry. Owner check failed.`);
            }
            
            console.log("✅ Proceeding with registry configuration");
            
        } catch (error) {
            console.log(`⚠️  Ownership check failed: ${error.message}`);
            console.log("Proceeding anyway (you may be the owner)...");
        }
        
        // Configure BSC chain information
        console.log("\n📝 Setting BSC chain configuration...");
        
        try {
            const tx = await registry.setChainInfo(
                BSC_CONFIG.chainId,
                BSC_CONFIG.eid, 
                BSC_CONFIG.lzEndpoint,
                BSC_CONFIG.active
            );
            
            console.log(`📡 Transaction sent: ${tx.hash}`);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await tx.wait();
            console.log(`✅ BSC configuration set! Block: ${receipt.blockNumber}`);
            
        } catch (error) {
            console.log(`❌ setChainInfo failed: ${error.message}`);
            
            // Try alternative function names
            console.log("🔄 Trying alternative configuration methods...");
            
            try {
                // Try registerChain function
                const tx2 = await registry.registerChain(
                    BSC_CONFIG.chainId,
                    BSC_CONFIG.eid,
                    BSC_CONFIG.lzEndpoint
                );
                console.log(`📡 registerChain transaction: ${tx2.hash}`);
                const receipt2 = await tx2.wait();
                console.log(`✅ BSC registered! Block: ${receipt2.blockNumber}`);
                
            } catch (error2) {
                console.log(`❌ registerChain also failed: ${error2.message}`);
                
                // Show what functions are available
                console.log("\n🔍 Let's see what functions this registry has...");
                try {
                    // Try to call with minimal interface
                    const minimalRegistry = await ethers.getContractAt([
                        "function setChainInfo(uint256,uint32,address,bool) external",
                        "function registerChain(uint256,uint32,address) external", 
                        "function addChain(uint256,uint32,address) external",
                        "function configure(uint256,uint32,address) external"
                    ], REGISTRY_ADDRESS);
                    
                    // This will fail but might give us better error info
                    await minimalRegistry.setChainInfo.staticCall(
                        BSC_CONFIG.chainId,
                        BSC_CONFIG.eid,
                        BSC_CONFIG.lzEndpoint, 
                        BSC_CONFIG.active
                    );
                } catch (error3) {
                    console.log(`Static call result: ${error3.message}`);
                }
            }
        }
        
        // Verify configuration worked
        console.log("\n✅ VERIFICATION");
        console.log("===============");
        
        try {
            const chainInfo = await registry.getChainInfo();
            console.log("BSC Chain Info:", chainInfo);
            
            const endpoint = await registry.getLZEndpoint();
            console.log(`BSC LayerZero Endpoint: ${endpoint}`);
            
            const eid = await registry.getEID();
            console.log(`BSC EID: ${eid}`);
            
            if (endpoint.toLowerCase() === BSC_CONFIG.lzEndpoint.toLowerCase() && eid == BSC_CONFIG.eid) {
                console.log("\n🎉 REGISTRY SUCCESSFULLY CONFIGURED FOR BSC!");
                console.log("✅ EagleShareOFT should now deploy successfully");
            } else {
                console.log("\n⚠️  Configuration may not have worked correctly");
            }
            
        } catch (verifyError) {
            console.log(`❌ Verification failed: ${verifyError.message}`);
            console.log("Registry may need different configuration approach");
        }
        
    } catch (error) {
        console.log(`❌ Registry configuration failed: ${error.message}`);
        throw error;
    }
}

configureRegistryForBSC()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
