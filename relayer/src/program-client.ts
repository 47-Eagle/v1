import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

// Program IDL for eagle_share_oft
const IDL = {
  version: "0.1.0",
  name: "eagle_share_oft",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "config", isMut: true, isSigner: false },
        { name: "mint", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false },
      ],
      args: [{ name: "decimals", type: "u8" }],
    },
    {
      name: "mint",
      accounts: [
        { name: "config", isMut: false, isSigner: false },
        { name: "mint", isMut: true, isSigner: false },
        { name: "to", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "burn",
      accounts: [
        { name: "config", isMut: false, isSigner: false },
        { name: "mint", isMut: true, isSigner: false },
        { name: "from", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "bridgeIn",
      accounts: [
        { name: "config", isMut: false, isSigner: false },
        { name: "mint", isMut: true, isSigner: false },
        { name: "to", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "sourceChainId", type: "u32" },
      ],
    },
    {
      name: "bridgeOut",
      accounts: [
        { name: "config", isMut: false, isSigner: false },
        { name: "mint", isMut: true, isSigner: false },
        { name: "from", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "destinationChainId", type: "u32" },
        { name: "recipient", type: { array: ["u8", 32] } },
      ],
    },
  ],
  accounts: [
    {
      name: "OftConfig",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "mint", type: "publicKey" },
          { name: "decimals", type: "u8" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "Unauthorized", msg: "Unauthorized: Only authority can perform this action" },
    { code: 6001, name: "InvalidAmount", msg: "Invalid amount: Amount must be greater than zero" },
    { code: 6002, name: "InvalidChainId", msg: "Invalid chain ID" },
  ],
};

export class EagleOftClient {
  program: Program;
  provider: AnchorProvider;
  connection: Connection;
  programId: PublicKey;
  mint: PublicKey;
  configPda: PublicKey;
  configBump: number;

  constructor(
    connection: Connection,
    wallet: Keypair,
    programId: PublicKey,
    mint: PublicKey
  ) {
    this.connection = connection;
    this.programId = programId;
    this.mint = mint;

    // Create provider
    const anchorWallet = new Wallet(wallet);
    this.provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
    });

    // Create program
    this.program = new Program(IDL as any, programId, this.provider);

    // Derive config PDA
    const [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );
    this.configPda = configPda;
    this.configBump = configBump;
  }

  /**
   * Mint EAGLE tokens via bridge_in instruction
   * This is called when tokens are bridged from Ethereum
   */
  async bridgeIn(
    recipient: PublicKey,
    amount: bigint,
    sourceChainId: number = 30101 // Ethereum
  ): Promise<string> {
    // Get or create token account for recipient
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.provider.wallet.payer,
      this.mint,
      recipient
    );

    // Call bridge_in instruction
    const tx = await this.program.methods
      .bridgeIn(
        new anchor.BN(amount.toString()),
        sourceChainId
      )
      .accounts({
        config: this.configPda,
        mint: this.mint,
        to: recipientTokenAccount.address,
        authority: this.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Get config account data
   */
  async getConfig(): Promise<any> {
    try {
      const config = await this.program.account.oftConfig.fetch(this.configPda);
      return config;
    } catch (error) {
      console.error("Failed to fetch config:", error);
      return null;
    }
  }

  /**
   * Check if program is initialized
   */
  async isInitialized(): Promise<boolean> {
    const config = await this.getConfig();
    return config !== null;
  }

  /**
   * Watch for bridge_out events
   * Returns a subscription ID
   */
  watchBridgeOut(callback: (event: BridgeOutEvent) => void): number {
    // Subscribe to program logs
    const subscriptionId = this.connection.onLogs(
      this.programId,
      (logs) => {
        // Parse logs for bridge_out events
        const logMessages = logs.logs;
        
        for (const log of logMessages) {
          if (log.includes("Bridging") && log.includes("EAGLE shares to chain")) {
            // Parse the log message
            // Format: "Bridging {amount} EAGLE shares to chain {chain_id}"
            const amountMatch = log.match(/Bridging (\d+) EAGLE/);
            const chainMatch = log.match(/to chain (\d+)/);
            
            if (amountMatch && chainMatch) {
              const amount = BigInt(amountMatch[1]);
              const chainId = parseInt(chainMatch[1]);
              
              // Get recipient from next log line
              const recipientLog = logMessages.find(l => l.includes("Recipient:"));
              let recipient: number[] = [];
              
              if (recipientLog) {
                // Parse recipient bytes32
                // This is a simplified parser - in production, parse properly
                recipient = Array(32).fill(0); // Placeholder
              }
              
              callback({
                amount,
                destinationChainId: chainId,
                recipient,
                signature: logs.signature,
              });
            }
          }
        }
      },
      "confirmed"
    );

    return subscriptionId;
  }
}

export interface BridgeOutEvent {
  amount: bigint;
  destinationChainId: number;
  recipient: number[];
  signature: string;
}

