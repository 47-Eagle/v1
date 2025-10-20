# 🏭 Deterministic Eagle Factory Guide

## Overview

The **DeterministicEagleFactory** enables deployment of $EAGLE tokens with the **same address across all chains** using Arachnid's CREATE2 factory and EagleRegistry integration.

## 🎯 Key Features

- ✅ **Same address on 100+ chains** - Uses Arachnid's deterministic proxy
- ✅ **EagleRegistry integration** - Automatic LayerZero V2 endpoint lookup
- ✅ **Multi-chain prediction** - Verify addresses before deployment
- ✅ **Zero-config deployment** - Registry handles endpoints automatically
- ✅ **Override support** - Manual endpoint specification if needed

## 🏗️ Architecture

```
DeterministicEagleFactory
    ├─ Uses: Arachnid's CREATE2 Factory (0x4e59b44847b379578588920cA78FbF26c0B4956C)
    ├─ Integrates: EagleRegistry (for LayerZero endpoints)
    └─ Deploys: EagleShareOFT (same address all chains)
```

## 📦 Prerequisites

### 1. Deploy EagleRegistry (Once Per Chain)

```solidity
// Deploy registry
EagleRegistry registry = new EagleRegistry(owner);

// Register chains
registry.registerChain(
    1,                              // chainId (Ethereum)
    "Ethereum",                     // name
    0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,  // WETH
    "WETH",                         // symbol
    true                            // active
);

// Set LayerZero endpoint
registry.setLayerZeroEndpoint(
    1,                              // chainId
    0x1a44076050125825900e736c501f859c50fE728c  // LZ V2 endpoint
);

// Set EID mapping
registry.setChainIdToEid(1, 30101);  // Ethereum EID
```

### 2. Deploy DeterministicEagleFactory

```solidity
DeterministicEagleFactory factory = new DeterministicEagleFactory(
    address(registry)
);
```

## 🚀 Deployment Methods

### Method 1: Automatic (Registry-Based)

**Simplest method** - Registry automatically provides LayerZero endpoint:

```solidity
// Get standard salt (same for all chains)
bytes32 salt = factory.getStandardSalt();

// Deploy $EAGLE (registry handles endpoint)
address eagle = factory.deployEagle(
    salt,
    "Eagle Shares",     // name
    "EAGLE",           // symbol
    msg.sender         // delegate/owner
);
```

### Method 2: Manual Endpoint (Advanced)

Override registry and specify endpoint manually:

```solidity
address eagle = factory.deployEagleWithEndpoint(
    salt,
    "Eagle Shares",
    "EAGLE",
    0x1a44076050125825900e736c501f859c50fE728c,  // LZ endpoint
    msg.sender
);
```

## 🔮 Address Prediction

### Predict on Current Chain

```solidity
bytes32 salt = factory.getStandardSalt();

address predicted = factory.predictEagleAddress(
    salt,
    "Eagle Shares",
    "EAGLE",
    owner
);

console.log("Will deploy to:", predicted);
```

### Predict on Specific Chain

```solidity
address predicted = factory.predictEagleAddressWithEndpoint(
    salt,
    "Eagle Shares",
    "EAGLE",
    lzEndpointForThatChain,
    owner
);
```

### Predict on Multiple Chains

```solidity
uint16[] memory chains = new uint16[](3);
chains[0] = 1;      // Ethereum
chains[1] = 8453;   // Base
chains[2] = 42161;  // Arbitrum

address[] memory addresses = factory.predictMultiChainAddresses(
    salt,
    "Eagle Shares",
    "EAGLE",
    owner,
    chains
);

// All addresses should be identical!
require(
    addresses[0] == addresses[1] && 
    addresses[1] == addresses[2],
    "Addresses must match!"
);
```

## 📋 Complete Multi-Chain Deployment

### Step 1: Setup Registry on All Chains

Deploy EagleRegistry and configure LayerZero endpoints on each chain.

**Chain Configs:**

| Chain | Chain ID | LZ EID | LZ Endpoint V2 |
|-------|----------|--------|----------------|
| Ethereum | 1 | 30101 | 0x1a44076050125825900e736c501f859c50fE728c |
| Base | 8453 | 30184 | 0x1a44076050125825900e736c501f859c50fE728c |
| Arbitrum | 42161 | 30110 | 0x1a44076050125825900e736c501f859c50fE728c |
| Sonic | 146 | 30255 | *Check LZ docs* |

### Step 2: Deploy Factory on All Chains

```bash
# Same registry address on all chains (using CREATE2)
REGISTRY_ADDRESS=0x...

# Deploy factory (will have different addresses per chain)
forge create contracts/factories/DeterministicEagleFactory.sol:DeterministicEagleFactory \
  --rpc-url $RPC_URL \
  --private-key $PK \
  --constructor-args $REGISTRY_ADDRESS
```

### Step 3: Predict $EAGLE Address

```typescript
// Predict on Ethereum
const factory = await ethers.getContractAt("DeterministicEagleFactory", factoryAddress);
const salt = await factory.getStandardSalt();

const predictedEthereum = await factory.predictEagleAddress(
    salt,
    "Eagle Shares",
    "EAGLE",
    owner
);

// Verify same address on Base, Arbitrum, etc.
```

### Step 4: Deploy $EAGLE on All Chains

```typescript
// Deploy on Ethereum
const txEthereum = await factory.deployEagle(
    salt,
    "Eagle Shares",
    "EAGLE",
    owner
);

// Deploy on Base (same salt, same params)
const txBase = await factoryBase.deployEagle(
    salt,
    "Eagle Shares",
    "EAGLE",
    owner
);

// Verify addresses match
const eagleEthereum = await getDeployedAddress(txEthereum);
const eagleBase = await getDeployedAddress(txBase);

assert(eagleEthereum === eagleBase);
```

