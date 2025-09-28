import { ethers } from "hardhat";

async function main() {
    const registryAddress = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";
    
    console.log("🔍 Checking registry on BSC...");
    console.log(`Registry address: ${registryAddress}`);
    
    try {
        // Check if contract exists
        const code = await ethers.provider.getCode(registryAddress);
        if (code === "0x") {
            console.log("❌ Registry contract does not exist on BSC");
            return;
        }
        console.log("✅ Registry contract exists on BSC");
        
        // Try to call it using the expected IChainRegistry interface
        const registry = await ethers.getContractAt("IChainRegistry", registryAddress);
        
        try {
            const endpoint = await registry.getLZEndpoint();
            console.log(`✅ Registry getLZEndpoint(): ${endpoint}`);
        } catch (e) {
            console.log(`❌ getLZEndpoint() failed: ${e.message}`);
        }
        
        try {
            const eid = await registry.getEID();
            console.log(`✅ Registry getEID(): ${eid}`);
        } catch (e) {
            console.log(`❌ getEID() failed: ${e.message}`);
        }
        
        try {
            const chainInfo = await registry.getChainInfo();
            console.log(`✅ Registry getChainInfo():`, chainInfo);
        } catch (e) {
            console.log(`❌ getChainInfo() failed: ${e.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Registry check failed: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
