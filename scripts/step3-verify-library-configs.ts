import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688'
};

const ETHEREUM_CONTRACTS = {
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F'
};

const BSC_LZ_ENDPOINT_V2 = process.env.BNB_LZ_ENDPOINT_V2!;
const ETHEREUM_LZ_ENDPOINT_V2 = process.env.ETHEREUM_LZ_ENDPOINT_V2!;

// LayerZero endpoint IDs
const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

// Known libraries from LayerZero docs
const KNOWN_LIBRARIES = {
    ethereum: {
        sendUln302: '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1',
        receiveUln302: '0xc02Ab410f0734EFa3F14628780e6e695156024C2'
    },
    bsc: {
        sendUln302: '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE',
        receiveUln302: '0xB217266c3A98C8B2709Ee26836C98cf12f6cCEC1'
    }
};

const EndpointAbi = [
    "function getSendLibrary(address oapp, uint32 eid) external view returns (address lib)",
    "function getReceiveLibrary(address oapp, uint32 eid) external view returns (address lib)",
    "function setSendLibrary(address oapp, uint32 eid, address lib) external",
    "function setReceiveLibrary(address oapp, uint32 eid, address lib, uint256 gracePeriod) external",
    "function defaultSendLibrary(uint32 eid) external view returns (address)",
    "function defaultReceiveLibrary(uint32 eid) external view returns (address)"
];

