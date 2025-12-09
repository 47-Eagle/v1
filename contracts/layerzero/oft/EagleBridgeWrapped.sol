// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EagleBridgeWrapped
 * @notice Wrapped EAGLE Token Bridge for Max-Supply Tokens
 *
 * @dev This contract implements a wrapped token bridge for EAGLE tokens
 *      that have a fixed max supply. Instead of burning/minting, it uses
 *      lock/unlock mechanics with attestations.
 *
 *      BRIDGE FLOW:
 *      1. Solana: User sends EAGLE to bridge vault + memo
 *      2. Solana: Relayer detects and sends LZ message with proof
 *      3. EVM: Contract receives message and mints wrapped EAGLE
 *      4. Reverse: Burn wrapped EAGLE, send LZ message, unlock on Solana
 */
contract EagleBridgeWrapped is OApp, OAppOptionsType3, ERC20, ERC20Burnable {

    /// @notice Bridge vault address on Solana (where tokens are locked)
    bytes32 public solanaBridgeVault;

    /// @notice Minimum amount that can be bridged
    uint256 public constant MIN_BRIDGE_AMOUNT = 1000; // 0.001 EAGLE (6 decimals)

    // =================================
    // EVENTS
    // =================================

    event TokensBridged(
        address indexed user,
        uint256 amount,
        uint32 dstEid,
        bytes32 bridgeId
    );

    event TokensReceived(
        address indexed user,
        uint256 amount,
        uint32 srcEid,
        bytes32 bridgeId
    );

    // =================================
    // ERRORS
    // =================================

    error InsufficientAmount();
    error InvalidBridgeVault();
    error BridgePaused();

    // =================================
    // CONSTRUCTOR
    // =================================

    constructor(
        address _endpoint,
        address _owner,
        bytes32 _solanaBridgeVault
    ) OApp(_endpoint, _owner) Ownable(_owner) ERC20("Wrapped EAGLE", "WEAGLE") {
        solanaBridgeVault = _solanaBridgeVault;
    }

    // =================================
    // EXTERNAL FUNCTIONS
    // =================================

    /**
     * @notice Bridge wrapped EAGLE tokens back to Solana
     * @param amount Amount of wrapped tokens to bridge
     * @param dstEid Destination endpoint ID (Solana)
     * @param options LayerZero options
     */
    function bridgeBack(
        uint256 amount,
        uint32 dstEid,
        bytes calldata options
    ) external payable {
        if (amount < MIN_BRIDGE_AMOUNT) revert InsufficientAmount();

        // Burn wrapped tokens
        _burn(msg.sender, amount);

        // Prepare bridge message
        bytes memory bridgeMessage = abi.encode(
            msg.sender,    // recipient on Solana
            amount,        // amount to unlock
            block.timestamp // timestamp
        );

        // Send LayerZero message
        _lzSend(
            dstEid,
            bridgeMessage,
            options,
            MessagingFee(msg.value, 0), // nativeFee, lzTokenFee
            payable(msg.sender)
        );

        emit TokensBridged(msg.sender, amount, dstEid, keccak256(abi.encode(msg.sender, amount, block.timestamp)));
    }

    // =================================
    // INTERNAL FUNCTIONS
    // =================================

    /**
     * @notice Handle incoming LayerZero messages
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Decode bridge message
        (address recipient, uint256 amount, uint256 timestamp) = abi.decode(_message, (address, uint256, uint256));

        // Mint wrapped tokens to recipient
        _mint(recipient, amount);

        emit TokensReceived(recipient, amount, _origin.srcEid, _guid);
    }

}
