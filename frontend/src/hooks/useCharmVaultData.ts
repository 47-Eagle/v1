import { useState, useEffect } from 'react';
import { Contract, formatUnits, JsonRpcProvider } from 'ethers';
import { useEthersProvider } from './useEthersProvider';
import { CONTRACTS } from '../config/contracts';

// Public RPC endpoint for reading data
const PUBLIC_RPC = import.meta.env.VITE_ETHEREUM_RPC || 'https://eth.llamarpc.com';

// Charm Finance Alpha Vault ABI (minimal interface for what we need)
const CHARM_VAULT_ABI = [
  'function getTotalAmounts() view returns (uint256 total0, uint256 total1)',
  'function getBasePosition() view returns (int24 tickLower, int24 tickUpper)',
  'function getLimitPosition() view returns (int24 tickLower, int24 tickUpper)',
  'function baseThreshold() view returns (uint256)',
  'function limitThreshold() view returns (uint256)',
  'function maxTotalSupply() view returns (uint256)',
  'function pool() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];

const POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
];

interface CharmVaultData {
  // Position data
  baseTickLower: number;
  baseTickUpper: number;
  limitTickLower: number;
  limitTickUpper: number;
  currentTick: number;
  
  // Liquidity weights
  baseWeight: number; // percentage
  limitWeight: number; // percentage
  fullRangeWeight: number; // percentage
  
  // Amounts
  total0: string;
  total1: string;
  
  // Loading state
  loading: boolean;
  error: string | null;
}

export function useCharmVaultData(): CharmVaultData {
  const walletProvider = useEthersProvider();
  const [data, setData] = useState<CharmVaultData>({
    baseTickLower: 0,
    baseTickUpper: 0,
    limitTickLower: 0,
    limitTickUpper: 0,
    currentTick: 0,
    baseWeight: 0,
    limitWeight: 0,
    fullRangeWeight: 0,
    total0: '0',
    total1: '0',
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchVaultData() {
      // Use wallet provider if available, otherwise fall back to public RPC
      const provider = walletProvider || new JsonRpcProvider(PUBLIC_RPC);

      try {
        console.log('[useCharmVaultData] Fetching vault data from contract...');
        
        const vaultContract = new Contract(CONTRACTS.CHARM_VAULT, CHARM_VAULT_ABI, provider);
        
        // Fetch all data in parallel
        const [
          totalAmounts,
          basePosition,
          limitPosition,
          baseThreshold,
          limitThreshold,
          poolAddress,
        ] = await Promise.all([
          vaultContract.getTotalAmounts(),
          vaultContract.getBasePosition(),
          vaultContract.getLimitPosition(),
          vaultContract.baseThreshold(),
          vaultContract.limitThreshold(),
          vaultContract.pool(),
        ]);

        // Get current tick from pool
        const poolContract = new Contract(poolAddress, POOL_ABI, provider);
        const slot0 = await poolContract.slot0();
        const currentTick = Number(slot0[1]);

        // Calculate weights (thresholds are in basis points: 10000 = 100%)
        const baseThresholdBps = Number(formatUnits(baseThreshold, 0));
        const limitThresholdBps = Number(formatUnits(limitThreshold, 0));
        
        // In Charm vaults:
        // - baseThreshold = minimum % for base position
        // - limitThreshold = minimum % for limit position
        // - remaining goes to full range
        const baseWeightCalc = baseThresholdBps / 100; // Convert basis points to percentage
        const limitWeightCalc = limitThresholdBps / 100;
        const fullRangeWeightCalc = 100 - baseWeightCalc - limitWeightCalc;

        const vaultData: CharmVaultData = {
          baseTickLower: Number(basePosition[0]),
          baseTickUpper: Number(basePosition[1]),
          limitTickLower: Number(limitPosition[0]),
          limitTickUpper: Number(limitPosition[1]),
          currentTick,
          baseWeight: baseWeightCalc,
          limitWeight: limitWeightCalc,
          fullRangeWeight: fullRangeWeightCalc,
          total0: formatUnits(totalAmounts[0], 18),
          total1: formatUnits(totalAmounts[1], 18),
          loading: false,
          error: null,
        };

        console.log('[useCharmVaultData] Vault data fetched:', {
          basePosition: `${vaultData.baseTickLower} to ${vaultData.baseTickUpper}`,
          limitPosition: `${vaultData.limitTickLower} to ${vaultData.limitTickUpper}`,
          currentTick: vaultData.currentTick,
          weights: {
            base: `${vaultData.baseWeight.toFixed(2)}%`,
            limit: `${vaultData.limitWeight.toFixed(2)}%`,
            fullRange: `${vaultData.fullRangeWeight.toFixed(2)}%`,
          },
          amounts: {
            USD1: vaultData.total0,
            WLFI: vaultData.total1,
          }
        });

        setData(vaultData);
      } catch (error) {
        console.error('[useCharmVaultData] Error fetching vault data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }

    fetchVaultData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchVaultData, 30000);
    return () => clearInterval(interval);
  }, [walletProvider]);

  return data;
}

