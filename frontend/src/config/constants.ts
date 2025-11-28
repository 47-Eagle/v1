// Price constants (approximate - actual prices from oracle)
export const PRICES = {
  WLFI_USD: 0.125,  // ~$0.125 per WLFI
  ETH_USD: 3796,    // ~$3,796 per ETH
  USD1_USD: 1.00,   // $1.00 per USD1
} as const;

// Vault configuration
export const VAULT_CONFIG = {
  SHARES_PER_USD: 80000,  // 80,000 vEAGLE shares per $1 USD
  MAX_SUPPLY: 50_000_000,  // 50M max vEAGLE shares
} as const;

// Fee configuration
export const FEES = {
  WRAP_FEE_BPS: 100,      // 1% wrap fee (vEAGLE → EAGLE)
  UNWRAP_FEE_BPS: 200,    // 2% unwrap fee (EAGLE → vEAGLE)
  DEX_FEE_BPS: 200,       // 2% DEX trading fee
  BASIS_POINTS: 10000,    // 100% = 10,000 basis points
} as const;

