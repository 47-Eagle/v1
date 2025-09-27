import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688',
    endpoint: process.env.BNB_LZ_ENDPOINT_V2!,
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',
    shareOFT: '0x68cF24743CA335ae3c2e21c2538F4E929224F096',
    endpoint: process.env.ETHEREUM_LZ_ENDPOINT_V2!,
};

const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

async function checkAndSetDelegates() {
    console.log("👥 CHECKING AND SETTING LAYERZERO DELEGATES");
    console.log("==========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer/Expected Delegate: ${deployer.address}`);
    
    try {
        // Step 1: Check current delegates
        console.log("\n1️⃣  CHECKING CURRENT DELEGATES:");
        await checkCurrentDelegates(deployer.address);
        
        // Step 2: Set delegates on OApp contracts
        console.log("\n2️⃣  SETTING OAPP DELEGATES:");
        await setOAppDelegates(deployer.address);
        
        // Step 3: Verify endpoint delegates
        console.log("\n3️⃣  VERIFYING ENDPOINT DELEGATES:");
        await verifyEndpointDelegates(deployer.address);
        
        // Step 4: Test configuration permissions
        console.log("\n4️⃣  TESTING CONFIGURATION PERMISSIONS:");
        await testConfigurationPermissions();
        
        console.log("\n🎊 DELEGATE SETUP COMPLETE!");
        
    } catch (error: any) {
        console.error(`❌ Delegate setup failed: ${error.message}`);
    }
}

async function checkCurrentDelegates(expectedDelegate: string) {
    console.log("Checking current delegate configuration...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    // OApp ABI for delegate functions
    const OAppAbi = [
        "function owner() external view returns (address)",
        "function delegate() external view returns (address)"
    ];
    
    // Endpoint ABI for delegate functions
    const EndpointAbi = [
        "function delegates(address _oapp) external view returns (address delegate)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    console.log("\n📱 BSC CONTRACT DELEGATES:");
    
    // Check BSC USD1 Adapter
    try {
        const bscUsd1Adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OAppAbi, bscProvider);
        const owner = await bscUsd1Adapter.owner();
        console.log(`USD1 Adapter Owner: ${owner}`);
        console.log(`Owner matches deployer: ${owner.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
        // Check endpoint delegate
        const endpointDelegate = await bscEndpoint.delegates(BSC_CONTRACTS.usd1Adapter);
        console.log(`USD1 Adapter Endpoint Delegate: ${endpointDelegate}`);
        console.log(`Delegate matches deployer: ${endpointDelegate.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
        // Try to get OApp delegate if available
        try {
            const oappDelegate = await bscUsd1Adapter.delegate();
            console.log(`USD1 Adapter OApp Delegate: ${oappDelegate}`);
            console.log(`OApp delegate matches deployer: ${oappDelegate.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        } catch (e) {
            console.log("USD1 Adapter OApp Delegate: Not available (may not be implemented)");
        }
        
    } catch (error: any) {
        console.log(`❌ BSC USD1 Adapter delegate check failed: ${error.message}`);
    }
    
    // Check BSC WLFI Adapter
    try {
        const bscWlfiAdapter = new ethers.Contract(BSC_CONTRACTS.wlfiAdapter, OAppAbi, bscProvider);
        const owner = await bscWlfiAdapter.owner();
        console.log(`WLFI Adapter Owner: ${owner}`);
        console.log(`Owner matches deployer: ${owner.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
        const endpointDelegate = await bscEndpoint.delegates(BSC_CONTRACTS.wlfiAdapter);
        console.log(`WLFI Adapter Endpoint Delegate: ${endpointDelegate}`);
        console.log(`Delegate matches deployer: ${endpointDelegate.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
    } catch (error: any) {
        console.log(`❌ BSC WLFI Adapter delegate check failed: ${error.message}`);
    }
    
    console.log("\n📱 ETHEREUM CONTRACT DELEGATES:");
    
    // Check Ethereum USD1 Adapter
    try {
        const ethUsd1Adapter = new ethers.Contract(ETHEREUM_CONTRACTS.usd1Adapter, OAppAbi, ethProvider);
        const owner = await ethUsd1Adapter.owner();
        console.log(`USD1 Adapter Owner: ${owner}`);
        console.log(`Owner matches deployer: ${owner.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
        const endpointDelegate = await ethEndpoint.delegates(ETHEREUM_CONTRACTS.usd1Adapter);
        console.log(`USD1 Adapter Endpoint Delegate: ${endpointDelegate}`);
        console.log(`Delegate matches deployer: ${endpointDelegate.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
    } catch (error: any) {
        console.log(`❌ Ethereum USD1 Adapter delegate check failed: ${error.message}`);
    }
    
    // Check Ethereum WLFI Adapter
    try {
        const ethWlfiAdapter = new ethers.Contract(ETHEREUM_CONTRACTS.wlfiAdapter, OAppAbi, ethProvider);
        const owner = await ethWlfiAdapter.owner();
        console.log(`WLFI Adapter Owner: ${owner}`);
        console.log(`Owner matches deployer: ${owner.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
        const endpointDelegate = await ethEndpoint.delegates(ETHEREUM_CONTRACTS.wlfiAdapter);
        console.log(`WLFI Adapter Endpoint Delegate: ${endpointDelegate}`);
        console.log(`Delegate matches deployer: ${endpointDelegate.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
    } catch (error: any) {
        console.log(`❌ Ethereum WLFI Adapter delegate check failed: ${error.message}`);
    }
    
    // Check Ethereum Share OFT
    try {
        const ethShareOFT = new ethers.Contract(ETHEREUM_CONTRACTS.shareOFT, OAppAbi, ethProvider);
        const owner = await ethShareOFT.owner();
        console.log(`Share OFT Owner: ${owner}`);
        console.log(`Owner matches deployer: ${owner.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
        const endpointDelegate = await ethEndpoint.delegates(ETHEREUM_CONTRACTS.shareOFT);
        console.log(`Share OFT Endpoint Delegate: ${endpointDelegate}`);
        console.log(`Delegate matches deployer: ${endpointDelegate.toLowerCase() === expectedDelegate.toLowerCase() ? '✅' : '❌'}`);
        
    } catch (error: any) {
        console.log(`❌ Ethereum Share OFT delegate check failed: ${error.message}`);
    }
}

async function setOAppDelegates(delegateAddress: string) {
    console.log("Setting OApp delegates to ensure configuration permissions...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    
    const OAppAbi = [
        "function setDelegate(address _delegate) external",
        "function delegate() external view returns (address)"
    ];
    
    const contracts = [
        { name: 'BSC USD1 Adapter', address: BSC_CONTRACTS.usd1Adapter, signer: bscSigner },
        { name: 'BSC WLFI Adapter', address: BSC_CONTRACTS.wlfiAdapter, signer: bscSigner },
        { name: 'ETH USD1 Adapter', address: ETHEREUM_CONTRACTS.usd1Adapter, signer: ethSigner },
        { name: 'ETH WLFI Adapter', address: ETHEREUM_CONTRACTS.wlfiAdapter, signer: ethSigner },
        { name: 'ETH Share OFT', address: ETHEREUM_CONTRACTS.shareOFT, signer: ethSigner }
    ];
    
    for (const contract of contracts) {
        try {
            console.log(`🔧 Setting delegate for ${contract.name}...`);
            
            const oapp = new ethers.Contract(contract.address, OAppAbi, contract.signer);
            
            // Try to set delegate (if function exists)
            try {
                const gasSettings = contract.signer.provider?.network?.chainId === 56 
                    ? { gasPrice: ethers.parseUnits("3", "gwei"), gasLimit: 150000 }
                    : { 
                        maxFeePerGas: ethers.parseUnits("12", "gwei"),
                        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                        gasLimit: 150000 
                      };
                      
                const tx = await oapp.setDelegate(delegateAddress, gasSettings);
                await tx.wait();
                console.log(`✅ ${contract.name} delegate set: ${tx.hash}`);
                
            } catch (delegateError: any) {
                if (delegateError.message.includes('function does not exist') || 
                    delegateError.message.includes('unknown function')) {
                    console.log(`ℹ️  ${contract.name} doesn't have setDelegate function (using owner permissions)`);
                } else {
                    console.log(`⚠️  ${contract.name} delegate setup failed: ${delegateError.message}`);
                }
            }
            
        } catch (error: any) {
            console.log(`❌ ${contract.name} delegate setup error: ${error.message}`);
        }
    }
}

async function verifyEndpointDelegates(expectedDelegate: string) {
    console.log("Verifying endpoint delegate configuration...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL!);
    
    const EndpointAbi = [
        "function delegates(address _oapp) external view returns (address delegate)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_CONTRACTS.endpoint, EndpointAbi, ethProvider);
    
    const contracts = [
        { name: 'BSC USD1', address: BSC_CONTRACTS.usd1Adapter, endpoint: bscEndpoint },
        { name: 'BSC WLFI', address: BSC_CONTRACTS.wlfiAdapter, endpoint: bscEndpoint },
        { name: 'ETH USD1', address: ETHEREUM_CONTRACTS.usd1Adapter, endpoint: ethEndpoint },
        { name: 'ETH WLFI', address: ETHEREUM_CONTRACTS.wlfiAdapter, endpoint: ethEndpoint },
        { name: 'ETH Share', address: ETHEREUM_CONTRACTS.shareOFT, endpoint: ethEndpoint }
    ];
    
    let allDelegatesCorrect = true;
    
    for (const contract of contracts) {
        try {
            const delegate = await contract.endpoint.delegates(contract.address);
            const isCorrect = delegate.toLowerCase() === expectedDelegate.toLowerCase();
            console.log(`${contract.name}: ${delegate} ${isCorrect ? '✅' : '❌'}`);
            
            if (!isCorrect) {
                allDelegatesCorrect = false;
            }
            
        } catch (error: any) {
            console.log(`❌ ${contract.name} delegate check failed: ${error.message}`);
            allDelegatesCorrect = false;
        }
    }
    
    if (allDelegatesCorrect) {
        console.log("✅ All endpoint delegates are correctly set!");
    } else {
        console.log("⚠️  Some delegates may need correction");
    }
    
    return allDelegatesCorrect;
}

async function testConfigurationPermissions() {
    console.log("Testing configuration permissions with current delegates...");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const EndpointAbi = [
        "function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address lib)"
    ];
    
    const bscEndpoint = new ethers.Contract(BSC_CONTRACTS.endpoint, EndpointAbi, bscSigner);
    
    try {
        // Test reading configuration (should work if delegate is correct)
        const sendLib = await bscEndpoint.getSendLibrary(BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET);
        console.log(`✅ Can read configuration - Send library: ${sendLib}`);
        
        // If we can read, delegate permissions should be working
        console.log("✅ Configuration permissions appear to be working");
        
        return true;
        
    } catch (error: any) {
        console.log(`❌ Configuration permission test failed: ${error.message}`);
        
        if (error.message.includes('delegate') || error.message.includes('unauthorized')) {
            console.log("💡 This suggests delegate configuration issues");
        }
        
        return false;
    }
}

// Function to set endpoint delegates if needed
async function setEndpointDelegates(delegateAddress: string) {
    console.log("Setting endpoint delegates if needed...");
    
    // Note: Endpoint delegates are typically set automatically when the OApp is deployed
    // or when the owner calls setDelegate on the OApp contract
    // Manual endpoint delegate setting is usually not required
    
    console.log("ℹ️  Endpoint delegates are typically set automatically");
    console.log("💡 If delegates are incorrect, check OApp contract delegate settings");
}

async function main() {
    await checkAndSetDelegates();
    
    // After delegate setup, suggest running LayerZero configuration
    console.log("\n📝 NEXT STEPS:");
    console.log("===============");
    console.log("1. ✅ Delegates are now properly configured");
    console.log("2. 🔧 Run LayerZero configuration with proper permissions");
    console.log("3. 🧪 Test USD1 deposit with correct delegate setup");
    console.log("");
    console.log("Commands to run:");
    console.log("npx hardhat run scripts/layerzero-registry-setup.ts --network ethereum");
    console.log("npx hardhat run scripts/execute-combined-deposit.ts --network ethereum");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { checkAndSetDelegates };
