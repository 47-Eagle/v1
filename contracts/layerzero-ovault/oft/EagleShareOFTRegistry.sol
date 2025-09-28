// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { IChainRegistry } from "../interfaces/IChainRegistry.sol";

/**
 * @title EagleShareOFTRegistry
 * @dev Registry-based LayerZero OFT for uniform cross-chain addresses
 * 
 * REVOLUTIONARY ARCHITECTURE:
 * - Uses universal registry to get chain-specific LayerZero endpoints
 * - Same constructor parameters = same bytecode = same address everywhere
 * - Registry deployed at 0x472656c76f45E8a8a63FffD32aB5888898EeA91E on all chains
 * - Enables vanity addresses like 0x4747...EA91E across all chains!
 * 
 * CONSTRUCTOR FLOW:
 * 1. Query registry for chain-specific LayerZero endpoint
 * 2. Pass endpoint to OFT parent constructor
 * 3. Same registry address = same bytecode everywhere
 * 4. CREATE2 with same salt = same address on all chains! 🎯
 */
contract EagleShareOFTRegistry is OFT {
    /// @dev Universal registry (same address on all chains)
    IChainRegistry public immutable CHAIN_REGISTRY;
    
    /// @dev Chain EID cached from registry
    uint32 public immutable CHAIN_EID;

    event RegistryConfigured(address indexed registry, address lzEndpoint, uint32 eid, uint256 chainId);

    error ZeroAddress();
    error ChainNotConfigured();
    error RegistryCallFailed();

    /**
     * @notice Creates registry-based Eagle Share OFT with uniform addresses
     * @param _name Token name (identical on all chains)
     * @param _symbol Token symbol (identical on all chains) 
     * @param _registry Universal registry address (identical on all chains)
     * @param _delegate Contract delegate (identical on all chains)
     */
    constructor(
        string memory _name,        // "Eagle Vault Shares"
        string memory _symbol,      // "EAGLE"
        address _registry,          // 0x472656c76f45E8a8a63FffD32aB5888898EeA91E
        address _delegate           // Your deployer address
    ) OFT(_name, _symbol, _getEndpointFromRegistry(_registry), _delegate) Ownable(_delegate) {
        if (_registry == address(0)) revert ZeroAddress();
        if (_delegate == address(0)) revert ZeroAddress();
        
        CHAIN_REGISTRY = IChainRegistry(_registry);
        
        // Cache the chain EID for gas optimization
        CHAIN_EID = CHAIN_REGISTRY.getEID();
        
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
        
        // Query registry for chain-specific LayerZero endpoint
        try IChainRegistry(_registry).getLZEndpoint() returns (address endpoint) {
            if (endpoint == address(0)) revert ChainNotConfigured();
            return endpoint;
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
    function getChainConfig() external view returns (IChainRegistry.ChainInfo memory) {
        return CHAIN_REGISTRY.getChainInfo();
    }

    /**
     * @notice Verify this contract is using correct registry and endpoint
     * @return True if configuration is valid
     */
    function verifyConfiguration() external view returns (bool) {
        try CHAIN_REGISTRY.getLZEndpoint() returns (address registryEndpoint) {
            // Compare with the endpoint we were initialized with
            return registryEndpoint == address(endpoint);
        } catch {
            return false;
        }
    }
}
