#!/bin/bash

# Eagle OVault Monitoring Stack Setup Script
# This script sets up Docker permissions and starts the monitoring infrastructure

set -e

echo "🦅 Eagle OVault Monitoring Setup"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sudo sh get-docker.sh"
    exit 1
fi

echo "✅ Docker is installed"

# Check if user is in docker group
if groups $USER | grep &>/dev/null '\bdocker\b'; then
    echo "✅ User is in docker group"
else
    echo "⚠️  User is not in docker group"
    echo ""
    echo "To fix this, run:"
    echo "  sudo usermod -aG docker $USER"
    echo "  newgrp docker"
    echo ""
    echo "Or, for this session only, the script will use sudo."
    echo ""
    USE_SUDO="sudo"
fi

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="${USE_SUDO} docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="${USE_SUDO} docker compose"
else
    echo "❌ docker-compose is not available. Please install it first."
    exit 1
fi

echo "✅ Docker Compose is available"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p $(dirname "$0")/../deployments
mkdir -p $(dirname "$0")/../logs

# Check if monitoring configuration files exist
REQUIRED_FILES=(
    "docker-compose.monitoring.yml"
    "production-prometheus-config.yml"
    "production-alert-rules.yml"
    "alertmanager-config.yml"
    "production-grafana-dashboard.json"
)

echo "🔍 Checking configuration files..."
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        exit 1
    fi
done

echo ""
echo "🚀 Starting monitoring stack..."
echo ""

# Start the monitoring stack
$COMPOSE_CMD -f docker-compose.monitoring.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "======================================"
echo "✅ Monitoring Stack Started!"
echo "======================================"
echo ""
echo "📊 Access Points:"
echo "  Grafana:       http://localhost:3000"
echo "                 Username: admin"
echo "                 Password: eagle-admin-2024"
echo ""
echo "  Prometheus:    http://localhost:9090"
echo "  Alertmanager:  http://localhost:9093"
echo "  Node Exporter: http://localhost:9100"
echo ""
echo "📈 Quick Commands:"
echo "  Check status:  $COMPOSE_CMD -f docker-compose.monitoring.yml ps"
echo "  View logs:     $COMPOSE_CMD -f docker-compose.monitoring.yml logs -f"
echo "  Stop stack:    $COMPOSE_CMD -f docker-compose.monitoring.yml down"
echo "  Restart:       $COMPOSE_CMD -f docker-compose.monitoring.yml restart"
echo ""
echo "🔧 Next Steps:"
echo "  1. Open Grafana at http://localhost:3000"
echo "  2. Configure Prometheus data source"
echo "  3. Import the production dashboard"
echo "  4. Set up alert notification channels (Slack, PagerDuty)"
echo ""
echo "⚠️  Note: If you added yourself to docker group, you may need to:"
echo "    1. Log out and log back in, OR"
echo "    2. Run: newgrp docker"
echo ""

