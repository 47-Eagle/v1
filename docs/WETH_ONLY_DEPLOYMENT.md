# WETH-Only Deployment (Guaranteed to Work)

## Execute These 3 Transactions in Safe (Batch Them):

### Transaction 1: Remove USD1 Strategy
- **To:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- **Value:** `0`
- **Data:** `0xa64c5a4a00000000000000000000000047b2659747d6a7e00c8251c3c3f7e92625a8cf6f`

### Transaction 2: Remove WETH Strategy  
- **To:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- **Value:** `0`
- **Data:** `0xa64c5a4a00000000000000000000000047dce4bd8262fe0e76733825a1cac205905889c6`

### Transaction 3: Add WETH Strategy Back (100% weight)
- **To:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- **Value:** `0`
- **Data:** `0xc83dd2f900000000000000000000000047dce4bd8262fe0e76733825a1cac205905889c60000000000000000000000000000000000000000000000000000000000002710`

**Then separately:**

### Transaction 4: Deploy Funds
- **To:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- **Value:** `0`
- **Data:** `0x68e5ce84`

This ensures a clean state!

