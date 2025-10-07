// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title MockEndpoint
 * @notice Mock LayerZero endpoint for testing
 */
contract MockEndpoint {
    mapping(address => mapping(uint32 => bytes32)) public peers;
    
    function delegates(address) external pure returns (address) {
        return address(0);
    }
    
    function setDelegate(address) external pure {}
    
    function eid() external pure returns (uint32) {
        return 40161; // Mock EID
    }
}

