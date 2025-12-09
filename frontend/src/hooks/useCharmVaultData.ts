import { useState, useEffect } from 'react';
import { Contract, formatUnits, JsonRpcProvider } from 'ethers';
import { useEthersProvider } from './useEthersProvider';
import { CONTRACTS } from '../config/contracts';

// Public RPC endpoint for reading data
const PUBLIC_RPC = import.meta.env.VITE_ETHEREUM_RPC || import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';

// Fetch from Charm Finance GraphQL API
async function fetchFromGraphQL() {
  // Use the actual Charm Finance query structure
  // We need the amounts to calculate actual weight percentages
  const query = `
    query GetVault($address: ID!) {
      vault(id: $address) {
        id
        baseLower
        baseUpper
        limitLower
        limitUpper
        fullRangeWeight
        total0
        total1
        totalSupply
        fullAmount0
        fullAmount1
        baseAmount0
        baseAmount1
        limitAmount0
        limitAmount1
        pool {
          id
          tick
          sqrtPrice
          token0
          token1
          token0Symbol
          token1Symbol
        }
      }
    }
  `;

  const response = await fetch('https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.2', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { address: CONTRACTS.CHARM_VAULT.toLowerCase() }
    })
  });

  const result = await response.json();
  
  if (result.errors) {
    console.error('[fetchFromGraphQL] GraphQL errors:', result.errors);
    return null;
  }
  
  const vault = result.data?.vault;
  
  if (!vault) {
    console.log('[fetchFromGraphQL] No vault data returned, response:', result);
    return null;
  }

  console.log('[fetchFromGraphQL] Success! Raw vault data:', vault);
  console.log('[fetchFromGraphQL] Raw fullRangeWeight value:', vault.fullRangeWeight);

  // Try to get amounts - GraphQL might not have these fields populated
  const fullAmount0 = parseFloat(vault.fullAmount0 || '0');
  const fullAmount1 = parseFloat(vault.fullAmount1 || '0');
  const baseAmount0 = parseFloat(vault.baseAmount0 || '0');
  const baseAmount1 = parseFloat(vault.baseAmount1 || '0');
  const limitAmount0 = parseFloat(vault.limitAmount0 || '0');
  const limitAmount1 = parseFloat(vault.limitAmount1 || '0');
  
  const totalValue = fullAmount0 + fullAmount1 + baseAmount0 + baseAmount1 + limitAmount0 + limitAmount1;
  
  console.log('[fetchFromGraphQL] Raw amount fields from API:', {
    fullAmount0: vault.fullAmount0,
    fullAmount1: vault.fullAmount1,
    baseAmount0: vault.baseAmount0,
    baseAmount1: vault.baseAmount1,
    limitAmount0: vault.limitAmount0,
    limitAmount1: vault.limitAmount1,
  });
  
  console.log('[fetchFromGraphQL] Parsed amounts (as numbers):', {
    fullAmount0,
    fullAmount1,
    baseAmount0,
    baseAmount1,
    limitAmount0,
    limitAmount1,
    totalValue
  });
  
  // Get full range weight from contract
  // GraphQL might return basis points (740000) or already-converted percentage (74)
  const fullRangeWeightRaw = parseFloat(vault.fullRangeWeight || '0');
  
  // If value is > 100, it's in basis points and needs conversion
  // If value is <= 100, it's already a percentage
  let fullRangePercent = fullRangeWeightRaw;
  if (fullRangeWeightRaw > 100) {
    fullRangePercent = fullRangeWeightRaw / 10000; // Convert basis points (740000 → 74, where 10000 = 100%)
    console.log('[fetchFromGraphQL] Converted from basis points:', fullRangeWeightRaw, '→', fullRangePercent + '%');
  } else {
    console.log('[fetchFromGraphQL] Already in percentage:', fullRangePercent + '%');
  }
  
  // Calculate remaining allocation for base + limit orders
  const remainingPercent = 100 - fullRangePercent;
  
  console.log('[fetchFromGraphQL] Remaining allocation for base+limit:', remainingPercent + '%');
  console.log('[fetchFromGraphQL] ⚠️ CRITICAL DEBUG - fullRangePercent:', fullRangePercent);
  console.log('[fetchFromGraphQL] ⚠️ CRITICAL DEBUG - remainingPercent:', remainingPercent);
  
  // If amounts aren't available, we can't calculate the base/limit split
  if (totalValue === 0) {
    console.log('[fetchFromGraphQL] No amount data available, using estimated split');
    const baseCalc = remainingPercent * 0.5;
    const limitCalc = remainingPercent * 0.5;
    console.log('[fetchFromGraphQL] ⚠️ EARLY RETURN - Calculated splits:', {
      baseWeight: baseCalc,
      limitWeight: limitCalc,
      fullRangeWeight: fullRangePercent,
      total: baseCalc + limitCalc + fullRangePercent
    });
    // Fall back to estimated split (roughly equal)
    return {
      baseTickLower: parseInt(vault.baseLower),
      baseTickUpper: parseInt(vault.baseUpper),
      limitTickLower: parseInt(vault.limitLower),
      limitTickUpper: parseInt(vault.limitUpper),
      currentTick: vault.pool?.tick ? parseInt(vault.pool.tick) : 0,
      baseWeight: baseCalc,
      limitWeight: limitCalc,
      fullRangeWeight: fullRangePercent,
      total0: vault.total0 || '0',
      total1: vault.total1 || '0',
    };
  }
  
  // Calculate actual base and limit percentages from amounts
  const baseValue = Math.abs(baseAmount0 + baseAmount1);
  const limitValue = Math.abs(limitAmount0 + limitAmount1);
  const nonFullRangeValue = baseValue + limitValue;
  
  let basePercent = 0;
  let limitPercent = 0;
  
  if (nonFullRangeValue > 0 && !isNaN(nonFullRangeValue)) {
    // Split the remaining % based on actual amounts in each position
    const baseRatio = baseValue / nonFullRangeValue;
    const limitRatio = limitValue / nonFullRangeValue;
    
    // Ensure ratios are valid (not NaN, not negative)
    if (!isNaN(baseRatio) && !isNaN(limitRatio) && baseRatio >= 0 && limitRatio >= 0) {
      basePercent = remainingPercent * baseRatio;
      limitPercent = remainingPercent * limitRatio;
    } else {
      // Invalid ratios, use tick-based split as fallback
      console.warn('[fetchFromGraphQL] Invalid ratios, using tick-based fallback');
      basePercent = remainingPercent * (2000 / 6000); // Base = 2000 ticks
      limitPercent = remainingPercent * (4000 / 6000); // Limit = 4000 ticks
    }
  } else {
    // No non-full-range liquidity or invalid data, use tick-based split
    console.log('[fetchFromGraphQL] No valid amount data, using tick-based split');
    basePercent = remainingPercent * (2000 / 6000); // Base = 2000 ticks  
    limitPercent = remainingPercent * (4000 / 6000); // Limit = 4000 ticks
  }
  
  // Final safety: ensure all percentages are positive and valid
  basePercent = Math.abs(basePercent);
  limitPercent = Math.abs(limitPercent);
  
  // Ensure they're not NaN
  if (isNaN(basePercent)) basePercent = remainingPercent * (2000 / 6000);
  if (isNaN(limitPercent)) limitPercent = remainingPercent * (4000 / 6000);
  
  console.log('[fetchFromGraphQL] Base/Limit split calculation:', {
    baseValue,
    limitValue,
    nonFullRangeValue,
    baseRatio: nonFullRangeValue > 0 ? (baseValue / nonFullRangeValue).toFixed(2) : 'N/A',
    limitRatio: nonFullRangeValue > 0 ? (limitValue / nonFullRangeValue).toFixed(2) : 'N/A',
  });
  
  console.log('[fetchFromGraphQL] Final allocation:', {
    fullRange: fullRangePercent.toFixed(2) + '%',
    base: basePercent.toFixed(2) + '%',
    limit: limitPercent.toFixed(2) + '%',
    total: (fullRangePercent + basePercent + limitPercent).toFixed(2) + '%'
  });
  
  const vaultData = {
    baseTickLower: parseInt(vault.baseLower),
    baseTickUpper: parseInt(vault.baseUpper),
    limitTickLower: parseInt(vault.limitLower),
    limitTickUpper: parseInt(vault.limitUpper),
    currentTick: vault.pool?.tick ? parseInt(vault.pool.tick) : 0,
    baseWeight: basePercent,
    limitWeight: limitPercent,
    fullRangeWeight: fullRangePercent,
    total0: vault.total0 || '0',
    total1: vault.total1 || '0',
  };
  
  console.log('[fetchFromGraphQL] ⚠️ FINAL RETURN VALUE:', vaultData);
  
  return vaultData;
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
          console.log('[useCharmVaultData] Attempting GraphQL fetch...');
          const graphqlData = await fetchFromGraphQL();
          if (graphqlData) {
            console.log('[useCharmVaultData] ✅ GraphQL SUCCESS! Data received:', {
              baseWeight: graphqlData.baseWeight,
              limitWeight: graphqlData.limitWeight,
              fullRangeWeight: graphqlData.fullRangeWeight,
              total: graphqlData.baseWeight + graphqlData.limitWeight + graphqlData.fullRangeWeight
            });
            setData({
              ...graphqlData,
              loading: false,
              error: null,
            });
            return;
          } else {
            console.log('[useCharmVaultData] GraphQL returned null, falling back to direct contract...');
          }
        } catch (e) {
          console.log('[useCharmVaultData] GraphQL fetch failed, trying direct contract calls...', e);
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

        // Log raw values from contract BEFORE conversion
        console.log('[useCharmVaultData] Raw contract values:', {
          baseThreshold: baseThreshold.toString(),
          limitThreshold: limitThreshold.toString(),
          fullRangeWeight: fullRangeWeight.toString(),
        });

        // Calculate weights
        // fullRangeWeight might be in basis points (740000) or percentage (74)
        const fullRangeWeightRaw = Number(fullRangeWeight);
        let fullRangeWeightCalc = fullRangeWeightRaw;
        
        // If > 100, it's in basis points, convert it
        if (fullRangeWeightRaw > 100) {
          fullRangeWeightCalc = fullRangeWeightRaw / 10000; // Convert basis points (740000 → 74, where 10000 = 100%)
          console.log('[useCharmVaultData] Converted from basis points:', fullRangeWeightRaw, '→', fullRangeWeightCalc + '%');
        } else {
          console.log('[useCharmVaultData] Already in percentage:', fullRangeWeightCalc + '%');
        }
        
        // The remaining % is split between base and limit
        const remainingPercent = Math.max(0, 100 - fullRangeWeightCalc); // Ensure non-negative
        
        console.log('[useCharmVaultData] Remaining for base+limit:', remainingPercent + '%');
        
        // Safety check: if remaining is negative, something is wrong
        if (remainingPercent <= 0) {
          console.error('[useCharmVaultData] ERROR: Remaining percent is zero or negative!', {
            fullRangeWeightRaw,
            fullRangeWeightCalc,
            remainingPercent,
            usingFallback: true
          });
        }
        
        // baseThreshold and limitThreshold are NOT weights, they're rebalancing thresholds
        // We need to calculate the actual split based on position widths or amounts
        // Use a simple split based on tick width:
        // Base = 2000 ticks, Limit = 4000 ticks (from user info)
        // So limit gets 2x the allocation of base
        let baseWeightCalc = remainingPercent * (2000 / 6000); // 2000 out of 6000 total ticks
        let limitWeightCalc = remainingPercent * (4000 / 6000); // 4000 out of 6000 total ticks
        
        // Ensure weights are positive and not NaN
        baseWeightCalc = Math.abs(baseWeightCalc);
        limitWeightCalc = Math.abs(limitWeightCalc);
        
        if (isNaN(baseWeightCalc)) baseWeightCalc = 8.67; // Fallback default
        if (isNaN(limitWeightCalc)) limitWeightCalc = 17.33; // Fallback default
        
        console.log('[useCharmVaultData] Calculated weights:', {
          baseWeight: baseWeightCalc.toFixed(2) + '%',
          limitWeight: limitWeightCalc.toFixed(2) + '%',
          fullRangeWeight: fullRangeWeightCalc.toFixed(2) + '%',
          total: (baseWeightCalc + limitWeightCalc + fullRangeWeightCalc).toFixed(2) + '%'
        });

        // Final safety check before setting state
        let safeFullWeight = fullRangeWeightCalc;
        let safeBaseWeight = baseWeightCalc;
        let safeLimitWeight = limitWeightCalc;
        
        // Triple-check the values are sane
        if (Math.abs(safeFullWeight) > 100) {
          console.error('[useCharmVaultData] CRITICAL: Full weight still > 100 after conversion!', safeFullWeight);
          safeFullWeight = safeFullWeight / 10000; // Convert basis points (where 10000 = 100%)
        }
        
        // Ensure all weights are positive
        safeFullWeight = Math.abs(safeFullWeight);
        safeBaseWeight = Math.abs(safeBaseWeight);
        safeLimitWeight = Math.abs(safeLimitWeight);
        
        // Final NaN check
        if (isNaN(safeFullWeight)) safeFullWeight = 74; // Default full range
        if (isNaN(safeBaseWeight)) safeBaseWeight = 8.67;
        if (isNaN(safeLimitWeight)) safeLimitWeight = 17.33;

        const vaultData: CharmVaultData = {
          baseTickLower: Number(baseLower),
          baseTickUpper: Number(baseUpper),
          limitTickLower: Number(limitLower),
          limitTickUpper: Number(limitUpper),
          currentTick,
          baseWeight: safeBaseWeight,
          limitWeight: safeLimitWeight,
          fullRangeWeight: safeFullWeight,
          total0,
          total1,
          loading: false,
          error: null,
        };

        console.log('[useCharmVaultData] FINAL Vault data (after safety checks):', {
          basePosition: `${vaultData.baseTickLower} to ${vaultData.baseTickUpper}`,
          limitPosition: `${vaultData.limitTickLower} to ${vaultData.limitTickUpper}`,
          currentTick: vaultData.currentTick,
          weights: {
            base: `${vaultData.baseWeight.toFixed(2)}%`,
            limit: `${vaultData.limitWeight.toFixed(2)}%`,
            fullRange: `${vaultData.fullRangeWeight.toFixed(2)}%`,
            total: `${(vaultData.baseWeight + vaultData.limitWeight + vaultData.fullRangeWeight).toFixed(2)}%`
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

