import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("\n=== Eagle Vault V3 - Execute Vanity Deployment ===\n");

  // Load deployment info
  const deploymentFile = "deployment-v3-vault-vanity.json";
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.log("Run deploy-v3-vanity.ts first to generate the vanity address.");
    return;
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Verify deployer matches
  if (deployer.address.toLowerCase() !== deploymentInfo.deployer.toLowerCase()) {
    console.error(`❌ Deployer mismatch!`);
    console.log(`Expected: ${deploymentInfo.deployer}`);
    console.log(`Current:  ${deployer.address}`);
    return;
  }

  console.log("📋 Deployment Info:");
  console.log("  Vanity Address:", deploymentInfo.vanityAddress);
  console.log("  Salt:", deploymentInfo.salt);
  console.log("  Factory:", deploymentInfo.factory);
  console.log("\n🏗️  Constructor Args:");
  console.log("  WLFI:", deploymentInfo.constructorArgs.wlfiToken);
  console.log("  USD1:", deploymentInfo.constructorArgs.usd1Token, "✅");
  console.log("  USD1 Price Feed:", deploymentInfo.constructorArgs.usd1PriceFeed);
  console.log("  WLFI/USD1 Pool:", deploymentInfo.constructorArgs.wlfiUsd1Pool);
  console.log("  Uniswap Router:", deploymentInfo.constructorArgs.uniswapRouter);
  console.log("  Owner:", deploymentInfo.constructorArgs.owner);

  // Load pre-generated init code
  const initCodeDataFile = "init-code-data.json";
  if (!fs.existsSync(initCodeDataFile)) {
    console.error(`❌ Init code data file not found: ${initCodeDataFile}`);
    console.log("Run get-init-code-hash.ts first to generate init code.");
    return;
  }

  const initCodeData = JSON.parse(fs.readFileSync(initCodeDataFile, "utf8"));
  const deploymentData = initCodeData.initCode;

  // Verify init code hash matches
  const initCodeHash = ethers.keccak256(deploymentData);
  if (initCodeHash !== deploymentInfo.initCodeHash) {
    console.error("❌ Init code hash mismatch!");
    console.log("Expected:", deploymentInfo.initCodeHash);
    console.log("Current:", initCodeHash);
    console.log("\n⚠️  Contract code may have changed since vanity generation.");
    console.log("Rerun deploy-v3-vanity.ts to generate new salt.");
    return;
  }

  console.log("\n✅ Init code hash verified:", initCodeHash.slice(0, 10) + "...");

  // Get CREATE2 factory with correct ABI
  const factoryABI = [
    "function deploy(bytes32 salt, bytes memory bytecode) returns (address)",
    "function computeAddress(bytes32 salt, bytes32 bytecodeHash) view returns (address)"
  ];
  
  const factory = new ethers.Contract(
    deploymentInfo.factory,
    factoryABI,
    deployer
  );

  console.log("\n🚀 Deploying EagleOVault V3...");
  console.log("Expected address:", deploymentInfo.vanityAddress);

  try {
    // Deploy using CREATE2 factory
    const tx = await factory.deploy(
      deploymentInfo.salt,
      deploymentData,
      { gasLimit: 10_000_000 }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Deployed in block ${receipt!.blockNumber}`);
    console.log(`Gas used: ${receipt!.gasUsed.toString()}`);

    // Verify deployed address
    const deployedAddress = ethers.getCreate2Address(
      deploymentInfo.factory,
      deploymentInfo.salt,
      initCodeHash
    );

    console.log("\n🎯 Deployed Address:", deployedAddress);
    
    if (deployedAddress.toLowerCase() !== deploymentInfo.vanityAddress.toLowerCase()) {
      console.error("⚠️  Warning: Deployed address doesn't match expected vanity address!");
    } else {
      console.log("✅ Vanity address confirmed!");
    }

    // Test the deployed contract
    const vault = await ethers.getContractAt("EagleOVault", deployedAddress);
    
    console.log("\n🧪 Verifying deployment...");
    const wlfiToken = await vault.WLFI_TOKEN();
    const usd1Token = await vault.USD1_TOKEN();
    const owner = await vault.owner();
    
    console.log("  WLFI Token:", wlfiToken);
    console.log("  USD1 Token:", usd1Token, usd1Token === deploymentInfo.constructorArgs.usd1Token ? "✅" : "❌");
    console.log("  Owner:", owner);
    
    // Try to get prices (this will verify oracle integration)
    try {
      const wlfiPrice = await vault.getWLFIPrice();
      const usd1Price = await vault.getUSD1Price();
      console.log("\n💰 Oracle Prices:");
      console.log("  WLFI:", ethers.formatEther(wlfiPrice), "USD");
      console.log("  USD1:", ethers.formatEther(usd1Price), "USD");
    } catch (error: any) {
      console.log("\n⚠️  Could not fetch prices:", error.message);
    }

    // Save final deployment
    const finalDeployment = {
      ...deploymentInfo,
      deployed: true,
      deploymentTx: tx.hash,
      deploymentBlock: receipt!.blockNumber,
      gasUsed: receipt!.gasUsed.toString(),
      actualAddress: deployedAddress,
      verification: {
        wlfiToken: wlfiToken,
        usd1Token: usd1Token,
        owner: owner
      }
    };

    fs.writeFileSync(
      `deployment-v3-vault-final.json`,
      JSON.stringify(finalDeployment, null, 2)
    );

    console.log("\n✅ V3 Vault deployed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Verify contract on Etherscan:");
    console.log(`   npx hardhat verify --network mainnet ${deployedAddress} \\`);
    console.log(`     "${deploymentInfo.constructorArgs.wlfiToken}" \\`);
    console.log(`     "${deploymentInfo.constructorArgs.usd1Token}" \\`);
    console.log(`     "${deploymentInfo.constructorArgs.usd1PriceFeed}" \\`);
    console.log(`     "${deploymentInfo.constructorArgs.wlfiUsd1Pool}" \\`);
    console.log(`     "${deploymentInfo.constructorArgs.uniswapRouter}" \\`);
    console.log(`     "${deploymentInfo.constructorArgs.owner}"`);
    console.log("\n2. Deploy Wrapper, OFT, and Strategy contracts");
    console.log("3. Update frontend/.env with new V3 address");
    console.log("4. Redeploy frontend to Vercel");

  } catch (error: any) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

