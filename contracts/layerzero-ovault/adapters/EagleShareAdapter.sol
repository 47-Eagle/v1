// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

/**
 * @title EagleShareAdapter  
 * @dev LayerZero Share OFT Adapter for Eagle Vault shares
 * Wraps vault shares (ERC4626 tokens) for cross-chain transfers
 * Deployed on the hub chain (Ethereum) only
 */
contract EagleShareAdapter is OFTAdapter {
    constructor(
        address _token,        // The vault share token (ERC4626)
        address _lzEndpoint,   // LayerZero endpoint
        address _delegate      // Contract owner/delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {
        require(_token != address(0), "EagleShareAdapter: token cannot be zero address");
        require(_lzEndpoint != address(0), "EagleShareAdapter: endpoint cannot be zero address");
        require(_delegate != address(0), "EagleShareAdapter: delegate cannot be zero address");
    }
}
