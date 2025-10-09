// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleShareOFTSimple
 * @notice Simplified OFT for Eagle shares on spoke chains (no registry dependency)
 * @dev For Sonic and other spoke chains - represents vault shares cross-chain
 */
contract EagleShareOFTSimple is OFT {
    /**
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _lzEndpoint LayerZero endpoint on this chain
     * @param _delegate Owner address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        // Simple OFT - no registry needed
    }
}


