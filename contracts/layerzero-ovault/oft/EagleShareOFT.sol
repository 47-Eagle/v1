// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IChainRegistry } from "../../interfaces/IChainRegistry.sol";

/**
 * @title EagleShareOFT
 * @dev Registry-based LayerZero OFT for Eagle Vault Shares
 * 
 */
contract EagleShareOFT is OFT {
    /// @dev Universal registry (same address on all chains)
    IChainRegistry public immutable CHAIN_REGISTRY;
    
    /// @dev Chain EID cached from registry
    uint32 public immutable CHAIN_EID;

    event RegistryConfigured(address indexed registry, address lzEndpoint, uint32 eid, uint256 chainId);

    error ZeroAddress();
    error ChainNotConfigured();
    error RegistryCallFailed();

    /**
     * @notice Creates registry-based Eagle Share OFT with deterministic addresses
     * @param _name Token name (identical on all chains)
     * @param _symbol Token symbol (identical on all chains) 
     * @param _registry Universal registry address (identical on all chains)
     * @param _delegate Contract delegate (identical on all chains)
     */
    constructor(
        string memory _name,        // "Eagle"
        string memory _symbol,      // "EAGLE"
        address _registry,          // Registry address (same on all chains)
        address _delegate           // Your deployer address
    ) OFT(_name, _symbol, _getEndpointFromRegistry(_registry), _delegate) Ownable(_delegate) {
        if (_registry == address(0)) revert ZeroAddress();
        if (_delegate == address(0)) revert ZeroAddress();
        
        CHAIN_REGISTRY = IChainRegistry(_registry);
        
        // Cache the chain EID for gas optimization using current chain ID
        uint16 currentChainId = CHAIN_REGISTRY.getCurrentChainId();
        CHAIN_EID = uint32(CHAIN_REGISTRY.getEidForChainId(uint256(currentChainId)));
        
        emit RegistryConfigured(
            _registry, 
            _getEndpointFromRegistry(_registry),
            CHAIN_EID,
            block.chainid
        );
    }

    /**
     * @notice Internal helper to get LayerZero endpoint from registry
     * @param _registry Registry contract address
     * @return LayerZero endpoint address for current chain
     */
    function _getEndpointFromRegistry(address _registry) private view returns (address) {
        if (_registry == address(0)) revert ZeroAddress();
        
        try IChainRegistry(_registry).getCurrentChainId() returns (uint16 currentChainId) {
            // Query registry for chain-specific LayerZero endpoint using current chain ID
            try IChainRegistry(_registry).getLayerZeroEndpoint(currentChainId) returns (address endpoint) {
                if (endpoint == address(0)) revert ChainNotConfigured();
                return endpoint;
            } catch {
                revert RegistryCallFailed();
            }
        } catch {
            revert RegistryCallFailed();
        }
    }

    /**
     * @notice Get the registry address used by this contract
     * @return Registry contract address
     */
    function getRegistry() external view returns (address) {
        return address(CHAIN_REGISTRY);
    }

    /**
     * @notice Get the cached chain EID
     * @return LayerZero Endpoint ID for this chain
     */
    function getChainEID() external view returns (uint32) {
        return CHAIN_EID;
    }

    /**
     * @notice Get current chain configuration from registry
     * @return Chain configuration struct
     */
    function getChainConfig() external view returns (IChainRegistry.ChainConfig memory) {
        uint16 currentChainId = CHAIN_REGISTRY.getCurrentChainId();
        return CHAIN_REGISTRY.getChainConfig(currentChainId);
    }

    /**
     * @notice Verify this contract is using correct registry and endpoint
     * @return True if configuration is valid
     */
    function verifyConfiguration() external view returns (bool) {
        try CHAIN_REGISTRY.getCurrentChainId() returns (uint16 currentChainId) {
            try CHAIN_REGISTRY.getLayerZeroEndpoint(currentChainId) returns (address registryEndpoint) {
                // Compare with the endpoint we were initialized with
                return registryEndpoint == address(endpoint);
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    /**
     * @notice Returns contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}