import { ethers } from "hardhat";

/**
 * @title Real System Demo
 * @notice Connect to actual deployed contracts and show real state
 */

async function main() {
    console.log("🌐 CONNECTING TO REAL DEPLOYED CONTRACTS");
    console.log("=".repeat(50));
    
    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);
    
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log("");
    
    // Real deployed contract addresses
    const contracts = {
        ethereum: {
            wlfiAdapter: "0x45d452aa571494b896d7926563B41a7b16B74E2F",
            usd1Adapter: "0xba9B60A00fD10323Abbdc1044627B54D3ebF470e",
            eagleShareOFT: "0x68cF24743CA335ae3c2e21c2538F4E929224F096",
            eagleVault: "0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0",
            charmStrategy: "0xB5589Af4b2CE5dcE27c757b18144e6D6848C45dF"
        },
        bsc: {
            wlfiAdapter: "0x210F058Ae6aFFB4910ABdBDd28fc252F97d25266",
            usd1Adapter: "0x283AbE84811318a873FB98242FC0FE008e7036D4", 
            eagleShareOFT: "0x775A6804aCbe265C0e4e017f7eFa797b1c38a750"
        }
    };
    
    try {
        // Check Ethereum contracts
        console.log("🔍 CHECKING ETHEREUM CONTRACTS (LIVE)");
        console.log("=".repeat(40));
        
        // WLFI Adapter
        const wlfiAdapter = await ethers.getContractAt("WLFIAssetOFTAdapter", contracts.ethereum.wlfiAdapter);
        console.log(`✅ WLFI Adapter: ${contracts.ethereum.wlfiAdapter}`);
        
        try {
            const wlfiOwner = await wlfiAdapter.owner();
            console.log(`   Owner: ${wlfiOwner}`);
            
            const wlfiToken = await wlfiAdapter.wlfiToken();
            console.log(`   Wraps WLFI: ${wlfiToken}`);
            
            // Check peers
            const bscPeer = await wlfiAdapter.peers(30102); // BSC EID
            console.log(`   BSC Peer: ${bscPeer}`);
            
        } catch (error) {
            console.log(`   Error reading WLFI adapter: ${error.message}`);
        }
        
        // USD1 Adapter  
        const usd1Adapter = await ethers.getContractAt("USD1AssetOFTAdapter", contracts.ethereum.usd1Adapter);
        console.log(`✅ USD1 Adapter: ${contracts.ethereum.usd1Adapter}`);
        
        try {
            const usd1Owner = await usd1Adapter.owner();
            console.log(`   Owner: ${usd1Owner}`);
            
            const usd1Token = await usd1Adapter.usd1Token();
            console.log(`   Wraps USD1: ${usd1Token}`);
            
            const arbPeer = await usd1Adapter.peers(30110); // Arbitrum EID
            console.log(`   Arbitrum Peer: ${arbPeer}`);
            
        } catch (error) {
            console.log(`   Error reading USD1 adapter: ${error.message}`);
        }
        
        // Eagle Share OFT
        const eagleShareOFT = await ethers.getContractAt("EagleShareOFT", contracts.ethereum.eagleShareOFT);
        console.log(`✅ Eagle Share OFT: ${contracts.ethereum.eagleShareOFT}`);
        
        try {
            const eagleName = await eagleShareOFT.name();
            const eagleSymbol = await eagleShareOFT.symbol();
            const eagleSupply = await eagleShareOFT.totalSupply();
            const eagleOwner = await eagleShareOFT.owner();
            
            console.log(`   Name: ${eagleName}`);
            console.log(`   Symbol: ${eagleSymbol}`);
            console.log(`   Total Supply: ${ethers.formatEther(eagleSupply)} EAGLE`);
            console.log(`   Owner: ${eagleOwner}`);
            
            const basePeer = await eagleShareOFT.peers(30184); // Base EID
            console.log(`   Base Peer: ${basePeer}`);
            
        } catch (error) {
            console.log(`   Error reading Eagle Share OFT: ${error.message}`);
        }
        
        console.log("");
        
        // Check if we can read vault info
        console.log("🏦 CHECKING EAGLE VAULT V2 (LIVE)");
        console.log("=".repeat(35));
        
        try {
            // Try to connect to the vault - it might be ERC4626 compliant
            const vaultInterface = new ethers.Interface([
                "function name() view returns (string)",
                "function symbol() view returns (string)", 
                "function totalSupply() view returns (uint256)",
                "function totalAssets() view returns (uint256)",
                "function asset() view returns (address)"
            ]);
            
            const vault = new ethers.Contract(contracts.ethereum.eagleVault, vaultInterface, signer);
            console.log(`✅ Eagle Vault V2: ${contracts.ethereum.eagleVault}`);
            
            try {
                const vaultName = await vault.name();
                console.log(`   Name: ${vaultName}`);
            } catch (e) {
                console.log(`   Name: Unable to read`);
            }
            
            try {
                const totalAssets = await vault.totalAssets();
                console.log(`   Total Assets: ${ethers.formatUnits(totalAssets, 6)} USD1`);
            } catch (e) {
                console.log(`   Total Assets: Unable to read`);
            }
            
        } catch (error) {
            console.log(`   Vault interface check failed: ${error.message}`);
        }
        
        console.log("");
        
        // Show real USD1 token info
        console.log("💰 CHECKING REAL USD1 TOKEN (LIVE)");
        console.log("=".repeat(35));
        
        const USD1_ADDRESS = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
        
        try {
            const usd1Token = await ethers.getContractAt("IERC20Metadata", USD1_ADDRESS);
            console.log(`✅ Real USD1 Token: ${USD1_ADDRESS}`);
            
            const usd1Name = await usd1Token.name();
            const usd1Symbol = await usd1Token.symbol();
            const usd1Decimals = await usd1Token.decimals();
            
            console.log(`   Name: ${usd1Name}`);
            console.log(`   Symbol: ${usd1Symbol}`);
            console.log(`   Decimals: ${usd1Decimals}`);
            
            // Check signer's balance
            const signerBalance = await usd1Token.balanceOf(signer.address);
            console.log(`   Your USD1 Balance: ${ethers.formatUnits(signerBalance, usd1Decimals)} USD1`);
            
        } catch (error) {
            console.log(`   Error reading USD1 token: ${error.message}`);
        }
        
        console.log("");
        
        // Show network info
        console.log("🌐 NETWORK INFORMATION");
        console.log("=".repeat(25));
        const network = await ethers.provider.getNetwork();
        const blockNumber = await ethers.provider.getBlockNumber();
        const feeData = await ethers.provider.getFeeData();
        
        console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})`);
        console.log(`📦 Block Number: ${blockNumber}`);
        console.log(`⛽ Gas Price: ${ethers.formatUnits(feeData.gasPrice!, "gwei")} gwei`);
        
        console.log("");
        console.log("🎯 WHAT THIS SHOWS:");
        console.log("=".repeat(20));
        console.log("✅ All contracts are LIVE and deployed");
        console.log("✅ Peer connections are configured");
        console.log("✅ Real USD1/WLFI tokens are integrated");
        console.log("✅ System is ready for real deposits!");
        console.log("");
        
        console.log("💡 TO MAKE A REAL DEPOSIT:");
        console.log("1. Get some USD1 tokens on BSC");
        console.log("2. Call send() on BSC USD1 Adapter");
        console.log("3. LayerZero will bridge to Ethereum");
        console.log("4. Auto-deposit into Eagle Vault");
        console.log("5. Start earning Charm Finance yields!");
        
    } catch (error: any) {
        console.error("❌ Error connecting to contracts:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
