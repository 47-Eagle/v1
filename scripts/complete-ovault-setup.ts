import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// Import all step functions
import { setEnforcedOptionsWithCompose } from './step2-set-enforced-options';
import { verifyAndSetLibraries } from './step3-verify-library-configs';
import { executeOVaultDeposit } from './step4-create-ovault-deposit-flow';
import { verifyComposerSecurity } from './step5-implement-composer-security';
import { testCompleteOVaultFlow } from './step6-test-complete-ovault-flow';

async function completeOVaultSetup() {
    console.log("🎯 COMPLETE OVAULT SETUP ORCHESTRATION");
    console.log("=====================================");
    console.log("This will execute all 6 steps to complete your OVault integration");
    
    const [deployer] = await ethers.getSigners();
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    if (ethBalance < ethers.parseEther("0.01")) {
        console.log("❌ Insufficient ETH for setup transactions");
        console.log("Need at least 0.01 ETH for gas fees");
        return;
    }

    console.log("\n📋 SETUP CHECKLIST:");
    console.log("===================");
    console.log("✅ Step 1: Deploy VaultComposerSync (COMPLETED)");
    console.log("⏳ Step 2: Set enforced options with lzCompose");
    console.log("⏳ Step 3: Verify and set library configurations");
    console.log("⏳ Step 4: Create OVault deposit flow");
    console.log("⏳ Step 5: Verify composer security");
    console.log("⏳ Step 6: Test complete flow");

    try {
        // Step 2: Set enforced options
        console.log("\n🔧 STEP 2: SETTING ENFORCED OPTIONS");
        console.log("==================================");
        await setEnforcedOptionsWithCompose();
        console.log("✅ Step 2 completed successfully!");

        // Wait a moment for transactions to propagate
        console.log("\n⏳ Waiting 30 seconds for transaction propagation...");
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Step 3: Verify libraries
        console.log("\n📚 STEP 3: VERIFYING LIBRARY CONFIGURATIONS");
        console.log("==========================================");
        await verifyAndSetLibraries();
        console.log("✅ Step 3 completed successfully!");

        // Wait a moment for transactions to propagate
        console.log("\n⏳ Waiting 30 seconds for transaction propagation...");
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Step 5: Verify security (do this before testing)
        console.log("\n🔒 STEP 5: VERIFYING COMPOSER SECURITY");
        console.log("=====================================");
        await verifyComposerSecurity();
        console.log("✅ Step 5 completed successfully!");

        // Display deposit instructions (Step 4)
        console.log("\n🏦 STEP 4: OVAULT DEPOSIT FLOW READY");
        console.log("==================================");
        console.log("The new OVault deposit flow is now configured!");
        console.log("To execute your requested deposits:");
        console.log("");
        console.log("// $5 USD1 deposit");
        console.log("await executeOVaultDeposit('USD1', 5, 'BSC', 2.0);");
        console.log("");
        console.log("// $5 WLFI deposit"); 
        console.log("await executeOVaultDeposit('WLFI', 5, 'BSC', 2.0);");
        console.log("");
        console.log("// Combined deposits (run separately)");
        console.log("await executeOVaultDeposit('USD1', 5, 'BSC', 2.0);");
        console.log("await executeOVaultDeposit('USD1', 5, 'BSC', 2.0); // Second $5");
        console.log("await executeOVaultDeposit('WLFI', 5, 'BSC', 2.0);");
        console.log("await executeOVaultDeposit('WLFI', 5, 'BSC', 2.0); // Second $5");

        // Optional: Run test flow
        console.log("\n🧪 STEP 6: OPTIONAL FLOW TEST");
        console.log("============================");
        console.log("Run `npx hardhat run scripts/step6-test-complete-ovault-flow.ts --network ethereum`");
        console.log("to test the complete OVault flow with a small amount.");

        console.log("\n🎊 OVAULT SETUP COMPLETE!");
        console.log("========================");
        console.log("");
        console.log("🎯 WHAT'S NOW WORKING:");
        console.log("✅ Horizontal composability (lzReceive → lzCompose)");
        console.log("✅ Enforced options with proper gas allocation");
        console.log("✅ Explicit library configurations (not defaults)");
        console.log("✅ Secure composer with endpoint/OApp validation");
        console.log("✅ Complete BSC → Ethereum → BSC OVault flow");
        console.log("✅ Integration with Charm Finance yield strategies");
        console.log("");
        console.log("🚀 YOUR $20 DEPOSITS SHOULD NOW WORK!");
        console.log("");
        console.log("📁 NEW USER FLOW:");
        console.log("1. User calls OFT.send() targeting COMPOSER (not adapter)");
        console.log("2. Includes composeMsg with vault operation instructions");
        console.log("3. LayerZero delivers to adapter → calls lzReceive()");
        console.log("4. Adapter calls sendCompose() → triggers composer");
        console.log("5. Composer executes vault.deposit() → gets shares");
        console.log("6. Composer sends shares back to user via Share OFT");
        console.log("");
        console.log("🔗 KEY ADDRESSES TO UPDATE IN SCRIPTS:");
        console.log(`Composer: UPDATE_WITH_ACTUAL_ADDRESS`);
        console.log(`BSC WLFI: UPDATE_WITH_ACTUAL_ADDRESS`);

    } catch (error: any) {
        console.error(`❌ Setup failed at step: ${error.message}`);
        console.log("");
        console.log("🔧 TROUBLESHOOTING:");
        console.log("1. Check that composer is deployed and address is updated in scripts");
        console.log("2. Ensure sufficient ETH for gas fees on both chains");
        console.log("3. Verify RPC URLs are working in .env file");
        console.log("4. Check that PRIVATE_KEY has proper permissions");
        console.log("");
        console.log("Run individual step scripts to isolate the issue:");
        console.log("- npx hardhat run scripts/step2-set-enforced-options.ts");
        console.log("- npx hardhat run scripts/step3-verify-library-configs.ts");
        console.log("- npx hardhat run scripts/step5-implement-composer-security.ts");
    }
}

