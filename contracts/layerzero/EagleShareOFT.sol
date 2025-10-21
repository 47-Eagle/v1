// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleShareOFT
 * @notice LayerZero OFT for vEAGLE shares on spoke chains
 * @dev Deploy ONLY on spoke chains (not on hub)
 * 
 * WARNING: NEVER mint shares directly in this contract!
 * Shares must ONLY be minted by the vault contract on the hub chain
 * to maintain the correct share-to-asset conversion rate.
 * 
 * Shares are bridged FROM hub (via ShareOFTAdapter) TO spoke chains.
 */
contract EagleShareOFT is OFT {
    /**
     * @notice Creates share OFT for spoke chains
     * @param _name Token name (e.g., "Eagle Vault Shares")
     * @param _symbol Token symbol (e.g., "vEAGLE")
     * @param _lzEndpoint LayerZero endpoint
     * @param _delegate Admin address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        // WARNING: Do NOT mint shares here - breaks vault accounting
        // Shares are minted by the vault on hub chain only
    }
}

