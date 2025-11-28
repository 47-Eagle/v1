import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CharmStats {
  currentFeeApr: string;
  weeklyApy: string;
  monthlyApy: string;
  historicalSnapshots: Array<{ timestamp: number; feeApr: string; totalValue: number }>;
  calculatedApr: number | null;
  calculatedApy: number | null;
  liquidTotal: string;
  strategyTotal: string;
}

interface CharmStatsContextType {
  stats: CharmStats;
  setStats: (stats: Partial<CharmStats>) => void;
  isLoaded: boolean;
}

const defaultStats: CharmStats = {
  currentFeeApr: '0',
  weeklyApy: '0',
  monthlyApy: '0',
  historicalSnapshots: [],
  calculatedApr: null,
  calculatedApy: null,
  liquidTotal: '0',
  strategyTotal: '0',
};

const CharmStatsContext = createContext<CharmStatsContextType>({
  stats: defaultStats,
  setStats: () => {},
  isLoaded: false,
});

export function CharmStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStatsState] = useState<CharmStats>(defaultStats);
  const [isLoaded, setIsLoaded] = useState(false);

  const setStats = useCallback((newStats: Partial<CharmStats>) => {
    setStatsState(prev => ({ ...prev, ...newStats }));
    setIsLoaded(true);
  }, []);

  return (
    <CharmStatsContext.Provider value={{ stats, setStats, isLoaded }}>
      {children}
    </CharmStatsContext.Provider>
  );
}

export function useCharmStats() {
  return useContext(CharmStatsContext);
}

