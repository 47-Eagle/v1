# 🦅 Eagle OVault Production Monitoring Setup

## ✅ What's Been Done

### 1. Production Verification ✅
- All 6 contracts verified on Ethereum mainnet
- Contract ownership confirmed (multisig controlled)
- Vanity addresses validated (5/6 contracts with 0x47... pattern)
- Production addresses integrated into `.env.production.local`

### 2. Health Monitoring ✅
- Production health check script running successfully
- All contracts responsive and operational
- Prometheus metrics being generated
- Metrics exported to `monitoring/production-metrics.prom`

### 3. Monitoring Infrastructure Created ✅
- Docker Compose configuration for monitoring stack
- Prometheus configuration for metrics collection
- Grafana dashboard for visualization
- Alertmanager for alert routing
- Alert rules for critical/warning/info notifications

## 🚀 Quick Start

### Step 1: Fix Docker Permissions (One-Time Setup)

Run these commands to allow Docker without sudo:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Activate the group (or log out and log back in)
newgrp docker

# Verify it worked
docker ps
```

### Step 2: Start the Monitoring Stack

```bash
cd monitoring
./setup-monitoring.sh
```

Or manually:

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Step 3: Access the Monitoring Dashboards

Once running, access:

- **Grafana**: http://localhost:3000
  - Username: `admin`
  - Password: `eagle-admin-2024`
  
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## 📊 Production Contract Addresses

All contracts are live on Ethereum Mainnet:

| Contract | Address | Status |
|----------|---------|--------|
| EagleRegistry | `0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e` | ✅ Live |
| EagleOVault | `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953` | ✅ Live |
| EagleShareOFT | `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E` | ✅ Live |
| EagleVaultWrapper | `0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5` | ✅ Live |
| CharmStrategyUSD1 | `0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f` | ✅ Live |
| Multisig | `0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3` | ✅ Live |

## 🔍 Health Check Commands

### Run Production Health Check

```bash
# With Alchemy RPC (recommended)
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/omeyMm6mGtblMX7rCT-QTGQvTLFD4J9F" \
  npx ts-node scripts/production/health-check-production.ts
```

### Run Production Verification

```bash
# Verify all contract deployments and state
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/omeyMm6mGtblMX7rCT-QTGQvTLFD4J9F" \
  npx ts-node scripts/production/verify-production.ts
```

## 🐳 Docker Commands

```bash
# Start monitoring stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f

# View specific service logs
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f prometheus

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# Restart monitoring stack
docker-compose -f docker-compose.monitoring.yml restart

# Stop and remove all data
docker-compose -f docker-compose.monitoring.yml down -v
```

## 📈 Monitoring Stack Components

### Prometheus
- **Port**: 9090
- **Purpose**: Metrics collection and storage
- **Retention**: 30 days
- **Config**: `monitoring/production-prometheus-config.yml`

### Grafana
- **Port**: 3000
- **Purpose**: Visualization and dashboards
- **Dashboard**: `monitoring/production-grafana-dashboard.json`
- **Credentials**: admin / eagle-admin-2024

### Alertmanager
- **Port**: 9093
- **Purpose**: Alert routing and notifications
- **Config**: `monitoring/alertmanager-config.yml`

### Node Exporter
- **Port**: 9100
- **Purpose**: System metrics collection
- **Metrics**: CPU, memory, disk, network

## ⚙️ Configuration Files

All monitoring configuration is in the `monitoring/` directory:

```
monitoring/
├── docker-compose.monitoring.yml       # Docker Compose stack definition
├── production-prometheus-config.yml    # Prometheus configuration
├── production-alert-rules.yml          # Alert rules (30+ rules)
├── production-grafana-dashboard.json   # Grafana dashboard (14 panels)
├── alertmanager-config.yml            # Alert routing configuration
└── setup-monitoring.sh                # Automated setup script
```

## 🔔 Alert Channels

Configure these environment variables for alert notifications:

```bash
# Slack
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# PagerDuty
export PAGERDUTY_SERVICE_KEY="your-pagerduty-service-key"
export PAGERDUTY_URL="https://events.pagerduty.com/v2/enqueue"

# Email
export ALERT_EMAIL="alerts@your-domain.com"
export SENDGRID_API_KEY="your-sendgrid-api-key"
```

## 🔒 Security Notes

1. **Change default Grafana password** after first login
2. **RPC URL** contains API key - keep `.env.production.local` secure
3. **Multisig address** controls all contracts - 3/5 signature threshold
4. **Start testing with SMALL amounts** (1-10 WLFI recommended)
5. **Monitor for 24-48 hours** before large transactions

## 📝 Production Status

- **Deployment Date**: 2025-10-31
- **Network**: Ethereum Mainnet (Chain ID: 1)
- **Status**: ✅ LIVE and HEALTHY
- **Total Value Locked**: 0 ETH (fresh deployment)
- **Vault Shares Supply**: 0 (no deposits yet)

## 🎯 Next Steps

1. ✅ **Fix Docker permissions** (run the usermod command above)
2. ✅ **Start monitoring stack** (`./setup-monitoring.sh`)
3. ⏳ **Configure Grafana dashboards**
4. ⏳ **Set up alert channels** (Slack, PagerDuty)
5. ⏳ **Run test deposits** (start with 1-10 WLFI)
6. ⏳ **Monitor for 24-48 hours**
7. ⏳ **Scale up gradually**

## 🆘 Troubleshooting

### Docker Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.monitoring.yml logs

# Remove and restart
docker-compose -f docker-compose.monitoring.yml down -v
docker-compose -f docker-compose.monitoring.yml up -d
```

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :9090

# Kill the process or change the port in docker-compose.yml
```

### RPC Rate Limiting
```bash
# Use your Alchemy API key (already configured)
# Or get a new one at: https://www.alchemy.com/
```

## 📚 Related Documentation

- `PRODUCTION_INTEGRATION.md` - Production deployment details
- `DEVOPS_GUIDE.md` - Complete DevOps documentation
- `MONITORING_GUIDE.md` - Detailed monitoring guide
- `INCIDENT_RESPONSE.md` - Incident response procedures

## 🔗 Useful Links

- **Etherscan Vault**: https://etherscan.io/address/0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Alchemy Dashboard**: https://dashboard.alchemy.com/

---

**Status**: ✅ Production monitoring infrastructure ready to deploy!

