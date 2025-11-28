// Token and Protocol Icon URLs
// Stored on IPFS via Pinata for permanence and reliability

export const ICONS = {
  // Tokens
  WLFI: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu',
  USD1: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreic74no55hhm544qjraibffhrb4h7zldae5sfsyipvu6dvfyqubppy',
  EAGLE: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy',
  
  // Networks
  ETHEREUM: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  BNB: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreify74oobnnpfywzxt26zcp63vjcib47j5zgpyyg4i7i22iqet2674',
  AVAX: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreihmd577vqyqd3iaqpsjupgjr4utcqxx3wrkuc3lvwfbbhbzkgp4qy',
  ARBITRUM: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreibj4e6paq7dbdflyhzevcgrteks345og7klpt34i4em65boofi5we',
  BASE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  MONAD: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreibsvmotzz6oddu4ouyusdal7z4a233hs4bordnaebg7abgkqozuxe',
  HYPEREVM: 'https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreico6h2tttoti4x5llr47tspt4wyl33uowd244vbshuv4xqxdij7kq',
  SONIC: 'https://raw.githubusercontent.com/soniclabs/assets/main/logo.png',
  
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

