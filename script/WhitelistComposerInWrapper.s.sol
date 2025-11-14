// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";

interface IWrapper {
    function setWhitelist(address user, bool whitelisted) external;
    function isWhitelisted(address account) external view returns (bool);
}

/**
 * @notice Whitelist the Composer contract in the Wrapper (to avoid deposit fees)
 * @dev Run with: forge script script/WhitelistComposerInWrapper.s.sol --rpc-url $RPC_URL --broadcast
 */
contract WhitelistComposerInWrapper is Script {
    address constant WRAPPER = 0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5;
    address constant COMPOSER = 0x3A91B3e863C0bd6948088e8A0A9B1D22d6D05da9;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        IWrapper wrapper = IWrapper(WRAPPER);
        
        console.log("========================================");
        console.log("Whitelisting Composer in Wrapper");
        console.log("========================================");
        console.log("Wrapper:", address(wrapper));
        console.log("Composer:", COMPOSER);
        console.log("");
        
        // Check current status
        bool isWhitelisted = wrapper.isWhitelisted(COMPOSER);
        console.log("Current whitelist status:", isWhitelisted);
        
        if (!isWhitelisted) {
            console.log("\nAdding Composer to wrapper whitelist...");
            wrapper.setWhitelist(COMPOSER, true);
            console.log("SUCCESS: Composer whitelisted in wrapper!");
        } else {
            console.log("\nSUCCESS: Composer already whitelisted in wrapper");
        }
        
        vm.stopBroadcast();
        
        console.log("\n========================================");
        console.log("Done!");
        console.log("========================================");
    }
}

