// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { EagleShareOFT } from "../layerzero/oft/EagleShareOFT.sol";
import { IChainRegistry } from "../interfaces/IChainRegistry.sol";

/**
 * @title DeterministicEagleFactory
 * @notice Factory for deterministic cross-chain deployment of $EAGLE tokens
 * @dev Uses Arachnid's CREATE2 factory (0x4e59b44847b379578588920cA78FbF26c0B4956C)
 *      for deterministic deployment with same address on all chains
 * 
 * KEY FEATURES:
 * - Uses external CREATE2 factory (deployed on 100+ chains)
 * - Integrates with EagleRegistry for LayerZero V2 endpoints
 * - Same address across all supported chains
 * - Predictable addresses before deployment
 */

// Arachnid's Deterministic Deployment Proxy interface
interface ICREATE2Factory {
    function deploy(bytes memory bytecode, bytes32 salt) external returns (address);
}

contract DeterministicEagleFactory {
    // =================================
    // IMMUTABLES & CONSTANTS
    // =================================
    
    /// @notice Arachnid's CREATE2 factory (deployed on 100+ chains at same address)
    ICREATE2Factory public constant CREATE2_FACTORY = ICREATE2Factory(0x4e59b44847b379578588920cA78FbF26c0B4956C);
    
    /// @notice EagleRegistry for chain configurations and LayerZero endpoints
    IChainRegistry public immutable registry;
    
    // =================================
    // EVENTS
    // =================================
    
    event EagleDeployed(
        address indexed eagle,
        bytes32 indexed salt,
        string name,
        string symbol,
        address indexed lzEndpoint,
        uint16 chainId
    );
    
    event DeploymentPredicted(
        address indexed predictedAddress,
        bytes32 indexed salt,
        uint16 chainId
    );

    // =================================
    // ERRORS
    // =================================
    
    error InvalidEndpoint();
    error InvalidDelegate();
    error InvalidName();
    error InvalidSymbol();
    error DeploymentFailed();
    error ChainNotSupported(uint16 chainId);
    error InvalidRegistry();

    // =================================
    // CONSTRUCTOR
    // =================================
    
    /**
     * @notice Initialize factory with EagleRegistry
     * @param _registry Address of EagleRegistry contract
     */
    constructor(address _registry) {
        if (_registry == address(0)) revert InvalidRegistry();
        registry = IChainRegistry(_registry);
    }

    // =================================
    // DEPLOYMENT FUNCTIONS
    // =================================
    
    /**
     * @notice Deploy $EAGLE token with deterministic address using external CREATE2 factory
     * @param salt Deterministic salt for CREATE2
     * @param name Token name (should be same across chains)
     * @param symbol Token symbol (should be same across chains)
     * @param delegate Initial owner/delegate
     * @return eagle Address of deployed $EAGLE token
     * 
     * @dev LayerZero endpoint is fetched from EagleRegistry based on current chain
     */
    function deployEagle(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address delegate
    ) external returns (address eagle) {
        // Validate inputs
        if (delegate == address(0)) revert InvalidDelegate();
        if (bytes(name).length == 0) revert InvalidName();
        if (bytes(symbol).length == 0) revert InvalidSymbol();

        // Get current chain ID and verify it's supported
        uint16 currentChainId = registry.getCurrentChainId();
        if (!registry.isChainSupported(currentChainId)) {
            revert ChainNotSupported(currentChainId);
        }

        // Get LayerZero endpoint from registry
        address lzEndpoint = registry.getLayerZeroEndpoint(currentChainId);
        if (lzEndpoint == address(0)) revert InvalidEndpoint();

        // Prepare bytecode for deployment
        bytes memory bytecode = abi.encodePacked(
            type(EagleShareOFT).creationCode,
            abi.encode(name, symbol, lzEndpoint, delegate)
        );

        // Deploy using external CREATE2 factory
        eagle = CREATE2_FACTORY.deploy(bytecode, salt);
        
        if (eagle == address(0)) revert DeploymentFailed();
        
        emit EagleDeployed(eagle, salt, name, symbol, lzEndpoint, currentChainId);
    }
    
    /**
     * @notice Deploy $EAGLE token with explicit LayerZero endpoint (advanced usage)
     * @param salt Deterministic salt for CREATE2
     * @param name Token name
     * @param symbol Token symbol
     * @param lzEndpoint LayerZero endpoint address (override registry)
     * @param delegate Initial owner/delegate
     * @return eagle Address of deployed $EAGLE token
     */
    function deployEagleWithEndpoint(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) external returns (address eagle) {
        if (lzEndpoint == address(0)) revert InvalidEndpoint();
        if (delegate == address(0)) revert InvalidDelegate();
        if (bytes(name).length == 0) revert InvalidName();
        if (bytes(symbol).length == 0) revert InvalidSymbol();

        bytes memory bytecode = abi.encodePacked(
            type(EagleShareOFT).creationCode,
            abi.encode(name, symbol, lzEndpoint, delegate)
        );

        eagle = CREATE2_FACTORY.deploy(bytecode, salt);
        
        if (eagle == address(0)) revert DeploymentFailed();
        
        uint16 currentChainId = registry.getCurrentChainId();
        emit EagleDeployed(eagle, salt, name, symbol, lzEndpoint, currentChainId);
    }

    // =================================
    // PREDICTION FUNCTIONS
    // =================================
    
    /**
     * @notice Predict the address of $EAGLE token before deployment (using registry)
     * @param salt Deterministic salt for CREATE2
     * @param name Token name
     * @param symbol Token symbol
     * @param delegate Initial owner/delegate
     * @return Predicted address of $EAGLE token on current chain
     */
    function predictEagleAddress(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address delegate
    ) public view returns (address) {
        uint16 currentChainId = registry.getCurrentChainId();
        address lzEndpoint = registry.getLayerZeroEndpoint(currentChainId);
        
        return _predictAddress(salt, name, symbol, lzEndpoint, delegate);
    }
    
    /**
     * @notice Predict address with explicit endpoint (for cross-chain prediction)
     * @param salt Deterministic salt
     * @param name Token name
     * @param symbol Token symbol
     * @param lzEndpoint LayerZero endpoint address
     * @param delegate Initial owner/delegate
     * @return Predicted address
     */
    function predictEagleAddressWithEndpoint(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) public pure returns (address) {
        return _predictAddress(salt, name, symbol, lzEndpoint, delegate);
    }
    
    /**
     * @notice Internal function to predict CREATE2 address
     * @dev Uses Arachnid's factory address for prediction
     */
    function _predictAddress(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) internal pure returns (address) {
        bytes32 bytecodeHash = keccak256(abi.encodePacked(
            type(EagleShareOFT).creationCode,
            abi.encode(name, symbol, lzEndpoint, delegate)
        ));
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(CREATE2_FACTORY),
                salt,
                bytecodeHash
            )
        );
        
        return address(uint160(uint256(hash)));
    }

    // =================================
    // UTILITY FUNCTIONS
    // =================================
    
    /**
     * @notice Standard salt for $EAGLE deployments
     * @dev Using this salt ensures same address across all chains
     *      Format: keccak256("EAGLE_SHARE_OFT_V1")
     */
    function getStandardSalt() external pure returns (bytes32) {
        return keccak256("EAGLE_SHARE_OFT_V1");
    }
    
    /**
     * @notice Generate custom salt from string
     * @param saltString Custom salt string
     * @return Salt bytes32
     */
    function generateSalt(string memory saltString) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(saltString));
    }

    /**
     * @notice Check if $EAGLE is already deployed at predicted address
     * @param salt Salt used for prediction
     * @param name Token name
     * @param symbol Token symbol
     * @param delegate Owner/delegate address
     * @return True if already deployed
     */
    function isEagleDeployed(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address delegate
    ) external view returns (bool) {
        address predicted = predictEagleAddress(salt, name, symbol, delegate);
        return predicted.code.length > 0;
    }
    
    /**
     * @notice Check if $EAGLE is deployed with explicit endpoint
     * @param salt Salt used
     * @param name Token name
     * @param symbol Token symbol
     * @param lzEndpoint LayerZero endpoint
     * @param delegate Delegate address
     * @return True if deployed
     */
    function isEagleDeployedWithEndpoint(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) external view returns (bool) {
        address predicted = predictEagleAddressWithEndpoint(salt, name, symbol, lzEndpoint, delegate);
        return predicted.code.length > 0;
    }

    // =================================
    // REGISTRY INTEGRATION
    // =================================
    
    /**
     * @notice Get LayerZero endpoint for current chain from registry
     * @return LayerZero endpoint address
     */
    function getCurrentLayerZeroEndpoint() external view returns (address) {
        uint16 chainId = registry.getCurrentChainId();
        return registry.getLayerZeroEndpoint(chainId);
    }
    
    /**
     * @notice Get LayerZero endpoint for specific chain
     * @param chainId Chain ID
     * @return LayerZero endpoint address
     */
    function getLayerZeroEndpoint(uint16 chainId) external view returns (address) {
        return registry.getLayerZeroEndpoint(chainId);
    }
    
    /**
     * @notice Check if chain is supported for deployment
     * @param chainId Chain ID to check
     * @return True if supported
     */
    function isChainSupported(uint16 chainId) external view returns (bool) {
        return registry.isChainSupported(chainId);
    }
    
    /**
     * @notice Get current chain ID from registry
     * @return Current chain ID
     */
    function getCurrentChainId() external view returns (uint16) {
        return registry.getCurrentChainId();
    }

    // =================================
    // MULTI-CHAIN PREDICTION
    // =================================
    
    /**
     * @notice Predict $EAGLE address on multiple chains
     * @param salt Deterministic salt
     * @param name Token name
     * @param symbol Token symbol
     * @param delegate Delegate address
     * @param chainIds Array of chain IDs to predict for
     * @return addresses Array of predicted addresses
     * 
     * @dev Useful for verifying same address across chains before deployment
     */
    function predictMultiChainAddresses(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address delegate,
        uint16[] memory chainIds
    ) external view returns (address[] memory addresses) {
        addresses = new address[](chainIds.length);
        
        for (uint256 i = 0; i < chainIds.length; i++) {
            address endpoint = registry.getLayerZeroEndpoint(chainIds[i]);
            addresses[i] = _predictAddress(salt, name, symbol, endpoint, delegate);
        }
    }
}
