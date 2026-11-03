#!/bin/bash

# Recover orphaned vEAGLE from wrapper and burn it
# Usage: PRIVATE_KEY=your_key ./scripts/recover-and-burn-orphaned.sh

set -e

# Contracts
EAGLE_OFT="0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E"
WRAPPER="0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5"
VAULT="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
WLFI="0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6"
USER="0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
RPC="https://eth.llamarpc.com"

# Orphaned amount
ORPHANED="12415509057152774754816818"

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

echo "==================================="
echo "Recover & Burn Orphaned vEAGLE"
echo "==================================="
echo ""
echo "Orphaned vEAGLE: $ORPHANED (~12.4M)"
echo ""

# Step 1: Mint EAGLE to recover the orphaned vEAGLE
echo "[1/5] Minting EAGLE to self..."
cast send $EAGLE_OFT \
  "mint(address,uint256)" \
  $USER \
  $ORPHANED \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Minted EAGLE"
echo ""

# Step 2: Approve wrapper to spend EAGLE
echo "[2/5] Approving wrapper to spend EAGLE..."
cast send $EAGLE_OFT \
  "approve(address,uint256)" \
  $WRAPPER \
  $ORPHANED \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Approved"
echo ""

# Step 3: Unwrap EAGLE → vEAGLE
echo "[3/5] Unwrapping EAGLE to vEAGLE..."
cast send $WRAPPER \
  "unwrap(uint256)" \
  $ORPHANED \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Unwrapped"
echo ""

# Step 4: Redeem vEAGLE for WLFI
echo "[4/6] Redeeming vEAGLE for WLFI..."
# Redeem exactly what we unwrapped
cast send $VAULT \
  "redeem(uint256,address,address)" \
  $ORPHANED \
  $USER \
  $USER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Redeemed"
echo ""

# Expected WLFI from redeem: ~4046 WLFI
WLFI_AMOUNT="4046747143979797443025"

# Step 5: Approve WLFI to vault
echo "[5/6] Approving WLFI to vault..."
cast send $WLFI \
  "approve(address,uint256)" \
  $VAULT \
  $WLFI_AMOUNT \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✓ Approved"
echo ""

# Step 6: Inject WLFI back (burn effect)
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
echo "Orphaned vEAGLE recovered and burned!"
echo "==================================="
