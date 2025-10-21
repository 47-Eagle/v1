// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleShareOFTAdapter
 * @notice LayerZero OFT adapter for vEAGLE vault shares
 * @dev Enables cross-chain transfers of vault shares using LayerZero OFT standard
 * 
 * IMPORTANT: This is a lockbox adapter (not mint-burn)
 * - Locks shares on hub chain when bridging out
 * - Unlocks shares on hub chain when bridging in
 * - Preserves totalSupply() of the vault share token
 * 
 * Compatible with LayerZero VaultComposerSync for omnichain vault operations
 */
contract EagleShareOFTAdapter is OFTAdapter {
    /**
     * @notice Creates OFT adapter for vault shares
     * @param _token The vEAGLE share token address (from EagleOVault)
     * @param _lzEndpoint LayerZero endpoint for this chain
     * @param _delegate Administrative address
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}

