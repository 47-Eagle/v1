// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {EagleRegistry} from "../contracts/EagleRegistry.sol";

contract ConfigureRegistryAvalanche is Script {
    address constant REGISTRY = 0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e;

    // LayerZero V2 Endpoints
    address constant LZ_ETHEREUM = 0x1a44076050125825900e736c501f859c50fE728c;
    address constant LZ_ARBITRUM = 0x1a44076050125825900e736c501f859c50fE728c;
    address constant LZ_BASE = 0x1a44076050125825900e736c501f859c50fE728c;
    address constant LZ_BSC = 0x1a44076050125825900e736c501f859c50fE728c;
    address constant LZ_SONIC = 0x6F475642a6e85809B1c36Fa62763669b1b48DD5B;
    address constant LZ_AVALANCHE = 0x1a44076050125825900e736c501f859c50fE728c;

    // Wrapped Native Tokens
    address constant WETH_ETHEREUM = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant WETH_ARBITRUM = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant WETH_BASE = 0x4200000000000000000000000000000000000006;
    address constant WBNB_BSC = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address constant WS_SONIC = 0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38;
    address constant WAVAX_AVALANCHE = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    // LayerZero EIDs
    uint32 constant EID_ETHEREUM = 30101;
    uint32 constant EID_ARBITRUM = 30110;
    uint32 constant EID_BASE = 30184;
    uint32 constant EID_BSC = 30102;
    uint32 constant EID_SONIC = 30332;
    uint32 constant EID_AVALANCHE = 30106;

    function run() external {
        console.log("CONFIGURE: EagleRegistry on Avalanche");
        uint256 pk = vm.envUint("PRIVATE_KEY");
        require(block.chainid == 43114, "Must run on Avalanche");
        
        EagleRegistry registry = EagleRegistry(REGISTRY);
        console.log("Registry Owner:", registry.owner());
        
        vm.startBroadcast(pk);
        _registerChains(registry);
        _setEndpoints(registry);
        _setEIDs(registry);
        vm.stopBroadcast();
        
        console.log("CONFIGURATION COMPLETE!");
    }
    
    function _registerChains(EagleRegistry registry) internal {
        console.log("Registering chains...");
        try registry.registerChain(1, "Ethereum", WETH_ETHEREUM, "WETH", true) {
            console.log("[OK] Ethereum");
        } catch { console.log("[SKIP] Ethereum"); }
        
        try registry.registerChain(42161, "Arbitrum One", WETH_ARBITRUM, "WETH", true) {
            console.log("[OK] Arbitrum");
        } catch { console.log("[SKIP] Arbitrum"); }
        
        try registry.registerChain(8453, "Base", WETH_BASE, "WETH", true) {
            console.log("[OK] Base");
        } catch { console.log("[SKIP] Base"); }
        
        try registry.registerChain(56, "BNB Chain", WBNB_BSC, "WBNB", true) {
            console.log("[OK] BNB Chain");
        } catch { console.log("[SKIP] BNB Chain"); }

        try registry.registerChain(146, "Sonic", WS_SONIC, "wS", true) {
            console.log("[OK] Sonic");
        } catch { console.log("[SKIP] Sonic"); }

        try registry.registerChain(43114, "Avalanche", WAVAX_AVALANCHE, "WAVAX", true) {
            console.log("[OK] Avalanche");
        } catch { console.log("[SKIP] Avalanche"); }
    }
    
    function _setEndpoints(EagleRegistry registry) internal {
        console.log("Setting LayerZero endpoints...");
        registry.setLayerZeroEndpoint(1, LZ_ETHEREUM);
        registry.setLayerZeroEndpoint(42161, LZ_ARBITRUM);
        registry.setLayerZeroEndpoint(8453, LZ_BASE);
        registry.setLayerZeroEndpoint(56, LZ_BSC);
        registry.setLayerZeroEndpoint(146, LZ_SONIC);
        registry.setLayerZeroEndpoint(43114, LZ_AVALANCHE);
        console.log("[OK] All endpoints set");
    }
    
    function _setEIDs(EagleRegistry registry) internal {
        console.log("Setting EID mappings...");
        registry.setChainIdToEid(1, EID_ETHEREUM);
        registry.setChainIdToEid(42161, EID_ARBITRUM);
        registry.setChainIdToEid(8453, EID_BASE);
        registry.setChainIdToEid(56, EID_BSC);
        registry.setChainIdToEid(146, EID_SONIC);
        registry.setChainIdToEid(43114, EID_AVALANCHE);
        console.log("[OK] All EIDs set");
    }
}