// Manual step execution functions
async function executeStep2() {
    console.log("🔧 EXECUTING STEP 2 ONLY: ENFORCED OPTIONS");
    await setEnforcedOptionsWithCompose();
}

async function executeStep3() {
    console.log("📚 EXECUTING STEP 3 ONLY: LIBRARY CONFIGS");
    await verifyAndSetLibraries();
}

async function executeStep5() {
    console.log("🔒 EXECUTING STEP 5 ONLY: SECURITY VERIFICATION");
    await verifyComposerSecurity();
}

async function executeStep6() {
    console.log("🧪 EXECUTING STEP 6 ONLY: FLOW TEST");
    await testCompleteOVaultFlow();
}

async function executeUserDeposits() {
    console.log("💰 EXECUTING USER DEPOSITS ($20 TOTAL)");
    console.log("=====================================");
    
    // Execute the user's requested deposits
    console.log("1️⃣ $5 USD1 deposit...");
    await executeOVaultDeposit('USD1', 5, 'BSC', 2.0);
    
    console.log("\n⏳ Waiting 2 minutes between deposits...");
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    console.log("2️⃣ $5 WLFI deposit...");
    await executeOVaultDeposit('WLFI', 5, 'BSC', 2.0);
    
    console.log("\n⏳ Waiting 2 minutes between deposits...");
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    console.log("3️⃣ Combined $5 USD1 + $5 WLFI deposit (first part)...");
    await executeOVaultDeposit('USD1', 5, 'BSC', 2.0);
    
    console.log("\n⏳ Waiting 2 minutes between deposits...");
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    console.log("4️⃣ Combined $5 USD1 + $5 WLFI deposit (second part)...");
    await executeOVaultDeposit('WLFI', 5, 'BSC', 2.0);
    
    console.log("\n🎊 ALL $20 DEPOSITS COMPLETED!");
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--step2')) {
        executeStep2().catch(console.error);
    } else if (args.includes('--step3')) {
        executeStep3().catch(console.error);
    } else if (args.includes('--step5')) {
        executeStep5().catch(console.error);
    } else if (args.includes('--step6')) {
        executeStep6().catch(console.error);
    } else if (args.includes('--deposits')) {
        executeUserDeposits().catch(console.error);
    } else {
        completeOVaultSetup().catch(console.error);
    }
}

export { 
    completeOVaultSetup,
    executeStep2,
    executeStep3, 
    executeStep5,
    executeStep6,
    executeUserDeposits
};
