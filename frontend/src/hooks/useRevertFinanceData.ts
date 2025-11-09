import { useState, useEffect } from 'react';
import { CONTRACTS } from '../config/contracts';

const POOL_ADDRESS = '0x9C2C8910F113f3b3B4F1f454D23A0F6B61B8E5A7'; // USD1/WLFI 1% pool

interface RevertFinanceData {
  tvl: number;
  avgAPR: number;
  maxAPR: number;
  avgVolume: number;
  loading: boolean;
  error: string | null;
}

export function useRevertFinanceData(): RevertFinanceData {
  const [data, setData] = useState<RevertFinanceData>({
    tvl: 0,
    avgAPR: 0,
    maxAPR: 0,
    avgVolume: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('[useRevertFinanceData] Fetching from API proxy...');
        const response = await fetch(
          `/api/revert-finance?pool=${POOL_ADDRESS}&days=30&network=mainnet`
        );
        
        console.log('[useRevertFinanceData] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[useRevertFinanceData] Raw result:', result);
        
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
          
          console.log('[useRevertFinanceData] Calculated data:', calculatedData);
          
          setData(calculatedData);
        } else {
          console.log('[useRevertFinanceData] No data available in result');
          setData(prev => ({ ...prev, loading: false, error: 'No data available' }));
        }
      } catch (err: any) {
        console.error('[useRevertFinanceData] Error:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: err.message || 'Failed to fetch data',
        }));
      }
    }

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return data;
}

