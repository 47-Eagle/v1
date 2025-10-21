// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleAssetOFT
 * @notice LayerZero OFT for WLFI asset token
 * @dev Deploy on hub + spoke chains for cross-chain asset transfers
 * 
 * If WLFI is already an OFT, you can skip this contract and use the existing OFT.
 * If WLFI needs to be bridgeable, deploy this as the omnichain wrapper.
 */
contract EagleAssetOFT is OFT {
    /**
     * @notice Creates asset OFT
     * @param _name Token name (e.g., "WLFI Omnichain")
     * @param _symbol Token symbol (e.g., "WLFI")
     * @param _lzEndpoint LayerZero endpoint
     * @param _delegate Admin address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        // NOTE: Uncomment for testing only - NOT for production
        // _mint(msg.sender, 1000000 ether); // 1M tokens for testing
    }
}

