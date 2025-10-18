// Deployed contract addresses on Ethereum (FINAL - October 18, 2025) - ALL VANITY 0x47...ea91e!
export const CONTRACTS = {
  VAULT: '0x47ff05aaf066f50baefdcfdcadf63d3762eea91e',       // FINAL - forceApprove fix! 0x47...ea91e
  OFT: '0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E',         // PRODUCTION - Vanity! 0x47...ea91e
  WRAPPER: '0x47d5768f68fb10e1d068673fde07b8a0cabea91e',     // PRODUCTION - Vanity! 0x47...ea91e
  STRATEGY: '0x47b6419c3abb94cdee7ace5f0bcbbbdd697ea91e',    // FINAL - Vanity! 0x47...ea91e
  CHARM_VAULT: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF', // Charm Alpha Vault
  
  // Token addresses (REAL tokens!)
  WLFI: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',  // Real World Liberty Financial
  USD1: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
} as const;

export const CHAIN_ID = 1; // Ethereum mainnet

// v1 Contracts (deprecated - oracle bug)
export const CONTRACTS_V1 = {
  VAULT: '0xf7eDdA9959249D96773BB2858bE1011C7E424855',
  OFT: '0x05D8Fe8B549bC8F45615FDAc1BF77eE7F4033569',
  WRAPPER: '0xA3d9e8f0de77241267A9d162c535C2A69385792A',
  STRATEGY: '0xd548CbC1D0A8723838993a763f1ca20533ed0c12',
} as const;

