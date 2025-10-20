#!/bin/bash
# Complete Charm Integration - One Command Deployment
# This script deploys a fresh vault + strategy and sets up the integration

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🦅 COMPLETE CHARM INTEGRATION DEPLOYMENT 🦅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get private key and owner address
PK=$(grep "^PRIVATE_KEY=" .env | cut -d'=' -f2)

if [ -z "$PK" ]; then
    echo "❌ PRIVATE_KEY not found in .env"
    exit 1
fi

# Get owner address from .env or use a default
OWNER=$(grep "^DEPLOYER_ADDRESS=" .env | cut -d'=' -f2)
if [ -z "$OWNER" ]; then
    # Try to get from OWNER_ADDRESS as fallback
    OWNER=$(grep "^OWNER_ADDRESS=" .env | cut -d'=' -f2)
fi

if [ -z "$OWNER" ]; then
    echo "❌ DEPLOYER_ADDRESS or OWNER_ADDRESS not found in .env"
    echo "Please add one of these to your .env file"
    exit 1
fi

# Token addresses (Ethereum Mainnet)
WLFI="0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6"
USD1="0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d"
USD1_FEED="0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d"
WLFI_USD1_POOL="0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d"
UNISWAP_ROUTER="0xE592427A0AEce92De3Edee1F18E0157C05861564"
CHARM_VAULT="0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71"

echo "📍 Configuration:"
echo "   Network: Ethereum Mainnet"
echo "   RPC: https://eth.llamarpc.com"
echo "   WLFI: $WLFI"
echo "   USD1: $USD1"
echo "   Charm Vault: $CHARM_VAULT"
echo ""

# =================================
# STEP 1: Deploy EagleOVault
# =================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: Deploying EagleOVault"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VAULT_OUTPUT=$(forge create contracts/EagleOVault.sol:EagleOVault \
  --broadcast \
  --rpc-url https://eth.llamarpc.com \
  --private-key "$PK" \
  --gas-limit 5000000 \
  --legacy \
  --constructor-args \
    "$WLFI" \
    "$USD1" \
    "$USD1_FEED" \
    "$WLFI_USD1_POOL" \
    "$UNISWAP_ROUTER" \
    "$OWNER" \
  2>&1)

VAULT=$(echo "$VAULT_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$VAULT" ]; then
    echo "❌ Vault deployment failed!"
    echo "$VAULT_OUTPUT"
    exit 1
fi

echo "✅ Vault deployed: $VAULT"
echo ""

# =================================
# STEP 2: Deploy CharmStrategyUSD1
# =================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: Deploying CharmStrategyUSD1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

STRATEGY_OUTPUT=$(forge create contracts/strategies/CharmStrategyUSD1.sol:CharmStrategyUSD1 \
  --broadcast \
  --rpc-url https://eth.llamarpc.com \
  --private-key "$PK" \
  --gas-limit 3000000 \
  --legacy \
  --constructor-args \
    "$VAULT" \
    "$CHARM_VAULT" \
    "$WLFI" \
    "$USD1" \
    "$UNISWAP_ROUTER" \
    "$OWNER" \
  2>&1)

STRATEGY=$(echo "$STRATEGY_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$STRATEGY" ]; then
    echo "❌ Strategy deployment failed!"
    echo "$STRATEGY_OUTPUT"
    exit 1
fi

echo "✅ Strategy deployed: $STRATEGY"
echo ""

# =================================
# STEP 3: Setup Integration
# =================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 3: Setting up integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

export VAULT_ADDRESS=$VAULT
export STRATEGY_ADDRESS=$STRATEGY

echo "Running integration setup script..."
npx hardhat run scripts/complete-charm-integration.ts --network ethereum

# =================================
# FINAL SUMMARY
# =================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 DEPLOYMENT COMPLETE! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Deployed Contracts:"
echo "   Vault:    $VAULT"
echo "   Strategy: $STRATEGY"
echo ""
echo "🔗 Etherscan Links:"
echo "   Vault:    https://etherscan.io/address/$VAULT"
echo "   Strategy: https://etherscan.io/address/$STRATEGY"
echo ""
echo "📋 Next Steps:"
echo "   1. Update frontend .env.production with new vault address"
echo "   2. Have users deposit via https://test.47eagle.com"
echo "   3. Deploy to Charm with:"
echo "      export VAULT_ADDRESS=$VAULT"
echo "      export STRATEGY_ADDRESS=$STRATEGY"
echo "      npx hardhat run scripts/deploy-to-charm.ts --network ethereum"
echo ""
echo "📚 Documentation:"
echo "   - Integration Guide: CHARM_INTEGRATION_GUIDE.md"
echo "   - Completion Report: INTEGRATION_COMPLETE.md"
echo ""
echo "✨ System is ready for testing!"
echo ""

