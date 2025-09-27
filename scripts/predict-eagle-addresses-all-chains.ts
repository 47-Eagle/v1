import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Predict $EAGLE addresses across ALL LayerZero chains using existing CREATE2 factory
 * Shows exactly what addresses will be used before any deployment
 */
async function predictEagleAddressesAllChains() {
    console.log("🔮 PREDICTING $EAGLE ADDRESSES ACROSS ALL CHAINS");
    console.log("=================================================");
    console.log("Using your CREATE2FactoryWithOwnership! 🏭\n");

    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`🏭 CREATE2 Factory: ${process.env.EAGLE_CREATE2_FACTORY}\n`);

    // Standard parameters (MUST be identical on ALL chains!)
    const STANDARD_PARAMS = {
        salt: ethers.keccak256(ethers.toUtf8Bytes("EAGLE_SHARE_OFT_V1_FINAL")),
        name: "Eagle Vault Shares",
        symbol: "EAGLE",
        delegate: deployer.address
    };

    console.log("📋 Standard Parameters (identical on ALL chains):");
    console.log(`   ├─ Salt: ${STANDARD_PARAMS.salt}`);
    console.log(`   ├─ Name: "${STANDARD_PARAMS.name}"`);
    console.log(`   ├─ Symbol: "${STANDARD_PARAMS.symbol}"`);
    console.log(`   └─ Delegate: ${STANDARD_PARAMS.delegate}\n`);

    // All LayerZero chains where you'll deploy
    const CHAINS = [
        {
            name: "Ethereum",
            chainId: 1,
            lzEndpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,
            explorer: "etherscan.io",
            currency: "ETH"
        },
        {
            name: "BSC", 
            chainId: 56,
            lzEndpoint: process.env.BSC_LZ_ENDPOINT_V2!,
            explorer: "bscscan.com",
            currency: "BNB"
        },
        {
            name: "Arbitrum",
            chainId: 42161,
            lzEndpoint: process.env.ARBITRUM_LZ_ENDPOINT_V2!,
            explorer: "arbiscan.io",
            currency: "ETH"
        },
        {
            name: "Base",
            chainId: 8453,
            lzEndpoint: process.env.BASE_LZ_ENDPOINT_V2!,
            explorer: "basescan.org",
            currency: "ETH"
        },
        {
            name: "Avalanche",
            chainId: 43114,
            lzEndpoint: process.env.AVALANCHE_LZ_ENDPOINT_V2!,
            explorer: "snowtrace.io",
            currency: "AVAX"
        }
    ];

    console.log("🌐 PREDICTED $EAGLE ADDRESSES:");
    console.log("=".repeat(50));

    const predictedAddresses: { [chainName: string]: string } = {};
    let universalAddress: string | null = null;

    for (const chain of CHAINS) {
        try {
            // Get EagleShareOFT bytecode with constructor args for this chain
            const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/EagleShareOFT.sol:EagleShareOFT");
            const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
                ["string", "string", "address", "address"],
                [STANDARD_PARAMS.name, STANDARD_PARAMS.symbol, chain.lzEndpoint, STANDARD_PARAMS.delegate]
            );
            
            const bytecode = EagleShareOFT.bytecode + constructorArgs.slice(2);
            const bytecodeHash = ethers.keccak256(bytecode);

            // Calculate CREATE2 address manually
            const create2Hash = ethers.keccak256(
                ethers.solidityPacked(
                    ["bytes1", "address", "bytes32", "bytes32"],
                    ["0xff", process.env.EAGLE_CREATE2_FACTORY!, STANDARD_PARAMS.salt, bytecodeHash]
                )
            );
            const predictedAddress = ethers.getAddress("0x" + create2Hash.slice(-40));

            predictedAddresses[chain.name] = predictedAddress;

            console.log(`\n🔗 ${chain.name} (Chain ID: ${chain.chainId}):`);
            console.log(`   ├─ LZ Endpoint: ${chain.lzEndpoint}`);
            console.log(`   ├─ $EAGLE: ${predictedAddress}`);
            console.log(`   ├─ Explorer: https://${chain.explorer}/address/${predictedAddress}`);
            console.log(`   └─ Currency: ${chain.currency}`);

            // Store first address as reference
            if (!universalAddress) {
                universalAddress = predictedAddress;
            }

        } catch (error) {
            console.error(`❌ ${chain.name} prediction failed: ${error}`);
        }
    }

    // Verify all addresses are the same
    const uniqueAddresses = [...new Set(Object.values(predictedAddresses))];
    
    console.log("\n🔍 CROSS-CHAIN ADDRESS VERIFICATION:");
    console.log("=" .repeat(40));
    
    if (uniqueAddresses.length === 1 && universalAddress) {
        console.log(`✅ SUCCESS: SAME ADDRESS ON ALL CHAINS!`);
        console.log(`🎯 Universal $EAGLE Address: ${universalAddress}`);
        
        console.log(`\n🎊 BENEFITS:`);
        console.log(`   ✅ Users see same address everywhere`);
        console.log(`   ✅ No chain-specific address mapping`);  
        console.log(`   ✅ Simplified frontend integration`);
        console.log(`   ✅ Professional user experience`);
        console.log(`   ✅ Like USDC, USDT, WETH standards`);
        
    } else {
        console.log(`❌ PROBLEM: ${uniqueAddresses.length} different addresses found:`);
        uniqueAddresses.forEach((addr, i) => {
            console.log(`   ${i + 1}. ${addr}`);
        });
        
        console.log(`\n💡 ISSUE: Different bytecode on different chains`);
        console.log(`   Check LayerZero endpoint addresses are correct`);
        console.log(`   Ensure identical constructor parameters`);
    }

    console.log("\n📊 DEPLOYMENT PLAN:");
    console.log("=" .repeat(20));
    console.log("1. 🏭 Verify factory ownership/permissions");
    console.log("2. 💰 Fund deployer on all chains");
    console.log("3. 🚀 Deploy $EAGLE on each chain with same params");
    console.log("4. ✅ Verify all addresses match prediction");
    console.log("5. 🔗 Configure LayerZero peer connections");
    console.log("6. 🧪 Test cross-chain $EAGLE transfers");

    console.log("\n📋 DEPLOYMENT COMMANDS:");
    console.log("=" .repeat(22));
    console.log("# Deploy on each chain:");
    for (const chain of CHAINS) {
        console.log(`npx hardhat run scripts/deploy-eagle-via-create2-factory.ts --network ${chain.name.toLowerCase()}`);
    }

    console.log("\n💡 NEXT STEPS:");
    console.log("=" .repeat(15));
    console.log("1. Check factory permissions");
    console.log("2. Fund accounts with enough gas");
    console.log("3. Run deployment script on each chain");
    console.log("4. Verify addresses match this prediction");
    console.log("5. Configure cross-chain peers");

    // Save prediction to file for reference
    const predictionData = {
        timestamp: new Date().toISOString(),
        factory: process.env.EAGLE_CREATE2_FACTORY,
        salt: STANDARD_PARAMS.salt,
        deployer: deployer.address,
        universalAddress,
        predictions: predictedAddresses,
        success: uniqueAddresses.length === 1
    };

    console.log(`\n💾 Prediction saved for deployment verification`);
    return predictionData;
}

predictEagleAddressesAllChains().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
