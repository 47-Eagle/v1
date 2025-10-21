// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppCore.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

/**
 * @title EagleOVaultComposer
 * @notice Simplified composer for wrapper architecture
 * @dev This composer works with the EagleVaultWrapper pattern where:
 * - Vault shares (vEAGLE) are wrapped into EagleShareOFT for bridging
 * - Composer handles basic cross-chain coordination
 * - Wrapper handles the actual wrap/unwrap logic
 * 
 * NOTE: This is a minimal implementation for deployment.
 * Full cross-chain compose functionality requires additional development.
 * 
 * Deploy ONLY on hub chain (Ethereum).
 */
contract EagleOVaultComposer is OAppCore {
    using SafeERC20 for IERC20;

    // =================================
    // STATE VARIABLES
    // =================================

    /// @notice The ERC4626 vault contract
    IERC4626 public immutable VAULT;

    /// @notice The asset OFT for cross-chain asset transfers
    address public immutable ASSET_OFT;

    /// @notice The share OFT for cross-chain share transfers
    address public immutable SHARE_OFT;

    /// @notice The vault wrapper for share conversion
    address public immutable WRAPPER;

    // =================================
    // EVENTS
    // =================================

    event ComposerInitialized(address vault, address assetOFT, address shareOFT, address wrapper);

    // =================================
    // CONSTRUCTOR
    // =================================

    /**
     * @notice Creates a new Eagle cross-chain vault composer
     * @dev Simplified constructor for wrapper architecture
     * @param _vault The EagleOVault contract implementing ERC4626
     * @param _assetOFT The OFT contract for cross-chain WLFI/USD1 asset transfers  
     * @param _shareOFT The EagleShareOFT contract for cross-chain share transfers
     * @param _wrapper The EagleVaultWrapper contract for share conversion
     * @param _endpoint LayerZero endpoint address
     * @param _delegate Admin address
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT,
        address _wrapper,
        address _endpoint,
        address _delegate
    ) OAppCore(_endpoint, _delegate) Ownable(_delegate) {
        require(_vault != address(0), "EagleOVaultComposer: vault cannot be zero address");
        require(_assetOFT != address(0), "EagleOVaultComposer: assetOFT cannot be zero address");
        require(_shareOFT != address(0), "EagleOVaultComposer: shareOFT cannot be zero address");
        require(_wrapper != address(0), "EagleOVaultComposer: wrapper cannot be zero address");

        VAULT = IERC4626(_vault);
        ASSET_OFT = _assetOFT;
        SHARE_OFT = _shareOFT;
        WRAPPER = _wrapper;

        emit ComposerInitialized(_vault, _assetOFT, _shareOFT, _wrapper);
    }

    // =================================
    // VIEW FUNCTIONS
    // =================================

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
        return ASSET_OFT;
    }
    
    /**
     * @notice Get the share OFT contract address  
     * @return The address of the share OFT (vEAGLE)
     */
    function getShareOFT() external view returns (address) {
        return SHARE_OFT;
    }

    /**
     * @notice Get the wrapper contract address
     * @return The address of the EagleVaultWrapper contract
     */
    function getWrapper() external view returns (address) {
        return WRAPPER;
    }

    // =================================
    // LAYERZERO REQUIRED FUNCTIONS
    // =================================

    /**
     * @notice Returns the OApp version
     * @dev Required by LayerZero OAppCore
     */
    function oAppVersion() external pure returns (uint64 senderVersion, uint64 receiverVersion) {
        return (1, 1);
    }

    /**
     * @notice Placeholder for LayerZero compose message handling
     * @dev This needs to be implemented for full cross-chain functionality
     */
    function lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata /*_message*/,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual {
        // TODO: Implement compose logic
        // 1. Decode message
        // 2. If deposit: receive assets → deposit to vault → wrap shares → send shares
        // 3. If redeem: receive shares → unwrap → redeem from vault → send assets
        revert("Compose not yet implemented");
    }

    /**
     * @notice Check if the path is allowed
     */
    function allowInitializePath(Origin calldata /*origin*/) external view virtual returns (bool) {
        return true;
    }

    /**
     * @notice Get the next nonce
     */
    function nextNonce(uint32 /*_eid*/, bytes32 /*_sender*/) external view virtual returns (uint64) {
        return 0;
    }
}

