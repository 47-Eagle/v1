// Deployed contract addresses on Ethereum (PRODUCTION - October 18, 2025)
export const CONTRACTS = {
  VAULT: '0xA2f437252Bd1479aBE69A249DD95Fa0F39aCb58d',       // EagleOVault V4 (Underflow FIXED!)
  OFT: '0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E',         // EagleShareOFT
  WRAPPER: '0x47d5768f68fb10e1d068673fde07b8a0cabea91e',     // EagleVaultWrapper
  STRATEGY: '0xb1571A0f815dCBbF649AD2eE4a18dc2D085780B8',    // CharmStrategy V2 (Approvals fixed!)
  CHARM_VAULT: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF', // Charm Alpha Vault
  
  // Token addresses (REAL tokens!)
  WLFI: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',  // Real World Liberty Financial
  USD1: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
} as const;

export const CHAIN_ID = 1; // Ethereum mainnet

// Old deployment (first version)
export const CONTRACTS_V1 = {
  VAULT: '0xf7eDdA9959249D96773BB2858bE1011C7E424855',
  OFT: '0x05D8Fe8B549bC8F45615FDAc1BF77eE7F4033569',
  WRAPPER: '0xA3d9e8f0de77241267A9d162c535C2A69385792A',
  STRATEGY: '0xd548CbC1D0A8723838993a763f1ca20533ed0c12',
} as const;

