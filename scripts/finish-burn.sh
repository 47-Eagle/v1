#!/bin/bash

# Finish burning orphaned vEAGLE (steps 4-6)
# Usage: PRIVATE_KEY=your_key ./scripts/finish-burn.sh

set -e

VAULT="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
WLFI="0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6"
USER="0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
RPC="https://eth.llamarpc.com"

VEAGLE_AMOUNT="12415807062988360023141762"
WLFI_AMOUNT="4046844276868871308909"

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

echo "==================================="
echo "Finish Burn (Steps 4-6)"
echo "==================================="
echo ""

# Step 4: Redeem vEAGLE
echo "[4/6] Redeeming vEAGLE for WLFI..."
cast send $VAULT \
  "redeem(uint256,address,address)" \
  $VEAGLE_AMOUNT \
  $USER \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Redeemed"
echo ""

# Step 5: Approve WLFI
echo "[5/6] Approving WLFI to vault..."
cast send $WLFI \
  "approve(address,uint256)" \
  $VAULT \
  $WLFI_AMOUNT \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Approved"
echo ""

# Step 6: Inject WLFI
echo "[6/6] Injecting WLFI back to vault..."
cast send $VAULT \
  "injectCapital(uint256,uint256)" \
  $WLFI_AMOUNT \
  0 \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Injected"
echo ""
echo "==================================="
echo "Burn complete!"
echo "==================================="
