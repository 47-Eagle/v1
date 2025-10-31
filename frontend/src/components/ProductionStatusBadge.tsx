import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';

interface StatusSummary {
  healthy: number;
  total: number;
  lastCheck: Date;
}

export function ProductionStatusBadge() {
  const [status, setStatus] = useState<StatusSummary | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🦅 ProductionStatusBadge mounted!', { loading, status });

  const checkHealth = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(
        import.meta.env.VITE_ETHEREUM_RPC || import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
      );

      const contracts = [
        '0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e', // EagleRegistry
        '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953', // EagleOVault
        '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E', // EagleShareOFT
        '0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5', // EagleVaultWrapper
        '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f', // CharmStrategyUSD1
      ];

      let healthy = 0;
      for (const address of contracts) {
        try {
          const code = await provider.getCode(address);
          if (code !== '0x') healthy++;
        } catch (err) {
          // Ignore errors
        }
      }

      setStatus({
        healthy,
        total: contracts.length,
        lastCheck: new Date(),
      });
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Simple fallback for debugging
  if (loading || !status) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 border-2 border-yellow-500 rounded-full">
        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-bold text-yellow-900">CHECKING STATUS...</span>
      </div>
    );
  }

  const isHealthy = status.healthy === status.total;
  const isDegraded = status.healthy > 0 && status.healthy < status.total;

  // Simplified version for visibility
  const bgColor = isHealthy ? 'bg-green-100 border-green-500' : isDegraded ? 'bg-yellow-100 border-yellow-500' : 'bg-red-100 border-red-500';
  const dotColor = isHealthy ? 'bg-green-500' : isDegraded ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = isHealthy ? 'text-green-900' : isDegraded ? 'text-yellow-900' : 'text-red-900';

  return (
    <Link
      to="/status"
      className={`relative z-50 inline-flex items-center gap-2 px-4 py-2 border-2 rounded-full hover:opacity-80 transition-all ${bgColor}`}
      title={`Production Status: ${status.healthy}/${status.total} contracts healthy - Click for details`}
    >
      <div className={`w-3 h-3 rounded-full ${dotColor} ${isHealthy ? 'animate-pulse' : ''}`}></div>
      <span className={`text-xs font-bold ${textColor}`}>
        {status.healthy}/{status.total} LIVE
      </span>
    </Link>
  );
}

