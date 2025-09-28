// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

/**
 * @title WLFIAdapter
 * @dev LayerZero Asset OFT Adapter for WLFI token
 * Wraps the existing WLFI ERC20 token for cross-chain transfers
 */
contract WLFIAdapter is OFTAdapter {
    constructor(
        address _wlfiToken,    // The existing WLFI ERC20 token
        address _lzEndpoint,   // LayerZero endpoint
        address _delegate      // Contract owner/delegate
    ) OFTAdapter(_wlfiToken, _lzEndpoint, _delegate) Ownable(_delegate) {
        require(_wlfiToken != address(0), "WLFIAdapter: WLFI token cannot be zero address");
        require(_lzEndpoint != address(0), "WLFIAdapter: endpoint cannot be zero address");
        require(_delegate != address(0), "WLFIAdapter: delegate cannot be zero address");
    }
}
