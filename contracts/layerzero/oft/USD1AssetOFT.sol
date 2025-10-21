// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title USD1AssetOFT
 * @notice LayerZero OFT for USD1 asset token
 * @dev Deploy on hub + spoke chains for cross-chain asset transfers
 * 
 * Use this if USD1 doesn't already exist as an ERC20 token.
 * If USD1 already exists, use USD1Adapter instead.
 * 
 * The asset that users deposit into the omnichain vault.
 */
contract USD1AssetOFT is OFT {
    /**
     * @notice Constructs the USD1 Asset OFT contract
     * @dev Initializes the OFT with LayerZero endpoint and sets up ownership
     * @param _name The name of the asset token (e.g., "USD1 Asset")
     * @param _symbol The symbol of the asset token (e.g., "USD1")
     * @param _lzEndpoint The address of the LayerZero endpoint on this chain
     * @param _delegate The address that will have owner privileges
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        require(_lzEndpoint != address(0), "USD1AssetOFT: endpoint cannot be zero address");
        require(_delegate != address(0), "USD1AssetOFT: delegate cannot be zero address");
        
        // NOTE: Uncomment for testing only - NOT for production
        // _mint(_delegate, 1_000_000 * 10**18); // 1M USD1 for testing
    }

    /**
     * @notice Mint tokens (owner only)
     * @dev Allows owner to mint additional tokens if needed
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

