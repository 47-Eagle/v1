// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

/**
 * @title EagleShareOFTTest
 * @dev Test version of registry-based Eagle Share OFT
 * 
 * This contract validates the architecture by:
 * - Using hardcoded LayerZero endpoint (same on all chains)
 * - Taking registry address as constructor parameter (same on all chains)
 * - Proving that same bytecode = same CREATE2 address
 */
contract EagleShareOFTTest is OFT {
    /// @dev Registry address (same on all chains for deterministic deployment)
    address public immutable TEST_REGISTRY;
    
    /// @dev Hardcoded LayerZero endpoint for testing
    address public constant LZ_ENDPOINT = 0x1a44076050125825900e736c501f859c50fE728c;

    event TestRegistrySet(address indexed registry);

    /**
     * @notice Test deployment with registry reference
     * @param _name Token name (same on all chains)
     * @param _symbol Token symbol (same on all chains) 
     * @param _registry Registry address (same on all chains)
     * @param _delegate Delegate address (same on all chains)
     */
    constructor(
        string memory _name,        
        string memory _symbol,      
        address _registry,          // Same registry address on all chains
        address _delegate           // Same delegate on all chains
    ) OFT(_name, _symbol, LZ_ENDPOINT, _delegate) Ownable(_delegate) {
        require(_registry != address(0), "EagleShareOFTTest: registry cannot be zero");
        require(_delegate != address(0), "EagleShareOFTTest: delegate cannot be zero");
        
        TEST_REGISTRY = _registry;
        
        emit TestRegistrySet(_registry);
    }

    /**
     * @notice Get the test registry address
     * @return Registry contract address
     */
    function getTestRegistry() external view returns (address) {
        return TEST_REGISTRY;
    }

    /**
     * @notice Get the hardcoded LayerZero endpoint
     * @return LayerZero endpoint address
     */
    function getLZEndpoint() external pure returns (address) {
        return LZ_ENDPOINT;
    }

    /**
     * @notice Verify this is the test version
     * @return True to indicate this is test contract
     */
    function isTestVersion() external pure returns (bool) {
        return true;
    }
}
