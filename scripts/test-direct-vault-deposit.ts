import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    wlfiToken: process.env.WLFI_ETHEREUM!,
    usd1Token: process.env.USD1_ETHEREUM!
};

const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function allowance(address, address) external view returns (uint256)",
    "function approve(address, uint256) external returns (bool)",
    "function transfer(address, uint256) external returns (bool)"
];

const vaultAbi = [
    "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
    "function asset() external view returns (address)",
    "function totalAssets() external view returns (uint256)",
    "function balanceOf(address) external view returns (uint256)",
    "function previewDeposit(uint256 assets) external view returns (uint256 shares)"
];

async function main() {
    console.log("🧪 TESTING DIRECT VAULT DEPOSIT");
    console.log("===============================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Signer: ${deployer.address}`);
    
    const vault = new ethers.Contract(ETHEREUM_CONTRACTS.vault, vaultAbi, deployer);
    const wlfiToken = new ethers.Contract(ETHEREUM_CONTRACTS.wlfiToken, erc20Abi, deployer);
    
    try {
        // Get current vault state
        const vaultAsset = await vault.asset();
        const totalAssets = await vault.totalAssets();
        const userShares = await vault.balanceOf(deployer.address);
        
        console.log(`🎯 Vault Asset: ${vaultAsset}`);
        console.log(`💰 Total Assets: ${ethers.formatEther(totalAssets)}`);
        console.log(`🎫 User Shares: ${ethers.formatEther(userShares)}`);
        
        // Check user's WLFI balance
        const wlfiBalance = await wlfiToken.balanceOf(deployer.address);
        console.log(`🪙 WLFI Balance: ${ethers.formatEther(wlfiBalance)}`);
        
        if (wlfiBalance === 0n) {
            console.log("❌ No WLFI tokens to test with");
            console.log("💡 Need WLFI tokens for direct deposit test");
            return;
        }
        
        // Test small deposit (0.01 WLFI)
        const depositAmount = ethers.parseEther("0.01");
        
        if (wlfiBalance < depositAmount) {
            console.log(`⚠️  Not enough WLFI. Have: ${ethers.formatEther(wlfiBalance)}, Need: ${ethers.formatEther(depositAmount)}`);
            return;
        }
        
        // Check allowance
        const allowance = await wlfiToken.allowance(deployer.address, ETHEREUM_CONTRACTS.vault);
        console.log(`🔓 Current Allowance: ${ethers.formatEther(allowance)}`);
        
        if (allowance < depositAmount) {
            console.log("🔐 Approving vault...");
            const approveTx = await wlfiToken.approve(ETHEREUM_CONTRACTS.vault, ethers.parseEther("1000"));
            await approveTx.wait();
            console.log("✅ Approved");
        }
        
        // Preview deposit
        const previewShares = await vault.previewDeposit(depositAmount);
        console.log(`📊 Preview: ${ethers.formatEther(depositAmount)} WLFI → ${ethers.formatEther(previewShares)} shares`);
        
        // Attempt direct deposit
        console.log("\n🚀 ATTEMPTING DIRECT DEPOSIT:");
        console.log(`Amount: ${ethers.formatEther(depositAmount)} WLFI`);
        console.log(`Expected: ${ethers.formatEther(previewShares)} shares`);
        
        const depositTx = await vault.deposit(depositAmount, deployer.address, {
            gasLimit: 500000
        });
        
        const receipt = await depositTx.wait();
        console.log(`✅ Direct deposit SUCCESS! Gas used: ${receipt?.gasUsed}`);
        console.log(`📄 TX: ${depositTx.hash}`);
        
        // Check new state
        const newTotalAssets = await vault.totalAssets();
        const newUserShares = await vault.balanceOf(deployer.address);
        
        console.log(`\n📈 RESULTS:`);
        console.log(`Total Assets: ${ethers.formatEther(totalAssets)} → ${ethers.formatEther(newTotalAssets)}`);
        console.log(`User Shares: ${ethers.formatEther(userShares)} → ${ethers.formatEther(newUserShares)}`);
        
        console.log(`\n💡 CONCLUSION:`);
        console.log(`✅ Vault works for direct deposits!`);
        console.log(`❌ LayerZero issue must be cross-chain messaging, not vault functionality`);
        
    } catch (error: any) {
        console.log(`❌ Direct deposit failed: ${error.message}`);
        
        if (error.message.includes("revert")) {
            console.log("💡 The vault itself has issues - not just LayerZero");
            console.log("🔧 Need to fix vault configuration first");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
