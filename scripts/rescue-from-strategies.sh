#!/bin/bash

# Rescue MEAGLE shares from strategies and withdraw from Charm vaults
# Usage: PRIVATE_KEY=your_key ./scripts/rescue-from-strategies.sh

set -e

USER="0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
STRATEGY1="0x6c638f745B7adC2873a52De0D732163b32144f0b"
STRATEGY2="0x55E78798A926Bac07b4D90f7b1bEc769b72E76A6"
CHARM1="0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71"
CHARM2="0x3314e248F3F752Cd16939773D83bEb3a362F0AEF"
RPC="https://eth.llamarpc.com"

# Your proportional share (24.83% of vault)
# Charm1 = cvEAGLE (USD1/WLFI), Charm2 = cEAGLE (WLFI/WETH)
CHARM_SHARES1="1530880471014268207104"
CHARM_SHARES2="2517014905700040048640"
echo "Your share: 24.83%"
echo "Strategy 1 cvEAGLE to rescue: $CHARM_SHARES1"
echo "Strategy 2 cEAGLE to rescue: $CHARM_SHARES2"

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

echo "==================================="
echo "Rescue Charm Shares from Strategies"
echo "==================================="
echo ""

# Step 1: Rescue cvEAGLE from Strategy 1
echo "[1/4] Rescuing cvEAGLE from Strategy 1..."
cast send $STRATEGY1 \
  "rescueToken(address,uint256,address)" \
  $CHARM1 \
  $CHARM_SHARES1 \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ cvEAGLE rescued"
echo ""

# Step 2: Rescue cEAGLE from Strategy 2
echo "[2/4] Rescuing cEAGLE from Strategy 2..."
cast send $STRATEGY2 \
  "rescueToken(address,uint256,address)" \
  $CHARM2 \
  $CHARM_SHARES2 \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ cEAGLE rescued"
echo ""

# Step 3: Withdraw from Charm Vault 1 (USD1/WLFI)
echo "[3/4] Withdrawing from Charm Vault 1 (USD1/WLFI)..."
cast send $CHARM1 \
  "withdraw(uint256,uint256,uint256,address)" \
  $CHARM_SHARES1 \
  0 \
  0 \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Charm 1 withdrawn"
echo ""

# Step 4: Withdraw from Charm Vault 2 (WLFI/WETH)
echo "[4/4] Withdrawing from Charm Vault 2 (WLFI/WETH)..."
cast send $CHARM2 \
  "withdraw(uint256,uint256,uint256,address)" \
  $CHARM_SHARES2 \
  0 \
  0 \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Charm 2 withdrawn"
echo ""

echo "==================================="
echo "Done! Check your WLFI/WETH balances."
echo "You can now inject WLFI into the vault."
echo "==================================="
