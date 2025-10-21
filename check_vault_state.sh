#!/bin/bash
VAULT="0x32a2544De7a644833fE7659dF95e5bC16E698d99"
RPC="https://eth-mainnet.g.alchemy.com/v2/demo"

echo "=== VAULT STATE CHECK ==="
echo ""
echo "What vault THINKS it has (wlfiBalance state var):"
cast call $VAULT "wlfiBalance()(uint256)" --rpc-url $RPC | xargs cast --to-unit

echo ""
echo "What vault THINKS it has (usd1Balance state var):"
cast call $VAULT "usd1Balance()(uint256)" --rpc-url $RPC | xargs cast --to-unit

echo ""
echo "What vault ACTUALLY has (real WLFI balance):"
cast call 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 "balanceOf(address)(uint256)" $VAULT --rpc-url $RPC | xargs cast --to-unit

echo ""
echo "What vault ACTUALLY has (real USD1 balance):"
cast call 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d "balanceOf(address)(uint256)" $VAULT --rpc-url $RPC | xargs cast --to-unit
