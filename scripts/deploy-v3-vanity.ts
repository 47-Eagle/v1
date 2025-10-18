import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("\n=== Eagle Vault V3 - Vanity Address Deployment ===\n");

  // Use deployer from env or hardhat config
  const deployerAddress = process.env.PUBLIC_KEY || "0x7310Dd6EF89b7f829839F140C6840bc929ba2031";
  console.log("Deployer:", deployerAddress);

  // CREATE2 Factory
  const CREATE2_FACTORY = "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE";
  
  // Constructor arguments for V3 (with CORRECT USD1 token!)
  const CONSTRUCTOR_ARGS = {
    wlfiToken: "0x4780940f87d2Ce81d9dBAE8cC79B2239366e4747",
    usd1Token: "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d", // ✅ World Liberty Financial USD (18 decimals)
    usd1PriceFeed: "0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d",
    wlfiUsd1Pool: "0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    owner: deployerAddress
  };

  console.log("\n📋 Constructor Arguments:");
  console.log("  WLFI:", CONSTRUCTOR_ARGS.wlfiToken);
  console.log("  USD1:", CONSTRUCTOR_ARGS.usd1Token, "✅ (18 decimals)");
  console.log("  USD1 Price Feed:", CONSTRUCTOR_ARGS.usd1PriceFeed);
  console.log("  WLFI/USD1 Pool:", CONSTRUCTOR_ARGS.wlfiUsd1Pool);
  console.log("  Uniswap Router:", CONSTRUCTOR_ARGS.uniswapRouter);
  console.log("  Owner:", CONSTRUCTOR_ARGS.owner);

  // Get the EagleOVault contract factory
  const EagleOVault = await ethers.getContractFactory("EagleOVault");
  
  // Generate init bytecode (creation code + encoded constructor args)
  const deploymentData = EagleOVault.getDeployTransaction(
    CONSTRUCTOR_ARGS.wlfiToken,
    CONSTRUCTOR_ARGS.usd1Token,
    CONSTRUCTOR_ARGS.usd1PriceFeed,
    CONSTRUCTOR_ARGS.wlfiUsd1Pool,
    CONSTRUCTOR_ARGS.uniswapRouter,
    CONSTRUCTOR_ARGS.owner
  ).data;

  if (!deploymentData) {
    throw new Error("Failed to generate deployment data");
  }

  const initCodeHash = ethers.keccak256(deploymentData);
  console.log("\n🔐 Init Code Hash:", initCodeHash);

  // Vanity address pattern: starts with 0x47, ends with ea91e
  const PREFIX = "47";
  const SUFFIX = "ea91e";
  
  console.log(`\n🎯 Searching for vanity address: 0x${PREFIX}...${SUFFIX}`);
  console.log("This may take a while...\n");

  let salt: string | null = null;
  let vanityAddress: string | null = null;
  let attempts = 0;
  const startTime = Date.now();

  // Search for vanity salt
  while (!salt) {
    // Generate random salt
    const randomSalt = ethers.hexlify(ethers.randomBytes(32));
    
    // Calculate CREATE2 address
    const address = ethers.getCreate2Address(
      CREATE2_FACTORY,
      randomSalt,
      initCodeHash
    );

    attempts++;

    // Check if it matches our pattern
    const addressLower = address.toLowerCase();
    if (addressLower.startsWith(`0x${PREFIX.toLowerCase()}`) && 
        addressLower.endsWith(SUFFIX.toLowerCase())) {
      salt = randomSalt;
      vanityAddress = address;
      break;
    }

    // Progress update every 10,000 attempts
    if (attempts % 10000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(attempts / (Date.now() - startTime) * 1000);
      console.log(`  Attempts: ${attempts.toLocaleString()} | Rate: ${rate}/s | Time: ${elapsed}s`);
    }

    // Safety limit
    if (attempts > 10_000_000) {
      console.log("\n⚠️  Reached attempt limit. Pattern might be too specific.");
      console.log("Consider using a shorter suffix or different pattern.");
      return;
    }
  }

  const searchTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Found vanity address after ${attempts.toLocaleString()} attempts in ${searchTime}s!`);
  console.log(`\n🎯 Vanity Address: ${vanityAddress}`);
  console.log(`🔑 Salt: ${salt}`);

  // Save deployment info
  const deploymentInfo = {
    network: "ethereum-mainnet",
    timestamp: new Date().toISOString(),
    deployer: deployerAddress,
    factory: CREATE2_FACTORY,
    salt: salt,
    initCodeHash: initCodeHash,
    vanityAddress: vanityAddress,
    constructorArgs: CONSTRUCTOR_ARGS,
    searchStats: {
      attempts: attempts,
      timeSeconds: parseFloat(searchTime)
    }
  };

  const filename = `deployment-v3-vault-vanity.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);

  // Ask for confirmation
  console.log("\n⚠️  IMPORTANT: Review the vanity address before deploying!");
  console.log("\nTo deploy, run:");
  console.log(`  npx hardhat run scripts/execute-v3-deployment.ts`);
  console.log("\nOr manually call CREATE2Factory.deployWithOwnership() with:");
  console.log(`  Salt: ${salt}`);
  console.log(`  Init Code: <contract bytecode + constructor args>`);
  console.log(`  Owner: ${deployerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

