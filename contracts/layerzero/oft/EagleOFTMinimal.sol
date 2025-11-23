// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleOFTMinimal
 * @notice Minimal LayerZero OFT for Eagle token
 * @dev Simple OFT implementation for Ethereum <-> Solana bridge
 *      Matches the simplicity of the Solana OFT implementation
 * 
 * Features:
 * - Standard ERC20 functionality
 * - LayerZero V2 cross-chain transfers
 * - 18 decimals (Ethereum standard)
 * - Converts to/from 9 decimals on Solana
 */
contract EagleOFTMinimal is OFT {
    /**
     * @notice Creates Eagle OFT on Ethereum Mainnet
     * @param _lzEndpoint LayerZero V2 Endpoint address
     * @param _owner Initial owner/delegate
     */
    constructor(
        address _lzEndpoint,
        address _owner
    ) OFT("Eagle", "EAGLE", _lzEndpoint, _owner) Ownable(_owner) {
        // No initial mint - tokens will be bridged from Solana
    }
    
    /**
     * @notice Returns the contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0-mainnet-minimal";
    }
}

