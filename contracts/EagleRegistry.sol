// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleRegistry
 * @notice Universal chain registry for EagleOVault ecosystem
 * @dev Provides chain-specific configurations for LayerZero deployments
 * 
 * KEY FEATURES:
 * - Deterministic deployment support (same address across chains)
 * - LayerZero endpoint management
 * - Chain configuration storage
 * - EID (Endpoint ID) mapping
 * - Multi-chain state management
 */
contract EagleRegistry is Ownable {
    
    // ================================
    // CONSTANTS
    // ================================
    
    uint256 public constant MAX_SUPPORTED_CHAINS = 50;
    
    // ================================
    // STRUCTS
    // ================================
    
    struct ChainConfig {
        uint16 chainId;
        string chainName;
        address wrappedNativeToken;
        string wrappedNativeSymbol;
        bool isActive;
    }
    
    // ================================
    // STATE VARIABLES
    // ================================
    
    // Chain configuration storage
    mapping(uint16 => ChainConfig) private chainConfigs;
    uint16[] private supportedChains;
    uint16 private currentChainId;
    
    // LayerZero endpoint management
    mapping(uint16 => address) public layerZeroEndpoints;
    
    // Chain ID to LayerZero EID mapping
    mapping(uint256 => uint32) public chainIdToEid;
    mapping(uint32 => uint256) public eidToChainId;
    
    // ================================
    // EVENTS
    // ================================
    
    event ChainRegistered(uint16 indexed chainId, string chainName);
    event ChainUpdated(uint16 indexed chainId);
    event ChainStatusChanged(uint16 indexed chainId, bool isActive);
    event CurrentChainSet(uint16 indexed chainId);
    event LayerZeroEndpointUpdated(uint16 indexed chainId, address endpoint);
    event ChainIdToEidUpdated(uint256 chainId, uint32 eid);
    
    // ================================
    // ERRORS
    // ================================
    
    error ChainAlreadyRegistered(uint16 chainId);
    error ChainNotRegistered(uint16 chainId);
    error TooManyChains();
    error ZeroAddress();
    
    // ================================
    // CONSTRUCTOR
    // ================================
    
    constructor(address _initialOwner) Ownable(_initialOwner) {
        if (_initialOwner == address(0)) revert ZeroAddress();
        
        // Set current chain ID based on block.chainid
        if (block.chainid == 1) {
            currentChainId = 1; // Ethereum
        } else if (block.chainid == 56) {
            currentChainId = 56; // BSC
        } else if (block.chainid == 137) {
            currentChainId = 137; // Polygon
        } else if (block.chainid == 42161) {
            currentChainId = 42161; // Arbitrum
        } else if (block.chainid == 8453) {
            currentChainId = 8453; // Base
        } else if (block.chainid == 43114) {
            currentChainId = 43114; // Avalanche
        } else if (block.chainid == 146) {
            currentChainId = 146; // Sonic
        } else {
            currentChainId = uint16(block.chainid); // Fallback
        }
        
        emit CurrentChainSet(currentChainId);
    }
    
    // ================================
    // ADMIN FUNCTIONS
    // ================================
    
    /**
     * @notice Register a new chain configuration
     * @param _chainId Chain ID (e.g., 1 for Ethereum)
     * @param _chainName Human-readable chain name
     * @param _wrappedNativeToken Address of wrapped native token (WETH, WBNB, etc.)
     * @param _wrappedNativeSymbol Symbol of wrapped native token
     * @param _isActive Whether chain is currently active
     */
    function registerChain(
        uint16 _chainId,
        string memory _chainName,
        address _wrappedNativeToken,
        string memory _wrappedNativeSymbol,
        bool _isActive
    ) external onlyOwner {
        if (_wrappedNativeToken == address(0)) revert ZeroAddress();
        if (chainConfigs[_chainId].chainId != 0) revert ChainAlreadyRegistered(_chainId);
        if (supportedChains.length >= MAX_SUPPORTED_CHAINS) revert TooManyChains();
        
        chainConfigs[_chainId] = ChainConfig({
            chainId: _chainId,
            chainName: _chainName,
            wrappedNativeToken: _wrappedNativeToken,
            wrappedNativeSymbol: _wrappedNativeSymbol,
            isActive: _isActive
        });
        
        supportedChains.push(_chainId);
        
        emit ChainRegistered(_chainId, _chainName);
    }
    
    /**
     * @notice Update LayerZero endpoint for a chain
     * @param _chainId Chain ID
     * @param _endpoint LayerZero endpoint address
     */
    function setLayerZeroEndpoint(uint16 _chainId, address _endpoint) external onlyOwner {
        if (_endpoint == address(0)) revert ZeroAddress();
        if (chainConfigs[_chainId].chainId == 0) revert ChainNotRegistered(_chainId);
        
        layerZeroEndpoints[_chainId] = _endpoint;
        
        emit LayerZeroEndpointUpdated(_chainId, _endpoint);
    }
    
    /**
     * @notice Set Chain ID to LayerZero EID mapping
     * @param _chainId Chain ID (standard chain ID)
     * @param _eid LayerZero Endpoint ID
     */
    function setChainIdToEid(uint256 _chainId, uint32 _eid) external onlyOwner {
        chainIdToEid[_chainId] = _eid;
        eidToChainId[_eid] = _chainId;
        
        emit ChainIdToEidUpdated(_chainId, _eid);
    }
    
    /**
     * @notice Update chain active status
     * @param _chainId Chain ID
     * @param _isActive Whether chain should be active
     */
    function setChainStatus(uint16 _chainId, bool _isActive) external onlyOwner {
        if (chainConfigs[_chainId].chainId == 0) revert ChainNotRegistered(_chainId);
        
        chainConfigs[_chainId].isActive = _isActive;
        
        emit ChainStatusChanged(_chainId, _isActive);
    }
    
    // ================================
    // VIEW FUNCTIONS
    // ================================
    
    /**
     * @notice Get current chain ID (the chain this registry is deployed on)
     * @return Current chain ID
     */
    function getCurrentChainId() external view returns (uint16) {
        return currentChainId;
    }
    
    /**
     * @notice Get LayerZero endpoint for a specific chain
     * @param _chainId Chain ID
     * @return LayerZero endpoint address
     */
    function getLayerZeroEndpoint(uint16 _chainId) external view returns (address) {
        return layerZeroEndpoints[_chainId];
    }
    
    /**
     * @notice Get LayerZero EID for a chain ID
     * @param _chainId Chain ID
     * @return LayerZero Endpoint ID
     */
    function getEidForChainId(uint256 _chainId) external view returns (uint32) {
        return chainIdToEid[_chainId];
    }
    
    /**
     * @notice Check if a chain is supported and registered
     * @param _chainId Chain ID
     * @return Whether chain is supported
     */
    function isChainSupported(uint16 _chainId) external view returns (bool) {
        return chainConfigs[_chainId].chainId != 0 && chainConfigs[_chainId].isActive;
    }
    
    /**
     * @notice Get complete configuration for a chain
     * @param _chainId Chain ID
     * @return Chain configuration struct
     */
    function getChainConfig(uint16 _chainId) external view returns (ChainConfig memory) {
        if (chainConfigs[_chainId].chainId == 0) revert ChainNotRegistered(_chainId);
        return chainConfigs[_chainId];
    }
    
    /**
     * @notice Get all supported chain IDs
     * @return Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint16[] memory) {
        return supportedChains;
    }
    
    /**
     * @notice Get total number of supported chains
     * @return Number of supported chains
     */
    function getSupportedChainCount() external view returns (uint256) {
        return supportedChains.length;
    }
}
