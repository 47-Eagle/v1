import { useState, useEffect } from 'react';
import { CONTRACTS } from '../config/contracts';

const POOL_ADDRESS_USD1_WLFI = '0x9C2C8910F113f3b3B4F1f454D23A0F6B61B8E5A7'; // USD1/WLFI 1% pool
const POOL_ADDRESS_WETH_WLFI = '0xCa2e972f081764c30Ae5F012A29D5277EEf33838'; // WETH/WLFI 1% pool

interface RevertFinanceData {
  tvl: number;
  avgAPR: number;
  maxAPR: number;
  avgVolume: number;
  loading: boolean;
  error: string | null;
}

interface RevertFinanceDataByStrategy {
  strategy1: RevertFinanceData; // USD1/WLFI
  strategy2: RevertFinanceData; // WETH/WLFI
}

export function useRevertFinanceData(): RevertFinanceDataByStrategy {
  const [data, setData] = useState<RevertFinanceDataByStrategy>({
    strategy1: {
      tvl: 0,
      avgAPR: 0,
      maxAPR: 0,
      avgVolume: 0,
      loading: true,
      error: null,
    },
    strategy2: {
      tvl: 0,
      avgAPR: 0,
      maxAPR: 0,
      avgVolume: 0,
      loading: true,
      error: null,
    },
  });

  useEffect(() => {
    async function fetchPoolData(poolAddress: string): Promise<RevertFinanceData> {
      try {
        console.log(`[useRevertFinanceData] Fetching for pool ${poolAddress}...`);
        const response = await fetch(
          `/api/revert-finance?pool=${poolAddress}&days=30&network=mainnet`
        );
        
        console.log(`[useRevertFinanceData] Response status for ${poolAddress}:`, response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`[useRevertFinanceData] Raw result for ${poolAddress}:`, result);
        
        if (result.success && result.data && result.data.length > 0) {
          const latestDay = result.data[result.data.length - 1];
          
          // Calculate 7-day average APR
          const last7Days = result.data.slice(-7);
          const validDays = last7Days.filter((d: any) => d.fees_apr > 0);
          const avgAPR = validDays.length > 0
            ? validDays.reduce((sum: number, d: any) => sum + d.fees_apr, 0) / validDays.length
            : 0;
          
          // Calculate 7-day average volume
          const avgVolume = last7Days.reduce((sum: number, d: any) => sum + d.volume_usd, 0) / 7;
          
          // Use max APR from last 7 days
          const maxAPR = Math.max(...last7Days.map((d: any) => d.fees_apr));
          
          const calculatedData = {
            tvl: latestDay.tvl_usd || 0,
            avgAPR,
            maxAPR,
            avgVolume,
            loading: false,
            error: null,
          };
          
          console.log(`[useRevertFinanceData] Calculated data for ${poolAddress}:`, calculatedData);
          
          return calculatedData;
        } else {
          console.log(`[useRevertFinanceData] No data available for ${poolAddress}`);
          return {
            tvl: 0,
            avgAPR: 0,
            maxAPR: 0,
            avgVolume: 0,
            loading: false,
            error: 'No data available',
          };
        }
      } catch (err: any) {
        console.error(`[useRevertFinanceData] Error for ${poolAddress}:`, err);
        return {
          tvl: 0,
          avgAPR: 0,
          maxAPR: 0,
          avgVolume: 0,
          loading: false,
          error: err.message || 'Failed to fetch data',
        };
      }
    }

    async function fetchAllData() {
      const [strategy1Data, strategy2Data] = await Promise.all([
        fetchPoolData(POOL_ADDRESS_USD1_WLFI),
        fetchPoolData(POOL_ADDRESS_WETH_WLFI),
      ]);

      setData({
        strategy1: strategy1Data,
        strategy2: strategy2Data,
      });
    }

    fetchAllData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return data;
}


