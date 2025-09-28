import { ethers } from "hardhat";
import { readFileSync, existsSync } from "fs";

/**
 * Test Cross-Chain Functionality
 * Tests actual cross-chain message passing
 */

interface ChainConfig {
    chainId: number;
    eid: number;
    name: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
    ethereum: { chainId: 1, eid: 30101, name: "ethereum" },
    arbitrum: { chainId: 42161, eid: 30110, name: "arbitrum" },
    base: { chainId: 8453, eid: 30184, name: "base" },
    bsc: { chainId: 56, eid: 30102, name: "bsc" }
};

function loadDeployedAddresses() {
    if (existsSync("deployed-addresses.json")) {
        return JSON.parse(readFileSync("deployed-addresses.json", "utf8"));
    }
    throw new Error("No deployed addresses found. Run deployment first.");
}

async function testCrossChainTransfer(
    sourceChain: string,
    destinationChain: string,
    amount: string = "1.0"
) {
    console.log(`\n🧪 Testing transfer: ${sourceChain} → ${destinationChain}`);
    console.log("=".repeat(50));
    
    const [user] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    const deployedAddresses = loadDeployedAddresses();
    const sourceAddresses = deployedAddresses[sourceChain];
    const destAddresses = deployedAddresses[destinationChain];
    
    if (!sourceAddresses || !destAddresses) {
        throw new Error("Missing deployment addresses");
    }
    
    // Get source contract
    const sourceContractAddress = sourceAddresses.eagleShareOFT || 
                                 sourceAddresses.eagleShareAdapter;
    
    if (!sourceContractAddress) {
        throw new Error("No source contract found");
    }
    
    const sourceContract = await ethers.getContractAt(
        sourceAddresses.eagleShareOFT ? "EagleShareOFT" : "EagleShareAdapter",
        sourceContractAddress
    );
    
    const destChainConfig = CHAIN_CONFIGS[destinationChain];
    const amountWei = ethers.parseEther(amount);
    
    console.log(`📄 Source Contract: ${sourceContractAddress}`);
    console.log(`🎯 Destination EID: ${destChainConfig.eid}`);
    console.log(`💰 Amount: ${amount} EAGLE`);
    console.log(`👤 User: ${user.address}`);
    
    try {
        // 1. Check balance
        const balance = await sourceContract.balanceOf(user.address);
        console.log(`\n💳 Current balance: ${ethers.formatEther(balance)} EAGLE`);
        
        if (balance < amountWei) {
            console.log(`⚠️  Insufficient balance. Minting ${amount} EAGLE for testing...`);
            
            // Try to mint (this may fail if not mintable)
            try {
                if (sourceAddresses.eagleShareOFT) {
                    // For OFT, try to mint directly (if the contract allows)
                    const mintTx = await sourceContract.mint(user.address, amountWei);
                    await mintTx.wait();
                    console.log(`✅ Minted ${amount} EAGLE for testing`);
                } else {
                    console.log(`❌ Cannot mint tokens on adapter contract`);
                    console.log(`   Please deposit assets in the vault first to get shares`);
                    return;
                }
            } catch (mintError) {
                console.log(`❌ Minting failed: ${mintError}`);
                console.log(`   Please ensure you have tokens to transfer`);
                return;
            }
        }
        
        // 2. Get quote for cross-chain transfer
        const sendParam = {
            dstEid: destChainConfig.eid,
            to: ethers.zeroPadValue(user.address, 32),
            amountLD: amountWei,
            minAmountLD: amountWei,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        console.log(`\n💸 Getting quote for cross-chain transfer...`);
        const quote = await sourceContract.quoteSend(sendParam, false);
        console.log(`   Native Fee: ${ethers.formatEther(quote.nativeFee)} ETH`);
        console.log(`   LZ Token Fee: ${quote.lzTokenFee}`);
        
        // 3. Execute cross-chain send
        console.log(`\n🚀 Executing cross-chain transfer...`);
        
        const sendTx = await sourceContract.send(
            sendParam,
            { nativeFee: quote.nativeFee, lzTokenFee: quote.lzTokenFee },
            user.address, // refund address
            { value: quote.nativeFee }
        );
        
        console.log(`   📝 Transaction: ${sendTx.hash}`);
        const receipt = await sendTx.wait();
        console.log(`   ⛽ Gas used: ${receipt?.gasUsed?.toString()}`);
        
        // 4. Extract message details from events
        const sentEvents = receipt?.logs?.filter((log: any) => {
            try {
                const parsed = sourceContract.interface.parseLog(log);
                return parsed?.name === "OFTSent";
            } catch {
                return false;
            }
        });
        
        if (sentEvents && sentEvents.length > 0) {
            const parsed = sourceContract.interface.parseLog(sentEvents[0]);
            console.log(`   📨 Message GUID: ${parsed?.args?.guid}`);
            console.log(`   🆔 Nonce: ${parsed?.args?.nonce}`);
        }
        
        console.log(`\n✅ Cross-chain transfer initiated successfully!`);
        console.log(`\n📋 Next steps:`);
        console.log(`1. Wait for DVN verification (1-5 minutes)`);
        console.log(`2. Check LayerZero scan for message status`);
        console.log(`3. Verify balance on destination chain`);
        console.log(`4. LayerZero Scan: https://layerzeroscan.com`);
        
    } catch (error) {
        console.log(`❌ Transfer failed: ${error}`);
    }
}

async function main() {
    console.log("🧪 EAGLE VAULT CROSS-CHAIN TESTING");
    console.log("=====================================");
    
    const [user] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Find current chain
    const currentChain = Object.entries(CHAIN_CONFIGS).find(
        ([, config]) => config.chainId === chainId
    )?.[0];
    
    if (!currentChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    console.log(`📍 Current chain: ${currentChain}`);
    console.log(`👤 User: ${user.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(user.address))} ETH\n`);
    
    // Load deployed addresses
    const deployedAddresses = loadDeployedAddresses();
    const availableChains = Object.keys(deployedAddresses);
    
    console.log(`🌐 Available chains: ${availableChains.join(", ")}`);
    
    // Test transfers to all other chains
    for (const destChain of availableChains) {
        if (destChain === currentChain) continue;
        
        await testCrossChainTransfer(currentChain, destChain, "0.1");
        
        // Wait a bit between transfers
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log("\n🎉 Cross-chain testing completed!");
    console.log("\n⚠️  Note: This test initiates transfers but doesn't wait for completion.");
    console.log("Check LayerZero scan and destination chain balances to verify success.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Testing failed:", error);
        process.exit(1);
    });
