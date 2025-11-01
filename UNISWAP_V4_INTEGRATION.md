# 🦄 Uniswap V4 Integration Guide for EAGLE/ETH Pool

## Overview

This guide outlines the integration of Uniswap V4 for the EAGLE/ETH liquidity pool, leveraging V4's innovative features including hooks, native ETH support, and the singleton architecture.

---

## 📚 Required Repositories

### 1. **v4-core** (ESSENTIAL)
- **GitHub**: https://github.com/Uniswap/v4-core
- **What to clone**:
```bash
git submodule add https://github.com/Uniswap/v4-core lib/v4-core
```
- **Key Files**:
  - `PoolManager.sol` - Singleton contract managing all V4 pools
  - `IPoolManager.sol` - Main interface
  - `IHooks.sol` - Hook interface
  - `PoolKey.sol` - Pool identification struct

### 2. **v4-periphery** (ESSENTIAL)
- **GitHub**: https://github.com/Uniswap/v4-periphery
- **What to clone**:
```bash
git submodule add https://github.com/Uniswap/v4-periphery lib/v4-periphery
```
- **Key Files**:
  - `PositionManager.sol` - Add/remove liquidity
  - `PoolInitializer.sol` - Create pools
  - `V4Router.sol` - Swap router
  - Base hook implementations

### 3. **universal-router** (OPTIONAL - Future)
- Use after your pool has liquidity
- For advanced routing and Permit2 support

---

## 🎯 Why Uniswap V4 for EAGLE/ETH?

### Key Advantages:

1. **Custom Hooks** 🪝
   - Add unique features to your pool
   - Examples: fee distribution, liquidity locks, rewards
   
2. **Native ETH** 💎
   - No WETH wrapping needed
   - Lower gas costs for users
   
3. **Singleton Architecture** 🏗️
   - All pools in one contract
   - ~99% gas savings on pool creation
   - ~50% savings on swaps vs V3
   
4. **2% Fee Tier** 💰
   - Premium tier perfect for new tokens
   - Higher rewards for LPs = more liquidity
   - Compensates for higher volatility risk
   - Still competitive for traders
   
5. **Dynamic Fees** 📊
   - Can adjust fees based on volatility
   - Optimize for market conditions
   
6. **Innovation** 🚀
   - First-mover advantage
   - Showcase EAGLE as cutting-edge

---

## 🏗️ Implementation Plan

### Phase 1: Setup Dependencies (Week 1)

```bash
# Install Uniswap V4 packages
npm install @uniswap/v4-sdk @uniswap/v4-core @uniswap/v4-periphery

# Add submodules
git submodule add https://github.com/Uniswap/v4-core lib/v4-core
git submodule add https://github.com/Uniswap/v4-periphery lib/v4-periphery
git submodule update --init --recursive
```

### Phase 2: Design Custom Hooks (Week 1-2)

**Recommended Hook Features for EAGLE:**

#### Option A: Simple Hook (Start Here)
```solidity
// contracts/hooks/EagleBasicHook.sol
contract EagleBasicHook is BaseHook {
    // Fee distribution to EAGLE stakers
    // Simple TWAP oracle
    // Liquidity tracking
}
```

#### Option B: Advanced Hook (Later)
```solidity
// contracts/hooks/EagleAdvancedHook.sol
contract EagleAdvancedHook is BaseHook {
    // Dynamic fees based on volatility
    // LP rewards in EAGLE tokens
    // Time-locked liquidity
    // Anti-bot protection
}
```

### Phase 3: Pool Deployment Contract (Week 2)

```solidity
// contracts/pools/EagleETHPoolDeployer.sol
pragma solidity ^0.8.24;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract EagleETHPoolDeployer {
    using CurrencyLibrary for Currency;
    
    IPoolManager public immutable poolManager;
    address public immutable eagle;
    
    // V4 uses native ETH (address(0))
    Currency public constant ETH = Currency.wrap(address(0));
    
    constructor(address _poolManager, address _eagle) {
        poolManager = IPoolManager(_poolManager);
        eagle = _eagle;
    }
    
    function createEagleETHPool(
        address hookAddress,
        uint160 sqrtPriceX96
    ) external returns (PoolKey memory poolKey) {
        // Create pool key with 2% fee tier
        poolKey = PoolKey({
            currency0: Currency.wrap(eagle),
            currency1: ETH,
            fee: 20000, // 2% fee tier (20000 = 2%)
            tickSpacing: 200, // Wider spacing for 2% fee
            hooks: IHooks(hookAddress)
        });
        
        // Initialize pool
        poolManager.initialize(poolKey, sqrtPriceX96, "");
        
        return poolKey;
    }
}
```

### Phase 4: Frontend Integration (Week 3)

