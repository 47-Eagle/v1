import { ethers } from "hardhat";

async function main() {
    console.log("🔍 CHECKING ACCOUNT SETUP");
    console.log("=".repeat(50));
    
    const [signer] = await ethers.getSigners();
    const address = await signer.getAddress();
    const balance = await ethers.provider.getBalance(address);
    const network = await ethers.provider.getNetwork();
    
    console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`👤 Account: ${address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    console.log("");
    
    if (balance === 0n) {
        console.log("⚠️ WARNING: Account has 0 ETH balance!");
        console.log("Please fund your account before deploying.");
        return;
    }
    
    console.log("✅ Account setup looks good!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

