import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688'
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',
    composer: '0x...' // UPDATE WITH ACTUAL COMPOSER ADDRESS
};

// LayerZero endpoint IDs
const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

const OFTAdapterAbi = [
    "function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] memory _enforcedOptions) external",
    "function enforcedOptions(uint32 eid, uint16 msgType) external view returns (bytes memory)",
    "function owner() external view returns (address)"
];

async function setEnforcedOptionsWithCompose() {
    console.log("🔧 SETTING ENFORCED OPTIONS WITH LZCOMPOSE");
    console.log("==========================================");

    const [deployer] = await ethers.getSigners();
    console.log(`👤 Signer: ${deployer.address}`);

    // Build options with BOTH lzReceive AND lzCompose
    const OptionsBuilder = await ethers.getContractFactory("OptionsBuilder");
    
    // Create options bytes manually (since OptionsBuilder is a library)
    // Format: [optionType][data...]
    // lzReceive: type=1, gas=65000, value=0
    // lzCompose: type=3, index=0, gas=50000, value=0
    
    const lzReceiveOption = "0x00030001001100000000000000000000000000fdfe"; // 65534 gas, 0 value
    const lzComposeOption = "0x00030200010000000000000000000000000000c350"; // index=0, 50000 gas, 0 value
    const combinedOptions = lzReceiveOption + lzComposeOption.slice(2); // Remove 0x from second

    console.log(`📝 Combined Options: ${combinedOptions}`);

    // Enforced options structure
    const enforcedOptions = [
        {
            eid: EndpointId.BSC_V2_MAINNET,
            msgType: 1, // SEND message type
            options: combinedOptions
        }
    ];

    // Set on Ethereum adapters (for BSC destination)
    console.log("\n🔧 SETTING ETHEREUM ADAPTER OPTIONS:");
    
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);

    const usd1Adapter = new ethers.Contract(ETHEREUM_CONTRACTS.usd1Adapter, OFTAdapterAbi, ethSigner);
    const wlfiAdapter = new ethers.Contract(ETHEREUM_CONTRACTS.wlfiAdapter, OFTAdapterAbi, ethSigner);

    try {
        console.log("1️⃣  USD1 Adapter enforced options...");
        const tx1 = await usd1Adapter.setEnforcedOptions(enforcedOptions, {
            maxFeePerGas: ethers.parseUnits("15", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 200000
        });
        await tx1.wait();
        console.log(`✅ USD1: ${tx1.hash}`);

        console.log("2️⃣  WLFI Adapter enforced options...");
        const tx2 = await wlfiAdapter.setEnforcedOptions(enforcedOptions, {
            maxFeePerGas: ethers.parseUnits("15", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            gasLimit: 200000
        });
        await tx2.wait();
        console.log(`✅ WLFI: ${tx2.hash}`);

    } catch (error: any) {
        console.error(`❌ Ethereum config failed: ${error.message}`);
    }

    // Set reverse options on BSC adapters (for Ethereum destination)
    console.log("\n🔧 SETTING BSC ADAPTER OPTIONS:");
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);

    const enforcedOptionsReverse = [
        {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            msgType: 1,
            options: combinedOptions
        }
    ];

    const bscUsd1Adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAdapterAbi, bscSigner);
    const bscWlfiAdapter = new ethers.Contract(BSC_CONTRACTS.wlfiAdapter, OFTAdapterAbi, bscSigner);

    try {
        console.log("3️⃣  BSC USD1 Adapter enforced options...");
        const tx3 = await bscUsd1Adapter.setEnforcedOptions(enforcedOptionsReverse, {
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 200000
        });
        await tx3.wait();
        console.log(`✅ BSC USD1: ${tx3.hash}`);

        console.log("4️⃣  BSC WLFI Adapter enforced options...");
        const tx4 = await bscWlfiAdapter.setEnforcedOptions(enforcedOptionsReverse, {
            gasPrice: ethers.parseUnits("3", "gwei"),
            gasLimit: 200000
        });
        await tx4.wait();
        console.log(`✅ BSC WLFI: ${tx4.hash}`);

    } catch (error: any) {
        console.error(`❌ BSC config failed: ${error.message}`);
    }

    // Verify options were set
    console.log("\n🔍 VERIFYING ENFORCED OPTIONS:");
    try {
        const ethUsd1Options = await usd1Adapter.enforcedOptions(EndpointId.BSC_V2_MAINNET, 1);
        const ethWlfiOptions = await wlfiAdapter.enforcedOptions(EndpointId.BSC_V2_MAINNET, 1);
        const bscUsd1Options = await bscUsd1Adapter.enforcedOptions(EndpointId.ETHEREUM_V2_MAINNET, 1);
        const bscWlfiOptions = await bscWlfiAdapter.enforcedOptions(EndpointId.ETHEREUM_V2_MAINNET, 1);

        console.log(`ETH USD1 → BSC: ${ethUsd1Options}`);
        console.log(`ETH WLFI → BSC: ${ethWlfiOptions}`);
        console.log(`BSC USD1 → ETH: ${bscUsd1Options}`);
        console.log(`BSC WLFI → ETH: ${bscWlfiOptions}`);

        if (ethUsd1Options === combinedOptions && ethWlfiOptions === combinedOptions &&
            bscUsd1Options === combinedOptions && bscWlfiOptions === combinedOptions) {
            console.log("✅ ALL ENFORCED OPTIONS SET CORRECTLY!");
        } else {
            console.log("⚠️  Some options may not match expected values");
        }
    } catch (error: any) {
        console.error(`❌ Verification failed: ${error.message}`);
    }

    console.log("\n🎊 STEP 2 COMPLETE!");
    console.log("Next: Run step3-verify-library-configs.ts");
}

if (require.main === module) {
    setEnforcedOptionsWithCompose().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { setEnforcedOptionsWithCompose };
