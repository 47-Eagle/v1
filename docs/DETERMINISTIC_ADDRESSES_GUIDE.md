# 🎯 Deterministic Cross-Chain Address Deployment Guide

## 🎪 Goal: Same $EAGLE Address on All Chains

Having the same contract address across all LayerZero chains provides:
- ✅ **Better UX**: Users see same address everywhere
- ✅ **Easier Integration**: Frontends use one address
- ✅ **Reduced Confusion**: No chain-specific address mapping
- ✅ **Professional Appearance**: Like USDC, USDT, etc.

---

## 🛠️ Method 1: CREATE2 Deterministic Deployment (RECOMMENDED)

### **How It Works:**
- Uses `CREATE2` opcode with deterministic salt
- Same bytecode + same salt = same address on any chain
- Can be calculated before deployment

### **Implementation:**

```solidity
// Factory contract for deterministic deployment
contract DeterministicEagleFactory {
    event EagleDeployed(address indexed eagle, bytes32 indexed salt);
    
    function deployEagle(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) external returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(EagleShareOFT).creationCode,
            abi.encode(name, symbol, lzEndpoint, delegate)
        );
        
        address eagle;
        assembly {
            eagle := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        
        require(eagle != address(0), "Deployment failed");
        emit EagleDeployed(eagle, salt);
        return eagle;
    }
    
    function predictAddress(
        bytes32 salt,
        string memory name,
        string memory symbol,
        address lzEndpoint,
        address delegate
    ) external view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(
                    type(EagleShareOFT).creationCode,
                    abi.encode(name, symbol, lzEndpoint, delegate)
                ))
            )
        );
        return address(uint160(uint256(hash)));
    }
}
```

### **Deployment Script:**
```typescript
async function deployDeterministicEagle() {
    const salt = ethers.keccak256(ethers.toUtf8Bytes("EAGLE_V1"));
    const factory = await ethers.getContractAt("DeterministicEagleFactory", FACTORY_ADDRESS);
    
    // This will be the SAME on every chain!
    const predictedAddress = await factory.predictAddress(
        salt,
        "Eagle Vault Shares",
        "EAGLE", 
        CHAIN_LZ_ENDPOINT,
        deployer.address
    );
    
    console.log(`Predicted EAGLE address: ${predictedAddress}`);
    
    const tx = await factory.deployEagle(
        salt,
        "Eagle Vault Shares", 
        "EAGLE",
        CHAIN_LZ_ENDPOINT,
        deployer.address
    );
    
    console.log(`EAGLE deployed to: ${predictedAddress}`);
}
```

---

## 🛠️ Method 2: Same Nonce Deployment

### **How It Works:**
- Deploy from same address with same nonce on each chain
- Address = `keccak256(deployer + nonce)`
- Requires careful nonce management

### **Implementation:**
```typescript
async function deployWithSameNonce() {
    const deployer = await ethers.getSigner();
    const currentNonce = await deployer.getNonce();
    
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Current nonce: ${currentNonce}`);
    
    // Calculate what the address will be
    const futureAddress = ethers.getCreateAddress({
        from: deployer.address,
        nonce: currentNonce
    });
    
    console.log(`Future EAGLE address: ${futureAddress}`);
    
    // Deploy with specific nonce
    const EagleShareOFT = await ethers.getContractFactory("EagleShareOFT");
    const eagle = await EagleShareOFT.deploy(
        "Eagle Vault Shares",
        "EAGLE",
        CHAIN_LZ_ENDPOINT,
        deployer.address,
        { nonce: currentNonce }
    );
    
    console.log(`EAGLE deployed to: ${await eagle.getAddress()}`);
}
```

### **Nonce Management:**
```typescript
// Before deploying on each chain, ensure same nonce
async function syncNonce(targetNonce: number) {
    const deployer = await ethers.getSigner();
    const currentNonce = await deployer.getNonce();
    
    if (currentNonce < targetNonce) {
        // Send dummy transactions to increase nonce
        for (let i = currentNonce; i < targetNonce; i++) {
            await deployer.sendTransaction({
                to: deployer.address,
                value: 0,
                gasLimit: 21000
            });
        }
    } else if (currentNonce > targetNonce) {
        throw new Error(`Nonce too high: ${currentNonce} > ${targetNonce}`);
    }
}
```

---

## 🛠️ Method 3: LayerZero's Factory Pattern

### **How It Works:**
- Deploy factory on all chains first
- Factory creates OFT with CREATE2
- LayerZero has standard patterns for this

### **Implementation:**
```solidity
import { OFTFactory } from "@layerzerolabs/oft-evm/contracts/factory/OFTFactory.sol";

