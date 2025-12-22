import { ethers } from "hardhat";

/**
 * Deploy V3 Strategies with zRouter + Auto Fee Tier optimizations
 * 
 * Run with: npx hardhat run scripts/deployV3Strategies.ts --network mainnet
 */

// ===== MAINNET ADDRESSES =====
const EAGLE_VAULT = "0x47bf80770E427aD988F38ddd0687D32Cbf626e9c";
const CHARM_USD1_WLFI = "0x16A82A9eb63168C6490BBe36d73c97f75e3E7616";
const CHARM_WETH_WLFI = "0xCB42D78C52c49e8c2e51f8b5766419f0D6616E3d";
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const UNISWAP_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const ZROUTER = "0x00000000008892d085e0611eb8C8BDc9FD856fD3";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying V3 strategies with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // ===== Deploy USD1/WLFI Strategy V3 =====
  console.log("\n=== Deploying CharmStrategyUSD1 V3 ===");
  
  const CharmStrategyUSD1V2 = await ethers.getContractFactory("CharmStrategyUSD1V2");
  const strategyUsd1 = await CharmStrategyUSD1V2.deploy(
    EAGLE_VAULT,
    CHARM_USD1_WLFI,
    UNISWAP_ROUTER
  );
  await strategyUsd1.waitForDeployment();
  const usd1Address = await strategyUsd1.getAddress();
  console.log("USD1 Strategy V3 deployed to:", usd1Address);
  
  // Configure USD1 strategy
  console.log("Configuring USD1 strategy...");
  await (await strategyUsd1.setZRouter(ZROUTER)).wait();
  await (await strategyUsd1.setUseZRouter(true)).wait();
  await (await strategyUsd1.setUniFactory(UNISWAP_FACTORY)).wait();
  await (await strategyUsd1.setAutoFeeTier(true)).wait();
  await (await strategyUsd1.initializeApprovals()).wait();
  await (await strategyUsd1.setActive(true)).wait();
  console.log("  ✓ zRouter enabled");
  console.log("  ✓ Auto fee tier enabled");
  console.log("  ✓ Approvals initialized");
  console.log("  ✓ Strategy active");

  // ===== Deploy WETH/WLFI Strategy V3 =====
  console.log("\n=== Deploying CharmStrategyWETH V3 ===");
  
  const CharmStrategyWETHV2 = await ethers.getContractFactory("CharmStrategyWETHV2");
  const strategyWeth = await CharmStrategyWETHV2.deploy(
    EAGLE_VAULT,
    CHARM_WETH_WLFI,
    UNISWAP_ROUTER
  );
  await strategyWeth.waitForDeployment();
  const wethAddress = await strategyWeth.getAddress();
  console.log("WETH Strategy V3 deployed to:", wethAddress);
  
  // Configure WETH strategy
  console.log("Configuring WETH strategy...");
  await (await strategyWeth.setZRouter(ZROUTER)).wait();
  await (await strategyWeth.setUseZRouter(true)).wait();
  await (await strategyWeth.setUniFactory(UNISWAP_FACTORY)).wait();
  await (await strategyWeth.setAutoFeeTier(true)).wait();
  await (await strategyWeth.initializeApprovals()).wait();
  await (await strategyWeth.setActive(true)).wait();
  console.log("  ✓ zRouter enabled");
  console.log("  ✓ Auto fee tier enabled");
  console.log("  ✓ Approvals initialized");
  console.log("  ✓ Strategy active");

  // ===== Summary =====
  console.log("\n========================================");
  console.log("           DEPLOYMENT SUMMARY           ");
  console.log("========================================");
  console.log("USD1/WLFI Strategy V3:", usd1Address);
  console.log("WETH/WLFI Strategy V3:", wethAddress);
  console.log("");
  console.log("========================================");
  console.log("              NEXT STEPS                ");
  console.log("========================================");
  console.log("");
  console.log("1. Transfer LP shares from V2 to V3:");
  console.log("   USD1 V2: 0xa7F6F4b1134c0aD4646AB18240a19f01e08Ba90E");
  console.log("   WETH V2: 0xCe1884B2dC7A2980d401C9C568CD59B2Eaa07338");
  console.log("");
  console.log("2. On EagleOVault (as owner/multisig):");
  console.log("   vault.removeStrategy(oldAddress)");
  console.log("   vault.addStrategy(newAddress, weight)");
  console.log("");
  console.log("3. Update frontend configs:");
  console.log("   - frontend/src/config/contracts.ts");
  console.log("   - frontend/src/config/strategies.ts");
  console.log("   - Vercel environment variables");
  console.log("========================================");

  // Verification commands
  console.log("\n========================================");
  console.log("          VERIFICATION COMMANDS         ");
  console.log("========================================");
  console.log(`npx hardhat verify --network mainnet ${usd1Address} ${EAGLE_VAULT} ${CHARM_USD1_WLFI} ${UNISWAP_ROUTER}`);
  console.log(`npx hardhat verify --network mainnet ${wethAddress} ${EAGLE_VAULT} ${CHARM_WETH_WLFI} ${UNISWAP_ROUTER}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
