// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleShareOFT
 * @dev LayerZero OFT for Eagle Vault Shares
 * Deterministic deployment across all chains with vanity addresses
 */
contract EagleShareOFT is OFT {
    
    constructor(
        string memory _name,        // "Eagle Vault Shares" 
        string memory _symbol,      // "EAGLE"
        address _lzEndpoint,        // Chain-specific LayerZero endpoint
        address _delegate           // Contract owner/delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        require(_lzEndpoint != address(0), "EagleShareOFT: endpoint cannot be zero");
        require(_delegate != address(0), "EagleShareOFT: delegate cannot be zero");
    }

    /**
     * @notice Returns contract version for verification
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
