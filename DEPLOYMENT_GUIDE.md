# 🦅 Eagle Vault Deployment Guide

Complete guide for deploying Eagle Vault with LayerZero V2 configuration.

## 📋 Prerequisites

1. **Node.js & npm** installed
2. **Hardhat** configured with your networks
3. **Private key** with ETH on all target chains
4. **RPC endpoints** configured in `hardhat.config.ts`

## 🚀 Quick Deployment (All Chains)

### Option 1: Automated Multi-Chain Deployment

```bash
# Deploy on all chains automatically
bash scripts/deploy-all-chains.sh
```

This script will:
- ✅ Deploy contracts on Ethereum, Arbitrum, Base, BSC
- ✅ Configure LayerZero V2 peers and DVNs
- ✅ Set enforced options for gas safety
- ✅ Verify all configurations
- ✅ Generate deployment summary

### Option 2: Manual Chain-by-Chain

```bash
# Deploy on each chain individually
npx hardhat run scripts/deploy-and-configure-complete.ts --network ethereum
npx hardhat run scripts/deploy-and-configure-complete.ts --network arbitrum
npx hardhat run scripts/deploy-and-configure-complete.ts --network base
npx hardhat run scripts/deploy-and-configure-complete.ts --network bsc

# Then configure LayerZero (run after all chains are deployed)
npx hardhat run scripts/deploy-and-configure-complete.ts --network ethereum
npx hardhat run scripts/deploy-and-configure-complete.ts --network arbitrum
npx hardhat run scripts/deploy-and-configure-complete.ts --network base
npx hardhat run scripts/deploy-and-configure-complete.ts --network bsc
```

## 🔍 Verification

### Verify LayerZero Configuration

```bash
# Check configuration on each chain
npx hardhat run scripts/verify-layerzero-config.ts --network ethereum
npx hardhat run scripts/verify-layerzero-config.ts --network arbitrum
npx hardhat run scripts/verify-layerzero-config.ts --network base
npx hardhat run scripts/verify-layerzero-config.ts --network bsc
```

### Test Cross-Chain Transfers

```bash
# Test from current chain to all others
npx hardhat run scripts/test-cross-chain.ts --network ethereum
```

## 📊 What Gets Deployed

### Ethereum (Hub Chain)
- **EagleOVault.sol** - Main yield-generating vault
- **EagleShareAdapter.sol** - Wraps vault shares for cross-chain
- **WLFIAdapter.sol** - Wraps WLFI tokens (if WLFI exists on Ethereum)
- **USD1Adapter.sol** - Wraps USD1 tokens (if USD1 exists on Ethereum)
- **EagleComposer.sol** - Cross-chain orchestration

### Other Chains (Arbitrum, Base, BSC)
- **EagleShareOFT.sol** - Cross-chain vault shares
- **WLFIAssetOFT.sol** - WLFI tokens (if WLFI doesn't exist natively)
- **USD1AssetOFT.sol** - USD1 tokens (if USD1 doesn't exist natively)
- **EagleComposer.sol** - Cross-chain orchestration

## ⚙️ Configuration Details

### LayerZero V2 Settings

Each deployment automatically configures:

1. **Peers**: All contracts are connected to their counterparts on other chains
2. **DVNs**: Multi-DVN security with LayerZero + Google Cloud + Chainlink
3. **Enforced Options**: 200k gas limit for cross-chain message execution
4. **Libraries**: Explicit ULN V2 libraries (not defaults)
5. **Delegates**: Deployer address set as delegate for configuration

### Security Configuration

- **Required DVNs**: LayerZero Labs + Google Cloud (2 required)
- **Optional DVNs**: Chainlink (1 optional, threshold 1)
- **Confirmations**: 15 blocks on source, 10 blocks on destination
- **Executors**: Official LayerZero V2 executors on each chain

## 📁 Generated Files

### `deployed-addresses.json`
Contains all deployed contract addresses across all chains:

```json
{
  "ethereum": {
    "eagleOVault": "0x...",
    "eagleShareAdapter": "0x...",
    "wlfiAdapter": "0x...",
    "usd1Adapter": "0x...",
    "eagleComposer": "0x..."
  },
  "arbitrum": {
    "eagleShareOFT": "0x...",
    "wlfiAssetOFT": "0x...",
    "usd1AssetOFT": "0x...",
    "eagleComposer": "0x..."
  }
}
```

### `deployment-summary.txt`
Summary of deployment results and status.

## 🛠️ Manual Configuration (Advanced)

If you need to configure LayerZero settings manually:

### Set Peers

```bash
npx hardhat run scripts/configure-layerzero-production.ts --network ethereum
```

### Configure DVN Security

```bash
npx hardhat run scripts/configure-dvn-security.ts --network ethereum
```

## 🧪 Testing

### 1. Verify Configuration
```bash
npx hardhat run scripts/verify-layerzero-config.ts --network ethereum
```

### 2. Test Cross-Chain Transfer
```bash
npx hardhat run scripts/test-cross-chain.ts --network ethereum
```

### 3. Check LayerZero Scan
Visit [LayerZero Scan](https://layerzeroscan.com) to track message status.

## ⚠️ Important Notes

### Before Mainnet Deployment

1. **Test on Testnets**: Deploy on testnets first (Sepolia, Arbitrum Sepolia, etc.)
2. **Verify Token Addresses**: Update WLFI and USD1 token addresses in scripts
3. **Check Registry**: Ensure your registry contract is deployed and configured
4. **Fund Deployer**: Ensure sufficient ETH balance on all chains
5. **Backup Keys**: Secure your private keys and have backup access

### Production Checklist

- [ ] All contracts deployed successfully
- [ ] All LayerZero peers configured
- [ ] All DVN configurations set
- [ ] All enforced options configured
- [ ] Cross-chain transfers tested
- [ ] Ownership transferred to final controllers
- [ ] Emergency controls tested
- [ ] Monitoring set up

### Security Best Practices

- [ ] Use multi-sig for ownership
- [ ] Set up monitoring alerts
- [ ] Document all contract addresses
- [ ] Implement emergency pause procedures
- [ ] Regular security audits
- [ ] Test emergency scenarios

## 🆘 Troubleshooting

### Common Issues

**"No deployed addresses found"**
- Run deployment scripts first
- Check `deployed-addresses.json` exists

**"Insufficient funds for gas"**
- Add more ETH to deployer wallet
- Reduce gas limits in scripts

**"DVN configuration failed"**
- Verify DVN addresses are correct for each chain
- Check if DVNs are active and operational

**"Peer verification failed"**
- Ensure contracts are deployed on both sides
- Verify EIDs are correct in configuration

**"Cross-chain transfer failed"**
- Check enforced options gas limits
- Verify peer configurations
- Check LayerZero Scan for error details

### Getting Help

1. **LayerZero Documentation**: https://docs.layerzero.network/v2
2. **LayerZero Discord**: https://discord.gg/layerzero
3. **Eagle Vault Issues**: Check project repository

## 📈 Post-Deployment

After successful deployment:

1. **Update Frontend**: Update contract addresses in your dApp
2. **Documentation**: Update API documentation with new addresses
3. **Monitoring**: Set up monitoring for contract events
4. **Team Access**: Share addresses with team members
5. **User Communication**: Announce new deployment to users

---

**🎉 Congratulations! Your Eagle Vault omnichain system is now live!**

Your users can now:
- Deposit assets on Ethereum into the yield-generating vault
- Receive EAGLE share tokens representing their vault position
- Transfer EAGLE shares across any supported chain
- Redeem EAGLE shares for underlying assets anytime
