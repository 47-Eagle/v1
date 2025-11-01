#!/bin/bash

# Deploy Assets to Strategy Script
# This deploys all vault balances to the CharmStrategyUSD1

set -e

VAULT_ADDRESS="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
STRATEGY_ADDRESS="0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f"
MULTISIG_ADDRESS="0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3"

echo "🚀 Eagle Vault - Deploy to Strategy"
echo "===================================="
echo ""
echo "📋 Contract Addresses:"
echo "   Vault:    $VAULT_ADDRESS"
echo "   Strategy: $STRATEGY_ADDRESS"
echo "   Multisig: $MULTISIG_ADDRESS"
echo ""

# Check balances before deployment
echo "📊 Checking current vault balances..."
echo ""

WLFI_BALANCE=$(cast call $VAULT_ADDRESS "wlfiBalance()(uint256)" --rpc-url $ETHEREUM_RPC)
USD1_BALANCE=$(cast call $VAULT_ADDRESS "usd1Balance()(uint256)" --rpc-url $ETHEREUM_RPC)

WLFI_HUMAN=$(echo "scale=2; $WLFI_BALANCE / 1000000000000000000" | bc)
USD1_HUMAN=$(echo "scale=2; $USD1_BALANCE / 1000000000000000000" | bc)

echo "   Current WLFI Balance: $WLFI_HUMAN WLFI"
echo "   Current USD1 Balance: $USD1_HUMAN USD1"
echo ""

# Check if strategy is active
echo "🔍 Checking strategy status..."
IS_ACTIVE=$(cast call $VAULT_ADDRESS "activeStrategies(address)(bool)" $STRATEGY_ADDRESS --rpc-url $ETHEREUM_RPC)
echo "   Strategy Active: $IS_ACTIVE"
echo ""

if [ "$IS_ACTIVE" != "true" ]; then
    echo "❌ Error: Strategy is not active!"
    exit 1
fi

# Confirm deployment
echo "⚠️  This will deploy ALL vault balances to the strategy!"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "📤 Deploying to strategy..."
echo ""

# Deploy to strategy
cast send $VAULT_ADDRESS \
    "forceDeployToStrategies()" \
    --rpc-url $ETHEREUM_RPC \
    --private-key $DEPLOYER_KEY \
    --gas-limit 500000

echo ""
echo "✅ Deployment transaction submitted!"
echo ""
echo "🔍 Monitoring deployment..."
sleep 5

# Check new balances
echo ""
echo "📊 New vault balances:"
NEW_WLFI=$(cast call $VAULT_ADDRESS "wlfiBalance()(uint256)" --rpc-url $ETHEREUM_RPC)
NEW_USD1=$(cast call $VAULT_ADDRESS "usd1Balance()(uint256)" --rpc-url $ETHEREUM_RPC)

NEW_WLFI_HUMAN=$(echo "scale=2; $NEW_WLFI / 1000000000000000000" | bc)
NEW_USD1_HUMAN=$(echo "scale=2; $NEW_USD1 / 1000000000000000000" | bc)

echo "   WLFI: $NEW_WLFI_HUMAN WLFI"
echo "   USD1: $NEW_USD1_HUMAN USD1"
echo ""

echo "📊 Strategy balances:"
STRATEGY_AMOUNTS=$(cast call $STRATEGY_ADDRESS "getTotalAmounts()(uint256,uint256)" --rpc-url $ETHEREUM_RPC)
echo "   $STRATEGY_AMOUNTS"
echo ""

echo "🎉 Deployment complete!"
echo ""
echo "📍 View on Etherscan:"
echo "   Vault:    https://etherscan.io/address/$VAULT_ADDRESS"
echo "   Strategy: https://etherscan.io/address/$STRATEGY_ADDRESS"
echo ""
echo "📍 View on Charm Finance:"
echo "   https://alpha.charm.fi/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71"

