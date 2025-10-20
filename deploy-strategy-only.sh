#!/bin/bash
# Deploy CharmStrategyUSD1 only (for existing vault)

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🦅 DEPLOYING CHARM STRATEGY ONLY 🦅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get config
PK=$(grep "^PRIVATE_KEY=" .env | cut -d'=' -f2)
OWNER=$(grep "^DEPLOYER_ADDRESS=" .env | cut -d'=' -f2)

if [ -z "$PK" ]; then
    echo "❌ PRIVATE_KEY not found in .env"
    exit 1
fi

if [ -z "$OWNER" ]; then
    OWNER=$(grep "^OWNER_ADDRESS=" .env | cut -d'=' -f2)
fi

if [ -z "$OWNER" ]; then
    echo "❌ DEPLOYER_ADDRESS or OWNER_ADDRESS not found in .env"
    exit 1
fi

# Get vault address (allow override via env var)
if [ -z "$VAULT_ADDRESS" ]; then
    VAULT_ADDRESS="0x244b73dC14C01c350C04EAd7e1D8C3FeFeA6AF58"
    echo "📍 Using vault from last deployment: $VAULT_ADDRESS"
    echo "   (Set VAULT_ADDRESS env var to use a different vault)"
else
    echo "📍 Using provided vault: $VAULT_ADDRESS"
fi

# Token addresses (Ethereum Mainnet)
CHARM_VAULT="0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71"
WLFI="0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6"
USD1="0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d"
UNISWAP_ROUTER="0xE592427A0AEce92De3Edee1F18E0157C05861564"

echo ""
echo "📝 Configuration:"
echo "   Vault:          $VAULT_ADDRESS"
echo "   Charm Vault:    $CHARM_VAULT"
echo "   Owner:          $OWNER"
echo ""

read -p "Deploy strategy to this vault? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying CharmStrategyUSD1..."

STRATEGY_OUTPUT=$(forge create contracts/strategies/CharmStrategyUSD1.sol:CharmStrategyUSD1 \
  --broadcast \
  --rpc-url https://eth.llamarpc.com \
  --private-key "$PK" \
  --gas-limit 3000000 \
  --legacy \
  --constructor-args \
    "$VAULT_ADDRESS" \
    "$CHARM_VAULT" \
    "$WLFI" \
    "$USD1" \
    "$UNISWAP_ROUTER" \
    "$OWNER" \
  2>&1)

echo "$STRATEGY_OUTPUT"

STRATEGY=$(echo "$STRATEGY_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$STRATEGY" ]; then
    echo ""
    echo "❌ Strategy deployment failed!"
    echo "Check the output above for errors."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ STRATEGY DEPLOYED! ✅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Addresses:"
echo "   Vault:    $VAULT_ADDRESS"
echo "   Strategy: $STRATEGY"
echo ""
echo "🔗 Etherscan:"
echo "   https://etherscan.io/address/$STRATEGY"
echo ""
echo "📋 Next Steps:"
echo "   1. Run integration setup:"
echo "      export VAULT_ADDRESS=$VAULT_ADDRESS"
echo "      export STRATEGY_ADDRESS=$STRATEGY"
echo "      npx hardhat run scripts/complete-charm-integration.ts --network ethereum"
echo ""
echo "   2. Then deploy to Charm:"
echo "      npx hardhat run scripts/deploy-to-charm.ts --network ethereum"
echo ""

