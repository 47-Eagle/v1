import { ethers } from "hardhat";

/**
 * Research Script: Find Real WLFI and USD1 Token Addresses
 * This script helps you discover if tokens exist on each chain
 */

const POSSIBLE_WLFI_ADDRESSES = [
    // Add known WLFI addresses from different chains
    "0x...", // Add if you know any
];

const POSSIBLE_USD1_ADDRESSES = [
    // Add known USD1 addresses from different chains
    "0x...", // Add if you know any
];

async function checkTokenExists(address: string, expectedSymbol: string): Promise<{ exists: boolean; name?: string; symbol?: string; decimals?: number }> {
    try {
        if (!address || address === "0x..." || address.length !== 42) {
            return { exists: false };
        }
        
        const code = await ethers.provider.getCode(address);
        if (code === "0x") {
            return { exists: false };
        }
        
        // Try to get ERC20 info
        const tokenContract = await ethers.getContractAt("IERC20Metadata", address);
        
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        
        console.log(`✅ Found token at ${address}:`);
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals}`);
        
        if (symbol.toLowerCase() === expectedSymbol.toLowerCase()) {
            console.log(`   🎯 Symbol matches expected ${expectedSymbol}!`);
        } else {
            console.log(`   ⚠️ Symbol ${symbol} doesn't match expected ${expectedSymbol}`);
        }
        
        return { exists: true, name, symbol, decimals };
        
    } catch (error) {
        console.log(`❌ Error checking ${address}: ${error}`);
        return { exists: false };
    }
}

async function searchForTokens() {
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log("🔍 TOKEN ADDRESS RESEARCH");
    console.log("=========================");
    console.log(`Chain ID: ${chainId}`);
    console.log(`Network: ${network.name || 'Unknown'}\n`);
    
    console.log("🔍 Searching for WLFI tokens...");
    console.log("----------------------------------");
    if (POSSIBLE_WLFI_ADDRESSES.length === 0) {
        console.log("❓ No WLFI addresses provided to check.");
        console.log("   Please research WLFI token addresses for this chain and add them to this script.");
    } else {
        for (const address of POSSIBLE_WLFI_ADDRESSES) {
            await checkTokenExists(address, "WLFI");
        }
    }
    
    console.log("\n🔍 Searching for USD1 tokens...");
    console.log("----------------------------------");
    if (POSSIBLE_USD1_ADDRESSES.length === 0) {
        console.log("❓ No USD1 addresses provided to check.");
        console.log("   Please research USD1 token addresses for this chain and add them to this script.");
    } else {
        for (const address of POSSIBLE_USD1_ADDRESSES) {
            await checkTokenExists(address, "USD1");
        }
    }
    
    console.log("\n📋 RESEARCH CHECKLIST:");
    console.log("======================");
    console.log("1. Visit token websites/documentation to find contract addresses");
    console.log("2. Check blockchain explorers:");
    console.log("   - Ethereum: https://etherscan.io");
    console.log("   - Arbitrum: https://arbiscan.io");
    console.log("   - Base: https://basescan.org");
    console.log("   - BSC: https://bscscan.com");
    console.log("3. Search for token symbols 'WLFI' and 'USD1'");
    console.log("4. Verify contract addresses by checking symbol/name matches");
    console.log("5. Update TOKEN_ADDRESSES in deploy-with-real-addresses.ts");
    
    console.log("\n🔧 REGISTRY ADDRESS CHECK:");
    console.log("==========================");
    const registryAddress = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E";
    console.log(`Checking registry at: ${registryAddress}`);
    
    try {
        const code = await ethers.provider.getCode(registryAddress);
        if (code === "0x") {
            console.log("❌ Registry contract not found at this address on current chain");
            console.log("   You need to deploy your registry on this chain first");
        } else {
            console.log("✅ Registry contract found");
            
            // Try to check if it's actually a registry
            try {
                const registry = await ethers.getContractAt("IChainRegistry", registryAddress);
                const eid = await registry.getEID();
                console.log(`   Current EID from registry: ${eid}`);
            } catch (error) {
                console.log("   ⚠️ Contract exists but interface might not match");
            }
        }
    } catch (error) {
        console.log(`❌ Error checking registry: ${error}`);
    }
    
    console.log("\n🎯 RECOMMENDED NEXT STEPS:");
    console.log("==========================");
    console.log("1. If tokens don't exist on this chain:");
    console.log("   → Use Asset OFTs (script will create them automatically)");
    console.log("2. If tokens exist on this chain:");
    console.log("   → Use Adapters (update TOKEN_ADDRESSES with real addresses)");
    console.log("3. If registry doesn't exist:");
    console.log("   → Deploy registry first OR use direct endpoint mode");
    console.log("4. Run: npx hardhat run scripts/deploy-with-real-addresses.ts --network <network>");
}

searchForTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Research failed:", error);
        process.exit(1);
    });
