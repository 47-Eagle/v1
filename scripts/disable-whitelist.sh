#!/bin/bash

# Disable whitelist on EagleOVault to allow anyone to deposit
# Usage: PRIVATE_KEY=your_key ./scripts/disable-whitelist.sh

set -e

VAULT="0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
RPC="https://eth.llamarpc.com"

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    echo "Usage: PRIVATE_KEY=your_key ./scripts/disable-whitelist.sh"
    exit 1
fi

echo "==================================="
echo "Disable Vault Whitelist"
echo "==================================="
echo ""
echo "Vault: $VAULT"
echo "This will allow ANYONE to deposit WLFI"
echo ""

cast send $VAULT \
  "setWhitelistEnabled(bool)" \
  false \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo ""
echo "==================================="
echo "✓ Whitelist disabled!"
echo "==================================="