async function verifyAndSetLibraries() {
    console.log("📚 VERIFYING LIBRARY CONFIGURATIONS");
    console.log("==================================");

    const [deployer] = await ethers.getSigners();
    console.log(`👤 Signer: ${deployer.address}`);

    // Check Ethereum libraries
    console.log("\n🔍 ETHEREUM LIBRARY STATUS:");
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);
    const ethEndpoint = new ethers.Contract(ETHEREUM_LZ_ENDPOINT_V2, EndpointAbi, ethSigner);

    // Check USD1 libraries on Ethereum
    console.log("USD1 Adapter → BSC:");
    const ethUsd1SendLib = await ethEndpoint.getSendLibrary(ETHEREUM_CONTRACTS.usd1Adapter, EndpointId.BSC_V2_MAINNET);
    const ethUsd1ReceiveLib = await ethEndpoint.getReceiveLibrary(ETHEREUM_CONTRACTS.usd1Adapter, EndpointId.BSC_V2_MAINNET);
    console.log(`  Send Library: ${ethUsd1SendLib}`);
    console.log(`  Receive Library: ${ethUsd1ReceiveLib}`);

    // Check WLFI libraries on Ethereum  
    console.log("WLFI Adapter → BSC:");
    const ethWlfiSendLib = await ethEndpoint.getSendLibrary(ETHEREUM_CONTRACTS.wlfiAdapter, EndpointId.BSC_V2_MAINNET);
    const ethWlfiReceiveLib = await ethEndpoint.getReceiveLibrary(ETHEREUM_CONTRACTS.wlfiAdapter, EndpointId.BSC_V2_MAINNET);
    console.log(`  Send Library: ${ethWlfiSendLib}`);
    console.log(`  Receive Library: ${ethWlfiReceiveLib}`);

    // Check defaults
    console.log("Ethereum Defaults:");
    const ethDefaultSend = await ethEndpoint.defaultSendLibrary(EndpointId.BSC_V2_MAINNET);
    const ethDefaultReceive = await ethEndpoint.defaultReceiveLibrary(EndpointId.BSC_V2_MAINNET);
    console.log(`  Default Send: ${ethDefaultSend}`);
    console.log(`  Default Receive: ${ethDefaultReceive}`);

    // Check BSC libraries
    console.log("\n🔍 BSC LIBRARY STATUS:");
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const bscEndpoint = new ethers.Contract(BSC_LZ_ENDPOINT_V2, EndpointAbi, bscSigner);

    // Check USD1 libraries on BSC
    console.log("USD1 Adapter → Ethereum:");
    const bscUsd1SendLib = await bscEndpoint.getSendLibrary(BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET);
    const bscUsd1ReceiveLib = await bscEndpoint.getReceiveLibrary(BSC_CONTRACTS.usd1Adapter, EndpointId.ETHEREUM_V2_MAINNET);
    console.log(`  Send Library: ${bscUsd1SendLib}`);
    console.log(`  Receive Library: ${bscUsd1ReceiveLib}`);

    // Check WLFI libraries on BSC
    console.log("WLFI Adapter → Ethereum:");
    const bscWlfiSendLib = await bscEndpoint.getSendLibrary(BSC_CONTRACTS.wlfiAdapter, EndpointId.ETHEREUM_V2_MAINNET);
    const bscWlfiReceiveLib = await bscEndpoint.getReceiveLibrary(BSC_CONTRACTS.wlfiAdapter, EndpointId.ETHEREUM_V2_MAINNET);
    console.log(`  Send Library: ${bscWlfiSendLib}`);
    console.log(`  Receive Library: ${bscWlfiReceiveLib}`);

    // Check BSC defaults
    console.log("BSC Defaults:");
    const bscDefaultSend = await bscEndpoint.defaultSendLibrary(EndpointId.ETHEREUM_V2_MAINNET);
    const bscDefaultReceive = await bscEndpoint.defaultReceiveLibrary(EndpointId.ETHEREUM_V2_MAINNET);
    console.log(`  Default Send: ${bscDefaultSend}`);
    console.log(`  Default Receive: ${bscDefaultReceive}`);

    // Analyze if using defaults
    console.log("\n📊 LIBRARY ANALYSIS:");
    let needsExplicitConfig = false;

    if (ethUsd1SendLib.toLowerCase() === ethDefaultSend.toLowerCase()) {
        console.log("⚠️  ETH USD1 using default send library");
        needsExplicitConfig = true;
    }
    if (ethUsd1ReceiveLib.toLowerCase() === ethDefaultReceive.toLowerCase()) {
        console.log("⚠️  ETH USD1 using default receive library");
        needsExplicitConfig = true;
    }
    if (ethWlfiSendLib.toLowerCase() === ethDefaultSend.toLowerCase()) {
        console.log("⚠️  ETH WLFI using default send library");
        needsExplicitConfig = true;
    }
    if (ethWlfiReceiveLib.toLowerCase() === ethDefaultReceive.toLowerCase()) {
        console.log("⚠️  ETH WLFI using default receive library");
        needsExplicitConfig = true;
    }

    if (bscUsd1SendLib.toLowerCase() === bscDefaultSend.toLowerCase()) {
        console.log("⚠️  BSC USD1 using default send library");
        needsExplicitConfig = true;
    }
    if (bscUsd1ReceiveLib.toLowerCase() === bscDefaultReceive.toLowerCase()) {
        console.log("⚠️  BSC USD1 using default receive library");
        needsExplicitConfig = true;
    }
    if (bscWlfiSendLib.toLowerCase() === bscDefaultSend.toLowerCase()) {
        console.log("⚠️  BSC WLFI using default send library");
        needsExplicitConfig = true;
    }
    if (bscWlfiReceiveLib.toLowerCase() === bscDefaultReceive.toLowerCase()) {
        console.log("⚠️  BSC WLFI using default receive library");
        needsExplicitConfig = true;
    }

    if (needsExplicitConfig) {
        console.log("\n🔧 SETTING EXPLICIT LIBRARIES:");
        console.log("(Per Integration Checklist - don't rely on defaults)");

        try {
            // Set Ethereum libraries explicitly
            console.log("1️⃣  Setting Ethereum USD1 libraries...");
            const tx1 = await ethEndpoint.setSendLibrary(
                ETHEREUM_CONTRACTS.usd1Adapter,
                EndpointId.BSC_V2_MAINNET,
                KNOWN_LIBRARIES.ethereum.sendUln302,
                {
                    maxFeePerGas: ethers.parseUnits("15", "gwei"),
                    maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx1.wait();
            console.log(`✅ ETH USD1 send: ${tx1.hash}`);

            const tx2 = await ethEndpoint.setReceiveLibrary(
                ETHEREUM_CONTRACTS.usd1Adapter,
                EndpointId.BSC_V2_MAINNET,
                KNOWN_LIBRARIES.ethereum.receiveUln302,
                0, // No grace period
                {
                    maxFeePerGas: ethers.parseUnits("15", "gwei"),
                    maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx2.wait();
            console.log(`✅ ETH USD1 receive: ${tx2.hash}`);

            console.log("2️⃣  Setting Ethereum WLFI libraries...");
            const tx3 = await ethEndpoint.setSendLibrary(
                ETHEREUM_CONTRACTS.wlfiAdapter,
                EndpointId.BSC_V2_MAINNET,
                KNOWN_LIBRARIES.ethereum.sendUln302,
                {
                    maxFeePerGas: ethers.parseUnits("15", "gwei"),
                    maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx3.wait();
            console.log(`✅ ETH WLFI send: ${tx3.hash}`);

            const tx4 = await ethEndpoint.setReceiveLibrary(
                ETHEREUM_CONTRACTS.wlfiAdapter,
                EndpointId.BSC_V2_MAINNET,
                KNOWN_LIBRARIES.ethereum.receiveUln302,
                0, // No grace period
                {
                    maxFeePerGas: ethers.parseUnits("15", "gwei"),
                    maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx4.wait();
            console.log(`✅ ETH WLFI receive: ${tx4.hash}`);

            // Set BSC libraries explicitly
            console.log("3️⃣  Setting BSC USD1 libraries...");
            const tx5 = await bscEndpoint.setSendLibrary(
                BSC_CONTRACTS.usd1Adapter,
                EndpointId.ETHEREUM_V2_MAINNET,
                KNOWN_LIBRARIES.bsc.sendUln302,
                {
                    gasPrice: ethers.parseUnits("3", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx5.wait();
            console.log(`✅ BSC USD1 send: ${tx5.hash}`);

            const tx6 = await bscEndpoint.setReceiveLibrary(
                BSC_CONTRACTS.usd1Adapter,
                EndpointId.ETHEREUM_V2_MAINNET,
                KNOWN_LIBRARIES.bsc.receiveUln302,
                0, // No grace period
                {
                    gasPrice: ethers.parseUnits("3", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx6.wait();
            console.log(`✅ BSC USD1 receive: ${tx6.hash}`);

            console.log("4️⃣  Setting BSC WLFI libraries...");
            const tx7 = await bscEndpoint.setSendLibrary(
                BSC_CONTRACTS.wlfiAdapter,
                EndpointId.ETHEREUM_V2_MAINNET,
                KNOWN_LIBRARIES.bsc.sendUln302,
                {
                    gasPrice: ethers.parseUnits("3", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx7.wait();
            console.log(`✅ BSC WLFI send: ${tx7.hash}`);

            const tx8 = await bscEndpoint.setReceiveLibrary(
                BSC_CONTRACTS.wlfiAdapter,
                EndpointId.ETHEREUM_V2_MAINNET,
                KNOWN_LIBRARIES.bsc.receiveUln302,
                0, // No grace period
                {
                    gasPrice: ethers.parseUnits("3", "gwei"),
                    gasLimit: 200000
                }
            );
            await tx8.wait();
            console.log(`✅ BSC WLFI receive: ${tx8.hash}`);

        } catch (error: any) {
            console.error(`❌ Library config failed: ${error.message}`);
        }
    } else {
        console.log("✅ All adapters using explicit (non-default) libraries!");
    }

    console.log("\n🎊 STEP 3 COMPLETE!");
    console.log("Next: Run step4-create-ovault-deposit-flow.ts");
}

if (require.main === module) {
    verifyAndSetLibraries().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { verifyAndSetLibraries };
