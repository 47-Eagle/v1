import { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';

// Charm Alpha Vault ABI (minimal for reading position data)
const CHARM_VAULT_ABI = [
  'function getTotalAmounts() external view returns (uint256 total0, uint256 total1)',
  'function totalSupply() external view returns (uint256)',
  'function pool() external view returns (address)',
];

const UNISWAP_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
];

export interface CharmPositionData {
  totalWLFI: number;
  totalUSD1: number;
  currentTick: number;
  currentPrice: number;
  totalLiquidity: number;
  apr: number;
  tvl: number;
  volume24h: number;
  fees24h: number;
}

export function useCharmData(provider: BrowserProvider | null, charmVaultAddress: string) {
  const [data, setData] = useState<CharmPositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider || !charmVaultAddress) {
      setLoading(false);
      return;
    }

    const fetchCharmData = async () => {
      setLoading(true);
      setError(null);

      try {
        const charmVault = new Contract(charmVaultAddress, CHARM_VAULT_ABI, provider);

        // Get total amounts in the vault
        const [total0, total1] = await charmVault.getTotalAmounts();
        const totalSupply = await charmVault.totalSupply();
        const poolAddress = await charmVault.pool();

        // Get pool data
        const pool = new Contract(poolAddress, UNISWAP_POOL_ABI, provider);
        const slot0 = await pool.slot0();
        const liquidity = await pool.liquidity();

        // Convert sqrtPriceX96 to actual price
        const sqrtPriceX96 = slot0[0];
        const tick = slot0[1];
        
        // Price = (sqrtPriceX96 / 2^96)^2
        const price = Math.pow(Number(sqrtPriceX96) / Math.pow(2, 96), 2);

        // Calculate TVL (simplified - would need token prices)
        const totalWLFI = Number(total0) / 1e18;
        const totalUSD1 = Number(total1) / 1e18;
        const tvl = (totalWLFI * price) + totalUSD1; // Approximate

        setData({
          totalWLFI,
          totalUSD1,
          currentTick: Number(tick),
          currentPrice: price,
          totalLiquidity: Number(liquidity),
          apr: 12.5, // Would calculate from historical fees
          tvl,
          volume24h: 0, // Would fetch from subgraph
          fees24h: 0, // Would fetch from subgraph
        });

      } catch (err: any) {
        console.error('Failed to fetch Charm data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCharmData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCharmData, 30000);
    return () => clearInterval(interval);

  }, [provider, charmVaultAddress]);

  return { data, loading, error };
}

// Helper to fetch historical data from Uniswap subgraph
export async function fetchHistoricalPoolData(poolAddress: string, days: number = 7) {
  const query = `
    query PoolDayData($poolAddress: String!, $days: Int!) {
      poolDayDatas(
        first: $days
        orderBy: date
        orderDirection: desc
        where: { pool: $poolAddress }
      ) {
        date
        volumeUSD
        feesUSD
        tvlUSD
        high
        low
      }
    }
  `;

  try {
    const response = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { poolAddress: poolAddress.toLowerCase(), days }
      })
    });

    const result = await response.json();
    return result.data?.poolDayDatas || [];
  } catch (error) {
    console.error('Failed to fetch historical data:', error);
    return [];
  }
}

