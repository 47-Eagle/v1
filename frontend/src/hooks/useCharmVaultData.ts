import { useState, useEffect } from 'react';
import { Contract, formatUnits, JsonRpcProvider } from 'ethers';
import { useEthersProvider } from './useEthersProvider';
import { CONTRACTS } from '../config/contracts';

// Public RPC endpoint for reading data
const PUBLIC_RPC = import.meta.env.VITE_ETHEREUM_RPC || 'https://eth.llamarpc.com';

// Fetch from Charm Finance GraphQL API
async function fetchFromGraphQL() {
  const query = `
    query GetVault($address: ID!) {
      vault(id: $address) {
        baseLower
        baseUpper
        limitLower
        limitUpper
        baseThreshold
        limitThreshold
        fullRangeWeight
        pool { tick }
      }
    }
  `;

  const response = await fetch('https://stitching-v2.herokuapp.com/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { address: CONTRACTS.CHARM_VAULT.toLowerCase() }
    })
  });

  const result = await response.json();
  const vault = result.data?.vault;
  
  if (!vault) {
    console.log('[fetchFromGraphQL] No vault data returned');
    return null;
  }

  console.log('[fetchFromGraphQL] Success! Vault data:', vault);

  // Parse the GraphQL data (values in basis points: 10000 = 100%)
  const baseThreshold = parseFloat(vault.baseThreshold || '0');
  const limitThreshold = parseFloat(vault.limitThreshold || '0');
  const fullRangeWeight = parseFloat(vault.fullRangeWeight || '0');
  
  console.log('[fetchFromGraphQL] Raw values:', { baseThreshold, limitThreshold, fullRangeWeight });
  
  return {
    baseTickLower: parseInt(vault.baseLower),
    baseTickUpper: parseInt(vault.baseUpper),
    limitTickLower: parseInt(vault.limitLower),
    limitTickUpper: parseInt(vault.limitUpper),
    currentTick: vault.pool?.tick ? parseInt(vault.pool.tick) : 0,
    // Convert basis points to percentage: divide by 100 (not 10000 since GraphQL already returns percentage-like values)
    baseWeight: baseThreshold > 1000 ? baseThreshold / 100 : baseThreshold,
    limitWeight: limitThreshold > 1000 ? limitThreshold / 100 : limitThreshold,
    fullRangeWeight: fullRangeWeight > 1000 ? fullRangeWeight / 100 : fullRangeWeight,
    total0: '0',
    total1: '0',
  };
}

// Charm Finance Alpha Vault ABI (minimal interface - public state variables)
const CHARM_VAULT_ABI = [
  // Position tick ranges (public state variables)
  'function baseLower() view returns (int24)',
  'function baseUpper() view returns (int24)',
  'function limitLower() view returns (int24)',
  'function limitUpper() view returns (int24)',
  // Thresholds (in basis points, where 10000 = 100%)
  'function baseThreshold() view returns (uint24)',
  'function limitThreshold() view returns (uint24)',
  'function fullRangeWeight() view returns (uint24)',
  // Pool reference
  'function pool() view returns (address)',
  // Token amounts
  'function getTotalAmounts() view returns (uint256 total0, uint256 total1)',
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
        
        // Try GraphQL API first (more reliable)
        try {
          const graphqlData = await fetchFromGraphQL();
          if (graphqlData) {
            setData({
              ...graphqlData,
              loading: false,
              error: null,
            });
            return;
          }
        } catch (e) {
          console.log('[useCharmVaultData] GraphQL fetch failed, trying direct contract calls...');
        }

        // Fallback to direct contract calls
        const vaultContract = new Contract(CONTRACTS.CHARM_VAULT, CHARM_VAULT_ABI, provider);
        
        // Fetch all data in parallel
        const [
          baseLower,
          baseUpper,
          limitLower,
          limitUpper,
          baseThreshold,
          limitThreshold,
          fullRangeWeight,
          poolAddress,
        ] = await Promise.all([
          vaultContract.baseLower(),
          vaultContract.baseUpper(),
          vaultContract.limitLower(),
          vaultContract.limitUpper(),
          vaultContract.baseThreshold().catch(() => 2900n), // Default 29%
          vaultContract.limitThreshold().catch(() => 2400n), // Default 24%
          vaultContract.fullRangeWeight().catch(() => 4700n), // Default 47%
          vaultContract.pool(),
        ]);

        // Get current tick from pool
        const poolContract = new Contract(poolAddress, POOL_ABI, provider);
        const slot0 = await poolContract.slot0();
        const currentTick = Number(slot0[1]);

        // Get total amounts (may not exist on all vaults)
        let total0 = '0';
        let total1 = '0';
        try {
          const totalAmounts = await vaultContract.getTotalAmounts();
          total0 = formatUnits(totalAmounts[0], 18);
          total1 = formatUnits(totalAmounts[1], 18);
        } catch (e) {
          console.log('[useCharmVaultData] getTotalAmounts not available, using defaults');
        }

        // Calculate weights (values are in basis points: 10000 = 100%)
        // Convert BigInt to number then to percentage
        const baseWeightCalc = Number(baseThreshold) / 100; // basis points to percentage
        const limitWeightCalc = Number(limitThreshold) / 100;
        const fullRangeWeightCalc = Number(fullRangeWeight) / 100;

        const vaultData: CharmVaultData = {
          baseTickLower: Number(baseLower),
          baseTickUpper: Number(baseUpper),
          limitTickLower: Number(limitLower),
          limitTickUpper: Number(limitUpper),
          currentTick,
          baseWeight: baseWeightCalc,
          limitWeight: limitWeightCalc,
          fullRangeWeight: fullRangeWeightCalc,
          total0,
          total1,
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

