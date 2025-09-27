import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688',
    usd1Token: '0x55d398326f99059fF775485246999027B3197955',
    wlfiToken: '0x...' // UPDATE WITH ACTUAL BSC WLFI ADDRESS
};

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',
    shareOFT: '0x68cF24743CA335ae3c2e21c2538F4E929224F096',
    composer: '0x...' // UPDATE WITH ACTUAL COMPOSER ADDRESS
};

// LayerZero endpoint IDs
const EndpointId = {
    BSC_V2_MAINNET: 30102,
    ETHEREUM_V2_MAINNET: 30101
};

const ERC20Abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)"
];

const VaultAbi = [
    "function balanceOf(address account) external view returns (uint256)", // ERC4626 shares
    "function totalAssets() external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function asset() external view returns (address)",
    "function previewDeposit(uint256 assets) external view returns (uint256 shares)"
];

const OFTAbi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), (uint256 nativeFee, uint256 lzTokenFee), address refundAddress) payable external",
    "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)"
];

const ComposerAbi = [
    "function VAULT() external view returns (address)",
    "function ASSET_OFT() external view returns (address)",
    "function SHARE_OFT() external view returns (address)"
];

// Helper function to convert address to bytes32
function addressToBytes32(address: string): string {
    return ethers.zeroPadValue(address, 32);
}

