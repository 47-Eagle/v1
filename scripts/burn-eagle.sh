#!/bin/bash

# Burn EAGLE tokens
# Usage: PRIVATE_KEY=your_key ./scripts/redeem-and-inject.sh

set -e

# Config
EAGLE="0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E"
USER="0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
RPC="https://eth.llamarpc.com"

# Amount to burn (11.2M EAGLE)
AMOUNT="11215560057152774754816818"

# Check private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    echo "Usage: PRIVATE_KEY=your_key ./scripts/redeem-and-inject.sh"
    exit 1
fi

echo "==================================="
echo "EAGLE Token Burn Script"
echo "==================================="
echo ""
echo "Account: $USER"
echo "EAGLE to burn: $AMOUNT (11.2M EAGLE)"
echo "Contract: $EAGLE"
echo ""
read -p "Are you sure you want to burn these tokens? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi
echo ""

# Burn tokens
echo "Burning EAGLE tokens..."
cast send $EAGLE \
  "burn(address,uint256)" \
  $USER \
  $AMOUNT \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo ""
echo "==================================="
echo "✓ Burn complete!"
echo "==================================="
