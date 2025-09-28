# Integration Checklist

URL: https://docs.layerzero.network/v2/tools/integration-checklist

Version: Endpoint V2Integration ChecklistThe checklist below is designed to help prepare a project that integrates LayerZero V2 OApps for an external audit or Mainnet deployment.
0. Introduction​
Pathway Model & Mental Map​
A LayerZero application operates over directional pathways:
Path A → B:1. Source Chain (Chain A): OApp(A) calls EndpointV2(A) → constructs & dispatches packet.
2. Destination Chain (Chain B): EndpointV2(B) verifies, inserts packet into channel, and calls OApp(B).[lzReceive](../concepts/glossary.md#lzreceive).Important: A → B configuration must be checked separately from B → A. Pathways are directional.
Critical Pathway Checks​
Use EndpointV2 and OApp methods as documented.
On Chain A (Source) — EndpointV2(A)​1. Send Library in Use
getSendLibrary(oApp, dstEid) → confirms which send library is active.
2. Executor & DVN Configuration (Send‑Side)
getConfig(oApp, sendLib, dstEid, configType)configType = 1: Executor config (max message size, executor address).
configType = 2: ULN/DVN config (confirmations, required/optional DVNs).
3. configType = 1: Executor config (max message size, executor address).
4. configType = 2: ULN/DVN config (confirmations, required/optional DVNs).
5. Delegate Check
delegates(oApp) → verifies the delegate authorized to configure endpoint settings.On Chain B (Destination) — EndpointV2(B)​1. Receive Library in Use
getReceiveLibrary(oApp, srcEid) → confirms which receive library is expected.
2. DVN Configuration (Receive‑Side)
getConfig(oApp, recvLib, srcEid, 2) → ULN config (confirmations + DVN sets).
3. Initialization Gate
initializable(origin, receiver) → Endpoint check if path can be initialized. Falls back to OApp’s allowInitializePath if no lazyNonce is present.
4. Optional Diagnostic Checks
verifiable(origin, receiver) or inboundPayloadHash(...) for debugging message states.On OApp Contracts (Both Chains)​1. Peer Mapping
peers(eid) → verifies that each OApp is correctly mapped to its counterpart on the remote chain.
2. Initialization Override
allowInitializePath(origin) → ensures the OAppReceiver provides a default implementation. If using ILayerZeroReceiver directly, you must implement this method to control initialization permissions.Defaults in LayerZero Protocol​
LayerZero maintains default configurations at the Endpoint level. These serve as fallbacks if an OApp has not explicitly called setSendLibrary, setReceiveLibrary, or setConfig.1. A default configuration may:Be a working config (with active DVNs + Executor).
Be a dead config (e.g., DVNs not listening → hard revert on send).
Be misconfigured (Executor not set or not connected, even if pathway appears live).
2. Be a working config (with active DVNs + Executor).
3. Be a dead config (e.g., DVNs not listening → hard revert on send).
4. Be misconfigured (Executor not set or not connected, even if pathway appears live).
5. Review Implication:Do not assume defaults are safe for production.
Always check explicitly: getSendLibrary, getReceiveLibrary, and getConfig. If these resolve to defaults, confirm whether the defaults are valid for the intended pathway.
Unintentional fallbacks to defaults are a common cause of blocked or failing pathways.
6. Do not assume defaults are safe for production.
7. Always check explicitly: getSendLibrary, getReceiveLibrary, and getConfig. If these resolve to defaults, confirm whether the defaults are valid for the intended pathway.
8. Unintentional fallbacks to defaults are a common cause of blocked or failing pathways.1. OApp Implementation​
Use the Latest Version of LayerZero Packages​
Always use the latest version of LayerZero packages. Avoid copying contracts directly from LayerZero repositories. You can find the latest packages on each contract's home page.
Avoid Hardcoding LayerZero Endpoint IDs​
Use admin-restricted setters to configure endpoint IDs instead of hardcoding them.
Set Peers on Every Pathway​
To ensure successful one-way messages between chains, it's essential to establish peer configurations on both the source and destination chains. Both chains' OApps perform peer verification before executing the message on the destination chain, ensuring secure and reliable cross-chain communication.```
// The real endpoint ids will vary per chain, and can be found under "Supported Chains"uint32 aEid = 1;uint32 bEid = 2;MyOApp aOApp;MyOApp bOApp;// Call on both sides per pathwayaOApp.setPeer(bEid, addressToBytes32(address(bOApp)));bOApp.setPeer(aEid, addressToBytes32(address(aOApp)));
```If using a custom OApp implementation that is not a child contract of the LayerZero OApp Standard, implement the receive side check for initializing the OApp's pathway. The Receive Library will call allowInitializePath when a message is received, and if true, it will initialize the pathway for message passing.```
// LayerZero V2 OAppReceiver.sol (implements ILayerZeroReceiver.sol)/** * @notice Checks if the path initialization is allowed based on the provided origin. * @param origin The origin information containing the source endpoint and sender address. * @return Whether the path has been initialized. * * @dev This indicates to the endpoint that the OApp has enabled msgs for this particular path to be received. * @dev This defaults to assuming if a peer has been set, its initialized. * Can be overridden by the OApp if there is other logic to determine this. */function allowInitializePath(Origin calldata origin) public view virtual returns (bool) {    return peers[origin.srcEid] == origin.sender;}
```Set Libraries on Every Pathway​
It is recommended that OApps explicitly set the intended libraries.```
EndpointV2.setSendLibrary(aOApp, bEid, newLib)EndpointV2.setReceiveLibrary(aOApp, bEid, newLib, gracePeriod)EndpointV2.setReceiveLibraryTimeout(aOApp, bEid, lib, gracePeriod)
```cautionIf libraries are not set, the OApp will fallback to the default libraries set by LayerZero Labs.```
/// @notice The Send Library is the Oapp specified library that will be used to send the message to the destination/// endpoint. If the Oapp does not specify a Send Library, the default Send Library will be used./// @dev If the Oapp does not have a selected Send Library, this function will resolve to the default library/// configured by LayerZero/// @return lib address of the Send Library/// @param _sender The address of the Oapp that is sending the message/// @param _dstEid The destination endpoint idfunction getSendLibrary(address _sender, uint32 _dstEid) public view returns (address lib) {    lib = sendLibrary[_sender][_dstEid];    if (lib == DEFAULT_LIB) {        lib = defaultSendLibrary[_dstEid];        if (lib == address(0x0)) revert Errors.LZ_DefaultSendLibUnavailable();    }}
```Set Security and Executor Configurations on Every Pathway​
You must configure Decentralized Validator Networks (DVNs) manually on all chain pathways for your OApp. LayerZero maintains a neutral stance and does not presuppose any security assumptions on behalf of deployed OApps. This approach requires you to define and implement security considerations that align with your application’s requirements.```
EndpointV2.setConfig(aOApp, sendLibrary, sendConfig)EndpointV2.setConfig(aOApp, receiveLibrary, receiveConfig)
```Follow the Protocol Configuration documentation to configure DVNs for each chain pathway.• EVM
• Solana
• Aptos MovecautionIf no configuration is set, the OApp will fallback to the default settings set by LayerZero Labs.```
// @dev get the executor config and if not set, return the default configfunction getExecutorConfig(address _oapp, uint32 _remoteEid) public view returns (ExecutorConfig memory rtnConfig) {    ExecutorConfig storage defaultConfig = executorConfigs[DEFAULT_CONFIG][_remoteEid];    ExecutorConfig storage customConfig = executorConfigs[_oapp][_remoteEid];    uint32 maxMessageSize = customConfig.maxMessageSize;    rtnConfig.maxMessageSize = maxMessageSize != 0 ? maxMessageSize : defaultConfig.maxMessageSize;    address executor = customConfig.executor;    rtnConfig.executor = executor != address(0x0) ? executor : defaultConfig.executor;}
```Additional considerations:1. Using just 1 DVN for each pathway should be avoided.
2. DVNs must match on every side of the pathway. Mismatching DVN configurations may still render operational OApps if the receive configuration on the remote OApp is less strict than the send configuration on the local OApp. Nonetheless, having fully matching configurations on either side is highly encouraged.
3. DVNs and Executor must implement their respective interfaces. Configured addresses can be checked against V2 Contracts and DVN Providers.Set Delegate on Every OApp​
It is recommended that OApps review and explicitly set the delegate for each deployment.```
EndpointV2.setDelegate(delegate)
```Check Initialization Logic is Valid on Every OApp​
Ensure that EndpointV2 can initialize the OApp on every chain.```
function _initializable(    Origin calldata _origin,    address _receiver,    uint64 _lazyInboundNonce) internal view returns (bool) {    return        _lazyInboundNonce > 0 || // allowInitializePath already checked        ILayerZeroReceiver(_receiver).allowInitializePath(_origin);}function initializable(Origin calldata _origin, address _receiver) external view returns (bool) {    return _initializable(_origin, _receiver, lazyInboundNonce[_receiver][_origin.srcEid][_origin.sender]);}
```2. Custom Business Logic via LayerZero Interfaces​
Check Message Safety​
Ensure that either one action is executed per cross-chain message, OR that bundled actions cannot fail mid-sequence. Enforcing action per message is recommended.
Consider Instant Finality Guarantee (IFG) if state safety is critical.
Check Mock and Test Functions Are Removed​
When example contracts are used as boilerplates, ensure that both any mock or test function existing or added is removed in the production deployments.
Check Enforced Gas and Value​
Destination gas and value consumption should be profiled and enforced for each OApp unless it's unpredictable.
Implement and set enforcedOptions to ensure users pay a predetermined amount of gas for delivery on the destination transaction. This setup guarantees that messages sent from source have sufficient gas to be executed on the destination.
Profile the gas required for execution on the destination chain to prevent failures due to insufficient gas.```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";contract MyOApp is OApp, OAppOptionsType3 {    /// @notice Message types that are used to identify the various OApp operations.    /// @dev These values are used in things like combineOptions() in OAppOptionsType3.    uint16 public constant SEND = 1;    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {}    // ... contract continues}
``````
EnforcedOptionParam[] memory aEnforcedOptions = new EnforcedOptionParam[](1);// Send gas for lzReceive (A -> B).aEnforcedOptions[0] = EnforcedOptionParam({eid: bEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)}); // gas limit, msg.valueaOApp.setEnforcedOptions(aEnforcedOptions);
```See more on Solana OFT Message Execution Options.
EVM-Specific​
Check _lzReceive Security​1. If using OAppReceiver (inherited by OApp and OFT), msg.sender != endpoint and _origin.srcEid != expectedOApp checks are already enforced in OAppReceiver.lzReceive (endpoint-only access, peer validation).
2. If implementing directly from ILayerZeroReceiver, you must implement these checks and initialization safeguards.Check lzCompose Security​
Unlike child contracts with the OAppReceiver.lzReceive method, the ILayerZeroComposer.lzCompose does not have built-in checks.
Add these checks for the source oApp and endpoint before any custom state change logic:```
// SPDX-License-Identifier: MITpragma solidity ^0.8.22;import { ILayerZeroComposer } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol";/// @title ComposedReceiver/// @dev A contract demonstrating the minimum ILayerZeroComposer interface necessary to receive composed messages via LayerZero.contract ComposedReceiver is ILayerZeroComposer {    /// @notice Stores the last received message.    string public data = "Nothing received yet";    /// @notice Store LayerZero addresses.    address public immutable endpoint;    address public immutable oApp;    /// @notice Constructs the contract.    /// @dev Initializes the contract.    /// @param _endpoint LayerZero Endpoint address    /// @param _oApp The address of the OApp that is sending the composed message.    constructor(address _endpoint, address _oApp) {        endpoint = _endpoint;        oApp = _oApp;    }    /// @notice Handles incoming composed messages from LayerZero.    /// @dev Decodes the message payload and updates the state.    /// @param _oApp The address of the originating OApp.    /// @param /*_guid*/ The globally unique identifier of the message.    /// @param _message The encoded message content.    function lzCompose(        address _oApp,        bytes32 /*_guid*/,        bytes calldata _message,        address,        bytes calldata    ) external payable override {        // Perform checks to make sure composed message comes from correct OApp.        require(_oApp == oApp, "!oApp");        require(msg.sender == endpoint, "!endpoint");        // Decode the payload to get the message        (string memory message, ) = abi.decode(_message, (string, address));        data = message;    }}
```Enforce msg.value in _lzReceive and lzCompose​
If you specify in the executor _options a certain msg.value, it is not guaranteed that the message will be executed with these exact parameters because any caller can execute a verified message.
In certain scenarios depending on the encoded message data, this can result in a successful message being delivered, but with a state change different than intended.
Encode the msg.value inside the message on the sending chain, and then decode it in the lzReceive or lzCompose and compare with the actual msg.value.```
// LayerZero V2 OmniCounter.sol examplefunction value(bytes calldata _message) internal pure returns (uint256) {    return uint256(bytes32(_message[VALUE_OFFSET:]));}function _lzReceive(    Origin calldata _origin,    bytes32 _guid,    bytes calldata _message,    address /*_executor*/,    bytes calldata /*_extraData*/) internal override {    _acceptNonce(_origin.srcEid, _origin.sender, _origin.nonce);    uint8 messageType = _message.msgType();    if (messageType == MsgCodec.VANILLA_TYPE) {        //////////////////////////////// IMPORTANT //////////////////////////////////        /// if you request for msg.value in the options, you should also encode it        /// into your message and check the value received at destination (example below).        /// if not, the executor could potentially provide less msg.value than you requested        /// leading to unintended behavior. Another option is to assert the executor to be        /// one that you trust.        /////////////////////////////////////////////////////////////////////////////        require(msg.value >= _message.value(), "OmniCounter: insufficient value");        count++;    }}
```This requires encoding the msg.value as part of the _message on the source chain, and extracting it from the encoded message.
3. LayerZero OFT/ONFT Implementation​
Check Use-Case Contracts​
New tokens that are launched with native LayerZero messaging capabilities should use plain token implementations (OFT or ONFT) on every chain.
Existing tokens in one or many chains with mint and burn capabilities should use a mint-and-burn Adapter such as MintAndBurnOFTAdapter in every existing chain, and plain token implementations in new chains.
Existing tokens in one chain without mint and burn capabilities should use a lockbox Adapter such as OFTAdapter or ONFT721Adapter in the existing chain, and plain token implementations in new chains.
Native tokens should use a native lockbox Adapter such as NativeOFTAdapter. For example, ETH in Ethereum or BNB in Binance Smart Chain.
warningThere can only be one lockbox OFT Adapter used in an OFT deployment.Multiple OFT Adapters break omnichain unified liquidity by effectively creating token pools.If you create OFT Adapters on multiple chains, you have no way to guarantee finality for token transfers due to the fact that the source chain has no knowledge of the destination pool's supply (or lack of supply). This can create race conditions where if a sent amount exceeds the available supply on the destination chain, those sent tokens will be permanently lost.
Check Shared Decimals​
Shared Decimals must be consistent across all OFT deployments, or amount conversion will vary by orders of magnitude and allow double spending.
Check Minter and Burner Permissions​
When using mint-and-burn Adapters such as MintAndBurnOFTAdapter, ensure that the Adapter has the required roles to mint and burn the underlying token through the specified interface.
Check Structured Codecs​
Use type-safe bytes codec for message encoding. Use custom codecs only if necessary and if your app requires deep optimization.
Examples:• EVM OFT.
• Solana OFT.Solana-Specific​
Avoid Enforcing Options Value to Initialize Accounts​
cautionOFT sends to Solana to uninitialized token accounts require additional options value to pay for ATA creation. The first transfer of a specific token to a recipient will require value, but any subsequent transaction will not.Static enforced options value should be avoided to deal with it, as it'd keep overpaying after the first send.Nonetheless, enforcing options for regular gas consumption and other value requirements is still recommended in Solana.
Examples:• First OFT send transaction to a Solana recipient. Note that the value received is non-zero, as it is used to pay for ATA creation of the token recipient.
• Second OFT send transaction to Solana recipient. Note that the SOL value sent is zero, as ATA is already created for the token recipient.4. Authority & Ownership Transfers​
Check OApp Ownership​
Ensure the OApp owner is set or transferred to the intended address.
Check Solana reference.
Check OApp Delegate​
Ensure the OApp delegate at the EndpointV2 is set or transferred to the intended address. It must be transferred before transferring ownership, as only the OApp owner can set the delegate.
Check Upgradeable Contracts Admin​
Ensure proxy admin for upgradeable contracts or upgrade authority is set or transferred to the intended addresses.
EVM-Specific​
Check Upgradeable Contracts Implementation Initialization​
Ensure implementation contracts for EVM upgradeable contracts disable initializers in the constructor.```
contract MyOFTUpgradeable is OFTUpgradeable {    constructor(address _lzEndpoint) OFTUpgradeable(_lzEndpoint) {        _disableInitializers();    }    function initialize(string memory _name, string memory _symbol, address _delegate) public initializer {        __OFT_init(_name, _symbol, _delegate);        __Ownable_init(_delegate);    }}
```Usage Notes​• This checklist is production-focused: it ensures pathway correctness, contract readiness, and monitoring preparedness.
• It is not a substitute for an audit, but provides:A systematic way to review OApp state.
Clear visibility into configuration consistency across chains.
Guidance on what Scan or external dashboards should surface automatically.
• A systematic way to review OApp state.
• Clear visibility into configuration consistency across chains.
• Guidance on what Scan or external dashboards should surface automatically.
• OFT/ONFT checks are categorized separately to avoid conflating with protocol-level messaging.References​• EVM Interactive Contract Playground
• Production Deployment Checklist (Upgradeable OFT Example)

---
Note: This content was extracted from the LayerZero documentation. Tables and special components have been converted to plain text for better readability.
