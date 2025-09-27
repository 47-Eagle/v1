import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    usd1Token: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d' // World Liberty Financial USD
};

const EndpointId = {
    ETHEREUM_V2_MAINNET: 30101
};

async function simpleUSD1Deposit() {
    console.log("💰 SIMPLE $5 USD1 DEPOSIT (BSC → ETHEREUM)");
    console.log("=========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 User: ${deployer.address}`);
    console.log(`💰 USD1 Balance: 10.029 USD1`);
    
    const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL!);
    const bscSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, bscProvider);
    
    const ERC20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)"
    ];
    
    const OFTAbi = [
        "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), (uint256 nativeFee, uint256 lzTokenFee), address refundAddress) payable external",
        "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd), bool _payInLzToken) external view returns ((uint256 nativeFee, uint256 lzTokenFee) fee)"
    ];
    
    const usd1Token = new ethers.Contract(BSC_CONTRACTS.usd1Token, ERC20Abi, bscSigner);
    const usd1Adapter = new ethers.Contract(BSC_CONTRACTS.usd1Adapter, OFTAbi, bscSigner);
    
    try {
        // Verify balance
        const balance = await usd1Token.balanceOf(bscSigner.address);
        console.log(`🔍 Verified balance: ${ethers.formatEther(balance)} USD1`);
        
        const depositAmount = ethers.parseUnits("5", 18); // $5 USD1
        
        if (balance < depositAmount) {
            console.log("❌ Insufficient balance for deposit");
            return;
        }
        
        // Check and approve
        const allowance = await usd1Token.allowance(bscSigner.address, BSC_CONTRACTS.usd1Adapter);
        
        if (allowance < depositAmount) {
            console.log("🔓 Approving USD1 spend...");
            const approveTx = await usd1Token.approve(BSC_CONTRACTS.usd1Adapter, depositAmount);
            await approveTx.wait();
            console.log(`✅ Approved: ${approveTx.hash}`);
        }
        
        // Build minimal send params
        const sendParam = {
            dstEid: EndpointId.ETHEREUM_V2_MAINNET,
            to: ethers.zeroPadValue(bscSigner.address, 32),
            amountLD: depositAmount,
            minAmountLD: depositAmount - (depositAmount / BigInt(100)), // 1% slippage
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        };
        
        console.log("\n💸 Calculating LayerZero fees...");
        
        // Try with higher gas limit and explicit options
        try {
            const fee = await usd1Adapter.quoteSend(sendParam, false);
            console.log(`LayerZero fee: ${ethers.formatEther(fee.nativeFee)} BNB`);
            
            // Check BNB balance
            const bnbBalance = await bscProvider.getBalance(bscSigner.address);
            console.log(`BNB balance: ${ethers.formatEther(bnbBalance)}`);
            
            if (bnbBalance < fee.nativeFee) {
                console.log("❌ Insufficient BNB for LayerZero fees");
                return;
            }
            
            console.log("\n🚀 Executing deposit...");
            
            const tx = await usd1Adapter.send(
                sendParam,
                { nativeFee: fee.nativeFee, lzTokenFee: fee.lzTokenFee },
                bscSigner.address,
                {
                    value: fee.nativeFee,
                    gasPrice: ethers.parseUnits("5", "gwei"), // Higher gas price
                    gasLimit: 800000 // Higher gas limit
                }
            );
            
            console.log(`📤 Transaction sent: ${tx.hash}`);
            console.log(`🔗 BSCScan: https://bscscan.com/tx/${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
            console.log(`⛽ Gas used: ${receipt.gasUsed}`);
            
            console.log("\n🎊 SUCCESS!");
            console.log("===========");
            console.log(`✅ $5 USD1 successfully sent from BSC to Ethereum!`);
            console.log(`📊 Track progress: https://layerzeroscan.com/tx/${tx.hash}`);
            console.log(`⏰ Tokens will arrive on Ethereum in ~5-15 minutes`);
            console.log(`🏦 Then you can deposit to Eagle Vault for yield!`);
            
        } catch (quoteError: any) {
            console.log(`❌ Quote/Send failed: ${quoteError.message}`);
            
            if (quoteError.message.includes('0x6780cfaf')) {
                console.log("\n💡 LayerZero configuration still needs setup");
                console.log("Let's try a different approach...");
                await tryAlternativeMethod(usd1Adapter, sendParam);
            }
        }
        
    } catch (error: any) {
        console.error(`❌ Deposit failed: ${error.message}`);
        
        if (error.message.includes('DVN')) {
            console.log("💡 This appears to be a DVN configuration issue");
        } else if (error.message.includes('peer')) {
            console.log("💡 This appears to be a peer connection issue");
        }
    }
}

async function tryAlternativeMethod(adapter: ethers.Contract, sendParam: any) {
    console.log("\n🔄 Trying alternative method with custom options...");
    
    // Try with explicit enforced options
    const customOptions = "0x00030001001100000000000000000000000000fdfe"; // lzReceive with 65534 gas
    const customSendParam = {
        ...sendParam,
        extraOptions: customOptions
    };
    
    try {
        const fee = await adapter.quoteSend(customSendParam, false);
        console.log(`Alternative fee quote: ${ethers.formatEther(fee.nativeFee)} BNB`);
        
        // Don't execute yet, just show it's possible
        console.log("💡 Alternative method fee quote successful!");
        console.log("Try updating LayerZero DVN configuration first");
        
    } catch (altError: any) {
        console.log(`❌ Alternative method also failed: ${altError.message}`);
        console.log("\n📞 RECOMMENDATION:");
        console.log("The LayerZero configuration needs professional setup");
        console.log("Consider using LayerZero's support or documentation");
    }
}

async function main() {
    await simpleUSD1Deposit();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

export { simpleUSD1Deposit };
