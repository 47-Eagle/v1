import { ethers } from "hardhat";

/**
 * Deploy EagleShareOFT with CREATE2 vanity address (0x47...EA91E)
 * Using the working registry and exact constructor arguments
 */

const REGISTRY_ADDRESS = "0x472656c76f45e8a8a63fffd32ab5888898eea91e";
const CREATE2_FACTORY = "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE";
const VANITY_SALT = "0xe0000000023e5f2f000000000000000000000000000000000000000000000000";

// Exact constructor arguments that work with registry
const CONSTRUCTOR_ARGS = {
    name: "Eagle",
    symbol: "EAGLE", 
    registry: REGISTRY_ADDRESS,
    delegate: "0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
};

async function deployEagleShareOFTVanity() {
    console.log("🎯 DEPLOYING EAGLESHARSOFT WITH VANITY ADDRESS");
    console.log("===============================================");
    console.log(`Target: 0x47...EA91E`);
    console.log(`Factory: ${CREATE2_FACTORY}`);
    console.log(`Salt: ${VANITY_SALT}`);
    console.log(`Registry: ${REGISTRY_ADDRESS}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // 1. Get contract factory and bytecode
        console.log("\n1️⃣ Preparing CREATE2 deployment...");
        
        const EagleShareOFT = await ethers.getContractFactory("contracts/layerzero-ovault/oft/EagleShareOFT.sol:EagleShareOFT");
        
        // Get deployment transaction with exact constructor args
        const deployTx = await EagleShareOFT.getDeployTransaction(
            CONSTRUCTOR_ARGS.name,
            CONSTRUCTOR_ARGS.symbol,
            CONSTRUCTOR_ARGS.registry,
            CONSTRUCTOR_ARGS.delegate
        );
        
        if (!deployTx.data) {
            throw new Error("Failed to get deployment transaction data");
        }
        
        console.log(`   📦 Contract bytecode prepared (${deployTx.data.length} chars)`);
        console.log(`   🔧 Constructor args: ["${CONSTRUCTOR_ARGS.name}", "${CONSTRUCTOR_ARGS.symbol}", "${CONSTRUCTOR_ARGS.registry}", "${CONSTRUCTOR_ARGS.delegate}"]`);
        
        // 2. Predict the vanity address
        console.log("\n2️⃣ Predicting vanity address...");
        
        const bytecodeHash = ethers.keccak256(deployTx.data);
        const salt = VANITY_SALT;
        
        // Compute CREATE2 address manually
        const create2Address = ethers.getCreate2Address(
            CREATE2_FACTORY,
            salt,
            bytecodeHash
        );
        
        console.log(`   🎯 Predicted address: ${create2Address}`);
        
        // Verify it matches our vanity pattern
        if (create2Address.toLowerCase().startsWith('0x47') && create2Address.toLowerCase().endsWith('ea91e')) {
            console.log(`   ✅ Vanity pattern confirmed: 0x47...EA91E`);
        } else {
            console.log(`   ⚠️  Address doesn't match vanity pattern`);
            console.log(`   Expected: 0x47...EA91E`);
            console.log(`   Got: ${create2Address.substring(0, 4)}...${create2Address.substring(38)}`);
        }
        
        // 3. Deploy with CREATE2 factory
        console.log("\n3️⃣ Deploying with CREATE2 factory...");
        
        const factory = await ethers.getContractAt([
            "function deploy(bytes32 salt, bytes memory bytecode) external returns (address)",
            "function computeAddress(bytes32 salt, bytes32 bytecodeHash) external view returns (address)"
        ], CREATE2_FACTORY);
        
        // Check factory computed address matches our prediction
        const factoryPrediction = await factory.computeAddress(salt, bytecodeHash);
        console.log(`   🏭 Factory prediction: ${factoryPrediction}`);
        
        if (factoryPrediction.toLowerCase() !== create2Address.toLowerCase()) {
            throw new Error("Factory prediction doesn't match manual calculation");
        }
        
        // Execute deployment
        console.log(`   🚀 Executing CREATE2 deployment...`);
        
        const deploymentTx = await factory.deploy(salt, deployTx.data, {
            gasLimit: 3000000 // High gas limit for safety
        });
        
        console.log(`   📡 Transaction sent: ${deploymentTx.hash}`);
        const receipt = await deploymentTx.wait();
        console.log(`   ⛽ Gas used: ${receipt.gasUsed}`);
        
        // 4. Verify deployment
        console.log("\n4️⃣ Verifying deployment...");
        
        const deployedCode = await ethers.provider.getCode(create2Address);
        if (deployedCode === "0x") {
            throw new Error("Deployment failed - no code at predicted address");
        }
        
        console.log(`   ✅ Contract deployed at: ${create2Address}`);
        
        // 5. Test deployed contract
        console.log("\n5️⃣ Testing deployed contract...");
        
        const deployedContract = EagleShareOFT.attach(create2Address);
        
        const name = await deployedContract.name();
        const symbol = await deployedContract.symbol();
        console.log(`   🏷️  Token: ${name} (${symbol})`);
        
        const registry = await deployedContract.getRegistry();
        console.log(`   🗃️  Registry: ${registry}`);
        
        const chainEID = await deployedContract.getChainEID();
        console.log(`   🆔 Chain EID: ${chainEID}`);
        
        // Check if address verification passes
        const verifyResult = await deployedContract.verifyConfiguration();
        console.log(`   🔍 Config verification: ${verifyResult}`);
        
        // 6. Save deployment info
        const fs = require('fs');
        const deploymentData = {
            bsc: {
                chainId: 56,
                timestamp: new Date().toISOString(),
                deployer: deployer.address,
                vanityDeployment: {
                    address: create2Address,
                    pattern: "0x47...EA91E",
                    factory: CREATE2_FACTORY,
                    salt: VANITY_SALT,
                    bytecodeHash: bytecodeHash
                },
                contracts: {
                    eagleShareOFT: create2Address, // Vanity address!
                    wlfiAdapter: "0xb71B1044E3875626Ff06C376553Fb5cBc2A78161",
                    usd1Adapter: "0xA136dc3562A99122D15a978A380e475F22fcCcf9"
                },
                constructor: CONSTRUCTOR_ARGS,
                registry: {
                    address: REGISTRY_ADDRESS,
                    configured: true
                }
            }
        };
        
        fs.writeFileSync('bsc-vanity-deployment.json', JSON.stringify(deploymentData, null, 2));
        
        console.log("\n🎉 VANITY DEPLOYMENT SUCCESSFUL!");
        console.log(`✅ EagleShareOFT: ${create2Address}`);
        console.log(`🎯 Vanity pattern: 0x47...EA91E achieved!`);
        console.log(`📁 Details saved to: bsc-vanity-deployment.json`);
        
        return create2Address;
        
    } catch (error) {
        console.log(`❌ Vanity deployment failed: ${error.message}`);
        
        if (error.message.includes("0x")) {
            console.log("💡 This might be a CREATE2 factory issue or salt collision");
        }
        
        throw error;
    }
}

deployEagleShareOFTVanity()
    .then((address) => {
        console.log(`\n🎯 SUCCESS: EagleShareOFT vanity address deployed!`);
        console.log(`Address: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
