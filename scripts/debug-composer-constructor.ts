import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',
    shareOFTAdapter: '0x68cF24743CA335ae3c2e21c2538F4E929224F096'
};

async function debugConstructorParams() {
    console.log("🔍 DEBUGGING COMPOSER CONSTRUCTOR PARAMETERS");
    console.log("===========================================");

    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    
    console.log("Checking if addresses are valid contracts...");
    
    for (const [name, address] of Object.entries(ETHEREUM_CONTRACTS)) {
        try {
            const code = await provider.getCode(address);
            const isContract = code !== '0x';
            console.log(`${name}: ${address} - ${isContract ? '✅ Contract' : '❌ Not a contract'}`);
            
            if (isContract) {
                // Try to get some basic info
                try {
                    const contract = new ethers.Contract(address, ['function owner() view returns (address)'], provider);
                    const owner = await contract.owner();
                    console.log(`  Owner: ${owner}`);
                } catch (e) {
                    console.log(`  Owner: Not available (${e.message.split('(')[0]})`);
                }
            }
        } catch (error) {
            console.log(`${name}: ${address} - ❌ Error checking: ${error.message}`);
        }
    }

    // Check if VaultComposerSync has specific requirements
    console.log("\n🔧 CHECKING VAULT REQUIREMENTS:");
    try {
        const vaultAbi = [
            'function asset() view returns (address)',
            'function decimals() view returns (uint8)'
        ];
        const vault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, vaultAbi, provider);
        const vaultAsset = await vault.asset();
        console.log(`Vault asset: ${vaultAsset}`);
        
        // Check if the asset matches our adapter
        console.log(`WLFI Adapter: ${ETHEREUM_CONTRACTS.wlfiAdapter}`);
        console.log(`Addresses match: ${vaultAsset.toLowerCase() === ETHEREUM_CONTRACTS.wlfiAdapter.toLowerCase() ? '✅' : '❌'}`);
        
    } catch (error) {
        console.log(`❌ Vault check failed: ${error.message}`);
    }

    console.log("\n🔧 CHECKING ADAPTER REQUIREMENTS:");
    try {
        const adapterAbi = [
            'function token() view returns (address)',
            'function owner() view returns (address)'
        ];
        const adapter = new ethers.Contract(ETHEREUM_CONTRACTS.wlfiAdapter, adapterAbi, provider);
        const wrappedToken = await adapter.token();
        const adapterOwner = await adapter.owner();
        console.log(`WLFI Adapter wraps: ${wrappedToken}`);
        console.log(`WLFI Adapter owner: ${adapterOwner}`);
        
    } catch (error) {
        console.log(`❌ Adapter check failed: ${error.message}`);
    }
}

debugConstructorParams().catch(console.error);
