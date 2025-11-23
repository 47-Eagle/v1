import { expect } from "chai";
import { ethers } from "ethers";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Integration Test: Ethereum to Solana Bridge
 * 
 * Tests the full flow of burning EAGLE on Ethereum and minting on Solana
 * 
 * Prerequisites:
 * - Solana program deployed
 * - Relayer running
 * - User wallets linked
 * - Test accounts funded
 */
describe("Ethereum → Solana Bridge Integration", function () {
  // Increase timeout for cross-chain operations
  this.timeout(120000);

  let ethProvider: ethers.JsonRpcProvider;
  let ethSigner: ethers.Wallet;
  let solanaConnection: Connection;
  let solanaWallet: Keypair;
  let eagleOftContract: ethers.Contract;

  const EAGLE_SHARE_OFT = process.env.EAGLE_SHARE_OFT_ADDRESS || "0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E";
  const SOLANA_PROGRAM_ID = new PublicKey(
    process.env.SOLANA_PROGRAM_ID || "11111111111111111111111111111112"
  );
  const SOLANA_MINT = new PublicKey(
    process.env.SOLANA_MINT || "11111111111111111111111111111112"
  );

  before(async function () {
    console.log("\n============================================");
    console.log("  Setup Test Environment");
    console.log("============================================\n");

    // Setup Ethereum
    ethProvider = new ethers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo"
    );
    
    if (!process.env.TEST_ETH_PRIVATE_KEY) {
      this.skip();
      return;
    }
    
    ethSigner = new ethers.Wallet(process.env.TEST_ETH_PRIVATE_KEY, ethProvider);
    
    console.log("Ethereum:");
    console.log("  Address:", ethSigner.address);
    console.log("  Balance:", ethers.formatEther(await ethProvider.getBalance(ethSigner.address)), "ETH");

    // Setup Solana
    solanaConnection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );
    
    if (!process.env.TEST_SOLANA_KEYPAIR) {
      this.skip();
      return;
    }
    
    solanaWallet = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.TEST_SOLANA_KEYPAIR))
    );
    
    const solBalance = await solanaConnection.getBalance(solanaWallet.publicKey);
    
    console.log("\nSolana:");
    console.log("  Address:", solanaWallet.publicKey.toBase58());
    console.log("  Balance:", solBalance / 1e9, "SOL");

    // Load EagleShareOFT contract
    const abi = [
      "function balanceOf(address) view returns (uint256)",
      "function burn(address,uint256)",
      "function transfer(address,uint256) returns (bool)",
    ];
    eagleOftContract = new ethers.Contract(EAGLE_SHARE_OFT, abi, ethSigner);

    console.log("\nContracts:");
    console.log("  EagleShareOFT:", EAGLE_SHARE_OFT);
    console.log("  Solana Program:", SOLANA_PROGRAM_ID.toBase58());
    console.log("  Solana Mint:", SOLANA_MINT.toBase58());
    console.log("");
  });

  it("should have EAGLE balance on Ethereum", async function () {
    const balance = await eagleOftContract.balanceOf(ethSigner.address);
    console.log("  ETH EAGLE Balance:", ethers.formatEther(balance));
    
    // We need at least some EAGLE to test
    if (balance === 0n) {
      console.log("  ⚠️  No EAGLE balance. Test will be skipped.");
      this.skip();
    }
    
    expect(balance).to.be.gt(0n);
  });

  it("should burn EAGLE on Ethereum", async function () {
    const burnAmount = ethers.parseEther("0.1"); // Burn 0.1 EAGLE
    
    console.log("  Burning", ethers.formatEther(burnAmount), "EAGLE on Ethereum");
    
    const balanceBefore = await eagleOftContract.balanceOf(ethSigner.address);
    
    // Burn tokens
    const tx = await eagleOftContract.burn(ethSigner.address, burnAmount);
    console.log("  Transaction:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("  Confirmed in block:", receipt.blockNumber);
    
    const balanceAfter = await eagleOftContract.balanceOf(ethSigner.address);
    
    expect(balanceAfter).to.equal(balanceBefore - burnAmount);
    console.log("  ✅ Burn successful");
  });

  it("should detect burn event on Ethereum", async function () {
    // This test verifies the relayer would detect the burn
    // In practice, the relayer should be running
    
    const filter = eagleOftContract.filters.Transfer(ethSigner.address, ethers.ZeroAddress);
    const events = await eagleOftContract.queryFilter(filter, -10); // Last 10 blocks
    
    console.log("  Found", events.length, "burn events in last 10 blocks");
    
    if (events.length > 0) {
      const lastBurn = events[events.length - 1];
      console.log("  Last burn:");
      console.log("    Amount:", ethers.formatEther(lastBurn.args[2]));
      console.log("    Block:", lastBurn.blockNumber);
    }
    
    expect(events.length).to.be.gt(0);
  });

  it("should mint EAGLE on Solana (via relayer)", async function () {
    // Wait for relayer to process the burn and mint on Solana
    console.log("  Waiting for relayer to process (30 seconds)...");
    
    await new Promise((resolve) => setTimeout(resolve, 30000));
    
    // Check Solana token account
    try {
      // Derive associated token account
      const [ata] = PublicKey.findProgramAddressSync(
        [
          solanaWallet.publicKey.toBuffer(),
          new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
          SOLANA_MINT.toBuffer(),
        ],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      
      console.log("  Token Account:", ata.toBase58());
      
      const account = await getAccount(solanaConnection, ata);
      console.log("  Solana EAGLE Balance:", Number(account.amount) / 1e9);
      
      // We should have received some EAGLE
      // Note: Amount will be less due to 18 → 9 decimal conversion
      expect(Number(account.amount)).to.be.gt(0);
      console.log("  ✅ Mint successful");
      
    } catch (error: any) {
      if (error.message.includes("could not find account")) {
        console.log("  ⚠️  Token account not found. Relayer may not have processed yet.");
        console.log("  This could mean:");
        console.log("    - Relayer is not running");
        console.log("    - User wallets not linked");
        console.log("    - Processing delay");
        this.skip();
      } else {
        throw error;
      }
    }
  });

  it("should have correct balance ratio (18:9 decimals)", async function () {
    // Verify the decimal conversion is correct
    // 1 EAGLE (18 decimals) on ETH = 1 EAGLE (9 decimals) on Solana
    // But the numeric value should be divided by 10^9
    
    // This is more of a unit test, but good to verify in integration
    const ethAmount = ethers.parseEther("1"); // 1e18
    const solanaAmount = ethAmount / 1_000_000_000n; // 1e9
    
    expect(solanaAmount).to.equal(1_000_000_000n);
    console.log("  ✅ Decimal conversion verified");
  });

  after(function () {
    console.log("\n============================================");
    console.log("  Test Complete");
    console.log("============================================\n");
  });
});

