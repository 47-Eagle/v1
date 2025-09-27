// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { EagleShareOFT } from "../layerzero-ovault/EagleShareOFT.sol";

/**
 * @title DeterministicEagleFactory
 * @notice Factory for deterministic cross-chain deployment of $EAGLE tokens
 * @dev Uses CREATE2 to ensure same address on all LayerZero chains
 */
contract DeterministicEagleFactory {
    event EagleDeployed(
        address indexed eagle,
        bytes32 indexed salt,
        string name,
        string symbol,
        address indexed lzEndpoint
    );

    /**
     * @notice Deploy $EAGLE token with deterministic address
     * @param salt Deterministic salt for CREATE2
     * @param name Token name (should be same across chains)
     * @param symbol Token symbol (should be same across chains)
     * @param lzEndpoint LayerZero endpoint for this chain
     * @param delegate Initial owner/delegate
     * @return eagle Address of deployed $EAGLE token
     */
    function deployEagle(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) external returns (address eagle) {
        require(lzEndpoint != address(0), "Invalid LZ endpoint");
        require(delegate != address(0), "Invalid delegate");
        require(bytes(name).length > 0, "Empty name");
        require(bytes(symbol).length > 0, "Empty symbol");

        bytes memory bytecode = abi.encodePacked(
            type(EagleShareOFT).creationCode,
            abi.encode(name, symbol, lzEndpoint, delegate)
        );

        assembly {
            eagle := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }

        require(eagle != address(0), "Eagle deployment failed");
        
        emit EagleDeployed(eagle, salt, name, symbol, lzEndpoint);
    }

    /**
     * @notice Predict the address of $EAGLE token before deployment
     * @param salt Deterministic salt for CREATE2
     * @param name Token name
     * @param symbol Token symbol
     * @param lzEndpoint LayerZero endpoint for this chain
     * @param delegate Initial owner/delegate
     * @return Predicted address of $EAGLE token
     */
    function predictEagleAddress(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) external view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(
                    type(EagleShareOFT).creationCode,
                    abi.encode(name, symbol, lzEndpoint, delegate)
                ))
            )
        );
        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Standard salt for $EAGLE deployments
     * @dev Using this salt ensures same address across all chains
     */
    function getStandardSalt() external pure returns (bytes32) {
        return keccak256("EAGLE_SHARE_OFT_V1");
    }

    /**
     * @notice Check if $EAGLE is already deployed at predicted address
     * @param salt Salt used for prediction
     * @param name Token name
     * @param symbol Token symbol
     * @param lzEndpoint LayerZero endpoint
     * @param delegate Owner/delegate address
     * @return True if already deployed
     */
    function isEagleDeployed(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) external view returns (bool) {
        address predicted = this.predictEagleAddress(salt, name, symbol, lzEndpoint, delegate);
        return predicted.code.length > 0;
    }
}
