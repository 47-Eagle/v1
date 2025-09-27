// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

/**
 * @title EagleShareOFTAdapter  
 * @dev LayerZero OVault Share OFT Adapter for Eagle Vault shares
 * This wraps the vault shares (ERC4626 tokens) to make them omnichain
 * Deployed on the hub chain (Ethereum) only
 * Follows LayerZero OVault specification for Share OFT Adapter
 */
contract EagleShareOFTAdapter is OFTAdapter {
    constructor(
        address _token,        // The vault share token (ERC4626)
        address _lzEndpoint,   // LayerZero endpoint
        address _delegate      // Contract owner/delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {
        require(_token != address(0), "EagleShareOFTAdapter: token cannot be zero address");
        require(_lzEndpoint != address(0), "EagleShareOFTAdapter: endpoint cannot be zero address");
        require(_delegate != address(0), "EagleShareOFTAdapter: delegate cannot be zero address");
    }
}
