import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

interface ContractHealth {
  contract: string;
  address: string;
  deployed: boolean;
  responsive: boolean;
  balance: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface VaultMetrics {
  name: string;
  symbol: string;
  totalAssets: string;
  totalSupply: string;
  sharePrice: string;
  asset: string;
}

interface HealthData {
  timestamp: string;
  blockNumber: number;
  contracts: ContractHealth[];
  vault: VaultMetrics | null;
  multisig: {
    balance: string;
    owners: number;
    threshold: number;
  };
  summary: {
    healthy: number;
    warning: number;
    critical: number;
  };
}

// Production contract addresses
const CONTRACTS = {
  EagleRegistry: '0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e',
  EagleOVault: '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953',
  EagleShareOFT: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',
  EagleVaultWrapper: '0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5',
  CharmStrategyUSD1: '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f',
  Multisig: '0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3',
};

export function ProductionStatus() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      setError(null);
      const provider = new ethers.JsonRpcProvider(
        import.meta.env.VITE_ETHEREUM_RPC || import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
      );

      const blockNumber = await provider.getBlockNumber();
      const contracts: ContractHealth[] = [];

      // Check each contract
      for (const [name, address] of Object.entries(CONTRACTS)) {
        try {
          const code = await provider.getCode(address);
          const balance = await provider.getBalance(address);
          
          contracts.push({
            contract: name,
            address,
            deployed: code !== '0x',
            responsive: code !== '0x',
            balance: ethers.formatEther(balance),
            status: code !== '0x' ? 'healthy' : 'critical',
          });
        } catch (err) {
          contracts.push({
            contract: name,
            address,
            deployed: false,
            responsive: false,
            balance: '0',
            status: 'critical',
          });
        }
      }

      // Get vault metrics
      let vaultMetrics: VaultMetrics | null = null;
      try {
        const vaultAbi = [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalAssets() view returns (uint256)',
          'function totalSupply() view returns (uint256)',
          'function asset() view returns (address)',
        ];
        const vault = new ethers.Contract(CONTRACTS.EagleOVault, vaultAbi, provider);
        
        const [name, symbol, totalAssets, totalSupply, asset] = await Promise.all([
          vault.name(),
          vault.symbol(),
          vault.totalAssets(),
          vault.totalSupply(),
          vault.asset(),
        ]);

        vaultMetrics = {
          name,
          symbol,
          totalAssets: ethers.formatEther(totalAssets),
          totalSupply: ethers.formatEther(totalSupply),
          sharePrice: totalSupply > 0 ? (Number(totalAssets) / Number(totalSupply)).toFixed(6) : '0',
          asset,
        };
      } catch (err) {
        console.error('Failed to fetch vault metrics:', err);
      }

      // Get multisig info
      const multisigBalance = await provider.getBalance(CONTRACTS.Multisig);

      const summary = {
        healthy: contracts.filter(c => c.status === 'healthy').length,
        warning: contracts.filter(c => c.status === 'warning').length,
        critical: contracts.filter(c => c.status === 'critical').length,
      };

      setHealthData({
        timestamp: new Date().toISOString(),
        blockNumber,
        contracts,
        vault: vaultMetrics,
        multisig: {
          balance: ethers.formatEther(multisigBalance),
          owners: 5,
          threshold: 3,
        },
        summary,
      });

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Health check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading production status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-red-500 text-xl font-bold mb-2">⚠️ Error</h2>
          <p className="text-white">{error}</p>
          <button
            onClick={fetchHealthData}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            🦅 Eagle OVault Production Status
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">
            Real-time monitoring of Ethereum Mainnet deployment
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-400">
            <span>Block: {healthData.blockNumber.toLocaleString()}</span>
            <span className="hidden sm:inline">•</span>
            <span>Last Update: {lastUpdate.toLocaleTimeString()}</span>
            <button
              onClick={fetchHealthData}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-xs"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-6">
            <div className="text-green-500 text-4xl font-bold mb-2">
              {healthData.summary.healthy}
            </div>
            <div className="text-green-300 text-sm">Healthy Contracts</div>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-6">
            <div className="text-yellow-500 text-4xl font-bold mb-2">
              {healthData.summary.warning}
            </div>
            <div className="text-yellow-300 text-sm">Warnings</div>
          </div>
          
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
            <div className="text-red-500 text-4xl font-bold mb-2">
              {healthData.summary.critical}
            </div>
            <div className="text-red-300 text-sm">Critical Issues</div>
          </div>
        </div>

        {/* Vault Metrics */}
        {healthData.vault && (
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">💰 Vault Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-gray-400 text-sm mb-1">Total Assets</div>
                <div className="text-white text-2xl font-bold">
                  {parseFloat(healthData.vault.totalAssets).toFixed(2)} ETH
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Total Supply</div>
                <div className="text-white text-2xl font-bold">
                  {parseFloat(healthData.vault.totalSupply).toLocaleString()} {healthData.vault.symbol}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Share Price</div>
                <div className="text-white text-2xl font-bold">
                  {healthData.vault.sharePrice}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Token</div>
                <div className="text-white text-lg font-mono">
                  {healthData.vault.symbol}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contract Status */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">📋 Contract Health</h2>
          <div className="space-y-4">
            {healthData.contracts.map((contract) => (
              <div
                key={contract.address}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getStatusIcon(contract.status)}</span>
                    <div>
                      <div className="text-white font-bold">{contract.contract}</div>
                      <a
                        href={`https://etherscan.io/address/${contract.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm font-mono"
                      >
                        {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                      </a>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getStatusColor(contract.status)}`}>
                      {contract.status.toUpperCase()}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {parseFloat(contract.balance).toFixed(4)} ETH
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multisig Info */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">🔐 Multisig Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-gray-400 text-sm mb-1">Balance</div>
              <div className="text-white text-xl font-bold">
                {parseFloat(healthData.multisig.balance).toFixed(6)} ETH
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Owners</div>
              <div className="text-white text-xl font-bold">
                {healthData.multisig.owners}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Threshold</div>
              <div className="text-white text-xl font-bold">
                {healthData.multisig.threshold}/{healthData.multisig.owners}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>Production deployment on Ethereum Mainnet</p>
          <p className="mt-2">Auto-refreshes every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}

