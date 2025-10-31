# Eagle OVault Monitoring Guide

## Table of Contents
- [Overview](#overview)
- [Monitoring Stack](#monitoring-stack)
- [Key Metrics](#key-metrics)
- [Dashboards](#dashboards)
- [Alerts](#alerts)
- [Log Management](#log-management)
- [Best Practices](#best-practices)

## Overview

This guide covers the monitoring and observability setup for Eagle OVault, including metrics collection, visualization, alerting, and log aggregation.

### Monitoring Goals
1. **Availability**: Ensure 99.9% uptime
2. **Performance**: Track response times and throughput
3. **Security**: Detect anomalies and threats
4. **User Experience**: Monitor frontend and transaction success
5. **Cost**: Track gas usage and infrastructure costs

## Monitoring Stack

### Components

#### Prometheus
**Purpose**: Metrics collection and storage
**Port**: 9090
**Configuration**: `monitoring/prometheus-config.yml`

**Features**:
- Time-series database
- Powerful query language (PromQL)
- 30-day data retention
- Scrapes metrics every 15-30 seconds

#### Grafana
**Purpose**: Metrics visualization
**Port**: 3000
**URL**: `http://<monitoring-ip>:3000`
**Credentials**: admin / (from GRAFANA_ADMIN_PASSWORD)

**Features**:
- Interactive dashboards
- Alerting (optional, we use Alertmanager)
- User management
- Annotations for deployments

#### Alertmanager
**Purpose**: Alert routing and management
**Port**: 9093
**Configuration**: `monitoring/alertmanager-config.yml`

**Features**:
- Alert grouping and deduplication
- Routing to Slack/PagerDuty
- Silencing and inhibition rules
- Alert history

#### Node Exporter
**Purpose**: System metrics (CPU, memory, disk)
**Port**: 9100

#### Blackbox Exporter
**Purpose**: Endpoint health checks
**Port**: 9115

#### Loki + Promtail
**Purpose**: Log aggregation
**Ports**: 3100 (Loki)

## Key Metrics

### Contract Metrics

#### Total Value Locked (TVL)
```promql
# Total TVL across all chains
sum(eagle_ovault_tvl_usd)

# TVL by chain
eagle_ovault_tvl_usd{chain="ethereum"}
```

**Alert Thresholds**:
- Drop > 20% in 1 hour: Critical
- 3σ deviation from 24h average: Warning

#### Transaction Metrics
```promql
# Transaction rate
rate(eagle_ovault_total_txs[5m])

# Failed transaction rate
rate(eagle_ovault_failed_txs[5m]) / rate(eagle_ovault_total_txs[5m])

# Transaction volume (USD)
rate(eagle_ovault_tx_volume_usd[5m])
```

**Alert Thresholds**:
- Failure rate > 10%: Warning
- Failure rate > 50%: Critical

#### User Activity
```promql
# Active users (24h)
increase(eagle_ovault_unique_users[24h])

# Deposits
rate(eagle_ovault_deposits_total[1h])

# Withdrawals
rate(eagle_ovault_withdrawals_total[1h])
```

**Alert Thresholds**:
- No deposits in 2 hours: Info
- Unusual withdrawal spike: Warning

### Cross-Chain Metrics

#### LayerZero Bridge
```promql
# Pending messages
eagle_ovault_lz_pending_messages

# Cross-chain transfer rate
rate(eagle_ovault_cross_chain_transfers[5m])

# Failed transfers
rate(eagle_ovault_cross_chain_transfer_failures[5m])
```

**Alert Thresholds**:
- Pending messages > 100: Warning
- Pending messages > 500: Critical
- Transfer failures > 5 in 5min: Critical

#### Message Delivery Time
```promql
# Average delivery time
avg(eagle_ovault_lz_message_delivery_seconds)

# p95 delivery time
histogram_quantile(0.95, 
  rate(eagle_ovault_lz_message_delivery_seconds_bucket[5m])
)
```

### Infrastructure Metrics

#### RPC Endpoints
```promql
# RPC health (1 = healthy, 0 = down)
eagle_ovault_chain_healthy

# RPC response time (p95)
histogram_quantile(0.95, 
  sum by (chain, le) (rate(eagle_ovault_rpc_duration_seconds_bucket[5m]))
)

# RPC error rate
rate(eagle_ovault_rpc_errors[5m])
```

**Alert Thresholds**:
- Chain down > 5 minutes: Critical
- RPC latency p95 > 5s: Warning
- Multiple chains down: Critical

#### System Resources
```promql
# CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 
node_memory_MemTotal_bytes * 100

# Disk usage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) / 
node_filesystem_size_bytes * 100
```

**Alert Thresholds**:
- CPU > 80% for 10min: Warning
- Memory > 90% for 5min: Warning
- Disk > 85%: Warning, > 95%: Critical

### Frontend Metrics

#### Page Load Time
```promql
# p95 page load time
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket{job="frontend"}[5m])
)
```

#### Error Rate
```promql
# 5xx error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / 
sum(rate(http_requests_total[5m]))
```

**Alert Thresholds**:
- Error rate > 5%: Warning
- Error rate > 10%: Critical

### Strategy Performance

#### APY
```promql
# Current APY
eagle_ovault_strategy_apy_percent
```

**Alert Thresholds**:
- APY < 1% for 1 hour: Warning

#### Rebalance Events
```promql
# Rebalance frequency
rate(eagle_ovault_rebalance_total[1h])

# Failed rebalances
increase(eagle_ovault_rebalance_failures[30m])
```

**Alert Thresholds**:
- > 2 failed rebalances in 30min: Critical

## Dashboards

### Main Dashboard

**URL**: `http://<monitoring-ip>:3000/d/eagle-ovault-main`

**Sections**:
1. **Overview** (Top Row)
   - Total TVL
   - Active Users (24h)
   - Transaction Volume (24h)
   - Current APY

2. **Chain Health** (Second Row)
   - RPC status indicators
   - TVL by chain (pie chart)
   - Chain activity (time series)

3. **Cross-Chain Activity**
   - Transfer rates
   - Message queue depth
   - Delivery times

4. **Performance**
   - Transaction success rate
   - Gas costs by chain
   - RPC response times

5. **System Health**
   - CPU, Memory, Disk usage
   - Container status
   - Error rates

### Creating Custom Dashboards

1. **Access Grafana**
   ```bash
   open http://<monitoring-ip>:3000
   ```

2. **Create Dashboard**
   - Click "+" → "Dashboard"
   - Add panel
   - Select Prometheus data source

3. **Example Panel - Transaction Rate**
   ```promql
   # Query
   sum by (chain) (rate(eagle_ovault_total_txs[5m]))
   
   # Legend
   {{chain}}
   
   # Panel Type: Time series
   # Unit: req/s
   ```

4. **Save Dashboard**
   - Click "Save" icon
   - Name: "Custom Dashboard"
   - Folder: General

### Dashboard Best Practices

1. **Use Variables** for dynamic filtering
   ```
   Variable name: chain
   Query: label_values(eagle_ovault_tvl_usd, chain)
   ```

2. **Set Appropriate Time Ranges**
   - Real-time monitoring: Last 15 minutes
   - Analysis: Last 24 hours or 7 days

3. **Use Annotations** for deployments
   ```promql
   eagle_ovault_deployment_event
   ```

4. **Color Thresholds** for quick assessment
   - Green: < 80% (good)
   - Yellow: 80-90% (warning)
   - Red: > 90% (critical)

## Alerts

### Alert Rules

Defined in: `monitoring/alert-rules.yml`

### Alert Severity Levels

#### Critical (SEV-1)
- System down or funds at risk
- Page on-call immediately
- Send to PagerDuty + Slack critical channel

**Examples**:
- Chain down
- High failure rate (> 50%)
- Contract balance critical
- Security threat detected

#### Warning (SEV-2)
- Degraded performance
- Send to Slack warnings channel
- Review within 1 hour

**Examples**:
- High failure rate (10-50%)
- RPC latency elevated
- Low contract balance
- Gas prices extreme

#### Info (SEV-3)
- Informational alerts
- Send to Slack info channel
- Review within 24 hours

**Examples**:
- No deposits in 2 hours
- Daily volume dropped
- Scheduled maintenance

### Testing Alerts

```bash
# Generate test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "chain": "ethereum"
    },
    "annotations": {
      "summary": "Test alert",
      "description": "This is a test"
    }
  }]'
```

### Silencing Alerts

**When to Silence**:
- Planned maintenance
- Known issues being worked on
- False positives (fix alert rule after)

**How to Silence**:
1. Open Alertmanager: `http://<monitoring-ip>:9093`
2. Find alert
3. Click "Silence"
4. Set duration and reason
5. Create

**Via CLI**:
```bash
amtool silence add \
  alertname=HighFailureRate \
  chain=ethereum \
  --duration=2h \
  --comment="Maintenance window"
```

### Alert Routing

**Configuration**: `monitoring/alertmanager-config.yml`

**Routes**:
```yaml
Critical → PagerDuty + Slack #critical
Warning → Slack #warnings
Info → Slack #info
Security → PagerDuty + Slack #security
```

**Inhibition Rules**:
- ChainDown inhibits RPC/Contract alerts for that chain
- CriticalFailure inhibits WarningFailure
- ContractBalanceCritical inhibits ContractBalanceLow

## Log Management

### Loki Setup

**Purpose**: Centralized log aggregation
**Query Language**: LogQL (similar to PromQL)

### Log Sources

1. **System Logs**
   - `/var/log/syslog`
   - `/var/log/auth.log`

2. **Application Logs**
   - Docker container logs
   - Deployment scripts
   - Monitoring stack

3. **Custom Logs**
   - Transaction events
   - Rebalance operations
   - Cross-chain messages

### Querying Logs

**In Grafana**:
1. Select "Loki" data source
2. Use LogQL queries

**Examples**:
```logql
# All logs from eagle-ovault
{job="eagle-ovault"}

# Error logs
{job="eagle-ovault"} |= "error"

# Rebalance events
{job="eagle-ovault"} |= "rebalance"

# Last 100 deployment logs
{job="eagle-ovault"} |= "deployment" | limit 100

# Rate of errors
rate({job="eagle-ovault"} |= "error" [5m])
```

### Log Retention

- **Hot storage**: 7 days
- **Cold storage**: 30 days (compressed)
- **Backup**: 90 days (S3)

### Log Levels

- **ERROR**: Critical issues requiring attention
- **WARN**: Potential issues
- **INFO**: Normal operations
- **DEBUG**: Detailed troubleshooting (disabled in production)

## Best Practices

### Monitoring Strategy

#### The Four Golden Signals

1. **Latency**: How long does it take?
   - RPC response time
   - Transaction confirmation time
   - Page load time

2. **Traffic**: How much demand?
   - Transaction rate
   - User activity
   - API requests

3. **Errors**: How many failures?
   - Transaction failures
   - RPC errors
   - Frontend errors

4. **Saturation**: How full is it?
   - Contract balance
   - Message queue depth
   - System resources

#### SLIs (Service Level Indicators)

1. **Availability**: 99.9% uptime
   ```promql
   avg_over_time(eagle_ovault_chain_healthy[30d]) * 100
   ```

2. **Success Rate**: > 95% transactions succeed
   ```promql
   sum(rate(eagle_ovault_total_txs[30d])) - 
   sum(rate(eagle_ovault_failed_txs[30d])) /
   sum(rate(eagle_ovault_total_txs[30d])) * 100
   ```

3. **Latency**: p95 < 3 seconds
   ```promql
   histogram_quantile(0.95, 
     rate(eagle_ovault_tx_duration_seconds_bucket[30d])
   )
   ```

### Dashboard Design

1. **Top-down approach**: Start with high-level metrics
2. **Actionable**: Each panel should answer a question
3. **Consistent**: Use same time ranges and colors
4. **Simple**: Don't overcrowd with too many panels
5. **Relevant**: Only show what matters

### Alert Design

1. **Actionable**: Every alert needs a clear action
2. **Not noisy**: Use appropriate thresholds
3. **Prioritized**: Use severity levels correctly
4. **Documented**: Link to runbooks
5. **Tested**: Validate alerts fire correctly

### Common Anti-Patterns

❌ **Don't**:
- Alert on symptoms without context
- Create alerts without runbooks
- Over-alert (alert fatigue)
- Under-alert (miss critical issues)
- Ignore alerts

✅ **Do**:
- Alert on user-impacting issues
- Provide context in alert descriptions
- Link to remediation steps
- Review and tune alerts regularly
- Act on every alert

## Accessing Monitoring

### SSH to Monitoring Instance

```bash
ssh -i /path/to/key ubuntu@<monitoring-ip>
```

### Port Forwarding

```bash
# Forward Grafana locally
ssh -L 3000:localhost:3000 ubuntu@<monitoring-ip>

# Forward Prometheus
ssh -L 9090:localhost:9090 ubuntu@<monitoring-ip>

# Access at http://localhost:3000
```

### Backup Monitoring Data

```bash
# Run backup script
ssh ubuntu@<monitoring-ip> '/opt/eagle-ovault/backup.sh'

# Or manually
docker exec prometheus tar czf - /prometheus | \
  gzip > prometheus-backup-$(date +%Y%m%d).tar.gz
```

## Troubleshooting

### Metrics Not Appearing

1. **Check Prometheus targets**
   - Open: `http://<monitoring-ip>:9090/targets`
   - All targets should be "UP"

2. **Check scrape interval**
   - Default: 30s
   - If just deployed, wait 1 minute

3. **Verify metric name**
   ```bash
   # Query Prometheus
   curl 'http://localhost:9090/api/v1/label/__name__/values'
   ```

### High Memory Usage

```bash
# Check Prometheus memory
docker stats prometheus

# Reduce retention if needed
# Edit prometheus config: --storage.tsdb.retention.time=15d
```

### Grafana Not Loading

```bash
# Check Grafana logs
docker logs grafana

# Restart if needed
docker restart grafana
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)

---

**Document Owner**: DevOps Team
**Last Updated**: 2025-10-31
**Version**: 1.0

