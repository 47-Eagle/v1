// Token and Protocol Icon URLs
// Stored on IPFS via Pinata for permanence and reliability

export const ICONS = {
  // Tokens
  WLFI: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu',
  USD1: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreic74no55hhm544qjraibffhrb4h7zldae5sfsyipvu6dvfyqubppy',
  EAGLE: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy',
  
  // Networks
  ETHEREUM: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreiagnmvgbx3g7prmcg57pu3safks7ut6j3okopfmji7h5pndz2zeqy',
  BNB: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreigqndf7kfutndj6e6ms2ic6pci7fi3wsch3nvxv5w5m6end6bmmme',
  
  // Protocols
  CHARM: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu',
  UNISWAP: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreichw4b4wxvinfu4dmkloxajj4mm7672k6q3nyqzvdnvogvlbbycfq',
  LAYERZERO_EMBLEM: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreihml3nahd2duwdjg2ltoeixax2xdj2ldp5unnrjwntyicar74nwra',
  LAYERZERO_LOGO: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreidp4x62pp27pf6cdtddvas7e3d2cshozgzi3yhmr2whhcefo5anly',
} as const;

// Helper function to get icon URL with fallback
export const getIcon = (iconKey: keyof typeof ICONS, fallback?: string): string => {
  return ICONS[iconKey] || fallback || '';
};

