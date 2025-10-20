// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../contracts/EagleOVault.sol";

contract DeployVanityVault is Script {
    function run() external {
        address factory = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        bytes32 salt = 0x000000000000000000000000000000000000000000000000a400000002a45bb1;
        address expected = 0x4792348B352E1118DDC252664c977477f30EA91E;
        
        address wlfi = 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6;
        address usd1 = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;
        address usd1Feed = 0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d;
        address pool = 0x4637Ea6eCf7E16C99E67E941ab4d7d52eAc7c73d;
        address router = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
        address owner = msg.sender;
        
        console.log("=== Deploying Vanity Vault ===");
        console.log("Expected:", expected);
        console.log("Salt:", vm.toString(salt));
        
        vm.startBroadcast();
        
        // Get init code
        bytes memory creationCode = type(EagleOVault).creationCode;
        bytes memory initCode = abi.encodePacked(
            creationCode,
            abi.encode(wlfi, usd1, usd1Feed, pool, router, owner)
        );
        
        // Deploy via CREATE2
        (bool success, bytes memory data) = factory.call{gas: 30000000}(
            abi.encodeWithSignature("deploy(bytes,bytes32)", initCode, salt)
        );
        
        require(success, "CREATE2 deployment failed");
        address deployed = abi.decode(data, (address));
        
        console.log("Deployed to:", deployed);
        console.log("Match:", deployed == expected ? "YES" : "NO");
        
        vm.stopBroadcast();
    }
}

