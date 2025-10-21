// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/EagleOVault.sol";
import "../contracts/EagleVaultWrapper.sol";
import "../contracts/layerzero/oft/WLFIAssetOFT.sol";
import "../contracts/layerzero/oft/USD1AssetOFT.sol";
import "../contracts/layerzero/oft/EagleShareOFT.sol";
import "../contracts/layerzero/composers/EagleOVaultComposer.sol";

/**
 * @title DeploySepoliaComplete
 * @notice Complete deployment script for Eagle OVault system on Sepolia testnet
 * 
 * @dev DEPLOYMENT ORDER:
 *      1. Asset OFTs (WLFI, USD1)
 *      2. EagleOVault (vault)
 *      3. EagleShareOFT (hub OFT)
 *      4. EagleVaultWrapper (wrapper)
 *      5. EagleOVaultComposer (composer)
 *      6. Configure permissions
 * 
 * @dev USAGE:
 *      forge script script/DeploySepoliaComplete.s.sol:DeploySepoliaComplete \
 *        --rpc-url sepolia \
 *        --broadcast \
 *        --verify \
 *        -vvvv
 */
contract DeploySepoliaComplete is Script {
    // =================================
    // SEPOLIA ADDRESSES
    // =================================
    
    // LayerZero V2 Sepolia Endpoint
    address constant LZ_ENDPOINT_SEPOLIA = 0x6EDCE65403992e310A62460808c4b910D972f10f;
    
    // Placeholder price feeds (Sepolia doesn't have real Chainlink feeds for WLFI/USD1)
    // You'll need to deploy mock price feeds or use a testnet oracle
    address constant WLFI_PRICE_FEED = address(0); // Deploy mock if needed
    address constant USD1_PRICE_FEED = address(0); // Deploy mock if needed
    
    // Uniswap V3 on Sepolia
    address constant UNISWAP_V3_ROUTER = 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD; // Universal Router
    address constant UNISWAP_V3_FACTORY = 0x0227628f3F023bb0B980b67D528571c95c6DaC1c;
    
    // WLFI/USD1 pool (will be created or use existing)
    address WLFI_USD1_POOL;
    
    // =================================
    // DEPLOYED CONTRACTS
    // =================================
    
    WLFIAssetOFT public wlfiOFT;
    USD1AssetOFT public usd1OFT;
    EagleOVault public vault;
    EagleShareOFT public shareOFT;
    EagleVaultWrapper public wrapper;
    EagleOVaultComposer public composer;
    
    // =================================
    // CONFIGURATION
    // =================================
    
    address public deployer;
    address public owner;
    address public manager;
    address public keeper;
    address public emergencyAdmin;
    address public performanceFeeRecipient;
    address public feeRecipient; // For wrapper fees
    
    function setUp() public {
        deployer = vm.envAddress("DEPLOYER_ADDRESS");
        owner = vm.envOr("OWNER_ADDRESS", deployer);
        manager = vm.envOr("MANAGER_ADDRESS", deployer);
        keeper = vm.envOr("KEEPER_ADDRESS", deployer);
        emergencyAdmin = vm.envOr("EMERGENCY_ADMIN_ADDRESS", deployer);
        performanceFeeRecipient = vm.envOr("PERFORMANCE_FEE_RECIPIENT", deployer);
        feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
    }
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=================================================");
        console.log("DEPLOYING EAGLE OVAULT SYSTEM TO SEPOLIA");
        console.log("=================================================");
        console.log("");
        console.log("Deployer:", deployer);
        console.log("Owner:", owner);
        console.log("LayerZero Endpoint:", LZ_ENDPOINT_SEPOLIA);
        console.log("");
        
        // =================================
        // STEP 1: DEPLOY ASSET OFTs
        // =================================
        
        console.log("Step 1: Deploying Asset OFTs...");
        
        wlfiOFT = new WLFIAssetOFT(
            "Wrapped LFI",
            "WLFI",
            LZ_ENDPOINT_SEPOLIA,
            owner
        );
        console.log("  WLFI OFT deployed at:", address(wlfiOFT));
        
        usd1OFT = new USD1AssetOFT(
            "USD1 Stablecoin",
            "USD1",
            LZ_ENDPOINT_SEPOLIA,
            owner
        );
        console.log("  USD1 OFT deployed at:", address(usd1OFT));
        
        // Mint test tokens for initial liquidity
        console.log("  Minting test tokens...");
        wlfiOFT.mint(deployer, 1_000_000 ether); // 1M WLFI
        usd1OFT.mint(deployer, 1_000_000 ether); // 1M USD1
        console.log("    Minted 1M WLFI and 1M USD1 to deployer");
        console.log("");
        
        // =================================
        // STEP 2: CREATE UNISWAP V3 POOL
        // =================================
        
        console.log("Step 2: Creating Uniswap V3 pool...");
        
        // For testnet, we'll create a simple pool
        // In production, you'd create this through Uniswap UI or dedicated script
        console.log("  Note: Pool creation requires separate transaction");
        console.log("  Use Uniswap V3 interface or create-pool script");
        console.log("  WLFI address:", address(wlfiOFT));
        console.log("  USD1 address:", address(usd1OFT));
        console.log("");
        
        // Placeholder - you'll need to set this after pool creation
        WLFI_USD1_POOL = address(0); // Set after pool creation
        
        // =================================
        // STEP 3: DEPLOY EAGLE OVAULT
        // =================================
        
        console.log("Step 3: Deploying EagleOVault...");
        
        vault = new EagleOVault(
            address(wlfiOFT),           // WLFI token
            address(usd1OFT),           // USD1 token
            WLFI_PRICE_FEED,            // WLFI price feed (mock)
            USD1_PRICE_FEED,            // USD1 price feed (mock)
            WLFI_USD1_POOL,             // Uniswap V3 pool
            UNISWAP_V3_ROUTER           // Uniswap router
        );
        console.log("  EagleOVault deployed at:", address(vault));
        console.log("");
        
        // =================================
        // STEP 4: CONFIGURE VAULT ROLES
        // =================================
        
        console.log("Step 4: Configuring vault roles...");
        
        vault.setManager(manager);
        console.log("  Manager set to:", manager);
        
        vault.setKeeper(keeper);
        console.log("  Keeper set to:", keeper);
        
        vault.setEmergencyAdmin(emergencyAdmin);
        console.log("  Emergency Admin set to:", emergencyAdmin);
        
        vault.setPerformanceFeeRecipient(performanceFeeRecipient);
        console.log("  Performance Fee Recipient set to:", performanceFeeRecipient);
        console.log("");
        
        // =================================
        // STEP 5: DEPLOY EAGLE SHARE OFT
        // =================================
        
        console.log("Step 5: Deploying EagleShareOFT (hub)...");
        
        shareOFT = new EagleShareOFT(
            "Eagle Vault Shares",
            "vEAGLE",
            LZ_ENDPOINT_SEPOLIA,
            owner
        );
        console.log("  EagleShareOFT deployed at:", address(shareOFT));
        console.log("");
        
        // =================================
        // STEP 6: DEPLOY EAGLE VAULT WRAPPER
        // =================================
        
        console.log("Step 6: Deploying EagleVaultWrapper...");
        
        wrapper = new EagleVaultWrapper(
            address(vault),      // Vault shares (vEAGLE from vault)
            address(shareOFT),   // OFT token
            feeRecipient,        // Fee recipient
            owner                // Owner
        );
        console.log("  EagleVaultWrapper deployed at:", address(wrapper));
        console.log("");
        
        // =================================
        // STEP 7: DEPLOY EAGLE OVAULT COMPOSER
        // =================================
        
        console.log("Step 7: Deploying EagleOVaultComposer...");
        
        composer = new EagleOVaultComposer(
            address(vault),
            address(wlfiOFT),    // Asset OFT
            address(shareOFT)    // Share OFT
        );
        console.log("  EagleOVaultComposer deployed at:", address(composer));
        console.log("");
        
        // =================================
        // STEP 8: CONFIGURE PERMISSIONS
        // =================================
        
        console.log("Step 8: Configuring permissions...");
        
        // Grant wrapper mint/burn permissions on ShareOFT
        shareOFT.setMinter(address(wrapper), true);
        console.log("  Wrapper granted mint/burn on ShareOFT");
        
        // Whitelist composer in wrapper (no fees for cross-chain ops)
        wrapper.setWhitelist(address(composer), true);
        console.log("  Composer whitelisted in Wrapper");
        
        // Whitelist owner/deployer in wrapper
        wrapper.setWhitelist(owner, true);
        console.log("  Owner whitelisted in Wrapper");
        
        // Set wrapper fees
        wrapper.setFees(100, 200); // 1% wrap, 2% unwrap
        console.log("  Wrapper fees set: 1% wrap, 2% unwrap");
        console.log("");
        
        // =================================
        // STEP 9: APPROVE VAULT TOKENS
        // =================================
        
        console.log("Step 9: Setting up token approvals...");
        
        // Approve vault to spend WLFI/USD1 for initial deposit
        wlfiOFT.approve(address(vault), type(uint256).max);
        usd1OFT.approve(address(vault), type(uint256).max);
        console.log("  Vault approved to spend WLFI and USD1");
        console.log("");
        
        vm.stopBroadcast();
        
        // =================================
        // DEPLOYMENT SUMMARY
        // =================================
        
        console.log("=================================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("=================================================");
        console.log("");
        console.log("DEPLOYED CONTRACTS:");
        console.log("-------------------");
        console.log("WLFI OFT:        ", address(wlfiOFT));
        console.log("USD1 OFT:        ", address(usd1OFT));
        console.log("EagleOVault:     ", address(vault));
        console.log("EagleShareOFT:   ", address(shareOFT));
        console.log("VaultWrapper:    ", address(wrapper));
        console.log("OVaultComposer:  ", address(composer));
        console.log("");
        console.log("ROLES:");
        console.log("------");
        console.log("Owner:           ", owner);
        console.log("Manager:         ", manager);
        console.log("Keeper:          ", keeper);
        console.log("Emergency Admin: ", emergencyAdmin);
        console.log("Fee Recipient:   ", feeRecipient);
        console.log("");
        console.log("NEXT STEPS:");
        console.log("-----------");
        console.log("1. Create Uniswap V3 pool for WLFI/USD1");
        console.log("2. Add initial liquidity to pool");
        console.log("3. Update vault with pool address: vault.updatePool()");
        console.log("4. Make initial deposit to vault");
        console.log("5. Deploy on Arbitrum Sepolia (spoke chain)");
        console.log("6. Wire LayerZero peers between chains");
        console.log("7. Configure ShareOFT fees on spoke chains");
        console.log("");
        console.log("SAVE THESE ADDRESSES!");
        console.log("=================================================");
        
        // Save to file
        _saveDeployment();
    }
    
    function _saveDeployment() internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "deployer", deployer);
        vm.serializeAddress(json, "owner", owner);
        vm.serializeAddress(json, "wlfiOFT", address(wlfiOFT));
        vm.serializeAddress(json, "usd1OFT", address(usd1OFT));
        vm.serializeAddress(json, "vault", address(vault));
        vm.serializeAddress(json, "shareOFT", address(shareOFT));
        vm.serializeAddress(json, "wrapper", address(wrapper));
        string memory finalJson = vm.serializeAddress(json, "composer", address(composer));
        
        vm.writeJson(finalJson, "./deployments/sepolia-complete.json");
        console.log("");
        console.log("Deployment saved to: deployments/sepolia-complete.json");
    }
}