```typescript
// frontend/src/lib/uniswapV4.ts
import { Pool, FeeAmount } from '@uniswap/v4-sdk'
import { Token, CurrencyAmount } from '@uniswap/sdk-core'

export const EAGLE_TOKEN = new Token(
  1, // Ethereum
  '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E', // Your EAGLE OFT
  18,
  'EAGLE',
  'Eagle Shares'
)

export const POOL_CONFIG = {
  token0: EAGLE_TOKEN,
  token1: NATIVE_ETH, // V4 uses native ETH
  fee: 20000, // 2% fee tier (premium for new tokens)
  tickSpacing: 200, // Wider tick spacing for 2% fee
  hookAddress: '0x...' // Your deployed hook
}

// Create pool instance
export async function getEagleETHPool() {
  const poolManager = new ethers.Contract(
    POOL_MANAGER_ADDRESS,
    POOL_MANAGER_ABI,
    provider
  )
  
  // Get pool state
  const { sqrtPriceX96, tick, liquidity } = await poolManager.getSlot0(poolKey)
  
  return new Pool(
    EAGLE_TOKEN,
    NATIVE_ETH,
    POOL_CONFIG.fee,
    sqrtPriceX96.toString(),
    liquidity.toString(),
    tick
  )
}
```

### Phase 5: Testing (Week 3-4)

```solidity
// test/EagleETHPoolV4.t.sol
contract EagleETHPoolV4Test is Test {
    IPoolManager poolManager;
    EagleBasicHook hook;
    PoolKey poolKey;
    
    function setUp() public {
        // Deploy V4 PoolManager
        poolManager = IPoolManager(deployPoolManager());
        
        // Deploy your hook
        hook = new EagleBasicHook(poolManager);
        
        // Create pool
        poolKey = createEagleETHPool();
    }
    
    function testAddLiquidity() public {
        // Test adding liquidity
    }
    
    function testSwap() public {
        // Test EAGLE → ETH swap
    }
    
    function testHookFeatures() public {
        // Test your custom hook logic
    }
}
```

---

## 📋 Deployment Checklist

### Prerequisites:
- [ ] V4 core and periphery submodules installed
- [ ] Hook contract developed and tested
- [ ] Audit hook contract (if complex)
- [ ] Frontend UI ready
- [ ] Documentation for users

### Deployment Steps:

#### 1. Deploy Hook Contract
```bash
forge script script/DeployEagleHook.s.sol:DeployEagleHook \
  --rpc-url $ETHEREUM_RPC \
  --private-key $DEPLOYER_KEY \
  --broadcast --verify
```

#### 2. Create Pool
```bash
forge script script/CreateEagleETHPool.s.sol:CreateEagleETHPool \
  --rpc-url $ETHEREUM_RPC \
  --private-key $DEPLOYER_KEY \
  --broadcast
```

#### 3. Add Initial Liquidity
```bash
# Use PositionManager to add liquidity
# Recommended: Start with conservative range (e.g., ±20%)
```

#### 4. Update Frontend Config
```typescript
// frontend/src/config/contracts.ts
export const UNISWAP_V4 = {
  POOL_MANAGER: '0x...', // Mainnet PoolManager
  EAGLE_ETH_POOL: '0x...', // Your pool address
  HOOK_ADDRESS: '0x...', // Your hook
  POSITION_MANAGER: '0x...', // V4 position manager
} as const;
```

---

## 🎨 Hook Ideas for EAGLE

### 1. **Fee Distribution Hook**
```solidity
// Automatically send 50% of trading fees to EAGLE stakers
function afterSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external override returns (bytes4) {
    uint256 fees = calculateFees(delta);
    uint256 stakerReward = fees / 2;
    
    // Distribute to stakers
    rewardDistributor.distribute(stakerReward);
    
    return BaseHook.afterSwap.selector;
}
```

### 2. **Liquidity Lock Hook**
```solidity
// Prevent removing liquidity for X days after adding
mapping(address => uint256) public lockUntil;

function beforeRemoveLiquidity(...) external override returns (bytes4) {
    require(block.timestamp >= lockUntil[msg.sender], "Liquidity locked");
    return BaseHook.beforeRemoveLiquidity.selector;
}
```

### 3. **Oracle Hook**
```solidity
// Maintain TWAP oracle updated on every swap
uint256[] public observations;

function afterSwap(...) external override returns (bytes4) {
    observations.push(getCurrentPrice());
    return BaseHook.afterSwap.selector;
}
```

### 4. **LP Reward Hook**
```solidity
// Extra EAGLE rewards for LPs based on time
function beforeAddLiquidity(...) external override returns (bytes4) {
    // Start tracking LP position
    lpRewards.startTracking(msg.sender);
    return BaseHook.beforeAddLiquidity.selector;
}
```

