#!/bin/bash
# Quick Vault Check Script

set -e

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep ETHEREUM_RPC_URL | xargs)
fi

# Use the RPC URL
RPC_URL="${ETHEREUM_RPC_URL:-https://eth.llamarpc.com}"

VAULT="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
STRATEGY="0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f"

echo "🔍 Eagle Vault Status"
echo "===================="
echo ""

echo "📊 Vault Balances:"
WLFI_WEI=$(cast call $VAULT "wlfiBalance()(uint256)" --rpc-url $RPC_URL)
USD1_WEI=$(cast call $VAULT "usd1Balance()(uint256)" --rpc-url $RPC_URL)

# Convert to human readable (divide by 10^18)
WLFI=$(echo "scale=2; $WLFI_WEI / 1000000000000000000" | bc)
USD1=$(echo "scale=2; $USD1_WEI / 1000000000000000000" | bc)

echo "   WLFI: $WLFI WLFI"
echo "   USD1: $USD1 USD1"
echo ""

echo "🎯 Strategy Status:"
IS_ACTIVE=$(cast call $VAULT "activeStrategies(address)(bool)" $STRATEGY --rpc-url $RPC_URL)
echo "   Active: $IS_ACTIVE"
echo ""

echo "📍 Addresses:"
echo "   Vault:    $VAULT"
echo "   Strategy: $STRATEGY"
echo ""

echo "🌐 RPC: $RPC_URL"

