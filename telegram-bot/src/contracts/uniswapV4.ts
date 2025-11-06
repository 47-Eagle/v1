// Uniswap V4 Pool Manager ABI (correct from official v4-core package)
export const POOL_MANAGER_ABI = [
  // Swap event - emitted when a swap occurs (NOTE: includes fee parameter!)
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
  
  // ModifyLiquidity event - emitted when liquidity is modified
  "event ModifyLiquidity(bytes32 indexed id, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt)",
  
  // Initialize event - emitted when a pool is initialized
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
  
  // Donate event
  "event Donate(bytes32 indexed id, address indexed sender, uint256 amount0, uint256 amount1, int256 amount0Delta, int256 amount1Delta)",
  
  // View functions
  "function getPool(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 id) external view returns (uint128 liquidity)",
];

// ERC20 ABI for token information
export const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
];

// Helper function to calculate pool ID (Uniswap V4 uses pool IDs)
export function calculatePoolId(
  currency0: string,
  currency1: string,
  fee: number,
  tickSpacing: number,
  hooks: string
): string {
  // This is a simplified version - actual implementation may vary
  // based on Uniswap V4's pool ID calculation
  const { keccak256, solidityPacked } = require('ethers');
  
  return keccak256(
    solidityPacked(
      ['address', 'address', 'uint24', 'int24', 'address'],
      [currency0, currency1, fee, tickSpacing, hooks]
    )
  );
}