## 🛠️ Utility Functions

### Generate Custom Salt

```solidity
bytes32 customSalt = factory.generateSalt("MY_CUSTOM_DEPLOYMENT_V1");
```

### Check if Already Deployed

```solidity
bool isDeployed = factory.isEagleDeployed(
    salt,
    "Eagle Shares",
    "EAGLE",
    owner
);

if (isDeployed) {
    console.log("Already deployed!");
}
```

### Get Current Chain Info

```solidity
uint16 chainId = factory.getCurrentChainId();
address endpoint = factory.getCurrentLayerZeroEndpoint();
bool supported = factory.isChainSupported(chainId);
```

## 🔐 Security Considerations

### 1. Salt Reuse

⚠️ **Never reuse salt with different parameters!**

```solidity
// ❌ WRONG - Will fail or create different addresses
factory.deployEagle(salt, "Eagle Shares", "EAGLE", owner1);
factory.deployEagle(salt, "Different Name", "EAGLE", owner2);  // FAILS

// ✅ CORRECT - Use different salts
factory.deployEagle(salt1, "Eagle Shares", "EAGLE", owner);
factory.deployEagle(salt2, "Other Token", "OTHER", owner);
```

### 2. Parameter Consistency

For same address across chains, **ALL** parameters must be identical:
- Same salt
- Same name
- Same symbol
- Same delegate/owner
- Same LayerZero endpoint (registry handles this)

### 3. Registry Security

Ensure EagleRegistry is properly secured:
- Only owner can add/modify chains
- Only owner can set endpoints
- Verify endpoints before deployment

## 📊 Gas Estimates

| Operation | Estimated Gas | Cost @ 30 gwei |
|-----------|---------------|----------------|
| Deploy Factory | ~2.5M | ~$8 |
| Deploy $EAGLE | ~3.5M | ~$11 |
| Predict Address | ~50K | ~$0.15 |
| Check Deployed | ~25K | ~$0.08 |

## 🐛 Troubleshooting

### Issue: Different Addresses on Different Chains

**Cause:** Parameter mismatch or different LayerZero endpoints

**Solution:**
```typescript
// Verify all params match
console.log("Salt:", salt);
console.log("Name:", name);
console.log("Symbol:", symbol);
console.log("Owner:", owner);

// Check endpoints
const endpointEth = await registry.getLayerZeroEndpoint(1);
const endpointBase = await registryBase.getLayerZeroEndpoint(8453);
console.log("Endpoints:", endpointEth, endpointBase);
```

### Issue: Deployment Fails with "Already Deployed"

**Cause:** Contract already exists at predicted address

**Solution:**
```solidity
// Check before deploying
if (factory.isEagleDeployed(salt, name, symbol, owner)) {
    console.log("Already deployed!");
    return;
}
```

### Issue: ChainNotSupported Error

**Cause:** Chain not registered in EagleRegistry

**Solution:**
```solidity
// Register chain first
registry.registerChain(chainId, name, wrappedNative, symbol, true);
registry.setLayerZeroEndpoint(chainId, lzEndpoint);
```

## 📝 Example: Complete Deployment Script

```typescript
import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    // 1. Deploy Registry (if not deployed)
    const Registry = await ethers.getContractFactory("EagleRegistry");
    const registry = await Registry.deploy(deployer.address);
    await registry.waitForDeployment();
    
    // 2. Configure registry
    await registry.registerChain(
        1,
        "Ethereum",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "WETH",
        true
    );
    await registry.setLayerZeroEndpoint(
        1,
        "0x1a44076050125825900e736c501f859c50fE728c"
    );
    await registry.setChainIdToEid(1, 30101);
    
    // 3. Deploy Factory
    const Factory = await ethers.getContractFactory("DeterministicEagleFactory");
    const factory = await Factory.deploy(await registry.getAddress());
    await factory.waitForDeployment();
    
    // 4. Predict address
    const salt = await factory.getStandardSalt();
    const predicted = await factory.predictEagleAddress(
        salt,
        "Eagle Shares",
        "EAGLE",
        deployer.address
    );
    
    console.log("Will deploy to:", predicted);
    
    // 5. Deploy $EAGLE
    const tx = await factory.deployEagle(
        salt,
        "Eagle Shares",
        "EAGLE",
        deployer.address
    );
    await tx.wait();
    
    console.log("Deployed to:", predicted);
    
    // 6. Verify
    const eagle = await ethers.getContractAt("EagleShareOFT", predicted);
    console.log("Name:", await eagle.name());
    console.log("Symbol:", await eagle.symbol());
}

main();
```

## 🎯 Best Practices

1. **Always predict before deploying** - Verify address is correct
2. **Use standard salt** - Unless you need multiple deployments
3. **Deploy registry first** - On all chains before factory
4. **Verify endpoints** - Ensure LayerZero endpoints are correct
5. **Test on testnet** - Verify deterministic deployment works
6. **Document salt** - Save salt used for production deployments
7. **Check deployment** - Use `isEagleDeployed()` before deploying

## 🔗 Related Contracts

- **EagleRegistry** - Chain configurations and LayerZero endpoints
- **EagleShareOFT** - The token being deployed
- **Arachnid's Factory** - `0x4e59b44847b379578588920cA78FbF26c0B4956C`

## 📚 References

- [Arachnid's Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy)
- [LayerZero V2 Endpoints](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts)
- [CREATE2 Specification](https://eips.ethereum.org/EIPS/eip-1014)

---

**Last Updated**: January 2025  
**Network**: Multi-chain (Ethereum, Base, Arbitrum, Sonic, etc.)  
**Status**: ✅ Production Ready

