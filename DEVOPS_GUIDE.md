# Eagle OVault DevOps Guide

## Table of Contents
- [Overview](#overview)
- [Infrastructure Architecture](#infrastructure-architecture)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment Process](#deployment-process)
- [Monitoring & Alerting](#monitoring--alerting)
- [Secret Management](#secret-management)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Overview

Eagle OVault is a multi-chain DeFi protocol deployed on:
- **Hub Chain**: Ethereum (main vault + strategy)
- **Spoke Chains**: BSC, Arbitrum, Base, Avalanche (user entry points)

### Technology Stack
- **Smart Contracts**: Solidity 0.8.22 (Foundry + Hardhat)
- **Cross-Chain**: LayerZero V2
- **Frontend**: React + Vite (deployed on Vercel)
- **Infrastructure**: AWS (EC2, S3, Secrets Manager, CloudWatch)
- **Monitoring**: Prometheus + Grafana + Alertmanager
- **IaC**: Terraform

## Infrastructure Architecture

### Components

#### Compute
- **EC2 Instance** (`t3.large`): Runs monitoring stack
  - Prometheus (metrics collection)
  - Grafana (visualization)
  - Alertmanager (alert routing)
  - Node Exporter (system metrics)

#### Storage
- **S3 Bucket**: Deployment artifacts and backups
- **EBS Volume**: 100GB for monitoring data

#### Networking
- **VPC**: Isolated network for monitoring
- **Public Subnets**: Internet-facing resources
- **Private Subnets**: Internal services
- **Security Groups**: Firewall rules

#### Security
- **AWS Secrets Manager**: Sensitive credentials
- **IAM Roles**: Service permissions
- **SSH Key Pair**: Secure instance access

### Network Topology

```
Internet
   |
   v
Internet Gateway
   |
   v
Public Subnet
   |
   +-- EC2 (Monitoring) [Grafana:3000, Prometheus:9090]
   |
Private Subnet
   |
   +-- (Reserved for future services)
```

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Test Workflow (`.github/workflows/test.yml`)
**Triggers**: Push to main/develop, Pull Requests

**Jobs**:
1. **Lint**: Solidity code quality checks
2. **Compile**: Build contracts with Foundry & Hardhat
3. **Test (Foundry)**: Run Forge tests with gas reporting
4. **Test (Hardhat)**: Run Hardhat tests with coverage
5. **Slither**: Security analysis
6. **Deployment Dry Run**: Validate deployment scripts
7. **Frontend Test**: Build and test React app

**Artifacts**:
- Compiled contracts
- Gas reports
- Coverage reports
- Slither analysis

#### 2. Deploy Workflow (`.github/workflows/deploy.yml`)
**Triggers**: Manual workflow dispatch

**Parameters**:
- `environment`: staging | production
- `chains`: comma-separated or "all"
- `verify`: enable contract verification

**Jobs**:
1. **Pre-Deployment Checks**: Validate configuration
2. **Deploy Ethereum** (Hub): Deploy main vault
3. **Deploy Spokes** (Parallel): BSC, Arbitrum, Base, Avalanche
4. **Configure Cross-Chain**: Set up LayerZero peers
5. **Deploy Frontend**: Vercel deployment
6. **Post-Deployment Tests**: Integration testing
7. **Notify**: Slack notifications

### Required Secrets

Store in GitHub Actions Secrets:

```
DEPLOYER_PRIVATE_KEY      # Wallet private key
ETHEREUM_RPC_URL          # Alchemy/Infura endpoint
ETHERSCAN_API_KEY         # Contract verification
VERCEL_TOKEN              # Frontend deployment
SLACK_WEBHOOK_URL         # Notifications
AWS_ACCESS_KEY_ID         # Infrastructure access
AWS_SECRET_ACCESS_KEY     # Infrastructure access
GRAFANA_ADMIN_PASSWORD    # Monitoring access
```

## Deployment Process

### Manual Deployment

#### Prerequisites
```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Load secrets from AWS
source <(./scripts/secrets/load-secrets.sh)
```

#### Deploy to All Chains
```bash
npx ts-node scripts/deployment/orchestrator.ts deploy
```

#### Deploy to Specific Chains
```bash
npx ts-node scripts/deployment/orchestrator.ts deploy ethereum,bsc
```

#### Deployment Steps

1. **Pre-Deployment**
   ```bash
   pnpm precheck
   pnpm validate:system
   ```

2. **Deploy Hub (Ethereum)**
   ```bash
   pnpm deploy:production:forge
   ```

3. **Deploy Spokes**
   ```bash
   npx hardhat lz:deploy --tags ovault --networks bsc
   npx hardhat lz:deploy --tags ovault --networks arbitrum
   npx hardhat lz:deploy --tags ovault --networks base
   npx hardhat lz:deploy --tags ovault --networks avalanche
   ```

4. **Configure Cross-Chain**
   ```bash
   pnpm configure:all
   ```

5. **Verify Contracts**
   ```bash
   pnpm verify:bsc
   pnpm verify:arbitrum
   pnpm verify:base
   pnpm verify:avalanche
   ```

6. **Post-Deployment**
   ```bash
   npx ts-node scripts/deployment/health-check.ts
   npx ts-node scripts/deployment/post-deployment-tests.ts
   ```

### Rollback Procedure

```bash
# Initiate rollback
npx ts-node scripts/deployment/orchestrator.ts rollback [chain]

# Steps:
# 1. Stop new user interactions (pause contracts if needed)
# 2. Restore previous deployment artifacts
# 3. Re-configure cross-chain connections
# 4. Verify system health
# 5. Resume operations
```

## Monitoring & Alerting

### Access Monitoring

**Grafana Dashboard**: `http://<monitoring-ip>:3000`
- Username: `admin`
- Password: From `GRAFANA_ADMIN_PASSWORD`

**Prometheus**: `http://<monitoring-ip>:9090`

**Alertmanager**: `http://<monitoring-ip>:9093`

### Key Metrics

#### Contract Health
- Total Value Locked (TVL) by chain
- Active users (24h)
- Transaction volume
- Failed transaction rate
- Contract balance monitoring

#### Cross-Chain Activity
- LayerZero message queue depth
- Cross-chain transfer rate
- Bridge failure rate
- Message delivery time

#### Infrastructure
- RPC endpoint health
- Response time (p95, p99)
- Error rates
- System resources (CPU, memory, disk)

### Alert Channels

1. **Critical Alerts** → PagerDuty + Slack `#eagle-ovault-critical`
2. **Warnings** → Slack `#eagle-ovault-warnings`
3. **Info** → Slack `#eagle-ovault-info`
4. **Security** → PagerDuty + Slack `#security-alerts`

### Alert Response Times

- **Critical**: 15 minutes
- **Warning**: 1 hour
- **Info**: 24 hours

## Secret Management

### AWS Secrets Manager

All sensitive credentials stored in AWS Secrets Manager:

```
eagle-ovault/deployer-private-key-{env}
eagle-ovault/rpc-urls-{env}
eagle-ovault/api-keys-{env}
eagle-ovault/monitoring-config-{env}
eagle-ovault/vercel-token-{env}
```

### Setup Secrets

```bash
cd scripts/secrets
./setup-secrets.sh
```

### Load Secrets

```bash
# Export to environment
source <(./scripts/secrets/load-secrets.sh)

# Or retrieve directly
aws secretsmanager get-secret-value \
  --secret-id eagle-ovault/deployer-private-key-production \
  --query SecretString \
  --output text
```

### Rotate Secrets

**Schedule**: Every 90 days

**Process**:
1. Generate new credentials
2. Update AWS Secrets Manager
3. Update GitHub Actions secrets
4. Test with staging environment
5. Deploy to production
6. Revoke old credentials

## Backup & Recovery

### Automated Backups

**Schedule**: Daily at 2 AM UTC

**Backed Up**:
- Deployment artifacts
- Monitoring data (Prometheus, Grafana)
- Configuration files
- Logs

**Location**: S3 bucket `eagle-ovault-backups-{env}`

**Retention**:
- Hot storage: 30 days
- Glacier: 31-90 days
- Deleted: After 90 days

### Manual Backup

```bash
# Run backup script
ssh ubuntu@<monitoring-ip> '/opt/eagle-ovault/backup.sh'

# Verify backup
aws s3 ls s3://eagle-ovault-backups-production/monitoring/
```

### Disaster Recovery

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 24 hours

**Recovery Steps**:

1. **Assess Damage**
   - Identify affected components
   - Review logs and metrics

2. **Restore Infrastructure**
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Restore Monitoring Data**
   ```bash
   aws s3 sync \
     s3://eagle-ovault-backups-production/monitoring/latest/ \
     /opt/eagle-ovault/monitoring/
   ```

4. **Verify Services**
   ```bash
   npx ts-node scripts/deployment/health-check.ts
   ```

5. **Resume Operations**
   - Update DNS if needed
   - Notify stakeholders
   - Monitor closely for 24h

## Troubleshooting

### Common Issues

#### 1. Deployment Fails

**Symptoms**: Transaction reverts, gas estimation fails

**Diagnosis**:
```bash
# Check RPC connectivity
curl -X POST $ETHEREUM_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check deployer balance
cast balance $DEPLOYER_ADDRESS --rpc-url $ETHEREUM_RPC_URL

# Check gas prices
cast gas-price --rpc-url $ETHEREUM_RPC_URL
```

**Solutions**:
- Ensure sufficient ETH balance
- Increase gas limits
- Wait for network congestion to clear
- Switch to backup RPC endpoint

#### 2. Cross-Chain Messages Stuck

**Symptoms**: LayerZero messages not delivered

**Diagnosis**:
```bash
# Check message queue
npx ts-node scripts/deployment/health-check.ts

# Check LayerZero scan
# Visit: https://layerzeroscan.com
```

**Solutions**:
- Wait for DVN confirmation (can take 5-10 mins)
- Check if destination chain is healthy
- Verify peer configuration
- Contact LayerZero support if > 1 hour

#### 3. Monitoring Down

**Symptoms**: Grafana unreachable

**Diagnosis**:
```bash
# SSH to monitoring instance
ssh ubuntu@<monitoring-ip>

# Check services
sudo systemctl status eagle-monitoring
docker ps

# Check logs
docker logs prometheus
docker logs grafana
```

**Solutions**:
```bash
# Restart monitoring stack
sudo systemctl restart eagle-monitoring

# Or manually
cd /opt/eagle-ovault/monitoring
docker-compose restart
```

#### 4. High Gas Costs

**Symptoms**: Deployments too expensive

**Solutions**:
- Wait for lower gas prices (use https://etherscan.io/gastracker)
- Deploy during off-peak hours (weekends, late night UTC)
- Use gas optimization flags in compiler
- Consider L2 deployment first

### Getting Help

1. **Check Documentation**: This guide + INCIDENT_RESPONSE.md
2. **Review Logs**: CloudWatch, Grafana, Docker logs
3. **Check Monitoring**: Grafana dashboards
4. **Team Channels**:
   - Slack: `#devops` for questions
   - PagerDuty: For critical issues
5. **External Support**:
   - LayerZero: Discord server
   - Alchemy/Infura: Support tickets

## Maintenance Tasks

### Daily
- [ ] Review monitoring dashboards
- [ ] Check alert notifications
- [ ] Verify backup completion

### Weekly
- [ ] Review gas costs and optimize
- [ ] Update dependencies (patch versions)
- [ ] Review error logs
- [ ] Test backup restore procedure

### Monthly
- [ ] Security audit review
- [ ] Update system packages
- [ ] Review and optimize infrastructure costs
- [ ] Test disaster recovery procedure

### Quarterly
- [ ] Rotate secrets and credentials
- [ ] Major dependency updates
- [ ] Infrastructure security review
- [ ] Capacity planning review

## Useful Commands

```bash
# Quick health check
npx ts-node scripts/deployment/health-check.ts

# Check contract on chain
cast code <CONTRACT_ADDRESS> --rpc-url <RPC_URL>

# View recent transactions
cast logs --address <CONTRACT_ADDRESS> --rpc-url <RPC_URL>

# Estimate gas for deployment
pnpm estimate-gas

# Test RPC endpoint
cast block latest --rpc-url <RPC_URL>

# Check deployer nonce
cast nonce <ADDRESS> --rpc-url <RPC_URL>

# View Grafana logs
ssh ubuntu@<ip> 'docker logs grafana --tail 100'

# Terraform status
cd infrastructure/terraform && terraform show
```

## Contact Information

**DevOps Team**: devops@eagle-ovault.com
**Security Team**: security@eagle-ovault.com
**On-Call**: PagerDuty rotation

---

*Last Updated: 2025-10-31*
*Version: 1.0*

