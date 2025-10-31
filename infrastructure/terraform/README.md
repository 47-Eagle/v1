# Eagle OVault Infrastructure - Terraform

This directory contains Terraform configuration for Eagle OVault's cloud infrastructure.

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured with appropriate credentials
- Vercel API token

## Setup

1. **Initialize Terraform Backend**

```bash
# Create S3 bucket for state
aws s3 mb s3://eagle-ovault-terraform-state

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name eagle-ovault-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

2. **Configure Variables**

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

3. **Initialize Terraform**

```bash
terraform init
```

4. **Plan Infrastructure**

```bash
terraform plan
```

5. **Apply Configuration**

```bash
terraform apply
```

## Resources Created

### Networking
- VPC with public and private subnets
- Internet Gateway
- Route tables and associations
- Security groups

### Compute
- EC2 instance for monitoring (Prometheus, Grafana, Alertmanager)
- Elastic IP for stable access

### Storage
- S3 bucket for backups (with lifecycle policies)
- CloudWatch Log Groups

### Security
- AWS Secrets Manager for sensitive data
- IAM roles and policies for deployment automation

### Monitoring
- CloudWatch alarms
- SNS topics for alerts

## Usage

### Accessing Monitoring

After deployment, Grafana will be available at:
```
http://<monitoring_instance_ip>:3000
```

Default credentials:
- Username: `admin`
- Password: Set via `grafana_admin_password` variable

### Managing Secrets

Store secrets in AWS Secrets Manager:

```bash
# Store deployer private key
aws secretsmanager put-secret-value \
  --secret-id eagle-ovault/deployer-private-key-production \
  --secret-string "YOUR_PRIVATE_KEY"

# Store RPC URLs
aws secretsmanager put-secret-value \
  --secret-id eagle-ovault/rpc-urls-production \
  --secret-string '{
    "ethereum": "https://...",
    "bsc": "https://...",
    "arbitrum": "https://...",
    "base": "https://...",
    "avalanche": "https://..."
  }'
```

### Accessing Backups

Backups are stored in the S3 bucket:
```bash
aws s3 ls s3://eagle-ovault-backups-production/
```

### SSH Access

```bash
ssh -i /path/to/private-key ubuntu@<monitoring_instance_ip>
```

## Terraform Commands

### Plan Changes
```bash
terraform plan -out=tfplan
```

### Apply Changes
```bash
terraform apply tfplan
```

### Destroy Infrastructure
```bash
terraform destroy
```

### Show Current State
```bash
terraform show
```

### List Resources
```bash
terraform state list
```

### Get Outputs
```bash
terraform output
terraform output -json
```

## Modules

The infrastructure is organized as a single root module. For larger deployments, consider splitting into:
- `modules/networking`
- `modules/compute`
- `modules/monitoring`
- `modules/security`

## Cost Optimization

Current estimated monthly cost (us-east-1):
- EC2 t3.large (24/7): ~$60
- EBS 100GB gp3: ~$8
- S3 storage (estimated): ~$5-20
- Data transfer: Variable
- **Total: ~$75-90/month**

To reduce costs:
1. Use t3.medium instead of t3.large
2. Stop monitoring instance during off-hours (dev/staging only)
3. Adjust backup retention period
4. Use S3 lifecycle policies aggressively

## Security Best Practices

1. **Never commit terraform.tfvars**
2. Rotate credentials regularly
3. Use IAM roles instead of access keys where possible
4. Enable MFA for AWS accounts
5. Regularly review security groups
6. Monitor CloudTrail logs

## Troubleshooting

### State Lock Issues
```bash
# Force unlock (use with caution)
terraform force-unlock <LOCK_ID>
```

### Import Existing Resources
```bash
terraform import aws_instance.monitoring i-1234567890abcdef0
```

### Refresh State
```bash
terraform refresh
```

## Maintenance

### Update Terraform Providers
```bash
terraform init -upgrade
```

### Validate Configuration
```bash
terraform validate
terraform fmt -recursive
```

## Disaster Recovery

### Backup State
```bash
terraform state pull > terraform.tfstate.backup
```

### Restore from Backup
```bash
terraform state push terraform.tfstate.backup
```

## Support

For issues or questions:
- Check logs: `ssh ubuntu@<ip> 'sudo journalctl -u eagle-monitoring -f'`
- Review CloudWatch logs
- Check monitoring dashboard

## License

Proprietary - Eagle OVault Team

