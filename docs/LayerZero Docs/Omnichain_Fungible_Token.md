# LayerZero V2 OFT Quickstart

URL: https://docs.layerzero.network/v2/developers/evm/oft/quickstart

Version: Endpoint V2LayerZero V2 OFT QuickstartThe Omnichain Fungible Token (OFT) Standard enables fungible tokens to exist across multiple blockchains while maintaining a unified supply. The OFT standard works by debiting an amount of tokens from a sender on the source chain and crediting the same amount of tokens to a receiver on the destination chain.
OFT​
The _debit function in OFT.sol burns an amount of an ERC20 token, while _credit mints ERC20 tokens on the destination chain.OFT.sol extends the base OApp.sol and inherits ERC20, providing both cross-chain messaging and standard token functionality:OFT Adapter​
OFTAdapter.sol can be used for already deployed ERC20 tokens who lack mint capabilities, so that the _debit function calls safeERC20.transferFrom from a sender, while _credit calls safeERC20.transfer to a receiver.OFTAdapter.sol provides token bridging without modifying the original ERC20 token contract:tipIf your use case involves cross-chain messaging beyond token transfers, consider using the OApp Standard for maximum flexibility.
infoFor detailed technical information about transfer flows, decimal handling, and architecture patterns, see the OFT Technical Reference.
Installation​
Below, you can find instructions for installing the OFT contract:
OFT in a new project​
To start using LayerZero OFT contracts in a new project, use the LayerZero CLI tool, create-lz-oapp. The CLI tool allows developers to create any omnichain application in <4 minutes! Get started by running the following from your command line:```
npx create-lz-oapp@latest --example oft
```This will create an example repository containing both the Hardhat and Foundry frameworks, LayerZero development utilities, as well as the OFT contract package pre-installed.
OFT in an existing project​
To use LayerZero contracts in an existing project, you can install the OFT package directly:• npm
• yarn
• pnpm
• forge```
npm install @layerzerolabs/oft-evm
``````
yarn add @layerzerolabs/oft-evm
``````
pnpm add @layerzerolabs/oft-evm
``````
forge init
``````
forge install layerzero-labs/devtoolsforge install layerzero-labs/LayerZero-v2forge install OpenZeppelin/openzeppelin-contractsgit submodule add https://github.com/GNSPS/solidity-bytes-utils.git lib/solidity-bytes-utils
```Then add to your foundry.toml under [profile.default]:```
[profile.default]src = "src"out = "out"libs = ["lib"]remappings = [    '@layerzerolabs/oft-evm/=lib/devtools/packages/oft-evm/',    '@layerzerolabs/oapp-evm/=lib/devtools/packages/oapp-evm/',    '@layerzerolabs/lz-evm-protocol-v2/=lib/layerzero-v2/packages/layerzero-v2/evm/protocol',    '@layerzerolabs/lz-evm-messagelib-v2/=lib/layerzero-v2/packages/layerzero-v2/evm/messagelib',    '@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/',    'solidity-bytes-utils/=lib/solidity-bytes-utils/',]# See more config options https://github.com/foundry-rs/foundry/blob/master/crates/config/README.md#all-options
```infoLayerZero contracts work with both OpenZeppelin V5 and V4 contracts. Specify your desired version in your project's package.json:```
"resolutions": {    "@openzeppelin/contracts": "^5.0.1",}
```Custom OFT Contract​
To build your own omnichain token contract, inherit from OFT.sol or OFTAdapter.sol depending on whether you're creating a new token or bridging an existing one.
Below is a complete example showing the key pieces you need to implement:• OFT (New token)
• OFT Adapter (Existing token)```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";/// @notice OFT is an ERC-20 token that extends the OFTCore contract.contract MyOFT is OFT {    constructor(        string memory _name,        string memory _symbol,        address _lzEndpoint,        address _owner    ) OFT(_name, _symbol, _lzEndpoint, _owner) Ownable(_owner) {}}
```tipRemember to add the ERC20 _mint method either in the constructor or as a protected mint function before deploying.This contract provides a complete omnichain ERC20 implementation. The OFT automatically handles:
• Burning tokens on the source chain when sending
• Minting tokens on the destination chain when receiving
• Decimal precision conversion between different chains
• Unified supply management across all networks```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";/// @notice OFTAdapter uses a deployed ERC-20 token and SafeERC20 to interact with the OFTCore contract.contract MyOFTAdapter is OFTAdapter {    constructor(        address _token,        address _lzEndpoint,        address _owner    ) OFTAdapter(_token, _lzEndpoint, _owner) Ownable(_owner) {}}
```warningThere can only be one OFT Adapter lockbox in your omnichain deployment. Multiple adapters break unified liquidity and can cause permanent token loss due to insufficient destination supply.The OFT Adapter enables existing ERC20 tokens to become omnichain without code changes. The adapter:
• Locks tokens in the adapter contract when sending
• Unlocks tokens from the adapter when receiving
• Requires approval of the underlying token for transfers
• Maintains the original token contract unchangedConstructor​• Pass the Endpoint V2 address and owner address into the base contracts.OFT(_name, _symbol, _lzEndpoint, _owner) binds your contract to the local LayerZero Endpoint V2 and registers the delegate
Ownable(_owner) makes _owner the only address that can change configurations (such as peers, enforced options, and delegate)
• OFT(_name, _symbol, _lzEndpoint, _owner) binds your contract to the local LayerZero Endpoint V2 and registers the delegate
• Ownable(_owner) makes _owner the only address that can change configurations (such as peers, enforced options, and delegate)
• After deployment, the owner can call:setConfig(...) to adjust library or DVN parameters
setSendLibrary(...) and setReceiveLibrary(...) to override default libraries
setPeer(...) to whitelist remote OFT addresses
setDelegate(...) to assign a different delegate address
setEnforcedOptions(...) to set mandatory execution options
• setConfig(...) to adjust library or DVN parameters
• setSendLibrary(...) and setReceiveLibrary(...) to override default libraries
• setPeer(...) to whitelist remote OFT addresses
• setDelegate(...) to assign a different delegate address
• setEnforcedOptions(...) to set mandatory execution optionsDeployment and Wiring​
After you finish writing and testing your MyOFT contract, follow these steps to deploy it on each network and wire up the messaging stack.
tipWe strongly recommend using the LayerZero CLI tool to manage your configurations. Our config generator simplifies access to all available deployments across networks and is the preferred method for cross-chain messaging. See the CLI Guide for examples and how to use it in your project.
1. Deploy Your OFT Contract​
Deploy MyOFT on each chain using either the LayerZero CLI (recommended) or manual deployment scripts.• LayerZero CLI
• Manual Foundry
After running pnpm compile at the root level of your example repo, you can deploy your contracts.Network Configuration​Before using the CLI, you'll need to configure your networks in hardhat.config.ts with LayerZero Endpoint IDs (EIDs) and declare an RPC URL in your .env or directly in the config file:```
// hardhat.config.tsimport { EndpointId } from '@layerzerolabs/lz-definitions'// ... rest of hardhat config omitted for brevitynetworks: {    'optimism-sepolia-testnet': {        eid: EndpointId.OPTSEP_V2_TESTNET,        url: process.env.RPC_URL_OP_SEPOLIA || 'https://optimism-sepolia.gateway.tenderly.co',        accounts,    },    'arbitrum-sepolia-testnet': {        eid: EndpointId.ARBSEP_V2_TESTNET,        url: process.env.RPC_URL_ARB_SEPOLIA || 'https://arbitrum-sepolia.gateway.tenderly.co',        accounts,    },}
```infoThe key addition to a standard hardhat.config.ts is the inclusion of LayerZero Endpoint IDs (eid) for each network. Check the Deployments section for all available endpoint IDs.The LayerZero CLI provides automated deployment with built-in endpoint detection based on your hardhat.config.ts networks object:```
# Deploy using interactive promptsnpx hardhat lz:deploy
```The CLI will prompt you to:
1. Select chains to deploy to:```
? Which networks would you like to deploy? ›◉  fuji◉  amoy◉  sepolia
```1. Choose deploy script tags:```
? Which deploy script tags would you like to use? › MyOFT
```1. Confirm deployment:```
✔ Do you want to continue? … yesNetwork: amoyDeployer: 0x0000000000000000000000000000000000000000Network: sepoliaDeployer: 0x0000000000000000000000000000000000000000Deployed contract: MyOApp, network: amoy, address: 0x0000000000000000000000000000000000000000Deployed contract: MyOApp, network: sepolia, address: 0x0000000000000000000000000000000000000000
```The CLI automatically:
• Detects the correct LayerZero Endpoint V2 address for each chain
• Deploys your OApp contract with proper constructor arguments
• Generates deployment artifacts in ./deployments/ folder
• Creates network-specific deployment files (e.g., deployments/sepolia/MyOApp.json)
For manual deployment using Foundry, create a deployment script that handles endpoint addresses:```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import "forge-std/Script.sol";import { MyOApp } from "../contracts/MyOApp.sol";contract DeployOApp is Script {    function run() external {        // Replace these env vars with your own values        address endpoint = vm.envAddress("ENDPOINT_ADDRESS");        address owner    = vm.envAddress("OWNER_ADDRESS");        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));        MyOApp oapp = new MyOApp(endpoint, owner);        vm.stopBroadcast();        console.log("MyOApp deployed to:", address(oapp));    }}
```Run the deployment script:```
# Deploy to testnetforge script script/DeployOApp.s.sol --rpc-url $RPC_URL --broadcast --verify# Deploy to multiple chainsforge script script/DeployOApp.s.sol --rpc-url $ETHEREUM_RPC --broadcast --verifyforge script script/DeployOApp.s.sol --rpc-url $POLYGON_RPC --broadcast --verify
```You'll need to set the correct LayerZero Endpoint V2 addresses for each chain in your environment variables. Check the Deployments section for endpoint addresses.
2. Wire Messaging Libraries and Configurations​
Once your contracts are on-chain, you must set up send/receive libraries and DVN/Executor settings so cross-chain messages flow correctly.• LayerZero CLI
• Manual Foundry
The LayerZero CLI automatically handles all wiring via a single configuration file and command:Configuration File​In your project root, you can find a layerzero.config.ts file:```
import {EndpointId} from '@layerzerolabs/lz-definitions';import {ExecutorOptionType} from '@layerzerolabs/lz-v2-utilities';import {TwoWayConfig, generateConnectionsConfig} from '@layerzerolabs/metadata-tools';import {OAppEnforcedOption, OmniPointHardhat} from '@layerzerolabs/toolbox-hardhat';// This contract object defines the OApp deployment on Optimism Sepolia testnet// The config references the contract deployment from your ./deployments folderconst optimismContract: OmniPointHardhat = {  eid: EndpointId.OPTSEP_V2_TESTNET,  contractName: 'MyOFT',};const arbitrumContract: OmniPointHardhat = {  eid: EndpointId.ARBSEP_V2_TESTNET,  contractName: 'MyOFT',};// For this example's simplicity, we will use the same enforced options values for sending to all chains// For production, you should ensure `gas` is set to the correct value through profiling the gas usage of calling OApp._lzReceive(...) on the destination chain// To learn more, read https://docs.layerzero.network/v2/concepts/applications/oapp-standard#execution-options-and-enforced-settingsconst EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [  {    msgType: 1,    optionType: ExecutorOptionType.LZ_RECEIVE,    gas: 80000,    value: 0,  },];// To connect all the above chains to each other, we need the following pathways:// Optimism <-> Arbitrum// With the config generator, pathways declared are automatically bidirectional// i.e. if you declare A,B there's no need to declare B,Aconst pathways: TwoWayConfig[] = [  [    optimismContract, // Chain A contract    arbitrumContract, // Chain C contract    [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]    [1, 1], // [A to B confirmations, B to A confirmations]    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // Chain C enforcedOptions, Chain A enforcedOptions  ],];export default async function () {  // Generate the connections config based on the pathways  const connections = await generateConnectionsConfig(pathways);  return {    contracts: [{contract: optimismContract}, {contract: arbitrumContract}],    connections,  };}
```Make sure your contract object's contractName matches the named deployment file for the network under ./deployments/.Wire Everything​Run a single command to configure all pathways:```
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```This automatically handles:
• Fetching the necessary contract addresses for each network from metadata
• Setting send and receive libraries
• Configuring DVNs and Executors
• Setting up peers between contracts
• Applying enforced options
• All bidirectional pathways in your config
For manual configuration using Foundry scripts, follow these steps:Environment Setup​Here's a comprehensive .env.example file showing all the environment variables needed for the different configuration scripts:```
# Common variables used across scriptsENDPOINT_ADDRESS=0x...        # LayerZero Endpoint V2 addressOAPP_ADDRESS=0x...           # Your OApp contract addressSIGNER=0x...                 # Address with permissions to configure/send# Library Configuration (SetLibraries.s.sol)SEND_LIB_ADDRESS=0x...       # SendUln302 addressRECEIVE_LIB_ADDRESS=0x...    # ReceiveUln302 addressDST_EID=30101               # Destination chain EIDSRC_EID=30110               # Source chain EIDGRACE_PERIOD=0              # Grace period for library switch (0 for immediate)# Send Config (SetSendConfig.s.sol)SOURCE_ENDPOINT_ADDRESS=0x... # Chain A Endpoint addressSENDER_OAPP_ADDRESS=0x...    # OApp on Chain AREMOTE_EID=30101            # Endpoint ID for Chain B# Peer Configuration (SetPeers.s.sol)CHAIN1_EID=30101            # First chain EIDCHAIN1_PEER=0x...           # OApp address on first chainCHAIN2_EID=30110            # Second chain EIDCHAIN2_PEER=0x...           # OApp address on second chainCHAIN3_EID=30111            # Third chain EIDCHAIN3_PEER=0x...           # OApp address on third chain# Message Sending (SendMessage.s.sol)MESSAGE="Hello World"        # Message to send cross-chain
```2.1 Set Send and Receive Libraries​
1. Choose your libraries (addresses of deployed MessageLib contracts). For standard cross-chain messaging, you should use SendUln302.sol for setSendLibrary(...) and ReceiveUln302.sol for setReceiveLibrary(...). You can find the deployments for these contracts under the Deployments section.
2. Call setSendLibrary(oappAddress, dstEid, sendLibAddress) on the Endpoint.
3. Call setReceiveLibrary(oappAddress, srcEid, receiveLibAddress, gracePeriod) on the Endpoint.```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import "forge-std/Script.sol";import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";/// @title LayerZero Library Configuration Script/// @notice Sets up send and receive libraries for OApp messagingcontract SetLibraries is Script {    function run() external {        // Load environment variables        address endpoint = vm.envAddress("ENDPOINT_ADDRESS");    // LayerZero Endpoint address        address oapp = vm.envAddress("OAPP_ADDRESS");           // Your OApp contract address        address signer = vm.envAddress("SIGNER");               // Address with permissions to configure        // Library addresses        address sendLib = vm.envAddress("SEND_LIB_ADDRESS");    // SendUln302 address        address receiveLib = vm.envAddress("RECEIVE_LIB_ADDRESS"); // ReceiveUln302 address        // Chain configurations        uint32 dstEid = uint32(vm.envUint("DST_EID"));         // Destination chain EID        uint32 srcEid = uint32(vm.envUint("SRC_EID"));         // Source chain EID        uint32 gracePeriod = uint32(vm.envUint("GRACE_PERIOD")); // Grace period for library switch        vm.startBroadcast(signer);        // Set send library for outbound messages        ILayerZeroEndpointV2(endpoint).setSendLibrary(            oapp,    // OApp address            dstEid,  // Destination chain EID            sendLib  // SendUln302 address        );        // Set receive library for inbound messages        ILayerZeroEndpointV2(endpoint).setReceiveLibrary(            oapp,        // OApp address            srcEid,      // Source chain EID            receiveLib,  // ReceiveUln302 address            gracePeriod  // Grace period for library switch        );        vm.stopBroadcast();    }}
```You would need to set up your .env file with the appropriate values:```
ENDPOINT_ADDRESS=0x...OAPP_ADDRESS=0x...SIGNER=0x...SEND_LIB_ADDRESS=0x...    # SendUln302 addressRECEIVE_LIB_ADDRESS=0x... # ReceiveUln302 addressDST_EID=30101SRC_EID=30110GRACE_PERIOD=0           # Set to 0 for immediate switch, or block number for gradual migration
```2.2 Set Send Config and Receive Config​If you need non-default DVN or Executor settings (block confirmations, required DVNs, max message size, etc.), call setConfig(...) next. To see defaults, use getConfig(...).Send Config (A → B):The send config is set on the source chain (Chain A) and applies to messages being sent from Chain A to Chain B. This config determines the DVN and Executor settings for outbound messages leaving Chain A and destined for Chain B. You must call setConfig on the Endpoint contract on Chain A, specifying the remote Endpoint ID for Chain B and the appropriate SendLib address for the A → B pathway.```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import "forge-std/Script.sol";import { ILayerZeroEndpointV2, SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";/// @title LayerZero Send Configuration Script (A → B)/// @notice Defines and applies ULN (DVN) + Executor configs for cross‑chain messages sent from Chain A to Chain B via LayerZero Endpoint V2.contract SetSendConfig is Script {    uint32 constant EXECUTOR_CONFIG_TYPE = 1;    uint32 constant ULN_CONFIG_TYPE = 2;     /// @notice Broadcasts transactions to set both Send ULN and Executor configurations for messages sent from Chain A to Chain B    function run() external {        address endpoint = vm.envAddress("SOURCE_ENDPOINT_ADDRESS"); // Chain A Endpoint        address oapp      = vm.envAddress("SENDER_OAPP_ADDRESS");    // OApp on Chain A        uint32 eid        = uint32(vm.envUint("REMOTE_EID"));        // Endpoint ID for Chain B        address sendLib   = vm.envAddress("SEND_LIB_ADDRESS");      // SendLib for A → B        address signer    = vm.envAddress("SIGNER");        /// @notice ULNConfig defines security parameters (DVNs + confirmation threshold) for A → B        /// @notice Send config requests these settings to be applied to the DVNs and Executor for messages sent from A to B        /// @dev 0 values will be interpretted as defaults, so to apply NIL settings, use:        /// @dev uint8 internal constant NIL_DVN_COUNT = type(uint8).max;        /// @dev uint64 internal constant NIL_CONFIRMATIONS = type(uint64).max;        UlnConfig memory uln = UlnConfig({            confirmations:        15,                                      // minimum block confirmations required on A before sending to B            requiredDVNCount:     2,                                       // number of DVNs required            optionalDVNCount:     type(uint8).max,                         // optional DVNs count, uint8            optionalDVNThreshold: 0,                                       // optional DVN threshold            requiredDVNs:        [address(0x1111...), address(0x2222...)], // sorted list of required DVN addresses            optionalDVNs:        []                                        // sorted list of optional DVNs        });        /// @notice ExecutorConfig sets message size limit + fee‑paying executor for A → B        ExecutorConfig memory exec = ExecutorConfig({            maxMessageSize: 10000,                                       // max bytes per cross-chain message            executor:       address(0x3333...)                           // address that pays destination execution fees on B        });        bytes memory encodedUln  = abi.encode(uln);        bytes memory encodedExec = abi.encode(exec);        SetConfigParam[] memory params = new SetConfigParam[](2);        params[0] = SetConfigParam(eid, EXECUTOR_CONFIG_TYPE, encodedExec);        params[1] = SetConfigParam(eid, ULN_CONFIG_TYPE, encodedUln);        vm.startBroadcast(signer);        ILayerZeroEndpointV2(endpoint).setConfig(oapp, sendLib, params); // Set config for messages sent from A to B        vm.stopBroadcast();    }}
```Receive Config (B ← A):The receive config is set on the destination chain (Chain B) and applies to messages being received on Chain B from Chain A. This config determines the DVN settings for inbound messages arriving from Chain A. You must call setConfig on the Endpoint contract on Chain B, specifying the remote Endpoint ID for Chain A and the appropriate ReceiveLib address for the B ← A pathway.```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import "forge-std/Script.sol";import { ILayerZeroEndpointV2, SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";/// @title LayerZero Receive Configuration Script (B ← A)/// @notice Defines and applies ULN (DVN) config for inbound message verification on Chain B for messages received from Chain A via LayerZero Endpoint V2.contract SetReceiveConfig is Script {    uint32 constant RECEIVE_CONFIG_TYPE = 2;    function run() external {        address endpoint = vm.envAddress("ENDPOINT_ADDRESS");      // Chain B Endpoint        address oapp      = vm.envAddress("OAPP_ADDRESS");         // OApp on Chain B        uint32 eid        = uint32(vm.envUint("REMOTE_EID"));      // Endpoint ID for Chain A        address receiveLib= vm.envAddress("RECEIVE_LIB_ADDRESS");  // ReceiveLib for B ← A        address signer    = vm.envAddress("SIGNER");        /// @notice UlnConfig controls verification threshold for incoming messages from A to B        /// @notice Receive config enforces these settings have been applied to the DVNs for messages received from A        /// @dev 0 values will be interpretted as defaults, so to apply NIL settings, use:        /// @dev uint8 internal constant NIL_DVN_COUNT = type(uint8).max;        /// @dev uint64 internal constant NIL_CONFIRMATIONS = type(uint64).max;        UlnConfig memory uln = UlnConfig({            confirmations:      15,                                       // min block confirmations from source (A)            requiredDVNCount:   2,                                        // required DVNs for message acceptance            optionalDVNCount:   type(uint8).max,                          // optional DVNs count            optionalDVNThreshold: 0,                                      // optional DVN threshold            requiredDVNs:       [address(0x1111...), address(0x2222...)], // sorted required DVNs            optionalDVNs:       []                                        // no optional DVNs        });        bytes memory encodedUln = abi.encode(uln);        SetConfigParam[] memory params = new SetConfigParam[](1);        params[0] = SetConfigParam(eid, RECEIVE_CONFIG_TYPE, encodedUln);        vm.startBroadcast(signer);        ILayerZeroEndpointV2(endpoint).setConfig(oapp, receiveLib, params); // Set config for messages received on B from A        vm.stopBroadcast();    }}
```2.3 Set Peers​Once you've finished your OApp Configuration you can open the messaging channel and connect your OApp deployments by calling setPeer.A peer is required to be set for each EID (or network). Ideally an OApp (or OFT) will have multiple peers set where one and only one peer exists for one EID.The function takes 2 arguments: _eid, the destination endpoint ID for the chain our other OApp contract lives on, and _peer, the destination OApp contract address in bytes32 format.```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import "forge-std/Script.sol";import { MyOApp } from "../contracts/MyOApp.sol";/// @title LayerZero OApp Peer Configuration Script/// @notice Sets up peer connections between OApp deployments on different chainscontract SetPeers is Script {    function run() external {        // Load environment variables        address oapp = vm.envAddress("OAPP_ADDRESS");         // Your OApp contract address        address signer = vm.envAddress("SIGNER");            // Address with owner permissions        // Example: Set peers for different chains        // Format: (chain EID, peer address in bytes32)        (uint32 eid1, bytes32 peer1) = (uint32(vm.envUint("CHAIN1_EID")), bytes32(uint256(uint160(vm.envAddress("CHAIN1_PEER")))));        (uint32 eid2, bytes32 peer2) = (uint32(vm.envUint("CHAIN2_EID")), bytes32(uint256(uint160(vm.envAddress("CHAIN2_PEER")))));        (uint32 eid3, bytes32 peer3) = (uint32(vm.envUint("CHAIN3_EID")), bytes32(uint256(uint160(vm.envAddress("CHAIN3_PEER")))));        vm.startBroadcast(signer);        // Set peers for each chain        MyOApp(oapp).setPeer(eid1, peer1);        MyOApp(oapp).setPeer(eid2, peer2);        MyOApp(oapp).setPeer(eid3, peer3);        vm.stopBroadcast();    }}
```cautionThis function opens your OApp to start receiving messages from the messaging channel, meaning you should configure any application settings you intend on changing prior to calling setPeer.warningOApps need setPeer to be called correctly on both contracts to send messages. The peer address uses bytes32 for handling non-EVM destination chains.If the peer has been set to an incorrect destination address, your messages will not be delivered and handled properly. If not resolved, users can potentially pay gas on source without any corresponding action on destination. You can confirm the peer address is the expected destination OApp address by viewing the peers mapping directly.2.4 Set Enforced Options​Enforced options allow the OApp owner to set mandatory execution parameters that will be applied to all messages of a specific type sent to a destination chain. These options are automatically combined with any caller-provided options when using OAppOptionsType3.Why use enforced options?
• Ensure sufficient gas is always allocated for message execution on the destination
• Enforce payment for additional services like PreCrime verification
• Set consistent execution parameters across all users of your OApp
• Prevent failed deliveries due to insufficient gas```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import "forge-std/Script.sol";import { MyOApp } from "../contracts/MyOApp.sol";import { EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";/// @title LayerZero OApp Enforced Options Configuration Script/// @notice Sets enforced execution options for specific message types and destinationscontract SetEnforcedOptions is Script {    using OptionsBuilder for bytes;    function run() external {        // Load environment variables        address oapp = vm.envAddress("OAPP_ADDRESS");         // Your OApp contract address        address signer = vm.envAddress("SIGNER");            // Address with owner permissions        // Destination chain configurations        uint32 dstEid1 = uint32(vm.envUint("DST_EID_1"));    // First destination EID        uint32 dstEid2 = uint32(vm.envUint("DST_EID_2"));    // Second destination EID        // Message type (should match your contract's constant)        uint16 SEND = 1;  // Message type for sendString function        // Build options using OptionsBuilder        bytes memory options1 = OptionsBuilder.newOptions().addExecutorLzReceiveOption(80000, 0);        bytes memory options2 = OptionsBuilder.newOptions().addExecutorLzReceiveOption(100000, 0);        // Create enforced options array        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](2);        // Set enforced options for first destination        enforcedOptions[0] = EnforcedOptionParam({            eid: dstEid1,            msgType: SEND,            options: options1        });        // Set enforced options for second destination        enforcedOptions[1] = EnforcedOptionParam({            eid: dstEid2,            msgType: SEND,            options: options2        });        vm.startBroadcast(signer);        // Set enforced options on the OApp        MyOApp(oapp).setEnforcedOptions(enforcedOptions);        vm.stopBroadcast();        console.log("Enforced options set successfully!");        console.log("Destination 1 EID:", dstEid1, "Gas:", 80000);        console.log("Destination 2 EID:", dstEid2, "Gas:", 100000);    }}
```Environment variables needed:```
OAPP_ADDRESS=0x...           # Your deployed MyOApp addressSIGNER=0x...                 # Address with owner permissionsDST_EID_1=30101             # First destination endpoint IDDST_EID_2=30110             # Second destination endpoint ID
```Run the script:```
forge script script/SetEnforcedOptions.s.sol --rpc-url $RPC_URL --broadcast
```Once set, these enforced options will be automatically applied when using combineOptions() in your send functions, ensuring consistent execution parameters across all messages.Usage​
Once deployed and wired, you can begin sending tokens across chains.
Send tokens​• LayerZero CLI
• Manual Foundry
The LayerZero CLI provides a convenient task for sending OFT tokens that automatically handles fee estimation and transaction execution.Using the Send Task​The CLI includes a built-in lz:oft:send task that:
1. Finds your deployed OFT contract automatically
2. Quotes the gas cost using your OFT's quoteSend() function
3. Sends the tokens with the correct fee
4. Provides tracking links for the transaction
Basic usage:```
npx hardhat lz:oft:send --src-eid 40232 --dst-eid 40231 --amount 1.5 --to 0x1234567890123456789012345678901234567890
```Required Parameters:
• --src-eid: Source endpoint ID (e.g., 40232 for Optimism Sepolia)
• --dst-eid: Destination endpoint ID (e.g., 40231 for Arbitrum Sepolia)
• --amount: Amount to send in human readable units (e.g., "1.5")
• --to: Recipient address (20-byte hex for EVM)
Optional Parameters:
• --min-amount: Minimum amount to receive for slippage protection (e.g., "1.4")
• --extra-options: Additional gas units for lzReceive, lzCompose, or receiver address
• --compose-msg: Arbitrary bytes message to deliver alongside the OFT
• --oft-address: Override the source OFT address (if not using deployment artifacts)
Example with optional parameters:```
npx hardhat lz:oft:send \  --src-eid 40232 \  --dst-eid 40231 \  --amount 10.0 \  --to 0x1234567890123456789012345678901234567890 \  --min-amount 9.5 \  --extra-options 0x00030100110100000000000000000000000000030d40
```The task automatically:
• Finds your deployed OFT contract from deployment artifacts
• Handles token approvals (for OFTAdapter)
• Quotes the exact gas fee needed
• Provides block explorer and LayerZero Scan links for tracking
Remember to generate a fee estimate using quoteSend first, then pass the returned native gas amount as your msg.valueIf using the base OFTAdapter.sol, you will want to approve the adapter contract to spend your ERC20 tokens:```
ERC20(tokenAddress).approve(adapterAddress, amount);
```For manual token sending using Foundry, create a script that handles fee estimation and token transfer:```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import "forge-std/Script.sol";import { MyOFT } from "../contracts/MyOFT.sol";import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";contract SendOFT is Script {    using OptionsBuilder for bytes;    function addressToBytes32(address _addr) internal pure returns (bytes32) {        return bytes32(uint256(uint160(_addr)));    }    function run() external {        // Load environment variables        address oftAddress = vm.envAddress("OFT_ADDRESS");        address toAddress = vm.envAddress("TO_ADDRESS");        uint256 tokensToSend = vm.envUint("TOKENS_TO_SEND");        uint32 dstEid = uint32(vm.envUint("DST_EID"));        uint256 privateKey = vm.envUint("PRIVATE_KEY");        vm.startBroadcast(privateKey);        MyOFT oft = MyOFT(oftAddress);        // Build send parameters        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(65000, 0);        SendParam memory sendParam = SendParam({            dstEid: dstEid,            to: addressToBytes32(toAddress),            amountLD: tokensToSend,            minAmountLD: tokensToSend * 95 / 100, // 5% slippage tolerance            extraOptions: extraOptions,            composeMsg: "",            oftCmd: ""        });        // Get fee quote        MessagingFee memory fee = oft.quoteSend(sendParam, false);        console.log("Sending tokens...");        console.log("Fee amount:", fee.nativeFee);        // Send tokens        oft.send{value: fee.nativeFee}(sendParam, fee, msg.sender);        vm.stopBroadcast();    }}
```Environment variables needed:```
OFT_ADDRESS=0x...           # Your deployed OFT addressTO_ADDRESS=0x...            # Recipient addressTOKENS_TO_SEND=1000000000000000000  # Amount in wei (18 decimals)DST_EID=30101              # Destination endpoint IDPRIVATE_KEY=0x...          # Private key for sending
```Run the script:```
forge script script/SendOFT.s.sol --rpc-url $RPC_URL --broadcast
```Send tokens + call composer​
Horizontal composability allows your OFT to trigger additional actions on the destination chain through separate, containerized message packets. Unlike vertical composability (multiple calls in a single transaction), horizontal composability processes operations independently, providing better fault isolation and gas efficiency.Benefits of Horizontal Composability​• Fault Isolation: If a composed call fails, it doesn't revert the main token transfer
• Gas Efficiency: Each step can have independent gas limits and execution options
• Flexible Workflows: Complex multi-step operations can be broken into manageable pieces
• Non-Critical Operations: Secondary actions (like swaps or staking) can fail without affecting token deliveryWorkflow Overview​1. Token Transfer: OFT processes the token transfer in _lzReceive() and credits tokens to the recipient
2. Compose Message: OFT calls endpoint.sendCompose() to queue a separate composed message
3. Composer Execution: The composer contract receives the message via lzCompose() and executes custom logicSending with ComposeMsg​
When sending tokens with composed actions, set the to address to your composer contract and include your custom composeMsg:```
SendParam memory sendParam = SendParam({    dstEid: dstEid,    to: addressToBytes32(composerAddress), // Composer contract address, NOT end recipient    amountLD: tokensToSend,    minAmountLD: tokensToSend * 95 / 100,    extraOptions: extraOptions,    composeMsg: abi.encode(finalRecipient, swapParams), // Data for composer logic    oftCmd: ""});
```tipMessage Encoding: The OFT automatically includes additional context in the composed message:
• Original sender address (msg.sender from source chain)
• Token amount transferred (amountLD)
• Your custom composeMsg payload
• Message nonce and source endpoint ID
Your composer should decode this full context using OFTComposeMsgCodec helper functions.
Execution Options for Composed Messages​
Composed messages require gas for two separate executions:1. Token Transfer (lzReceive): Credits tokens and queues the composed message
2. Composer Call (lzCompose): Executes your custom logic in the composer contract```
bytes memory options = OptionsBuilder.newOptions()    .addExecutorLzReceiveOption(65000, 0)        // Token transfer + compose queuing    .addExecutorLzComposeOption(0, 50000, 0);    // Composer contract execution
```cautionTwo-Phase Gas Requirements:
• lzReceiveOption: Gas for token crediting + endpoint.sendCompose() call (varies with composeMsg size)
• lzComposeOption: Gas for your composer contract's business logic (depends on complexity)
Always test your composed implementation to determine adequate gas limits for both phases. If either phase runs out of gas, you'll need to manually retry the failed execution.
Using the CLI with Composed Messages​
The lz:oft:send task supports composed messages via the --compose-msg and --extra-options parameters:```
npx hardhat lz:oft:send \  --src-eid 40232 \  --dst-eid 40231 \  --amount 5 \  --to 0x1234567890123456789012345678901234567890 \  --compose-msg 0x000000000000000000000000abcdefabcdefabcdefabcdefabcdefabcdefabcd \  --extra-options 0x00030100110100000000000000000000000000fdfe00030200010000000000000000000000000000c350
```tipEncoding Compose Messages: The --compose-msg parameter expects hex-encoded bytes. You can encode data using:
• Online tools: Use ethers.js playground or similar tools to encode your data
• Cast command: cast abi-encode "function_signature" param1 param2
• Hardhat console: ethers.utils.defaultAbiCoder.encode(['address'], ['0x...'])
Extra Options: The --extra-options above includes both lzReceiveOption (gas: 65534) and lzComposeOption (index: 0, gas: 50000) for composed messages.
Implementing a Composer Contract​
The composer contract must implement IOAppComposer to handle composed messages. Here's a comprehensive example:```
// SPDX-License-Identifier: MITpragma solidity ^0.8.22;import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";/** * @title TokenSwapper * @notice Receives OFT tokens and automatically swaps them for another token */contract TokenSwapper is IOAppComposer {    using SafeERC20 for IERC20;    /// @notice LayerZero endpoint address    address public immutable endpoint;    /// @notice Trusted OFT that can send composed messages    address public immutable trustedOFT;    /// @notice Token to swap to    IERC20 public immutable targetToken;    event TokenSwapped(        address indexed originalSender,        address indexed recipient,        uint256 amountIn,        uint256 amountOut    );    constructor(address _endpoint, address _trustedOFT, address _targetToken) {        endpoint = _endpoint;        trustedOFT = _trustedOFT;        targetToken = IERC20(_targetToken);    }    /**     * @notice Handles composed messages from the OFT     * @param _oApp Address of the originating OApp (must be trusted OFT)     * @param _guid Unique identifier for this message     * @param _message Encoded message containing compose data     */    function lzCompose(        address _oApp,        bytes32 _guid,        bytes calldata _message,        address /*_executor*/,        bytes calldata /*_extraData*/    ) external payable override {        // Security: Verify the message source        require(msg.sender == endpoint, "TokenSwapper: unauthorized sender");        require(_oApp == trustedOFT, "TokenSwapper: untrusted OApp");        // Decode the full composed message context        uint64 nonce = OFTComposeMsgCodec.nonce(_message);        uint32 srcEid = OFTComposeMsgCodec.srcEid(_message);        uint256 amountLD = OFTComposeMsgCodec.amountLD(_message);        // Get original sender (who initiated the OFT transfer)        bytes32 composeFromBytes = OFTComposeMsgCodec.composeFrom(_message);        address originalSender = OFTComposeMsgCodec.bytes32ToAddress(composeFromBytes);        // Decode your custom compose message        bytes memory composeMsg = OFTComposeMsgCodec.composeMsg(_message);        (address recipient, uint256 minAmountOut) = abi.decode(composeMsg, (address, uint256));        // Execute the swap logic        uint256 amountOut = _performSwap(amountLD, minAmountOut);        // Transfer swapped tokens to recipient        targetToken.safeTransfer(recipient, amountOut);        emit TokenSwapped(originalSender, recipient, amountLD, amountOut);    }    function _performSwap(uint256 amountIn, uint256 minAmountOut) internal returns (uint256 amountOut) {        // Your swap logic here (DEX integration, etc.)        // This is a simplified example        amountOut = amountIn * 95 / 100; // Simulate 5% slippage        require(amountOut >= minAmountOut, "TokenSwapper: insufficient output");    }}
```Key Security Considerations​• Endpoint Verification: Always verify msg.sender == endpoint
• OApp Authentication: Only accept messages from trusted OApps
• Message Validation: Validate all decoded parameters before execution
• Reentrancy Protection: Consider using ReentrancyGuard for complex operationstipToken Availability: The OFT automatically credits tokens to the composer address before calling lzCompose, so your composer can immediately use the received tokens. The tokens are already available in the composer's balance when lzCompose executes.
Extensions​
The OFT Standard can be extended to support several different use cases, similar to the ERC20 token standard. Since OFT inherits from the base OApp contract, all OApp extensions and patterns are also available to OFT implementations, providing maximum flexibility for cross-chain token applications.
Below you can find relevant patterns and extensions:
Rate Limiting​
The RateLimiter pattern controls the number of tokens that can be transferred cross-chain within a specific time window. This is particularly valuable for OFTs to prevent abuse and ensure controlled token flow across chains.
Why Use Rate Limiting for OFTs?​• Prevent Token Drain Attacks: Protects against malicious actors attempting to rapidly drain tokens from a chain
• Regulatory Compliance: Helps meet compliance requirements for controlled cross-blockchain token transfers
• Supply Management: Maintains balanced token distribution across chains by limiting transfer velocity
• Risk Management: Reduces exposure to smart contract vulnerabilities or bridge exploitsImplementation​
Inherit from both OFT and RateLimiter in your contract:```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";import { RateLimiter } from "@layerzerolabs/oapp-evm/contracts/oapp/utils/RateLimiter.sol";import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";contract MyRateLimitedOFT is OFT, RateLimiter {    constructor(        string memory _name,        string memory _symbol,        address _lzEndpoint,        address _owner,        RateLimitConfig[] memory _rateLimitConfigs    ) OFT(_name, _symbol, _lzEndpoint, _owner) Ownable(_owner) {        _setRateLimits(_rateLimitConfigs);    }    // Override _debit to enforce rate limits on token transfers    function _debit(        address _from,        uint256 _amountLD,        uint256 _minAmountLD,        uint32 _dstEid    ) internal override returns (uint256 amountSentLD, uint256 amountReceivedLD) {        // Check rate limit before allowing the transfer        _outflow(_dstEid, _amountLD);        // Proceed with normal OFT debit logic        return super._debit(_amountLD, _minAmountLD, _dstEid);    }}
```Configuration​
Set up rate limits per destination chain during deployment:```
// Example: Allow max 1000 tokens per hour to Ethereum, 500 per hour to PolygonRateLimitConfig[] memory configs = new RateLimitConfig[](2);configs[0] = RateLimitConfig({    dstEid: 30101,     // Ethereum endpoint ID    limit: 1000 ether, // 1000 tokens (18 decimals)    window: 3600       // 1 hour window});configs[1] = RateLimitConfig({    dstEid: 30109,     // Polygon endpoint ID    limit: 500 ether,  // 500 tokens (18 decimals)    window: 3600       // 1 hour window});
```Dynamic Rate Limit Management​
Add functions to update rate limits post-deployment:```
function setRateLimits(RateLimitConfig[] calldata _rateLimitConfigs) external onlyOwner {_setRateLimits(_rateLimitConfigs);}function getRateLimit(uint32 _dstEid) external view returns (RateLimit memory) {return rateLimits[_dstEid];}
```Rate Limit Behavior​
When a transfer exceeds the rate limit:• The transaction reverts with a rate limit error
• Users must wait for the time window to reset
• The limit resets based on a sliding window mechanismtipConsider implementing different rate limits for different user tiers (e.g., higher limits for verified institutions) by overriding the rate limit check logic.
cautionRate limiting may not be suitable for all OFT applications. High-frequency trading or time-sensitive applications might be negatively impacted by rate limits.
Mint & Burn OFT Adapter​
The MintBurnOFTAdapter is a specialized adapter for existing ERC20 tokens that have exposed mint and burn functions. Unlike the standard OFTAdapter which locks/unlocks tokens, this adapter burns tokens on the source chain and mints them on the destination chain.
Key Differences from Standard OFTAdapter​--- Table ---
Feature | Standard OFTAdapter | MintBurnOFTAdapter
--- | --- | ---
Token Supply | Locks/unlocks existing tokens | Burns/mints tokens dynamically
Multiple Deployments | Only one adapter per token globally | Multiple adapters can exist
Approval Required | Yes, users must approve adapter | No, uses mint/burn privileges
Token Mechanism | Escrow (locks tokens) | Non-escrow (burns/mints)
--- End Table ---When to Use MintBurnOFTAdapter​• Tokens with mint/burn capabilities: Your ERC20 already has mint() and burn() functions
• Dynamic supply management: You prefer burning/minting over locking mechanisms
• Reduced custody risk: Eliminate the risk of locked token supply running dry when using multiple adaptersInstallation​
To get started with a MintBurnOFTAdapter example, use the LayerZero CLI tool to create a new project:```
npx create-lz-oapp@latest --example mint-burn-oft-adapter
```This creates a complete project with:• Example MintBurnOFTAdapter contracts
• Sample ElevatedMinterBurner implementation
• Deployment and configuration scripts
• Cross-chain unit testsThe example includes both the adapter contract and the underlying token with mint/burn capabilities, showing the complete integration pattern.
Implementation​
Create your mint/burn adapter by inheriting from MintBurnOFTAdapter:```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";import { MintBurnOFTAdapter } from "@layerzerolabs/oft-evm/contracts/MintBurnOFTAdapter.sol";import { IMintableBurnable } from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";contract MyMintBurnOFTAdapter is MintBurnOFTAdapter {constructor(  address _token,                   // Your existing ERC20 token with mint/burn exposed  IMintableBurnable _minterBurner,  // Contract with mint/burn privileges  address _lzEndpoint,              // Local LayerZero endpoint  address _owner                    // Contract owner) MintBurnOFTAdapter(_token, _minterBurner, _lzEndpoint, _owner) Ownable(_owner) {}}
```Token Requirements​
You need a contract that implements the IMintableBurnable interface. This can be either:
Option 1: Token directly implements the interface```
interface IMintableBurnable {    function burn(address _from, uint256 _amount) external returns (bool success);    function mint(address _to, uint256 _amount) external returns (bool success);}
```Option 2: Elevated minter/burner contract (Recommended)
For existing tokens that already have mint/burn capabilities but don't implement IMintableBurnable, use an intermediary contract:```
contract ElevatedMinterBurner is IMintableBurnable, Ownable {    IMintableBurnable public immutable token;    mapping(address => bool) public operators;    modifier onlyOperators() {        require(operators[msg.sender] || msg.sender == owner(), "Not authorized");        _;    }    constructor(IMintableBurnable _token, address _owner) Ownable(_owner) {        token = _token;    }    function setOperator(address _operator, bool _status) external onlyOwner {        operators[_operator] = _status;    }    function burn(address _from, uint256 _amount) external override onlyOperators returns (bool) {        return token.burn(_from, _amount);    }    function mint(address _to, uint256 _amount) external override onlyOperators returns (bool) {        return token.mint(_to, _amount);    }}
```The elevated contract approach allows you to:• Use existing tokens without modification
• Control which contracts can mint/burn through operator management
• Maintain existing token governance while adding bridge functionalityUsage Flow​1. Sending tokens:• User calls send() on the MintBurnOFTAdapter
• Adapter burns tokens from user's balance
• LayerZero message sent to destination
2. Receiving tokens:• Destination adapter receives LayerZero message
• Adapter mints new tokens to recipient's addressSecurity Considerations​
The MintBurnOFTAdapter requires careful access control since it can mint tokens:```
// Example: Ensure only the adapter can mint/burncontract SecureMintBurner is IMintableBurnable, Ownable {    IERC20Mintable public token;    address public adapter;    modifier onlyAdapter() {        require(msg.sender == adapter, "Only adapter can mint/burn");        _;    }    function mint(address _to, uint256 _amount) external onlyAdapter returns (bool) {        token.mint(_to, _amount);        return true;    }    function burn(address _from, uint256 _amount) external onlyAdapter returns (bool) {        token.burnFrom(_from, _amount);        return true;    }}
```warningTransfer Fee Tokens: The default implementation assumes lossless transfers (1 token in = 1 token out). If your token has transfer fees, you must override _debit and _credit functions to handle the actual amounts transferred.
infoUnlike standard OFTAdapter, you can deploy multiple MintBurnOFTAdapters for the same omnichain mesh.
OFT Alt​
When the native gas token cannot be used to pay LayerZero fees, you can use OFTAlt which supports payment in an alternative ERC20 token.
Installation​
To get started with an OFTAlt example, use the LayerZero CLI tool to create a new project:```
LZ_ENABLE_ALT_EXAMPLE=1 npx create-lz-oapp@latest --example oft-alt
```This creates a complete project with:• Example OFTAlt contracts with alternative fee payment
• EndpointV2Alt integration setup
• Alternative fee token configuration
• Deployment and configuration scripts
• Cross-chain unit tests with ERC20 fee paymentsThe example includes both the OFT Alt contract and the necessary setup for using alternative fee tokens, showing the complete integration pattern.
Implementation​```
// SPDX-License-Identifier: UNLICENSEDpragma solidity ^0.8.22;import { OFTAlt } from "@layerzerolabs/oft-evm/contracts/OFTAlt.sol";import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";contract MyOFTAlt is OFTAlt {    constructor(        string memory _name,        string memory _symbol,        address _lzEndpointAlt,        address _owner    ) OFTAlt(_name, _symbol, _lzEndpointAlt, _owner) Ownable(_owner) {}}
```Key Differences​1. Fee Payment: Uses ERC20 tokens instead of native gas
2. Approval Required: You must approve the OFT contract to spend your fee tokens
3. Endpoint: Must use EndpointV2Alt instead of standard EndpointV2Using OFT Alt​
Before sending messages, approve the fee token:```
// Approve the OFT to spend fee tokensIERC20(feeToken).approve(oftAltAddress, feeAmount);// Then send normallyoft.send{value: 0}(sendParam, fee, refundAddress); // No native value needed
```infoOFT Alt is designed for chains where native gas tokens are not suitable for LayerZero fees, such as certain L2s or sidechains with alternative fee mechanisms.
Further Reading​
For more advanced patterns and detailed implementations, see:• OApp Design Patterns - Additional messaging patterns
• Message Execution Options - Detailed options configuration
• OFT Technical Reference - Deep dive into OFT mechanicsTracing and Troubleshooting​
You can follow your testnet and mainnet transaction statuses using LayerZero Scan.
Refer to Debugging Messages for any unexpected complications when sending a message.
You can also ask for help or follow development in the Discord.

---
Note: This content was extracted from the LayerZero documentation. Tables and special components have been converted to plain text for better readability.
