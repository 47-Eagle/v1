// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

/**
 * @title USD1Adapter
 * @dev LayerZero Asset OFT Adapter for USD1 token
 * Wraps the existing USD1 ERC20 token for cross-chain transfers
 */
contract USD1Adapter is OFTAdapter {
    /**
     * @notice Creates a new OFT adapter for existing USD1 tokens
     * @dev Wraps an existing USD1 ERC20 token for cross-chain functionality
     * @param _usd1Token The existing USD1 ERC20 token contract address
     * @param _lzEndpoint The LayerZero endpoint for this chain
     * @param _delegate The account with administrative privileges
     */
    constructor(
        address _usd1Token,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_usd1Token, _lzEndpoint, _delegate) Ownable(_delegate) {
        // Validate addresses
        require(_usd1Token != address(0), "USD1Adapter: USD1 token cannot be zero address");
        require(_lzEndpoint != address(0), "USD1Adapter: endpoint cannot be zero address");
        require(_delegate != address(0), "USD1Adapter: delegate cannot be zero address");
        
        // Additional validation - ensure it's actually an ERC20 token
        require(_isContract(_usd1Token), "USD1Adapter: USD1 token must be a contract");
    }
    
    /**
     * @notice Get the underlying USD1 token address
     * @return The address of the existing USD1 ERC20 contract
     */
    function usd1Token() external view returns (address) {
        return address(innerToken);
    }
    
    /**
     * @notice Get token information
     * @return name Token name from underlying USD1 contract
     * @return symbol Token symbol from underlying USD1 contract  
     * @return decimals Token decimals from underlying USD1 contract
     */
    function tokenInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        // Try to get metadata, fall back to defaults if not available
        try IERC20Metadata(address(innerToken)).name() returns (string memory _name) {
            name = _name;
        } catch {
            name = "USD1";
        }
        
        try IERC20Metadata(address(innerToken)).symbol() returns (string memory _symbol) {
            symbol = _symbol;
        } catch {
            symbol = "USD1";
        }
        
        try IERC20Metadata(address(innerToken)).decimals() returns (uint8 _decimals) {
            decimals = _decimals;
        } catch {
            decimals = 18;
        }
    }
    
    /**
     * @dev Internal function to check if address is a contract
     */
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
