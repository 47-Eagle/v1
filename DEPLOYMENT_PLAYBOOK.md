# Eagle OVault Deployment Playbook

## Table of Contents
- [Pre-Deployment](#pre-deployment)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment](#post-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Emergency Procedures](#emergency-procedures)
- [Deployment Checklist](#deployment-checklist)

## Pre-Deployment

### Prerequisites

#### 1. Environment Setup

```bash
# Clone repository
git clone https://github.com/eagle-ovault/smart-contracts.git
cd smart-contracts

# Install dependencies
pnpm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values
```

#### 2. Load Secrets

```bash
# From AWS Secrets Manager
source <(./scripts/secrets/load-secrets.sh)

# Verify secrets loaded
echo $ETHEREUM_RPC_URL | head -c 20
```

#### 3. Verify Tooling

```bash
# Check Node version
node --version  # Should be v20+

# Check Foundry
forge --version

# Check Hardhat
npx hardhat --version

# Check network connectivity
cast block-number --rpc-url $ETHEREUM_RPC_URL
```

#### 4. Verify Deployer Wallet

```bash
# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Deployer: $DEPLOYER_ADDRESS"

# Check balances on all chains
echo "Ethereum:"
cast balance $DEPLOYER_ADDRESS --rpc-url $ETHEREUM_RPC_URL --ether

echo "BSC:"
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_RPC_URL --ether

echo "Arbitrum:"
cast balance $DEPLOYER_ADDRESS --rpc-url $ARBITRUM_RPC_URL --ether

echo "Base:"
cast balance $DEPLOYER_ADDRESS --rpc-url $BASE_RPC_URL --ether

echo "Avalanche:"
cast balance $DEPLOYER_ADDRESS --rpc-url $AVALANCHE_RPC_URL --ether
```

**Required Balances** (Mainnet):
- Ethereum: ≥ 0.5 ETH
- BSC: ≥ 0.1 BNB
- Arbitrum: ≥ 0.05 ETH
- Base: ≥ 0.05 ETH
- Avalanche: ≥ 1 AVAX

### Pre-Deployment Checks

#### 1. Run Automated Checks

```bash
# Run pre-deployment validation
pnpm precheck

# Expected output:
# ✅ Environment variables validated
# ✅ Network connectivity verified
# ✅ Compiler versions correct
# ✅ Dependencies up to date
```

#### 2. Run Test Suite

```bash
# Foundry tests
forge test -vvv

# Hardhat tests
pnpm hardhat test

# Coverage check (should be > 80%)
pnpm hardhat coverage
```

#### 3. Gas Estimation

```bash
# Estimate deployment costs
pnpm estimate-gas

# Example output:
# Ethereum deployment: ~0.15 ETH
# Spoke deployments: ~0.02 ETH each
# Total estimated: ~0.23 ETH
```

#### 4. Security Review

```bash
# Run Slither analysis
slither .

# Review findings
# Should have no HIGH or CRITICAL findings
```

#### 5. Validate System

```bash
# System validation
pnpm validate:system

# Checks:
# - Contract bytecode hashes
# - Configuration files
# - LayerZero setup
# - Network parameters
```

### Team Coordination

#### 1. Schedule Deployment

**Best Time Windows**:
- **Ethereum**: Weekend mornings UTC (lower gas)
- **Avoid**: ETH NFT drops, major DeFi events
- **Duration**: Allow 4-6 hours

#### 2. Notify Stakeholders

**Internal**:
- Engineering team
- Product team
- Customer support

**External** (for major upgrades):
- Social media announcement (24h notice)
- Discord/Telegram communities
- Email to active users

#### 3. Deployment Team Roles

- **Commander**: Senior DevOps Engineer
- **Executor**: Smart Contract Engineer
- **Verifier**: QA Engineer
- **Monitor**: Backend Engineer
- **Communicator**: Product Manager

### Backup Current State

```bash
# Backup current deployment artifacts
mkdir -p backups/$(date +%Y%m%d)
cp -r deployments/* backups/$(date +%Y%m%d)/

# Backup to S3
aws s3 sync deployments/ \
  s3://eagle-ovault-backups-production/pre-deployment-$(date +%Y%m%d)/
```

## Deployment Steps

### Phase 1: Deploy Ethereum Hub (Main Chain)

**Duration**: 30-60 minutes

#### 1.1 Deploy Contracts

```bash
# Start deployment
pnpm deploy:production:forge

# This deploys:
# - EagleOVault (main vault)
# - Charm Liquidity Strategy
# - Supporting contracts

# Monitor progress in terminal
# Save deployment output
```

#### 1.2 Verify Deployment

```bash
# Check contract addresses
cat deployments/ethereum/EagleOVault.json

# Verify bytecode
OVAULT_ADDR=$(jq -r .address deployments/ethereum/EagleOVault.json)
cast code $OVAULT_ADDR --rpc-url $ETHEREUM_RPC_URL

# Should return bytecode (starts with 0x60...)
```

#### 1.3 Verify on Etherscan

```bash
# Automatic verification (if configured)
forge verify-contract \
  $OVAULT_ADDR \
  src/EagleOVault.sol:EagleOVault \
  --chain ethereum \
  --watch

# Or manually upload via Etherscan UI
```

#### 1.4 Smoke Test

```bash
# Check basic functions
cast call $OVAULT_ADDR "name()(string)" --rpc-url $ETHEREUM_RPC_URL
# Expected: "Eagle OVault"

cast call $OVAULT_ADDR "totalAssets()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0 (initially)

cast call $OVAULT_ADDR "paused()(bool)" --rpc-url $ETHEREUM_RPC_URL
# Expected: false
```

### Phase 2: Deploy Spoke Chains

**Duration**: 60-90 minutes

Deploy to spoke chains in order: BSC → Arbitrum → Base → Avalanche

#### 2.1 Deploy to BSC

```bash
# Deploy
npx hardhat lz:deploy --tags ovault --networks bsc

# Verify
BSC_OVAULT=$(jq -r .address deployments/bsc/EagleOVault.json)
cast code $BSC_OVAULT --rpc-url $BSC_RPC_URL

# Configure
pnpm configure:bsc

# Wait 5 minutes between chains
sleep 300
```

#### 2.2 Deploy to Arbitrum

```bash
npx hardhat lz:deploy --tags ovault --networks arbitrum
ARB_OVAULT=$(jq -r .address deployments/arbitrum/EagleOVault.json)
cast code $ARB_OVAULT --rpc-url $ARBITRUM_RPC_URL
pnpm configure:arbitrum
sleep 300
```

#### 2.3 Deploy to Base

```bash
npx hardhat lz:deploy --tags ovault --networks base
BASE_OVAULT=$(jq -r .address deployments/base/EagleOVault.json)
cast code $BASE_OVAULT --rpc-url $BASE_RPC_URL
pnpm configure:base
sleep 300
```

#### 2.4 Deploy to Avalanche

```bash
npx hardhat lz:deploy --tags ovault --networks avalanche
AVAX_OVAULT=$(jq -r .address deployments/avalanche/EagleOVault.json)
cast code $AVAX_OVAULT --rpc-url $AVALANCHE_RPC_URL
pnpm configure:avalanche
```

### Phase 3: Configure Cross-Chain Connections

**Duration**: 30-45 minutes

#### 3.1 Set LayerZero Peers

```bash
# Configure all peer connections
pnpm configure:all

# This sets up:
# - Ethereum ↔ BSC
# - Ethereum ↔ Arbitrum
# - Ethereum ↔ Base
# - Ethereum ↔ Avalanche
```

#### 3.2 Verify Peer Configuration

```bash
# Verify each spoke can reach hub
pnpm verify:bsc
pnpm verify:arbitrum
pnpm verify:base
pnpm verify:avalanche

# Expected output for each:
# ✅ Peer set correctly
# ✅ Can communicate with hub
```

#### 3.3 Configure DVN Settings

```bash
# Configure LayerZero DVN for security
npx ts-node scripts/configure-layerzero-dvn.ts
```

### Phase 4: Deploy Frontend

**Duration**: 15-30 minutes

#### 4.1 Update Contract Addresses

```bash
# Create frontend .env
cat > frontend/.env.production <<EOF
VITE_ETHEREUM_OVAULT_ADDRESS=$OVAULT_ADDR
VITE_BSC_OVAULT_ADDRESS=$BSC_OVAULT
VITE_ARBITRUM_OVAULT_ADDRESS=$ARB_OVAULT
VITE_BASE_OVAULT_ADDRESS=$BASE_OVAULT
VITE_AVALANCHE_OVAULT_ADDRESS=$AVAX_OVAULT

VITE_ETHEREUM_RPC_URL=$ETHEREUM_RPC_URL
VITE_BSC_RPC_URL=$BSC_RPC_URL
VITE_ARBITRUM_RPC_URL=$ARBITRUM_RPC_URL
VITE_BASE_RPC_URL=$BASE_RPC_URL
VITE_AVALANCHE_RPC_URL=$AVALANCHE_RPC_URL
EOF
```

#### 4.2 Build and Deploy to Vercel

```bash
cd frontend

# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod

# Or via GitHub Actions:
# The deploy workflow will handle this automatically
```

#### 4.3 Verify Frontend

```bash
# Check deployment
curl -I https://eagle-ovault.com

# Should return 200 OK

# Test in browser:
# - Connect wallet
# - View balances
# - Check all chains visible
```

### Phase 5: Post-Deployment Testing

**Duration**: 30-60 minutes

#### 5.1 Health Check

```bash
# Run comprehensive health check
npx ts-node scripts/deployment/health-check.ts

# Expected output:
# ✅ Ethereum: Healthy
# ✅ BSC: Healthy
# ✅ Arbitrum: Healthy
# ✅ Base: Healthy
# ✅ Avalanche: Healthy
```

#### 5.2 Integration Tests

```bash
# Run post-deployment tests
npx ts-node scripts/deployment/post-deployment-tests.ts

# Tests:
# ✅ RPC connectivity
# ✅ Contract deployments
# ✅ Cross-chain peer configuration
# ✅ Basic functionality
```

#### 5.3 End-to-End Test (Testnet First!)

```bash
# Test deposit flow (with small amount)
# 1. Deposit on spoke chain
# 2. Verify message sent
# 3. Verify received on hub
# 4. Check balance updated

# Test withdrawal flow
# 1. Request withdrawal
# 2. Verify message sent
# 3. Verify received on spoke
# 4. Withdraw funds
```

## Post-Deployment

### Update Documentation

```bash
# Generate contract documentation
pnpm docs:generate

# Update deployment addresses in README
# Commit and push
git add deployments/ README.md docs/
git commit -m "feat: production deployment $(date +%Y-%m-%d)"
git push origin main
```

### Backup Deployment Artifacts

```bash
# Backup to S3
aws s3 sync deployments/ \
  s3://eagle-ovault-backups-production/deployments-$(date +%Y%m%d)/

# Create deployment summary
npx ts-node scripts/deployment/orchestrator.ts

# Save summary
cp deployments/deployment-summary.md \
  docs/deployments/deployment-$(date +%Y%m%d).md
```

### Configure Monitoring

```bash
# Update Grafana with new contract addresses
# Add annotations for deployment
curl -X POST http://grafana:3000/api/annotations \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Production deployment",
    "tags": ["deployment", "production"],
    "time": '$(date +%s000)'
  }'
```

### Enable Monitoring Alerts

```bash
# Verify all alerts active
curl http://prometheus:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.state=="firing")'

# Should show no firing alerts initially
```

### Announce Deployment

**Internal**:
```
✅ Eagle OVault deployed successfully!

📍 Chains: Ethereum, BSC, Arbitrum, Base, Avalanche
🔗 Frontend: https://eagle-ovault.com
📊 Monitoring: https://grafana.eagle-ovault.com
📖 Docs: https://docs.eagle-ovault.com

Contract Addresses:
- Ethereum: 0x...
- BSC: 0x...
- Arbitrum: 0x...
- Base: 0x...
- Avalanche: 0x...
```

**External** (Social Media):
```
🦅 Eagle OVault is now LIVE on mainnet!

Multi-chain liquidity management across:
✅ Ethereum
✅ BSC
✅ Arbitrum
✅ Base
✅ Avalanche

Start earning now: https://eagle-ovault.com
```

## Rollback Procedures

### When to Rollback

- Critical bug discovered
- Security vulnerability
- Funds at risk
- Unrecoverable state

### Rollback Steps

#### 1. Immediate Actions

```bash
# Pause all contracts (if pausable)
cast send $OVAULT_ADDR "pause()" \
  --private-key $ADMIN_KEY \
  --rpc-url $ETHEREUM_RPC_URL

# Repeat for all chains
```

#### 2. Assess Situation

```bash
# Review what went wrong
# Check logs
docker logs prometheus
cast logs --address $OVAULT_ADDR --from-block -1000

# Assess user impact
npx ts-node scripts/assess-impact.ts
```

#### 3. Restore Previous State

```bash
# Restore from backup
aws s3 sync \
  s3://eagle-ovault-backups-production/pre-deployment-YYYYMMDD/ \
  deployments/

# Redeploy previous version if needed
git checkout <previous-release-tag>
pnpm deploy:production:forge
```

#### 4. Verify Restoration

```bash
# Run health checks
npx ts-node scripts/deployment/health-check.ts

# Verify user funds safe
npx ts-node scripts/verify-user-funds.ts
```

#### 5. Communicate

```
⚠️ We've temporarily paused operations to address an issue.

User funds are secure. We're working on a resolution.

Updates every 30 minutes.

Status: https://status.eagle-ovault.com
```

## Emergency Procedures

### Emergency Contact Tree

1. **Discover Issue** → Page on-call engineer
2. **On-Call** → Assess & notify team lead
3. **Team Lead** → Escalate if SEV-1
4. **Engineering Lead** → Notify CTO/CEO

### Emergency Actions

#### Pause All Contracts

```bash
# Quick pause script
./scripts/emergency-pause-all.sh

# Or manually:
for chain in ethereum bsc arbitrum base avalanche; do
  cast send $OVAULT_ADDR "pause()" \
    --private-key $ADMIN_KEY \
    --rpc-url $(eval echo \$${chain^^}_RPC_URL)
done
```

#### Disable Frontend

```bash
# Deploy maintenance page
cd frontend
echo "Under maintenance" > public/maintenance.html
vercel --prod
```

#### Notify Users

```bash
# Send via all channels
./scripts/emergency-notification.sh \
  "Operations temporarily paused. User funds secure."
```

## Deployment Checklist

### Pre-Deployment ✅

- [ ] Environment configured
- [ ] Secrets loaded
- [ ] Tooling verified
- [ ] Deployer wallet funded
- [ ] Tests passing (100%)
- [ ] Security review complete
- [ ] Gas estimated
- [ ] Team notified
- [ ] Backup created

### Deployment ✅

- [ ] Ethereum deployed
- [ ] Ethereum verified
- [ ] BSC deployed
- [ ] Arbitrum deployed
- [ ] Base deployed
- [ ] Avalanche deployed
- [ ] All contracts verified
- [ ] Cross-chain configured
- [ ] Peers verified
- [ ] Frontend deployed

### Post-Deployment ✅

- [ ] Health check passed
- [ ] Integration tests passed
- [ ] End-to-end test passed
- [ ] Documentation updated
- [ ] Artifacts backed up
- [ ] Monitoring configured
- [ ] Alerts enabled
- [ ] Team notified
- [ ] Public announcement

### 24-Hour Watch ✅

- [ ] Monitor dashboards
- [ ] Check error rates
- [ ] Verify transactions
- [ ] Review user feedback
- [ ] No critical alerts

---

**Document Owner**: DevOps Team
**Last Updated**: 2025-10-31
**Version**: 1.0

*Review and update after each deployment based on lessons learned.*

