#!/bin/bash
# Deploy fresh Eagle Vault + Charm Strategy system

set -e
PK=$(grep "^PRIVATE_KEY=" .env | cut -d'=' -f2)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🦅 DEPLOYING FRESH EAGLE VAULT SYSTEM 🦅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Deploy Vault
echo "1️⃣ Deploying EagleOVault..."
VAULT_OUTPUT=$(forge create contracts/EagleOVault.sol:EagleOVault \
  --broadcast \
  --rpc-url https://eth.llamarpc.com \
  --private-key "$PK" \
  --gas-limit 5000000 \
  --legacy \
  --constructor-args \
    0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \
    0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d \
    0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d \
    0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d \
    0xE592427A0AEce92De3Edee1F18E0157C05861564 \
    0x7310Dd6EF89b7f829839F140C6840bc929ba2031 \
  2>&1)

VAULT=$(echo "$VAULT_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo "✅ Vault: $VAULT"
echo ""

# Step 2: Deploy Strategy (with new vault address)
echo "2️⃣ Deploying CharmStrategyUSD1 (matched to vault)..."
STRATEGY_OUTPUT=$(forge create contracts/strategies/CharmStrategyUSD1.sol:CharmStrategyUSD1 \
  --broadcast \
  --rpc-url https://eth.llamarpc.com \
  --private-key "$PK" \
  --gas-limit 3000000 \
  --legacy \
  --constructor-args \
    $VAULT \
    0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71 \
    0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \
    0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d \
    0x7310Dd6EF89b7f829839F140C6840bc929ba2031 \
  2>&1)

STRATEGY=$(echo "$STRATEGY_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo "✅ Strategy: $STRATEGY"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 FRESH SYSTEM DEPLOYED! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Vault:    $VAULT"
echo "Strategy: $STRATEGY"
echo ""
echo "Next: Run setup script to connect them!"

