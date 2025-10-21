// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { VaultComposerSync } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSync.sol";

/**
 * @title EagleOVaultComposer
 * @notice Cross-chain vault composer enabling omnichain Eagle vault operations via LayerZero
 * @dev This contract orchestrates cross-chain vault operations between OFT assets/shares 
 * and the EagleOVault ERC4626 vault. It automatically handles:
 * 
 * DEPOSIT FLOW (Asset OFT → Composer):
 * 1. Receives WLFI/USD1 assets via LayerZero
 * 2. Deposits into EagleOVault 
 * 3. Routes vEAGLE shares to destination chain
 * 
 * REDEMPTION FLOW (Share OFT → Composer):
 * 1. Receives vEAGLE shares via LayerZero
 * 2. Redeems from EagleOVault
 * 3. Routes WLFI/USD1 assets to destination chain
 * 
 * SLIPPAGE PROTECTION:
 * - Phase 1: OFT transfer slippage (minimal impact)
 * - Phase 2: Vault operation slippage (critical - protected by composeMsg)
 * 
 * CROSS-CHAIN EXAMPLES:
 * - Deposit WLFI on Arbitrum, receive vEAGLE shares on Optimism
 * - Redeem vEAGLE on Base, receive WLFI on Ethereum
 * - All vault logic stays on hub chain (Ethereum)
 * 
 * Compatible with LayerZero VaultComposerSync for omnichain vault operations.
 * Deploy ONLY on hub chain (Ethereum).
 */
contract EagleOVaultComposer is VaultComposerSync {
    /**
     * @notice Creates a new Eagle cross-chain vault composer
     * @dev Initializes the composer with vault and OFT contracts for omnichain operations
     * @param _vault The EagleOVault contract implementing ERC4626 for deposit/redeem operations
     * @param _assetOFT The OFT contract for cross-chain WLFI/USD1 asset transfers  
     * @param _shareOFT The ShareOFTAdapter contract for cross-chain vEAGLE share transfers
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT
    ) VaultComposerSync(_vault, _assetOFT, _shareOFT) {
        // Additional validation for Eagle-specific requirements
        require(_vault != address(0), "EagleOVaultComposer: vault cannot be zero address");
        require(_assetOFT != address(0), "EagleOVaultComposer: assetOFT cannot be zero address");
        require(_shareOFT != address(0), "EagleOVaultComposer: shareOFT cannot be zero address");
    }
    
    /**
     * @notice Get the vault contract address
     * @return The address of the EagleOVault contract
     */
    function getVault() external view returns (address) {
        return address(VAULT);
    }
    
    /**
     * @notice Get the asset OFT contract address
     * @return The address of the asset OFT (WLFI/USD1)
     */
    function getAssetOFT() external view returns (address) {
        return address(ASSET_OFT);
    }
    
    /**
     * @notice Get the share OFT contract address  
     * @return The address of the share OFT adapter (vEAGLE)
     */
    function getShareOFT() external view returns (address) {
        return address(SHARE_OFT);
    }
}

