#!/bin/bash

# Fix vault state and burn vEAGLE
# Usage: PRIVATE_KEY=your_key ./scripts/fix-and-burn.sh

set -e

VAULT="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
WLFI="0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6"
USER="0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
STRATEGY1="0x6c638f745B7adC2873a52De0D732163b32144f0b"
STRATEGY2="0x55E78798A926Bac07b4D90f7b1bEc769b72E76A6"
RPC="https://eth.llamarpc.com"

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

echo "==================================="
echo "Fix Vault & Burn vEAGLE"
echo "==================================="
echo ""

# Step 1: Sync balances
echo "[1/5] Syncing vault balances..."
cast send $VAULT \
  "syncBalances()" \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Synced"
echo ""

# Step 2: Remove strategy 1 (force withdraws funds)
echo "[2/5] Removing strategy 1..."
cast send $VAULT \
  "removeStrategy(address)" \
  $STRATEGY1 \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Strategy 1 removed"
echo ""

# Step 3: Remove strategy 2 (force withdraws funds)
echo "[3/5] Removing strategy 2..."
cast send $VAULT \
  "removeStrategy(address)" \
  $STRATEGY2 \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Strategy 2 removed"
echo ""

# Step 4: Sync balances again
echo "[4/5] Syncing balances again..."
cast send $VAULT \
  "syncBalances()" \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Synced"
echo ""

# Step 5: Now try redeem
echo "[5/5] Checking new balance and redeeming..."
VEAGLE=$(cast call $VAULT "balanceOf(address)(uint256)" $USER --rpc-url $RPC)
echo "vEAGLE balance: $VEAGLE"

WLFI_PREVIEW=$(cast call $VAULT "previewRedeem(uint256)(uint256)" $VEAGLE --rpc-url $RPC)
echo "WLFI preview: $WLFI_PREVIEW"

cast send $VAULT \
  "redeem(uint256,address,address)" \
  $VEAGLE \
  $USER \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo ""
echo "==================================="
echo "Done! Now inject WLFI back if you want to burn."
echo "==================================="
