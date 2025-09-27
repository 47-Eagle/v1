import { ethers } from "hardhat";

async function checkFactory() {
    const factoryAddress = "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE";
    
    console.log("🔍 Checking CREATE2 Factory...");
    console.log(`📍 Address: ${factoryAddress}`);
    
    const code = await ethers.provider.getCode(factoryAddress);
    console.log(`📦 Code Length: ${code.length}`);
    console.log(`✅ Contract Exists: ${code !== "0x"}`);
    
    if (code === "0x") {
        console.log("❌ No contract found at factory address!");
        console.log("🔧 Please verify the factory address is correct");
    } else {
        console.log("✅ Factory contract exists");
        
        try {
            const factory = await ethers.getContractAt("ICREATE2Factory", factoryAddress);
            console.log("✅ Can connect to factory interface");
        } catch (error) {
            console.log(`❌ Interface mismatch: ${error}`);
        }
    }
}

checkFactory().catch(console.error);
