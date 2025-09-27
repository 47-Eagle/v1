import { ethers } from "hardhat";

/**
 * @title Debug WLFI OFT Adapter Deployment
 * @notice Isolate and debug the WLFI adapter deployment issue
 */

async function main() {
    console.log("🔧 DEBUG WLFI OFT ADAPTER DEPLOYMENT");
    console.log("=".repeat(50));
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Constants
    const REAL_WLFI = process.env.WLFI_ETHEREUM!;
    const ENDPOINT = process.env.ETHEREUM_LZ_ENDPOINT_V2!;
    const DELEGATE = deployer.address;
    
    console.log("\n📋 CONSTRUCTOR PARAMETERS:");
    console.log(`   WLFI Token: ${REAL_WLFI}`);
    console.log(`   Endpoint: ${ENDPOINT}`);
    console.log(`   Delegate: ${DELEGATE}`);
    
    // Validate addresses exist
    console.log("\n🔍 VALIDATING ADDRESSES:");
    
    // Check WLFI token
    try {
        const wlfiCode = await ethers.provider.getCode(REAL_WLFI);
        console.log(`✅ WLFI Token has code: ${wlfiCode.length > 2}`);
    } catch (error) {
        console.log(`❌ WLFI Token check failed:`, error);
    }
    
    // Check LayerZero endpoint
    try {
        const endpointCode = await ethers.provider.getCode(ENDPOINT);
        console.log(`✅ LayerZero Endpoint has code: ${endpointCode.length > 2}`);
    } catch (error) {
        console.log(`❌ Endpoint check failed:`, error);
    }
    
    // Try to get WLFI token info
    try {
        const wlfiContract = await ethers.getContractAt("IERC20Metadata", REAL_WLFI);
        const name = await wlfiContract.name();
        const symbol = await wlfiContract.symbol();
        const decimals = await wlfiContract.decimals();
        console.log(`✅ WLFI Token info: ${name} (${symbol}) - ${decimals} decimals`);
    } catch (error) {
        console.log(`ℹ️  WLFI metadata not available (might not implement full interface)`);
    }
    
    console.log("\n⛽ DEPLOYMENT WITH MINIMAL GAS:");
    const gasSettings = {
        gasPrice: ethers.parseUnits("0.5", "gwei"), // 0.5 gwei ultra low
        gasLimit: 1000000 // 1M gas limit
    };
    
    console.log(`   Gas Price: 0.5 gwei`);
    console.log(`   Gas Limit: 1M`);
    console.log(`   Max Cost: ~${ethers.formatEther(gasSettings.gasPrice * BigInt(gasSettings.gasLimit))} ETH`);
    
    try {
        console.log("\n🚀 Deploying WLFI OFT Adapter...");
        
        const WLFIAdapter = await ethers.getContractFactory("WLFIAssetOFTAdapter");
        
        // Try deployment with error catching
        const deployTx = await WLFIAdapter.getDeployTransaction(
            REAL_WLFI,
            ENDPOINT,
            DELEGATE
        );
        
        console.log("📤 Sending deployment transaction...");
        const sentTx = await deployer.sendTransaction({
            ...deployTx,
            ...gasSettings
        });
        
        console.log(`📄 TX Hash: ${sentTx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await sentTx.wait();
        
        if (receipt && receipt.status === 1) {
            console.log(`✅ WLFI OFT Adapter deployed: ${receipt.contractAddress}`);
            console.log(`💸 Gas used: ${receipt.gasUsed.toString()}`);
            console.log(`💰 Cost: ${ethers.formatEther(receipt.gasUsed * sentTx.gasPrice!)} ETH`);
        } else {
            console.log(`❌ Deployment failed with receipt:`, receipt);
        }
        
    } catch (error: any) {
        console.log("\n❌ DEPLOYMENT ERROR:");
        console.log(`Error: ${error.message}`);
        
        if (error.reason) {
            console.log(`Reason: ${error.reason}`);
        }
        
        if (error.data) {
            console.log(`Error data: ${error.data}`);
        }
        
        // Try to decode the revert reason
        if (error.receipt && error.receipt.status === 0) {
            console.log("Transaction reverted. Checking revert reason...");
            try {
                const tx = await ethers.provider.getTransaction(error.receipt.hash);
                const result = await ethers.provider.call(tx!, error.receipt.blockNumber);
                console.log("Call result:", result);
            } catch (callError) {
                console.log("Could not determine revert reason:", callError);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
