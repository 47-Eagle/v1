// Deployed contract addresses on Ethereum (PRODUCTION - Working!)
export const CONTRACTS = {
  VAULT: '0x32a2544De7a644833fE7659dF95e5bC16E698d99',       // EagleOVault (PUSH + Corrected) ✅
  OFT: '0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E',         // EagleShareOFT ✅
  WRAPPER: '0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03',     // EagleVaultWrapper ✅
  STRATEGY: '0xd286Fdb2D3De4aBf44649649D79D5965bD266df4',    // CharmStrategyUSD1 (Fixed & Deployed!) ✅
  CHARM_VAULT: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71', // Charm USD1/WLFI Vault
  
  // Token addresses (REAL tokens!)
  WLFI: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',  // Real World Liberty Financial
  USD1: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
} as const;

export const CHAIN_ID = 1; // Ethereum mainnet
