# Terraform Variables for Eagle OVault Infrastructure

variable "aws_region" {
  description = "AWS region for infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging/production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either staging or production"
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (Ubuntu 22.04 LTS recommended)"
  type        = string
  default     = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS us-east-1
}

variable "instance_type" {
  description = "EC2 instance type for monitoring"
  type        = string
  default     = "t3.large"
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  type        = string
}

variable "ssh_allowed_ips" {
  description = "List of IPs allowed to SSH to instances"
  type        = list(string)
  default     = []
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
}

variable "vercel_api_token" {
  description = "Vercel API token for frontend deployment"
  type        = string
  sensitive   = true
}

# RPC Endpoint Configuration
variable "ethereum_rpc_url" {
  description = "Ethereum RPC URL"
  type        = string
  sensitive   = true
}

variable "bsc_rpc_url" {
  description = "BSC RPC URL"
  type        = string
  default     = "https://bsc-rpc.publicnode.com"
}

variable "arbitrum_rpc_url" {
  description = "Arbitrum RPC URL"
  type        = string
  default     = "https://arbitrum-rpc.publicnode.com"
}

variable "base_rpc_url" {
  description = "Base RPC URL"
  type        = string
  default     = "https://base-rpc.publicnode.com"
}

variable "avalanche_rpc_url" {
  description = "Avalanche RPC URL"
  type        = string
  default     = "https://api.avax.network/ext/bc/C/rpc"
}

# API Keys
variable "etherscan_api_key" {
  description = "Etherscan API key for contract verification"
  type        = string
  sensitive   = true
}

variable "bscscan_api_key" {
  description = "BSCScan API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "arbiscan_api_key" {
  description = "Arbiscan API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "basescan_api_key" {
  description = "Basescan API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "snowtrace_api_key" {
  description = "Snowtrace API key"
  type        = string
  sensitive   = true
  default     = ""
}

# Monitoring Configuration
variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
  default     = ""
}

variable "pagerduty_service_key" {
  description = "PagerDuty service key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 90
}

# Tags
variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Feature Flags
variable "enable_monitoring" {
  description = "Enable monitoring infrastructure"
  type        = bool
  default     = true
}

variable "enable_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

