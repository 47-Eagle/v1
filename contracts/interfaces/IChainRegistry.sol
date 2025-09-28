// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IChainRegistry 
 * @notice Interface for the EagleRegistry deployed at same address on all chains
 * @dev Updated to match actual deployed registry contract ABI
 */
interface IChainRegistry {
    struct ChainConfig {
        uint16 chainId;
        string chainName;
        address wrappedNativeToken;
        string wrappedNativeSymbol;
        bool isActive;
    }

    /**
     * @notice Get current chain ID
     * @return Current chain ID as uint16
     */
    function getCurrentChainId() external view returns (uint16);

    /**
     * @notice Get LayerZero endpoint for specific chain
     * @param _chainId Chain ID (uint16)
     * @return LayerZero V2 endpoint address
     */
    function getLayerZeroEndpoint(uint16 _chainId) external view returns (address);

    /**
     * @notice Get LayerZero EID for specific chain ID
     * @param _chainId Chain ID (uint256)
     * @return LayerZero Endpoint ID
     */
    function getEidForChainId(uint256 _chainId) external view returns (uint32);

    /**
     * @notice Check if a chain is supported
     * @param _chainId Chain ID to check (uint16)
     * @return True if chain is configured and active
     */
    function isChainSupported(uint16 _chainId) external view returns (bool);

    /**
     * @notice Get chain configuration
     * @param _chainId Chain ID (uint16)
     * @return Chain configuration struct
     */
    function getChainConfig(uint16 _chainId) external view returns (ChainConfig memory);

    /**
     * @notice Get all supported chain IDs
     * @return Array of supported chain IDs (uint16[])
     */
    function getSupportedChains() external view returns (uint16[] memory);

    /**
     * @notice Get supported chain count
     * @return Number of supported chains
     */
    function getSupportedChainCount() external view returns (uint256);

    // Admin functions (only owner)
    function registerChain(
        uint16 _chainId,
        string memory _chainName, 
        address _wrappedNativeToken,
        string memory _wrappedNativeSymbol,
        bool _isActive
    ) external;

    function setLayerZeroEndpoint(uint16 _chainId, address _endpoint) external;
    function setChainIdToEid(uint256 _chainId, uint32 _eid) external;
    function setChainStatus(uint16 _chainId, bool _isActive) external;
    
    // Ownable
    function owner() external view returns (address);
}
