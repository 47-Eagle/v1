#!/bin/bash

# Burn vEAGLE shares by redeeming and injecting capital back
# Usage: PRIVATE_KEY=your_key ./scripts/burn-veagle.sh

set -e

# Config
VAULT="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
WLFI="0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6"
USER="0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
RPC="https://eth.llamarpc.com"

# Amounts
SHARES="298005835585268324944"
WLFI_AMOUNT="97132889073865884"

# Check private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    echo "Usage: PRIVATE_KEY=your_key ./scripts/burn-veagle.sh"
    exit 1
fi

echo "==================================="
echo "vEAGLE Burn (Redeem + Inject)"
echo "==================================="
echo ""
echo "Account: $USER"
echo "vEAGLE to redeem: $SHARES (~298 shares)"
echo "WLFI to receive & inject: $WLFI_AMOUNT (~0.097 WLFI)"
echo ""

# Step 1: Redeem
echo "[1/3] Redeeming vEAGLE shares..."
cast send $VAULT \
  "redeem(uint256,address,address)" \
  $SHARES \
  $USER \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Redeem complete"
echo ""

# Step 2: Approve
echo "[2/3] Approving WLFI to vault..."
cast send $WLFI \
  "approve(address,uint256)" \
  $VAULT \
  $WLFI_AMOUNT \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Approval complete"
echo ""

# Step 3: Inject
echo "[3/3] Injecting capital back..."
cast send $VAULT \
  "injectCapital(uint256,uint256)" \
  $WLFI_AMOUNT \
  0 \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Injection complete"
echo ""
echo "==================================="
echo "vEAGLE shares burned!"
echo "==================================="
