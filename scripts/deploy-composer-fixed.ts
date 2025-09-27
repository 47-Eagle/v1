import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',      // Eagle Vault V2
    wlfiToken: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',   // Underlying WLFI token (vault asset)
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',  // WLFI OFT Adapter 
    shareOFTAdapter: '0x68cF24743CA335ae3c2e21c2538F4E929224F096' // Share OFT Adapter
};

async function main() {
    console.log("🚀 DEPLOYING OVAULT COMPOSER (FIXED VERSION)");
    console.log("===========================================");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Verify the relationship between contracts
    console.log("\n🔍 VERIFYING CONTRACT RELATIONSHIPS:");
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com');
    
    // Check vault asset
    const vaultAbi = ['function asset() view returns (address)'];
    const vault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, vaultAbi, provider);
    const vaultAsset = await vault.asset();
    console.log(`Vault asset: ${vaultAsset}`);
    console.log(`WLFI token: ${ETHEREUM_CONTRACTS.wlfiToken}`);
    console.log(`Assets match: ${vaultAsset.toLowerCase() === ETHEREUM_CONTRACTS.wlfiToken.toLowerCase() ? '✅' : '❌'}`);
    
    // Check adapter wraps correct token
    const adapterAbi = ['function token() view returns (address)'];
    const adapter = new ethers.Contract(ETHEREUM_CONTRACTS.wlfiAdapter, adapterAbi, provider);
    const wrappedToken = await adapter.token();
    console.log(`Adapter wraps: ${wrappedToken}`);
    console.log(`Tokens match: ${wrappedToken.toLowerCase() === ETHEREUM_CONTRACTS.wlfiToken.toLowerCase() ? '✅' : '❌'}`);
    
    if (balance < ethers.parseEther("0.005")) {
        console.log("❌ Insufficient ETH for deployment");
        return;
    }
    
    try {
        console.log("\n🏗️  Deploying EagleOVaultComposer...");
        
        const EagleOVaultComposer = await ethers.getContractFactory("EagleOVaultComposer");
        
        // The composer parameters should be:
        // 1. vault: The ERC4626 vault
        // 2. assetOFT: The OFT that wraps the vault's asset (WLFI Adapter)
        // 3. shareOFT: The OFT that wraps the vault's shares (Share OFT Adapter)
        const composer = await EagleOVaultComposer.deploy(
            ETHEREUM_CONTRACTS.vault,           // ERC4626 vault
            ETHEREUM_CONTRACTS.wlfiAdapter,     // Asset OFT (wraps vault asset)
            ETHEREUM_CONTRACTS.shareOFTAdapter, // Share OFT (wraps vault shares)
            {
                gasLimit: 3000000, // Increased gas limit
                maxFeePerGas: ethers.parseUnits("12", "gwei"), 
                maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")
            }
        );
        
        console.log("⏳ Waiting for deployment confirmation...");
        const receipt = await composer.deploymentTransaction().wait();
        
        if (receipt.status === 0) {
            console.log("❌ Constructor failed - transaction reverted");
            console.log("This suggests VaultComposerSync has strict validation requirements");
            
            // Let's check if there's a specific issue
            console.log("\n🔧 POTENTIAL ISSUES:");
            console.log("1. VaultComposerSync may require asset OFT to be on specific chains");
            console.log("2. There might be additional validation we're missing");
            console.log("3. The base contract might check LayerZero endpoint configurations");
            
            return;
        }
        
        const composerAddress = await composer.getAddress();
        console.log(`✅ EagleOVaultComposer deployed: ${composerAddress}`);
        
        // Verify deployment works
        try {
            const linkedVault = await composer.VAULT();
            const linkedAssetOFT = await composer.ASSET_OFT();
            const linkedShareOFT = await composer.SHARE_OFT();
            
            console.log(`✅ Vault: ${linkedVault}`);
            console.log(`✅ Asset OFT: ${linkedAssetOFT}`);
            console.log(`✅ Share OFT: ${linkedShareOFT}`);
            
            console.log("\n🎊 COMPOSER SUCCESSFULLY DEPLOYED!");
            console.log("=================================");
            console.log(`Address: ${composerAddress}`);
            console.log(`Etherscan: https://etherscan.io/address/${composerAddress}`);
            
        } catch (viewError: any) {
            console.log(`⚠️  Could not verify deployment: ${viewError.message}`);
        }
        
    } catch (error: any) {
        console.log(`❌ Deployment failed: ${error.message}`);
        
        if (error.message.includes("VaultComposerSync")) {
            console.log("\n💡 TROUBLESHOOTING VaultComposerSync:");
            console.log("1. Check LayerZero packages are installed");
            console.log("2. Verify @layerzerolabs/ovault-evm is available");
            console.log("3. Try deploying a simpler test composer first");
        }
        
        // Alternative: Try a minimal composer implementation
        console.log("\n🔄 FALLBACK: Deploying minimal composer instead...");
        try {
            await deployMinimalComposer();
        } catch (fallbackError: any) {
            console.log(`❌ Fallback also failed: ${fallbackError.message}`);
        }
    }
}

async function deployMinimalComposer() {
    console.log("🔄 Attempting minimal composer deployment...");
    
    const [deployer] = await ethers.getSigners();
    
    // Create a minimal composer that just implements the interface
    const minimalComposerSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ILayerZeroComposer } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MinimalEagleComposer is ILayerZeroComposer {
    address public immutable VAULT;
    address public immutable ASSET_OFT;  
    address public immutable SHARE_OFT;
    address public immutable ENDPOINT;
    
    constructor(address _vault, address _assetOFT, address _shareOFT) {
        require(_vault != address(0), "Zero vault");
        require(_assetOFT != address(0), "Zero asset OFT");
        require(_shareOFT != address(0), "Zero share OFT");
        
        VAULT = _vault;
        ASSET_OFT = _assetOFT;
        SHARE_OFT = _shareOFT;
        ENDPOINT = 0x1a44076050125825900e736c501f859c50fE728c; // Ethereum endpoint
    }
    
    function lzCompose(
        address _oApp,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override {
        // Security checks
        require(msg.sender == ENDPOINT, "!endpoint");
        require(_oApp == ASSET_OFT || _oApp == SHARE_OFT, "!trusted");
        
        // Simple deposit logic (placeholder for now)
        // In full implementation, would decode message and execute vault operations
        
        emit ComposerCalled(_oApp, _guid);
    }
    
    event ComposerCalled(address indexed oApp, bytes32 indexed guid);
}`;
    
    console.log("📄 Minimal composer source code created");
    console.log("⚠️  This is a placeholder - you'll need to implement full vault logic");
    console.log("💡 Consider using a pre-built VaultComposerSync implementation");
    
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
