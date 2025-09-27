# Message Execution Options

URL: https://docs.layerzero.network/v2/tools/sdks/options

Version: Endpoint V2Message Execution OptionsWhen sending cross-chain messages, the source chain has no knowledge of the destination chain's state or the resources required to execute a transaction on it. Message Execution Options provide a standardized way to specify the execution requirements for transactions on the destination chain.
You can think of options as serialized requests in bytes that inform the off-chain infrastructure (DVNs and Executors) how to handle the execution of your message on the destination chain.
See Message Options for more details on why Options exist in the LayerZero protocol.
Options Builders​
LayerZero provides tools to build specific Message Execution Options for your application:
EVM​• OptionsBuilder.sol: Can be imported from @layerzerolabs/oapp-evm
• options.ts: Can be imported from @layerzerolabs/lz-v2-utilitiesAptos & Solana​• options.ts: Can be imported from @layerzerolabs/lz-v2-utilitiesGenerating Options​
EVM (Solidity)​```
using OptionsBuilder for bytes;bytes memory options = OptionsBuilder.newOptions()    .addExecutorLzReceiveOption(50000, 0)    .toBytes();
```All Chains (TypeScript)​```
import {Options} from '@layerzerolabs/lz-v2-utilities';const options = Options.newOptions().addExecutorLzReceiveOption(gas_limit, msg_value).toBytes();
```Option Types​
lzReceive Option​
Specifies the gas values the Executor uses when calling lzReceive on the destination chain.```
Options.newOptions().addExecutorLzReceiveOption(gas_limit, msg_value);
```lzRead Option​
Specifies the gas values and response data size the Executor uses when delivering lzRead responses.
cautionSince the return data size is not known to the Executor ahead of time, you must estimate the expected response data size. This size is priced into the Executor's fee formula. Failure to correctly estimate the return data size will result in the Executor not delivering the response.```
Options.newOptions().addExecutorLzReadOption(gas_limit, return_data_size, msg_value);
```Parameters:• gas_limit: The amount of gas for delivering the lzRead response
• return_data_size: The estimated size (in bytes) of the response data from the read operation
• msg_value: The msg.value for the calllzCompose Option​
Allocates gas and value for Composed Messages on the destination chain.```
Options.newOptions().addExecutorLzComposeOption(index, gas_limit, msg_value);
```Parameters:• _index: The index of the lzCompose() function call
• _gas: The gas amount for the lzCompose call
• _value: The msg.value for the calllzNativeDrop Option​
Specifies how much native gas to drop to any address on the destination chain.```
Options.newOptions().addExecutorNativeDropOption(amount, receiverAddressInBytes32);
```Parameters:• _amount: The amount of gas in wei/lamports to drop
• _receiver: The bytes32 representation of the receiver addressOrderedExecution Option​
Enables ordered message delivery, overriding the default unordered delivery.```
Options.newOptions().addExecutorOrderedExecutionOption('');
```Chain-Specific Considerations​
EVM Chains​• Gas values are specified in wei
• Gas costs vary by chain and opcode pricingAptos​• Gas units are similar to EVM but may have different costs
• Recommended starting gas limit: 1,500 units for lzReceive
• Uses APT as native tokenSolana​• Uses compute units instead of gas
• For SPL token ATAs, rent-exempt minimum is 0.00203928 SOL (2,039,280 lamports); Token-2022 accounts may require more depending on enabled extensions
• Native token drops are in lamports
• Programs pull SOL from sender's account rather than pushing with transaction
• Prefer per-tx extraOptions with gas=0 and non-zero msg.value only if the recipient’s Associated Token Account (ATA) is missing; enforce gas via app-level enforcedOptions (options are combined). See Solana OFT: Conditional msg.value for ATA creation.Determining Gas Costs​
Tenderly​
For supported chains, the Tenderly Gas Profiler can help determine optimal gas values:1. Deploy and test your contract
2. Use Tenderly to profile actual gas usage
3. Set your options slightly above the profiled amountTesting​
Always test your gas settings thoroughly:1. Start with conservative estimates
2. Profile actual usage
3. Adjust based on real-world performance
4. Consider chain-specific gas mechanismsBest Practices​1. Gas Profiling: Always profile your contract's gas usage on each target chain
2. Conservative Estimates: Start with higher gas limits and adjust down
3. Chain-Specific Testing: Test thoroughly on each target chain
4. Native Caps: Check Executor's native cap for each pathway
5. Multiple Options: Consider combining options for complex scenariosFurther Reading​• EVM Gas Documentation
• Aptos Gas Fees
• Solana Compute Units
• LayerZero Executors

---
Note: This content was extracted from the LayerZero documentation. Tables and special components have been converted to plain text for better readability.