---

## 🔍 Key Contracts to Study

### From v4-core:
1. `PoolManager.sol` - Main pool manager
2. `Hooks.sol` - Hook validation and calls
3. `Pool.sol` - Pool logic
4. `ProtocolFees.sol` - Fee handling

### From v4-periphery:
1. `PositionManager.sol` - LP position NFTs
2. `V4Router.sol` - Swap routing
3. `BaseHook.sol` - Hook base contract
4. Examples in `/contracts/hooks/examples/`

---

## ⚠️ Important Considerations

### Security:
- **Audit your hooks** - Custom logic = custom risks
- Test extensively on testnet (Sepolia)
- Start with simple hooks, add complexity later
- Consider using OpenZeppelin's hooks patterns

### Economics:
- **Initial Price**: Set carefully to prevent arbitrage
- **Initial Liquidity**: Recommend $50k+ to start
- **Fee Tier**: 2% (premium tier for new tokens, attracts LPs)
- **Price Range**: ±20-50% for concentrated liquidity

### User Experience:
- Native ETH support means users don't need WETH
- Clear docs explaining hook features
- UI to show hook benefits (rewards, fees, etc.)
- Analytics dashboard for pool metrics

---

## 📊 Monitoring & Analytics

### Key Metrics to Track:
- Trading volume (24h, 7d, 30d)
- TVL (Total Value Locked)
- Fee generation
- Hook-specific metrics (rewards distributed, etc.)
- LP position health
- EAGLE price impact

### Tools:
- Dune Analytics (create custom V4 dashboard)
- The Graph (subgraph for your hook)
- Internal analytics API

---

## 🚀 Launch Timeline

| Week | Task | Status |
|------|------|--------|
| 1 | Install V4 dependencies, design hooks | 📋 Planning |
| 2 | Develop & test hook contracts | ⏳ Pending |
| 3 | Deploy to testnet, frontend integration | ⏳ Pending |
| 4 | Audit, final testing | ⏳ Pending |
| 5 | Mainnet deployment, add liquidity | ⏳ Pending |
| 6 | Marketing, community launch | ⏳ Pending |

---

## 📚 Resources

### Official Docs:
- [Uniswap V4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [V4 Core GitHub](https://github.com/Uniswap/v4-core)
- [V4 Periphery GitHub](https://github.com/Uniswap/v4-periphery)
- [Hooks Guide](https://docs.uniswap.org/contracts/v4/guides/hooks/hook-examples)

### Community:
- [Uniswap Discord](https://discord.com/invite/uniswap)
- [Hook Ideas Forum](https://gov.uniswap.org/)

### Examples:
- Hook examples in v4-periphery repo
- [Paradigm's Hook Examples](https://github.com/paradigm/hooks-examples)

---

## 🎯 Next Steps

1. **Today**: Install V4 dependencies
   ```bash
   cd /home/akitav2/eagle-ovault-clean
   npm install @uniswap/v4-sdk @uniswap/v4-core @uniswap/v4-periphery
   git submodule add https://github.com/Uniswap/v4-core lib/v4-core
   git submodule add https://github.com/Uniswap/v4-periphery lib/v4-periphery
   ```

2. **This Week**: Design your hook
   - Start simple (fee distribution or basic oracle)
   - Review hook examples in v4-periphery
   - Sketch out hook logic

3. **Next Week**: Implement and test
   - Create `contracts/hooks/EagleBasicHook.sol`
   - Write comprehensive tests
   - Deploy to Sepolia testnet

4. **Month 1**: Production deployment
   - Audit hook (if complex)
   - Deploy to mainnet
   - Add initial liquidity
   - Launch with marketing

---

## 💡 Pro Tips

1. **Start Simple**: Don't over-engineer your first hook. A basic fee distribution hook is powerful and safe.

2. **Test Thoroughly**: V4 is new. Test on Sepolia for weeks before mainnet.

3. **Community**: Join Uniswap Discord, learn from other hook developers.

4. **Gas Optimization**: V4 is already efficient, but optimize your hook logic.

5. **Documentation**: Document your hook features clearly for users.

6. **Upgradability**: Consider if you need upgradeable hooks (use proxy pattern).

---

## 🎨 Marketing Angle

**"EAGLE/ETH - The First [Your Feature] Pool on Uniswap V4"**

Positioning ideas:
- First yield-bearing pool on V4
- First fee-sharing pool on V4
- First liquidity-locked pool on V4
- Pioneer in V4 innovation

This creates buzz and establishes EAGLE as innovative!

---

**Questions? Need help with implementation? Let's build the future of DeFi! 🦅💎**

