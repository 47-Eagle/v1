import { mainnet } from "viem/chains";

export const URL = import.meta.env.VITE_API_URL || ""

export const managerAddress: string = "0xB05Cf01231cF2fF99499682E64D3780d57c80FdD";

export const maxTotalSupply: string =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export const minLimitBalance = 0.00002;

export const BasicTokens = [
  [
    "WETH",
    "USDT",
    "USDC",
    "DAI",
    "WLFI",
    "USD1",
    "LINK",
    "UNI",
    "wstETH",
    "WBTC",
  ],
];
export const MainTokens = [
  "0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E",
];

export const MAINSYMBOLS = [
  "EAGLE",
]

export const chainNames =[
  "Ethereum",
]

export const changeColors = [
  "text-blue-400",
]

export const changeBg = [
  "bg-blue-400",
]

export const changeBorder = [
  "hover:border-blue-400",
]

export const chainIDS = [
  "ethereum",
]

export const LOGO = "https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy";
export const Icon = [
  {
    name: "Ethereum",
    chainId: mainnet.id,
    routerAddress: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Uniswap V3 NonfungiblePositionManager (for LP positions!)
    swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 SwapRouter (for swaps)
    factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Uniswap V3 Factory
    EagleTokenAddress: "0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E", // Eagle Token (EagleShareOFT)
    vaultAddress: "0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953", // EagleOVault
    vaultFactoryAddress: "0x5B7B8b487D05F77977b7ABEec5F922925B9b2aFa",
  },
];
const truncateMiddle = (str: string, maxLength: number = 16): string => {
    if (str.length <= maxLength) return str;
    
    const ellipsis = '...';
    const charsToShow = maxLength - ellipsis.length;
    const frontChars = Math.ceil(charsToShow / 2);
    const backChars = Math.floor(charsToShow / 2);
    
    return str.substr(0, frontChars) + ellipsis + str.substr(str.length - backChars);
}

const formatFloatString = (floatString: string): string => {
    // Convert the string to a number
    const numberValue = parseFloat(floatString);
  
    // Check if the conversion was successful
    if (isNaN(numberValue)) {
      throw new Error('Invalid float string');
    }
  
    // Format the number to two decimal places
    return numberValue.toFixed(2);
  }

 export const truncateString = (str: string): string => {
    if (str.length <= 8) return str;
    return str.slice(0, 4) + '...' + str.slice(-4);
  };

  

export default {truncateMiddle, formatFloatString, truncateString};

