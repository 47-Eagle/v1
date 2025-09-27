// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IChainRegistry
 * @notice Interface for the universal chain registry deployed at same address on all chains
 * @dev Registry contains chain-specific configuration like LayerZero endpoints, EIDs, etc.
 */
interface IChainRegistry {
    struct ChainInfo {
        uint32 eid;              // LayerZero Endpoint ID
        address lzEndpoint;      // LayerZero V2 Endpoint address
        uint256 chainId;         // Chain ID
        bool active;             // Whether this chain is active
    }

    /**
     * @notice Get LayerZero endpoint for current chain
     * @return LayerZero V2 endpoint address
     */
    function getLZEndpoint() external view returns (address);

    /**
     * @notice Get LayerZero EID for current chain
     * @return LayerZero Endpoint ID
     */
    function getEID() external view returns (uint32);

    /**
     * @notice Get complete chain information for current chain
     * @return ChainInfo struct with all chain data
     */
    function getChainInfo() external view returns (ChainInfo memory);

    /**
     * @notice Get chain information for specific chain ID
     * @param chainId Target chain ID
     * @return ChainInfo struct for specified chain
     */
    function getChainInfoById(uint256 chainId) external view returns (ChainInfo memory);

    /**
     * @notice Set chain information (only owner)
     * @param chainId Chain ID to configure
     * @param eid LayerZero Endpoint ID
     * @param lzEndpoint LayerZero V2 Endpoint address
     * @param active Whether chain is active
     */
    function setChainInfo(
        uint256 chainId,
        uint32 eid,
        address lzEndpoint,
        bool active
    ) external;

    /**
     * @notice Check if a chain is supported
     * @param chainId Chain ID to check
     * @return True if chain is configured and active
     */
    function isChainSupported(uint256 chainId) external view returns (bool);

    /**
     * @notice Get all supported chain IDs
     * @return Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory);
}
