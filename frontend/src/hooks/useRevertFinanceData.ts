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
    let isMounted = true;
    const abortControllers: AbortController[] = [];
    
    async function fetchPoolData(poolAddress: string): Promise<RevertFinanceData> {
      const abortController = new AbortController();
      abortControllers.push(abortController);
      
      // Set timeout to prevent hanging requests
      const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(
          `/api/revert-finance?pool=${poolAddress}&days=30&network=mainnet`,
          {
            signal: abortController.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Don't throw for 404 or other client errors, just return empty data
          if (response.status === 404 || response.status >= 400) {
            return {
              tvl: 0,
              avgAPR: 0,
              maxAPR: 0,
              avgVolume: 0,
              loading: false,
              error: null, // Silently fail
            };
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
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
          
          return {
            tvl: latestDay.tvl_usd || 0,
            avgAPR,
            maxAPR,
            avgVolume,
            loading: false,
            error: null,
          };
        } else {
          // No data available - return empty data silently
          return {
            tvl: 0,
            avgAPR: 0,
            maxAPR: 0,
            avgVolume: 0,
            loading: false,
            error: null,
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        // Silently handle errors (timeout, network errors, etc.)
        // Only log if it's not an abort/timeout error
        if (err.name !== 'AbortError' && err.name !== 'TimeoutError') {
          console.warn(`[useRevertFinanceData] Error for ${poolAddress}:`, err.message);
        }
        return {
          tvl: 0,
          avgAPR: 0,
          maxAPR: 0,
          avgVolume: 0,
          loading: false,
          error: null, // Don't show error to user
        };
      }
    }

    async function fetchAllData() {
      if (!isMounted) return;
      
      try {
        const [strategy1Data, strategy2Data] = await Promise.all([
          fetchPoolData(POOL_ADDRESS_USD1_WLFI),
          fetchPoolData(POOL_ADDRESS_WETH_WLFI),
        ]);

        if (isMounted) {
          setData({
            strategy1: strategy1Data,
            strategy2: strategy2Data,
          });
        }
      } catch (err) {
        // Silently handle errors
        if (isMounted) {
          setData(prev => ({
            strategy1: prev.strategy1.loading ? { ...prev.strategy1, loading: false, error: null } : prev.strategy1,
            strategy2: prev.strategy2.loading ? { ...prev.strategy2, loading: false, error: null } : prev.strategy2,
          }));
        }
      }
    }

    fetchAllData();
    // Refresh every 10 minutes (reduced frequency)
    const interval = setInterval(fetchAllData, 10 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      // Abort any pending requests
      abortControllers.forEach(controller => controller.abort());
    };
  }, []);

  return data;
}


