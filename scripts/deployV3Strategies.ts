import { ethers } from "hardhat";

/**
 * Deploy V3 Strategies with zRouter + Auto Fee Tier optimizations
 * 
 * Run with: npx hardhat run scripts/deployV3Strategies.ts --network ethereum
 */

async function main() {
  // ===== MAINNET ADDRESSES (lowercase, then checksummed) =====
  const EAGLE_VAULT = ethers.utils.getAddress("0x47bf80770e427ad988f38ddd0687d32cbf626e9c");
  const WLFI = ethers.utils.getAddress("0x8f5cdb9afa95f5e80494657ccdc0c87c67c9814e");
  const USD1 = ethers.utils.getAddress("0xdc632993324878ed782c1b859a893c71af55c4c6");
  const WETH = ethers.utils.getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");

  // Charm Vaults (from current V2 strategies)
  const CHARM_USD1_WLFI = ethers.utils.getAddress("0x22828dbf15f5fba2394ba7cf8fa9a96bdb444b71");
  const CHARM_WETH_WLFI = ethers.utils.getAddress("0x3314e248f3f752cd16939773d83beb3a362f0aef");

  // Uniswap V3 Pools
  const POOL_USD1_WLFI = ethers.utils.getAddress("0xe63a04d7cd9a2644a1080e51d7ec23b61abd21e7");
  const POOL_WETH_WLFI = ethers.utils.getAddress("0x6e9db4533e420b16a9ebbf5b5a1ceb7fbf7d162b");

  const UNISWAP_ROUTER = ethers.utils.getAddress("0xe592427a0aece92de3edee1f18e0157c05861564");
  const UNISWAP_FACTORY = ethers.utils.getAddress("0x1f98431c8ad98523631ae4a59f267346ea31f984");
  const ZROUTER = ethers.utils.getAddress("0x00000000008892d085e0611eb8c8bdc9fd856fd3");

  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying V3 strategies with account:", deployer.address);
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  // ===== Deploy USD1/WLFI Strategy V3 =====
  console.log("\n=== Deploying CharmStrategyUSD1 V3 ===");
  
  const CharmStrategyUSD1V2 = await ethers.getContractFactory("CharmStrategyUSD1V2");
  // Constructor: vault, charmVault, wlfi, usd1, uniswapRouter, swapPool, owner
  const strategyUsd1 = await CharmStrategyUSD1V2.deploy(
    EAGLE_VAULT,
    CHARM_USD1_WLFI,
    WLFI,
    USD1,
    UNISWAP_ROUTER,
    POOL_USD1_WLFI,
    deployer.address  // owner
  );
  await strategyUsd1.deployed();
  const usd1Address = strategyUsd1.address;
  console.log("USD1 Strategy V3 deployed to:", usd1Address);
  
  // Configure USD1 strategy
  console.log("Configuring USD1 strategy...");
  await (await strategyUsd1.setZRouter(ZROUTER)).wait();
  console.log("  ✓ zRouter set");
  await (await strategyUsd1.setUseZRouter(true)).wait();
  console.log("  ✓ zRouter enabled");
  await (await strategyUsd1.setUniFactory(UNISWAP_FACTORY)).wait();
  console.log("  ✓ Uniswap Factory set");
  await (await strategyUsd1.setAutoFeeTier(true)).wait();
  console.log("  ✓ Auto fee tier enabled");
  await (await strategyUsd1.initializeApprovals()).wait();
  console.log("  ✓ Approvals initialized");
  await (await strategyUsd1.setActive(true)).wait();
  console.log("  ✓ Strategy active");

  // ===== Deploy WETH/WLFI Strategy V3 =====
  console.log("\n=== Deploying CharmStrategyWETH V3 ===");
  
  const CharmStrategyWETHV2 = await ethers.getContractFactory("CharmStrategyWETHV2");
  // Constructor: vault, charmVault, wlfi, weth, usd1, uniswapRouter, swapPool, owner
  const strategyWeth = await CharmStrategyWETHV2.deploy(
    EAGLE_VAULT,
    CHARM_WETH_WLFI,
    WLFI,
    WETH,
    USD1,
    UNISWAP_ROUTER,
    POOL_WETH_WLFI,
    deployer.address  // owner
  );
  await strategyWeth.deployed();
  const wethAddress = strategyWeth.address;
  console.log("WETH Strategy V3 deployed to:", wethAddress);
  
  // Configure WETH strategy
  console.log("Configuring WETH strategy...");
  await (await strategyWeth.setZRouter(ZROUTER)).wait();
  console.log("  ✓ zRouter set");
  await (await strategyWeth.setUseZRouter(true)).wait();
  console.log("  ✓ zRouter enabled");
  await (await strategyWeth.setUniFactory(UNISWAP_FACTORY)).wait();
  console.log("  ✓ Uniswap Factory set");
  await (await strategyWeth.setAutoFeeTier(true)).wait();
  console.log("  ✓ Auto fee tier enabled");
  await (await strategyWeth.initializeApprovals()).wait();
  console.log("  ✓ Approvals initialized");
  await (await strategyWeth.setActive(true)).wait();
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
  console.log(`npx hardhat verify --network ethereum ${usd1Address} ${EAGLE_VAULT} ${CHARM_USD1_WLFI} ${WLFI} ${USD1} ${UNISWAP_ROUTER} ${POOL_USD1_WLFI} ${deployer.address}`);
  console.log(`npx hardhat verify --network ethereum ${wethAddress} ${EAGLE_VAULT} ${CHARM_WETH_WLFI} ${WLFI} ${WETH} ${USD1} ${UNISWAP_ROUTER} ${POOL_WETH_WLFI} ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
