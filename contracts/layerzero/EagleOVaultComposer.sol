// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { VaultComposerSync } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSync.sol";

/**
 * @title EagleOVaultComposer
 * @notice LayerZero VaultComposerSync for Eagle omnichain vault operations
 * @dev Orchestrates cross-chain deposits and redemptions
 * 
 * Flow Examples:
 * 
 * 1. Deposit Asset (Spoke → Hub):
 *    User on Arbitrum → AssetOFT.send() → Hub Composer
 *    → vault.deposit() → ShareOFT.send() → User on Arbitrum
 * 
 * 2. Redeem Shares (Spoke → Hub):
 *    User on Optimism → ShareOFT.send() → Hub Composer
 *    → vault.redeem() → AssetOFT.send() → User on Optimism
 * 
 * 3. Cross-chain Deposit:
 *    User on Arbitrum (Asset) → User on Optimism (Shares)
 *    AssetOFT(Arbitrum) → Composer(Hub) → ShareOFT(Optimism)
 * 
 * Compatible with:
 * - ERC-4626 vaults (EagleOVault)
 * - LayerZero OFT standard
 * - Synchronous vault operations (immediate deposit/redeem)
 */
contract EagleOVaultComposer is VaultComposerSync {
    /**
     * @notice Creates LayerZero vault composer
     * @param _vault EagleOVault address (ERC-4626)
     * @param _assetOFT AssetOFT address (WLFI or EagleAssetOFT)
     * @param _shareOFT ShareOFT address (EagleShareOFTAdapter on hub)
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT
    ) VaultComposerSync(_vault, _assetOFT, _shareOFT) {}
}

