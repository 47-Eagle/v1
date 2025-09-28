// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

/**
 * @title WLFIAssetOFT
 * @dev LayerZero Asset OFT for WLFI token
 * The asset that users deposit into the omnichain vault
 */
contract WLFIAssetOFT is OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        require(_lzEndpoint != address(0), "WLFIAssetOFT: endpoint cannot be zero address");
        require(_delegate != address(0), "WLFIAssetOFT: delegate cannot be zero address");
    }
}