contract EagleOFTFactory is OFTFactory {
    bytes32 public constant EAGLE_SALT = keccak256("EAGLE_V1");
    
    function deployEagleOFT(
        address lzEndpoint,
        address delegate
    ) external returns (address) {
        return createOFT(
            EAGLE_SALT,
            "Eagle Vault Shares",
            "EAGLE",
            lzEndpoint,
            delegate
        );
    }
    
    function getEagleAddress(
        address lzEndpoint,
        address delegate
    ) external view returns (address) {
        return predictOFTAddress(
            EAGLE_SALT,
            "Eagle Vault Shares", 
            "EAGLE",
            lzEndpoint,
            delegate
        );
    }
}
```

---

## 🛠️ Method 4: Keyless Deployment

### **How It Works:**
- Use a "keyless" deployment address
- Deploy from address that nobody controls
- Same address across all EVM chains

### **Implementation:**
```typescript
// Generate keyless deployment address
const KEYLESS_DEPLOYER = "0x4e59b44847b379578588920cA78FbF26c0B4956C"; // CREATE2 factory

async function deployKeyless() {
    // This requires sending ETH to the keyless address on each chain
    // Then deploying from that address with same nonce
    
    const predictedAddress = ethers.getCreateAddress({
        from: KEYLESS_DEPLOYER,
        nonce: 0 // Always use nonce 0
    });
    
    console.log(`Keyless EAGLE address: ${predictedAddress}`);
}
```

---

## 🚀 RECOMMENDED APPROACH FOR EAGLE

### **Best Solution: CREATE2 Factory**

1. **Deploy DeterministicEagleFactory on all chains**
2. **Use same salt across all chains**
3. **Deploy EAGLE with same parameters**

### **Advantages:**
- ✅ **Most Reliable**: Works regardless of nonce state
- ✅ **Predictable**: Calculate address before deployment  
- ✅ **Flexible**: Can deploy multiple versions with different salts
- ✅ **Professional**: Used by major protocols
- ✅ **Recoverable**: Can redeploy if needed

### **Implementation Steps:**
```bash
# Step 1: Deploy factory on each chain
npx hardhat run scripts/deploy-eagle-factory.ts --network ethereum
npx hardhat run scripts/deploy-eagle-factory.ts --network bsc
npx hardhat run scripts/deploy-eagle-factory.ts --network arbitrum
npx hardhat run scripts/deploy-eagle-factory.ts --network base
npx hardhat run scripts/deploy-eagle-factory.ts --network avalanche

# Step 2: Deploy EAGLE with same salt on each chain
npx hardhat run scripts/deploy-eagle-deterministic.ts --network ethereum
npx hardhat run scripts/deploy-eagle-deterministic.ts --network bsc
# etc...
```

---

## 📊 COMPARISON TABLE

| Method | Reliability | Complexity | Retroactive | Gas Cost |
|--------|-------------|------------|-------------|----------|
| CREATE2 Factory | ⭐⭐⭐⭐⭐ | Medium | ❌ | Medium |
| Same Nonce | ⭐⭐⭐ | High | ❌ | Low |
| LayerZero Factory | ⭐⭐⭐⭐ | Low | ❌ | Medium |
| Keyless Deploy | ⭐⭐⭐⭐ | High | ❌ | Low |

---

## 🎯 FINAL RECOMMENDATION

**Use CREATE2 Factory approach** for your `$EAGLE` tokens:

1. 🏭 Deploy `DeterministicEagleFactory` on all chains
2. 🎲 Use salt: `keccak256("EAGLE_SHARE_OFT_V1")`
3. 📍 Deploy `$EAGLE` with same parameters on all chains
4. ✅ Verify same address across all chains
5. 🔗 Configure LayerZero peers using the deterministic addresses

This gives you **professional-grade deterministic addresses** that work reliably across all LayerZero chains! 🚀

