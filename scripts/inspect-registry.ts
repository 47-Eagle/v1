import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Inspect the actual registry contract to understand its interface
 */
async function inspectRegistry() {
    console.log("🔍 INSPECTING REGISTRY CONTRACT");
    console.log("===============================");
    
    const registryAddress = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";
    console.log(`Registry: ${registryAddress}\n`);

    try {
        // Get the contract code
        const code = await ethers.provider.getCode(registryAddress);
        console.log(`📦 Contract Code Length: ${code.length - 2} characters`);
        console.log(`📦 Contract Exists: ${code !== "0x" ? "✅ Yes" : "❌ No"}\n`);

        if (code === "0x") {
            console.log("❌ No contract deployed at this address");
            return;
        }

        // Try to connect with a generic contract interface
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}\n`);

        // Try some common function signatures
        const registry = new ethers.Contract(registryAddress, [], ethers.provider);

        console.log("🧪 Testing Common Function Calls:");
        console.log("==================================");

        // Test owner function
        try {
            const ownerSig = "0x8da5cb5b"; // owner()
            const ownerResult = await ethers.provider.call({
                to: registryAddress,
                data: ownerSig
            });
            const owner = ethers.AbiCoder.defaultAbiCoder().decode(["address"], ownerResult)[0];
            console.log(`✅ owner(): ${owner}`);
            console.log(`   └─ Your deployer is owner: ${owner.toLowerCase() === deployer.address.toLowerCase() ? '✅' : '❌'}`);
        } catch (error) {
            console.log("❌ owner() function not found or failed");
        }

        // Test if it has a specific function signature we expect
        const testFunctions = [
            { name: "registerChain(uint256,uint32,address)", sig: "0x" + ethers.keccak256(ethers.toUtf8Bytes("registerChain(uint256,uint32,address)")).slice(2, 10) },
            { name: "setChainInfo(uint256,uint32,address,bool)", sig: "0x" + ethers.keccak256(ethers.toUtf8Bytes("setChainInfo(uint256,uint32,address,bool)")).slice(2, 10) },
            { name: "getChainInfo()", sig: "0x" + ethers.keccak256(ethers.toUtf8Bytes("getChainInfo()")).slice(2, 10) },
            { name: "chains(uint256)", sig: "0x" + ethers.keccak256(ethers.toUtf8Bytes("chains(uint256)")).slice(2, 10) }
        ];

        console.log("\n🔍 Testing Function Signatures:");
        console.log("================================");

        for (const func of testFunctions) {
            try {
                // Just test if the function selector exists (this may still revert but with different error)
                await ethers.provider.call({
                    to: registryAddress,
                    data: func.sig + "0000000000000000000000000000000000000000000000000000000000000001" // dummy data
                });
                console.log(`✅ ${func.name}: Function exists (may have reverted with data)`);
            } catch (error: any) {
                if (error.message.includes("function selector was not recognized")) {
                    console.log(`❌ ${func.name}: Function does not exist`);
                } else {
                    console.log(`⚠️  ${func.name}: Function exists but reverted (${error.message.substring(0, 50)}...)`);
                }
            }
        }

        // Try to read the contract directly using Etherscan API
        console.log("\n🌐 Checking Etherscan for verified source...");
        try {
            // We could use Etherscan API here, but let's try some educated guesses first
            
            // Your contract might be a simple mapping-based registry
            // Let's try reading chain data directly
            const chainId = 1; // Ethereum
            const chainKey = ethers.solidityPackedKeccak256(["uint256"], [chainId]);
            
            console.log("📊 Trying to read chain data directly...");
            console.log(`Chain key for chain ${chainId}: ${chainKey}`);
            
            // Try reading storage slots
            const slot0 = await ethers.provider.getStorage(registryAddress, 0);
            const slot1 = await ethers.provider.getStorage(registryAddress, 1);
            const slot2 = await ethers.provider.getStorage(registryAddress, 2);
            
            console.log(`Storage slot 0: ${slot0}`);
            console.log(`Storage slot 1: ${slot1}`);
            console.log(`Storage slot 2: ${slot2}`);
            
        } catch (error) {
            console.log(`❌ Storage reading failed: ${error}`);
        }

        console.log("\n💡 RECOMMENDATIONS:");
        console.log("====================");
        console.log("1. Check if your registry has a different function name");
        console.log("2. Verify the contract source code on Etherscan");
        console.log("3. Check if you need to call a different function like 'registerChain'");
        console.log("4. Ensure you're the owner of the registry contract");
        console.log(`\n🔗 Etherscan: https://etherscan.io/address/${registryAddress}#code`);

    } catch (error: any) {
        console.error(`❌ Inspection failed: ${error.message}`);
    }
}

inspectRegistry().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
