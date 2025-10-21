// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WLFIAdapter
 * @notice LayerZero OFT Adapter for existing WLFI token
 * @dev Wraps the existing WLFI ERC20 token for cross-chain transfers
 * 
 * Use this if WLFI already exists as an ERC20 token.
 * If WLFI doesn't exist yet, use WLFIAssetOFT instead.
 * 
 * Deploy on hub chain (Ethereum) to enable cross-chain WLFI transfers.
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

