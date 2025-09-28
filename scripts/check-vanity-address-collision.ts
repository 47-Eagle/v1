import { ethers } from "hardhat";

/**
 * Check if the predicted vanity address already has code (salt collision)
 */

const PREDICTED_ADDRESS = "0x05C65AFC2bb154A0dE297Ce170B91E62741EE530";
const DESIRED_ADDRESS_PATTERN = "0x47...EA91E";

async function checkAddressCollision() {
    console.log("🔍 CHECKING ADDRESS COLLISION");
    console.log("=============================");
    console.log(`Predicted: ${PREDICTED_ADDRESS}`);
    console.log(`Desired: ${DESIRED_ADDRESS_PATTERN}`);
    
    try {
        // Check if address already has code
        const code = await ethers.provider.getCode(PREDICTED_ADDRESS);
        console.log(`\nCode at ${PREDICTED_ADDRESS}:`);
        
        if (code === "0x") {
            console.log("✅ Address is empty - no collision");
            
            // The issue is that our salt doesn't produce the desired vanity address
            console.log("\n💡 ISSUE IDENTIFIED:");
            console.log("   The salt was generated for old contract bytecode");
            console.log("   We updated the registry interface, changing the bytecode");
            console.log("   Need to generate new salt for current bytecode");
            
            // Let's also check if our desired vanity address exists
            console.log("\n🎯 Checking if desired vanity address exists...");
            
            // Since we don't know the exact address, let's see if we can find what salt would work
            console.log("   We need to either:");
            console.log("   1. Generate a new vanity salt for current bytecode");
            console.log("   2. Or deploy without vanity for now");
            
        } else {
            console.log(`❌ Address collision detected!`);
            console.log(`   Code length: ${code.length} characters`);
            console.log(`   This address already has a deployed contract`);
        }
        
    } catch (error) {
        console.log(`❌ Address check failed: ${error.message}`);
    }
}

checkAddressCollision()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