async function testCompleteOVaultFlow() {
    console.log("🧪 COMPLETE OVAULT FLOW TEST");
    console.log("============================");

    const [deployer] = await ethers.getSigners();
    console.log(`👤 Test user: ${deployer.address}`);

    if (ETHEREUM_CONTRACTS.composer === '0x...') {
        console.log("❌ UPDATE COMPOSER ADDRESS FIRST!");
        console.log("Set ETHEREUM_CONTRACTS.composer to actual deployed address");
        return;
    }

    // Connect to both chains
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com');
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    const ethSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, ethProvider);

    // Test parameters
    const testAmount = ethers.parseUnits("1", 18); // 1 USD1 for testing
    const slippagePercent = 3.0; // 3% slippage tolerance

    console.log("\n📊 PRE-TEST BALANCES:");
    
    // Check initial balances on BSC
    const bscUsd1Token = new ethers.Contract(BSC_CONTRACTS.usd1Token, ERC20Abi, bscProvider);
    const bscUsd1Adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscProvider);
    
    const initialUsd1Balance = await bscUsd1Token.balanceOf(deployer.address);
    const initialAdapterBalance = await bscUsd1Adapter.balanceOf(deployer.address);
    
    console.log(`BSC USD1 (native): ${ethers.formatEther(initialUsd1Balance)}`);
    console.log(`BSC USD1 (OFT): ${ethers.formatEther(initialAdapterBalance)}`);

    // Check initial balances on Ethereum
    const ethVault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, VaultAbi, ethProvider);
    const ethShareOFT = new ethers.Contract(ETHEREUM_CONTRACTS.shareOFT, OFTAbi, ethProvider);
    const ethComposer = new ethers.Contract(ETHEREUM_CONTRACTS.composer, ComposerAbi, ethProvider);
    
    const initialVaultShares = await ethVault.balanceOf(deployer.address);
    const initialShareOFTBalance = await ethShareOFT.balanceOf(deployer.address);
    const vaultTotalAssets = await ethVault.totalAssets();
    const vaultTotalSupply = await ethVault.totalSupply();
    
    console.log(`Ethereum Vault Shares: ${ethers.formatEther(initialVaultShares)}`);
    console.log(`Ethereum Share OFT: ${ethers.formatEther(initialShareOFTBalance)}`);
    console.log(`Vault Total Assets: ${ethers.formatEther(vaultTotalAssets)}`);
    console.log(`Vault Total Supply: ${ethers.formatEther(vaultTotalSupply)}`);

    // Verify composer configuration
    console.log("\n🔧 COMPOSER VERIFICATION:");
    try {
        const composerVault = await ethComposer.VAULT();
        const composerAssetOFT = await ethComposer.ASSET_OFT();
        const composerShareOFT = await ethComposer.SHARE_OFT();
        
        console.log(`Composer Vault: ${composerVault}`);
        console.log(`Composer Asset OFT: ${composerAssetOFT}`);
        console.log(`Composer Share OFT: ${composerShareOFT}`);
        
        if (composerVault.toLowerCase() === ETHEREUM_CONTRACTS.vault.toLowerCase()) {
            console.log("✅ Vault configured correctly");
        } else {
            console.log("❌ Vault configuration mismatch!");
        }
    } catch (error: any) {
        console.error(`❌ Composer verification failed: ${error.message}`);
        return;
    }

    // Preview vault deposit
    console.log("\n🔮 DEPOSIT PREVIEW:");
    const expectedShares = await ethVault.previewDeposit(testAmount);
    const minShares = (expectedShares * BigInt(Math.floor((100 - slippagePercent) * 100))) / BigInt(10000);
    
    console.log(`Input: ${ethers.formatEther(testAmount)} USD1`);
    console.log(`Expected shares: ${ethers.formatEther(expectedShares)}`);
    console.log(`Min shares (${slippagePercent}% slippage): ${ethers.formatEther(minShares)}`);

    if (initialUsd1Balance < testAmount) {
        console.log("❌ Insufficient USD1 balance for test");
        console.log(`Need: ${ethers.formatEther(testAmount)}`);
        console.log(`Have: ${ethers.formatEther(initialUsd1Balance)}`);
        return;
    }

    // Build complete OVault flow
    console.log("\n🏗️  BUILDING OVAULT TRANSACTION:");

    // Phase 2 routing (vault output back to BSC)
    const composeMsg = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd)", "uint256"],
        [
            {
                dstEid: EndpointId.BSC_V2_MAINNET, // Return shares to BSC
                to: addressToBytes32(deployer.address), // Final recipient
                amountLD: 0, // Will be set by composer to actual vault shares
                minAmountLD: minShares, // Slippage protection on vault output
                extraOptions: "0x",
                composeMsg: "0x",
                oftCmd: "0x"
            },
            ethers.parseEther("0.005") // msg.value for return trip
        ]
    );

    // Phase 1 transfer (BSC → Ethereum composer)
    const sendParam = {
        dstEid: EndpointId.ETHEREUM_V2_MAINNET,
        to: addressToBytes32(ETHEREUM_CONTRACTS.composer), // CRITICAL: To composer!
        amountLD: testAmount,
        minAmountLD: testAmount - (testAmount / BigInt(100)), // 1% transfer slippage
        extraOptions: "0x", // Will use enforced options
        composeMsg: composeMsg,
        oftCmd: "0x"
    };

    console.log(`Phase 1: BSC → Ethereum composer`);
    console.log(`Phase 2: Vault deposit → shares → BSC`);
    console.log(`Compose message length: ${composeMsg.length} bytes`);

    // Get LayerZero fee quote
    console.log("\n💸 LAYERZERO FEE CALCULATION:");
    try {
        const bscUsd1AdapterSigner = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
        const fee = await bscUsd1AdapterSigner.quoteSend(sendParam, false);
        
        console.log(`Native fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
        console.log(`LZ token fee: ${ethers.formatEther(fee.lzTokenFee)} LZ`);

        // Check BNB balance
        const bnbBalance = await bscProvider.getBalance(deployer.address);
        console.log(`BNB balance: ${ethers.formatEther(bnbBalance)}`);

        if (bnbBalance < fee.nativeFee) {
            console.log("❌ Insufficient BNB for LayerZero fees");
            return;
        }

        // Approve token spend if needed
        const allowance = await bscUsd1Token.allowance(deployer.address, BSC_CONTRACTS.usd1Adapter);
        if (allowance < testAmount) {
            console.log("🔓 Approving USD1 spend...");
            const approveTx = await bscUsd1Token.connect(bscSigner).approve(BSC_CONTRACTS.usd1Adapter, testAmount);
            await approveTx.wait();
            console.log(`✅ Approved: ${approveTx.hash}`);
        }

        // Execute the complete OVault flow!
        console.log("\n🚀 EXECUTING COMPLETE OVAULT FLOW:");
        console.log("===================================");
        console.log("1. BSC USD1 → LayerZero → Ethereum USD1 Adapter");
        console.log("2. Adapter → lzReceive() → sendCompose()");
        console.log("3. Composer → lzCompose() → vault.deposit()");
        console.log("4. Vault → returns shares to composer");
        console.log("5. Composer → ShareOFT.send() → BSC");
        console.log("6. BSC receives vault shares as Share OFT tokens");

        const executeTx = await bscUsd1AdapterSigner.send(
            sendParam,
            { nativeFee: fee.nativeFee, lzTokenFee: fee.lzTokenFee },
            deployer.address,
            {
                value: fee.nativeFee,
                gasPrice: ethers.parseUnits("3", "gwei"),
                gasLimit: 500000
            }
        );

        console.log(`📤 Transaction hash: ${executeTx.hash}`);
        console.log(`🔗 BSCScan: https://bscscan.com/tx/${executeTx.hash}`);
        
        const receipt = await executeTx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed}`);

        // Track the cross-chain journey
        console.log("\n📍 TRACKING CROSS-CHAIN JOURNEY:");
        console.log(`LayerZero Scan: https://layerzeroscan.com/tx/${executeTx.hash}`);
        
        console.log("\nThis transaction should result in:");
        console.log("1. ✅ USD1 transferred from your BSC wallet");
        console.log("2. 🔄 LayerZero message processed (5-15 minutes)");
        console.log("3. 🏛️  Vault deposit executed on Ethereum");
        console.log("4. 📈 Vault shares minted and sent back to BSC");
        console.log("5. 🎊 You receive Share OFT tokens on BSC");

        // Wait and check results
        console.log("\n⏳ WAITING FOR COMPLETION (this may take several minutes)...");
        
        // Poll for balance changes (simplified - in real app would use events)
        let attempts = 0;
        const maxAttempts = 20; // 10 minutes max wait
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            attempts++;
            
            console.log(`Checking attempt ${attempts}/${maxAttempts}...`);
            
            // Check if Share OFT balance increased on BSC
            const shareOftBsc = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscProvider); // This would be the share OFT on BSC
            // Note: You'd need the actual BSC share OFT address here
            
            const newVaultShares = await ethVault.balanceOf(deployer.address);
            console.log(`Current vault shares: ${ethers.formatEther(newVaultShares)}`);
            
            if (newVaultShares > initialVaultShares) {
                console.log("✅ VAULT SHARES INCREASED!");
                console.log(`Gained: ${ethers.formatEther(newVaultShares - initialVaultShares)} shares`);
                break;
            }
            
            if (attempts === maxAttempts) {
                console.log("⏰ Timeout reached. Check LayerZero Scan for transaction status");
            }
        }

    } catch (error: any) {
        console.error(`❌ Flow test failed: ${error.message}`);
        
        if (error.message.includes("22960")) {
            console.log("💡 Early revert suggests missing composer or enforced options");
            console.log("   Check that steps 2-5 were completed successfully");
        } else if (error.message.includes("InsufficientMsgValue")) {
            console.log("💡 Increase the msg.value in composeMsg for second hop");
        } else if (error.message.includes("SlippageExceeded")) {
            console.log("💡 Increase slippage tolerance or check vault conditions");
        }
    }

    console.log("\n🎊 OVAULT FLOW TEST COMPLETE!");
    console.log("=============================");
    console.log("If successful, you now have a fully functional OVault with:");
    console.log("✅ Cross-chain asset deposits");
    console.log("✅ Automatic vault integration");
    console.log("✅ Charm Finance yield strategies");
    console.log("✅ Cross-chain share distribution");
    console.log("✅ Horizontal composability architecture");
}

if (require.main === module) {
    testCompleteOVaultFlow().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { testCompleteOVaultFlow };
