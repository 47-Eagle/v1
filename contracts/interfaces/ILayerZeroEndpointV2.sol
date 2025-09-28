// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title ILayerZeroEndpointV2
 * @dev Interface for LayerZero V2 Endpoint
 */

struct Origin {
    uint32 srcEid;
    bytes32 sender;
    uint64 nonce;
}

struct MessagingFee {
    uint256 nativeFee;
    uint256 lzTokenFee;
}

struct MessagingParams {
    uint32 dstEid;
    bytes32 receiver;
    bytes message;
    bytes options;
    bool payInLzToken;
}

interface ILayerZeroEndpointV2 {
    /**
     * @notice Get the send library for an OApp and destination endpoint
     */
    function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address lib);
    
    /**
     * @notice Get the receive library for an OApp and source endpoint
     */
    function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address lib);
    
    /**
     * @notice Get configuration for a specific config type
     */
    function getConfig(
        address _oapp,
        address _lib,
        uint32 _eid,
        uint32 _configType
    ) external view returns (bytes memory config);
    
    /**
     * @notice Set send library for an OApp
     */
    function setSendLibrary(address _oapp, uint32 _dstEid, address _sendLib) external;
    
    /**
     * @notice Set receive library for an OApp
     */
    function setReceiveLibrary(
        address _oapp,
        uint32 _srcEid,
        address _receiveLib,
        uint256 _gracePeriod
    ) external;
    
    /**
     * @notice Set configuration for an OApp
     */
    function setConfig(
        address _oapp,
        address _lib,
        uint32 _eid,
        uint32 _configType,
        bytes calldata _config
    ) external;
    
    /**
     * @notice Get the delegate for an OApp
     */
    function delegates(address _oapp) external view returns (address delegate);
    
    /**
     * @notice Set delegate for an OApp
     */
    function setDelegate(address _delegate) external;
    
    /**
     * @notice Check if a pathway can be initialized
     */
    function initializable(Origin calldata _origin, address _receiver) external view returns (bool);
    
    /**
     * @notice Send a message cross-chain
     */
    function send(
        MessagingParams calldata _params,
        address _refundAddress
    ) external payable returns (MessagingFee memory fee, bytes32 guid);
    
    /**
     * @notice Quote the fee for sending a message
     */
    function quote(
        MessagingParams calldata _params,
        address _sender
    ) external view returns (MessagingFee memory fee);
    
    /**
     * @notice Verify a message
     */
    function verify(Origin calldata _origin, address _receiver, bytes32 _payloadHash) external;
    
    /**
     * @notice Check if a message is verifiable
     */
    function verifiable(Origin calldata _origin, address _receiver) external view returns (bool);
    
    /**
     * @notice Execute a verified message
     */
    function lzReceive(
        Origin calldata _origin,
        address _receiver,
        bytes32 _guid,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable;
}
