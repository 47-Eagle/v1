# Eagle Vault - Production Addresses (Ethereum Mainnet)

## 🎯 **Active Deployment (October 18, 2025)**

### Core Contracts
| Contract | Address | Status |
|----------|---------|--------|
| **EagleOVault V6** | `0x1e6049cC14a484049392FEd9077c0931A71F8285` | ✅ **LIVE** |
| **CharmStrategyUSD1** | `0x7DE0041De797c9b95E45DF27492f6021aCF691A0` | ✅ **ACTIVE** |

### External Integrations
| Contract | Address | Purpose |
|----------|---------|---------|
| **Charm USD1/WLFI Vault** | `0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71` | Yield generation |
| **WLFI Token** | `0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6` | Asset token |
| **USD1 Token** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | Stablecoin |
| **USD1 Price Feed** | `0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d` | Chainlink oracle |
| **WLFI/USD1 Pool** | `0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d` | Uniswap V3 1% |
| **Uniswap Router** | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | Swaps |

---

## 📝 **Configuration**

### Vault Settings
- **Deployment Threshold**: $100 USD
- **Min Deployment Interval**: 3600 seconds (1 hour)
- **Max Total Supply**: 50,000,000 shares
- **Shares Per USD**: 80,000

### CharmStrategy Settings
- **Pool**: USD1/WLFI (1% fee tier)
- **Routing**: Optimal ratio matching
- **Approvals**: All initialized
- **Max Slippage**: 5%

---

## 🌐 **Frontend**

**Live Site**: https://test.47eagle.com  
**Repository**: https://github.com/wenakita/EagleOVaultV2  
**Deployment**: Vercel (auto-deploy on push)

---

## 📊 **Current Stats**

**Total Deposited**: ~$230 USD  
**Total Shares**: ~18.3M vEAGLE  
**APY**: ~5-8% (base) + future Charm yields  
**Status**: ✅ Fully operational  

---

## 🔗 **Useful Links**

- **Vault**: https://etherscan.io/address/0x1e6049cC14a484049392FEd9077c0931A71F8285
- **Strategy**: https://etherscan.io/address/0x7DE0041De797c9b95E45DF27492f6021aCF691A0
- **Charm Vault**: https://alpha.charm.fi/ethereum/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71

---

## 🗂️ **Old Addresses (Deprecated - DO NOT USE)**

These are previous versions with bugs/issues:

| Version | Address | Issue |
|---------|---------|-------|
| V1 | `0xf7eDdA9959249D96773BB2858bE1011C7E424855` | Oracle bug |
| V2 | `0x47ff05aaf066f50baefdcfdcadf63d3762eea91e` | Charm approval issues |
| V3 | `0x37241bD9F0404c5a08c431109820B0464041cE17` | Testing only |
| V4 | `0xA2f437252Bd1479aBE69A249DD95Fa0F39aCb58d` | Charm strategy issues |
| V5 | `0xF87299c517116Df23EdD0DE485387a79AA2175A2` | Max strategies reached |

**CharmStrategy V1**: `0xd548CbC1D0A8723838993a763f1ca20533ed0c12` - Missing approvals  
**CharmStrategy V2**: `0xb1571A0f815dCBbF649AD2eE4a18dc2D085780B8` - Wrong fee tier  
**CharmStrategy V3**: `0x6F55f3eCbAc112Cf4C833Fd9dce943EDa80b5cf5` - WLFI/WETH (wrong pool)  

---

**Always use the V6 addresses above!** ✅

