# Eagle OVault Incident Response Procedures

## Table of Contents
- [Overview](#overview)
- [Incident Classification](#incident-classification)
- [Response Team](#response-team)
- [Incident Response Process](#incident-response-process)
- [Incident Scenarios](#incident-scenarios)
- [Communication Protocols](#communication-protocols)
- [Post-Incident Procedures](#post-incident-procedures)

## Overview

This document outlines the incident response procedures for Eagle OVault. All team members should be familiar with these procedures to ensure rapid and effective response to incidents.

### Incident Definition

An **incident** is any event that:
- Disrupts normal operations
- Poses a security threat
- Results in loss of user funds
- Causes significant degradation of service
- Violates compliance requirements

## Incident Classification

### Severity Levels

#### SEV-1: Critical
**Impact**: System down, funds at risk, security breach
**Examples**:
- Smart contract exploit detected
- Unauthorized fund withdrawals
- Multiple chains simultaneously failing
- Security breach in progress
- Data breach exposing user information

**Response Time**: Immediate (within 15 minutes)
**Escalation**: Notify CEO, CTO, Security Lead immediately

#### SEV-2: High
**Impact**: Major functionality impaired, significant user impact
**Examples**:
- Single chain down
- LayerZero bridge not functioning
- High transaction failure rate (>20%)
- RPC endpoints degraded
- Monitoring infrastructure down

**Response Time**: Within 30 minutes
**Escalation**: Notify DevOps Lead, Engineering Lead

#### SEV-3: Medium
**Impact**: Partial functionality affected, workarounds available
**Examples**:
- Elevated error rates (5-20%)
- Slow transaction confirmations
- Intermittent RPC issues
- Non-critical monitoring alerts
- Deployment delays

**Response Time**: Within 2 hours
**Escalation**: DevOps team notified

#### SEV-4: Low
**Impact**: Minor issues, minimal user impact
**Examples**:
- Documentation issues
- Non-critical bugs
- Performance degradation (<5% impact)
- Cosmetic frontend issues

**Response Time**: Within 24 hours
**Escalation**: Standard support channels

## Response Team

### Roles and Responsibilities

#### Incident Commander (IC)
**Who**: Senior DevOps Engineer or Engineering Lead
**Responsibilities**:
- Coordinate response efforts
- Make critical decisions
- Communicate with stakeholders
- Declare incident resolution

#### Technical Lead
**Who**: Smart Contract Engineer or Senior Developer
**Responsibilities**:
- Investigate root cause
- Implement technical fixes
- Assess security implications
- Provide technical updates to IC

#### Communications Lead
**Who**: Product Manager or Marketing Lead
**Responsibilities**:
- Draft user communications
- Update status page
- Coordinate social media
- Handle media inquiries (for major incidents)

#### Security Lead
**Who**: Security Engineer or External Auditor (on-call)
**Responsibilities**:
- Assess security impact
- Review exploit scenarios
- Recommend security measures
- Coordinate with white hats if needed

### On-Call Rotation

**Schedule**: 24/7 coverage, weekly rotation
**Contact**: Via PagerDuty

**Primary**: Senior DevOps Engineer
**Secondary**: Backend Engineer
**Escalation**: Engineering Lead → CTO → CEO

## Incident Response Process

### Phase 1: Detection & Alert (0-5 minutes)

1. **Incident Detected**
   - Automated alert (Prometheus/Alertmanager)
   - User report
   - Security researcher disclosure
   - Internal discovery

2. **Initial Triage**
   - Assess severity level
   - Identify affected systems
   - Gather initial information
   - Create incident channel

3. **Activate Response**
   - Page on-call engineer
   - Open incident ticket
   - Start incident log
   - Begin war room (Slack/Discord)

### Phase 2: Containment (5-30 minutes)

1. **Assess Impact**
   ```bash
   # Quick health check
   npx ts-node scripts/deployment/health-check.ts
   
   # Check contract state
   cast call $CONTRACT_ADDR "paused()" --rpc-url $RPC_URL
   
   # Review recent transactions
   cast logs --address $CONTRACT_ADDR --from-block -1000
   ```

2. **Contain Threat**
   - Pause contracts if necessary
   - Disable affected features
   - Isolate compromised systems
   - Rate limit if under attack

3. **Protect User Funds**
   - Assess fund security
   - Implement emergency procedures
   - Coordinate with exchanges if needed

### Phase 3: Investigation (30 minutes - 2 hours)

1. **Root Cause Analysis**
   - Review logs and metrics
   - Analyze transaction history
   - Check for exploit patterns
   - Identify vulnerability

2. **Collect Evidence**
   - Save logs and screenshots
   - Export relevant metrics
   - Document timeline
   - Preserve blockchain state

3. **Assess Scope**
   - Determine full impact
   - Identify affected users
   - Calculate financial impact
   - Estimate recovery time

### Phase 4: Resolution (2-8 hours)

1. **Develop Fix**
   - Code patch or configuration change
   - Security review
   - Test in staging
   - Prepare deployment plan

2. **Execute Fix**
   - Deploy fix to production
   - Verify resolution
   - Monitor closely
   - Prepare rollback if needed

3. **Verify Recovery**
   - Run health checks
   - Test critical paths
   - Monitor error rates
   - Verify user accessibility

### Phase 5: Communication (Throughout)

**Internal**:
- Real-time updates in war room
- Hourly updates to leadership
- Status dashboard maintained

**External** (SEV-1/SEV-2):
- Initial notification within 30 minutes
- Hourly updates during active incident
- Resolution announcement
- Post-mortem report (within 5 days)

### Phase 6: Post-Incident (24 hours - 1 week)

1. **Immediate** (Day 0-1)
   - Resume normal operations
   - Monitor closely for 24 hours
   - Document all actions taken
   - Begin draft post-mortem

2. **Short-term** (Day 2-5)
   - Complete post-mortem
   - Identify preventive measures
   - Update runbooks
   - Implement quick wins

3. **Long-term** (Week 2+)
   - Implement systemic improvements
   - Update monitoring/alerts
   - Conduct training
   - Review and update policies

## Incident Scenarios

### Scenario 1: Smart Contract Exploit

**Indicators**:
- Unusual withdrawals detected
- Contract balance dropping rapidly
- Security researcher alert

**Immediate Actions**:
```bash
# 1. Pause affected contracts (if pausable)
cast send $CONTRACT_ADDR "pause()" --private-key $ADMIN_KEY

# 2. Check contract balance
cast balance $CONTRACT_ADDR

# 3. Review recent transactions
cast logs --address $CONTRACT_ADDR --from-block -1000

# 4. Analyze exploit transaction
cast run $EXPLOIT_TX_HASH --verbose
```

**Response Steps**:
1. **Contain** (Immediate)
   - Pause all contracts
   - Notify exchanges to halt deposits
   - Contact white hat groups

2. **Investigate** (0-2 hours)
   - Identify vulnerability
   - Calculate losses
   - Assess remaining risk

3. **Resolve** (2-48 hours)
   - Deploy patched contracts
   - Migrate funds if necessary
   - Compensate affected users

4. **Communicate**
   - Immediate: "Investigating potential issue"
   - 1 hour: "Contracts paused, funds secure"
   - 4 hours: "Root cause identified"
   - Resolution: "Fix deployed, operations resumed"

### Scenario 2: Chain RPC Failure

**Indicators**:
- RPC endpoint returning errors
- Monitoring alerts: "ChainDown"
- User reports of failed transactions

**Immediate Actions**:
```bash
# 1. Test RPC endpoint
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 2. Switch to backup RPC
export BACKUP_RPC_URL="https://..."
cast block latest --rpc-url $BACKUP_RPC_URL

# 3. Update configuration
# Edit .env or update secrets
```

**Response Steps**:
1. Switch to backup RPC provider
2. Update frontend configuration
3. Monitor transaction success rate
4. Contact primary provider
5. Implement automatic failover

### Scenario 3: LayerZero Bridge Stuck

**Indicators**:
- Cross-chain messages not delivered
- Message queue building up
- User reports of stuck transfers

**Immediate Actions**:
```bash
# 1. Check LayerZero status
# Visit: https://layerzeroscan.com

# 2. Verify message queue
npx ts-node scripts/deployment/health-check.ts

# 3. Check DVN configuration
cast call $OVAULT_ADDR "endpoint()" --rpc-url $RPC_URL
```

**Response Steps**:
1. Verify DVN is operational
2. Check if messages are in queue
3. Wait for DVN confirmation (usually 5-10 min)
4. If stuck > 30 min, contact LayerZero
5. Communicate delays to users
6. Consider manual message relay if critical

### Scenario 4: Frontend Down

**Indicators**:
- Vercel deployment failed
- Frontend unreachable
- High error rates

**Immediate Actions**:
```bash
# 1. Check Vercel status
vercel ls

# 2. Check deployment logs
vercel logs

# 3. Rollback if needed
vercel rollback
```

**Response Steps**:
1. Verify issue is frontend-only (contracts still work)
2. Rollback to last known good deployment
3. Fix issue in code
4. Deploy fix
5. Monitor error rates

### Scenario 5: High Gas Costs

**Indicators**:
- Gas prices > 200 gwei
- User complaints
- Failed transactions due to gas

**Response Steps**:
1. **Immediate**: Update frontend to show gas warning
2. **Short-term**: Implement gas price limits
3. **Medium-term**: Consider deploying to L2s
4. **Communicate**: "High network gas fees, consider waiting"

## Communication Protocols

### Internal Communication

**War Room** (Slack Channel):
- Create: `#incident-YYYY-MM-DD-description`
- Pin: Incident details, timeline, action items
- Invite: Response team + stakeholders

**Update Cadence**:
- SEV-1: Every 15 minutes
- SEV-2: Every 30 minutes
- SEV-3: Every 2 hours

### External Communication

**Channels**:
1. **Status Page**: status.eagle-ovault.com
2. **Twitter/X**: @EagleOVault
3. **Discord**: #announcements
4. **Email**: For affected users

**Message Templates**:

**Initial Notification (SEV-1/SEV-2)**:
```
🚨 We're investigating reports of [issue description]. 
Our team is actively working on a resolution. 
User funds are secure. 
Updates every hour.
```

**Update**:
```
Update [HH:MM UTC]: 
[Progress made]
[Current status]
[Next steps]
ETA: [estimate if known]
```

**Resolution**:
```
✅ Resolved: [Issue description]
Duration: [X hours]
Impact: [User impact]
Root cause: [Brief explanation]
Full post-mortem: [link]
```

### User Communication Guidelines

**DO**:
- Be transparent and honest
- Provide regular updates
- Acknowledge user concerns
- Give realistic timelines
- Explain impact clearly

**DON'T**:
- Speculate on causes
- Promise specific timelines early
- Minimize severity
- Blame external factors
- Use technical jargon

## Post-Incident Procedures

### Post-Mortem Report

**Timeline**: Within 5 days of resolution

**Required Sections**:
1. **Executive Summary**
   - What happened
   - Impact
   - Resolution

2. **Timeline**
   - Detection
   - Key events
   - Resolution

3. **Root Cause**
   - Technical analysis
   - Contributing factors

4. **Impact Assessment**
   - Users affected
   - Financial impact
   - Downtime

5. **Response Analysis**
   - What went well
   - What could improve

6. **Action Items**
   - Preventive measures
   - Monitoring improvements
   - Process changes
   - Assigned owners

### Follow-Up Actions

1. **Immediate** (Week 1)
   - Implement quick fixes
   - Update monitoring
   - Add relevant alerts

2. **Short-term** (Month 1)
   - Address systemic issues
   - Update documentation
   - Conduct training

3. **Long-term** (Quarter 1)
   - Architectural improvements
   - Enhanced testing
   - Process refinement

### Incident Review Meeting

**When**: Within 3 days of resolution
**Who**: Response team + leadership
**Duration**: 1-2 hours

**Agenda**:
1. Incident walkthrough
2. Timeline review
3. Response effectiveness
4. Lessons learned
5. Action item assignment

## Emergency Contacts

### Internal
- **PagerDuty**: On-call engineer (24/7)
- **Slack**: `#incidents` channel
- **Email**: incidents@eagle-ovault.com

### External
- **LayerZero Support**: Discord server
- **Alchemy Support**: support@alchemy.com
- **Security Researchers**: security@eagle-ovault.com
- **Bug Bounty**: Via Immunefi

### Escalation Path
1. On-call Engineer
2. DevOps Lead
3. Engineering Lead
4. CTO
5. CEO

## Appendix

### Incident Log Template

```markdown
# Incident: [INCIDENT-YYYY-MM-DD-NNN]

**Severity**: [SEV-1/2/3/4]
**Status**: [Investigating/Identified/Monitoring/Resolved]
**Started**: YYYY-MM-DD HH:MM UTC
**Resolved**: YYYY-MM-DD HH:MM UTC

## Impact
- [Affected systems]
- [User impact]
- [Financial impact]

## Timeline
- HH:MM - [Event]
- HH:MM - [Action taken]

## Root Cause
[Description]

## Resolution
[Actions taken]

## Follow-up
- [ ] Action item 1
- [ ] Action item 2
```

### Useful Commands Cheat Sheet

```bash
# Health check
npx ts-node scripts/deployment/health-check.ts

# Check contract state
cast call $ADDR "paused()" --rpc-url $RPC

# Recent transactions
cast logs --address $ADDR --from-block -1000

# Gas prices
cast gas-price --rpc-url $RPC

# Deployer balance
cast balance $DEPLOYER_ADDR --rpc-url $RPC

# Block number
cast block-number --rpc-url $RPC

# Pause contract (if pausable)
cast send $ADDR "pause()" --private-key $KEY --rpc-url $RPC

# Check LayerZero
# Visit: https://layerzeroscan.com
```

---

**Document Owner**: DevOps Team
**Last Updated**: 2025-10-31
**Review Cycle**: Quarterly
**Version**: 1.0

*This is a living document. Update after each incident to reflect learnings.*

