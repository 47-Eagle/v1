// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WLFIAssetOFT
 * @notice LayerZero OFT for WLFI asset token
 * @dev Deploy on hub + spoke chains for cross-chain asset transfers
 * 
 * Use this if WLFI doesn't already exist as an ERC20 token.
 * If WLFI already exists, use WLFIAdapter instead.
 * 
 * The asset that users deposit into the omnichain vault.
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
        
        // NOTE: Uncomment for testing only - NOT for production
        // _mint(msg.sender, 1000000 ether); // 1M tokens for testing
    }
    
    /**
     * @notice Mint tokens (owner only, for testnet)
     * @dev Only for testnet deployment - remove in production
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

