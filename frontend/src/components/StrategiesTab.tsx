import { useState } from 'react';
import { CONTRACTS } from '../config/contracts';

interface StrategiesTabProps {
  vaultData: any;
  revertData?: any;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function StrategiesTab({ vaultData, revertData, onToast }: StrategiesTabProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<1 | 2>(1);
  
  // Extract real data
  const wlfiPrice = Number(vaultData.wlfiPrice) || 0.0001;
  const wethPrice = Number(vaultData.wethPrice) || 3500;
  
  // USD1/WLFI Strategy Data
  const usd1StrategyValue = Number(vaultData.strategyUSD1) || 0;
  const usd1InPool = Number(vaultData.strategyUSD1InPool) || 0;
  const wlfiInUSD1Pool = Number(vaultData.strategyWLFIinUSD1Pool) || 0;
  
  // WETH/WLFI Strategy Data
  const wethStrategyValue = Number(vaultData.strategyWLFI) || 0;
  const wethInPool = Number(vaultData.strategyWETH) || 0;
  const wlfiInWethPool = Number(vaultData.strategyWLFIinPool) || 0;
  
  // Total deployed
  const totalDeployed = usd1StrategyValue + wethStrategyValue;
  const usd1Allocation = totalDeployed > 0 ? (usd1StrategyValue / totalDeployed) * 100 : 50;
  const wethAllocation = totalDeployed > 0 ? (wethStrategyValue / totalDeployed) * 100 : 50;

  // Get Revert data for current strategy
  const currentRevertData = selectedStrategy === 1 ? revertData?.strategy1 : revertData?.strategy2;

  // Format helpers
  const formatNumber = (n: number, decimals = 2) => {
    if (isNaN(n) || !isFinite(n)) return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  };

  const formatUSD = (n: number) => {
    if (isNaN(n) || !isFinite(n)) return '$0.00';
    return '$' + formatNumber(n, 2);
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  // Strategy configs - V3 Strategies with zRouter + Auto Fee Tier
  const strategies = {
    1: {
      name: 'CHARM_V3.USD1_WLFI',
      fullName: 'Charm USD1/WLFI Alpha Vault V3',
      version: 'V3',
      token0: 'USD1',
      token1: 'WLFI',
      token0Amount: usd1InPool,
      token1Amount: wlfiInUSD1Pool,
      totalValue: usd1StrategyValue,
      allocation: usd1Allocation,
      feeTier: 'Auto',
      contract: CONTRACTS.STRATEGY_USD1, // V3: 0x6c638f745B7adC2873a52De0D732163b32144f0b
      charmVault: CONTRACTS.CHARM_VAULT_USD1,
      charmLink: 'https://alpha.charm.fi/ethereum/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
      poolPrice: wlfiPrice > 0 ? (1 / wlfiPrice).toFixed(4) : '0',
      tickLower: -887200,
      tickUpper: 887200,
      features: ['zRouter', 'Auto Fee Tier', 'Bidirectional Swaps'],
    },
    2: {
      name: 'CHARM_V3.WETH_WLFI',
      fullName: 'Charm WETH/WLFI Alpha Vault V3',
      version: 'V3',
      token0: 'WETH',
      token1: 'WLFI',
      token0Amount: wethInPool,
      token1Amount: wlfiInWethPool,
      totalValue: wethStrategyValue,
      allocation: wethAllocation,
      feeTier: 'Auto',
      contract: CONTRACTS.STRATEGY_WETH, // V3: 0xF71CB8b57667A39Bc1727A9AB8f3aF19d14DBC28
      charmVault: CONTRACTS.CHARM_VAULT_WETH,
      charmLink: 'https://alpha.charm.fi/ethereum/vault/0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
      poolPrice: (wethPrice / wlfiPrice).toFixed(2),
      tickLower: -887200,
      tickUpper: 887200,
      features: ['zRouter', 'Auto Fee Tier', 'Bidirectional Swaps'],
    }
  };

  const currentStrategy = strategies[selectedStrategy];

  // Simulated event log (would be real events in production)
  const eventLog = [
    { time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg: 'Heartbeat: CharmVault in range.', type: 'info' },
    { time: '14:02:11', msg: `StrategyDeposit: ${formatNumber(wlfiInUSD1Pool, 0)} WLFI deposited successfully.`, type: 'success' },
    { time: '14:02:09', msg: 'TokensSwapped: Optimal ratio achieved (Slippage: 0.04%)', type: 'info' },
    { time: '13:58:44', msg: 'ParametersUpdated: swapSlippageBps set to 300', type: 'info' },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Neumorphic Container */}
      <div className="rounded-2xl overflow-hidden
        bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900
        shadow-[8px_8px_16px_rgba(0,0,0,0.4),-4px_-4px_12px_rgba(255,255,255,0.05)]
        border border-gray-700/30">
      {/* Strategy Selector Tabs */}
      <div className="flex gap-[2px] bg-[#2a2a30]">
        <button
          onClick={() => setSelectedStrategy(1)}
          className={`flex-1 py-3 px-4 text-left transition-all duration-300 ${
            selectedStrategy === 1 
              ? 'bg-[#1a1b1e] border-t-2 border-t-[#F2D57C]' 
              : 'bg-[#0a0a0b] hover:bg-[#141517] border-t-2 border-t-transparent'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-[#F2D57C] font-bold tracking-[0.2em] uppercase">Strategy #1</div>
              <div className={`text-sm font-bold ${selectedStrategy === 1 ? 'text-white' : 'text-[#71717a]'}`}>
                USD1/WLFI
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#71717a] font-mono">{formatNumber(usd1Allocation, 1)}%</div>
              <div className={`text-sm font-mono ${selectedStrategy === 1 ? 'text-[#F2D57C]' : 'text-[#71717a]'}`}>
                {formatUSD(usd1StrategyValue)}
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={() => setSelectedStrategy(2)}
          className={`flex-1 py-3 px-4 text-left transition-all duration-300 ${
            selectedStrategy === 2 
              ? 'bg-[#1a1b1e] border-t-2 border-t-[#F2D57C]' 
              : 'bg-[#0a0a0b] hover:bg-[#141517] border-t-2 border-t-transparent'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-[#F2D57C] font-bold tracking-[0.2em] uppercase">Strategy #2</div>
              <div className={`text-sm font-bold ${selectedStrategy === 2 ? 'text-white' : 'text-[#71717a]'}`}>
                WETH/WLFI
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#71717a] font-mono">{formatNumber(wethAllocation, 1)}%</div>
              <div className={`text-sm font-mono ${selectedStrategy === 2 ? 'text-[#F2D57C]' : 'text-[#71717a]'}`}>
                {formatUSD(wethStrategyValue)}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Main Monolith Panel */}
      <div className="bg-[#1a1b1e] border border-[#333] relative overflow-hidden"
        style={{
          boxShadow: '0 0 0 1px #000, 20px 20px 60px rgba(0,0,0,0.8), -1px -1px 0px rgba(255,255,255,0.1)',
          clipPath: 'polygon(0 0, 100% 0, 100% 95%, 97% 100%, 0 100%)'
        }}
      >
        {/* Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/brushed-alum.png")' }}
        />

        {/* Corner Screws */}
        <div className="absolute top-3 left-3 w-3 h-3 bg-[#111] rounded-full" style={{ boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.1), 1px 1px 2px rgba(0,0,0,0.5)' }}>
          <div className="absolute top-1/2 left-1/2 w-2 h-[1px] bg-[#222] -translate-x-1/2 -translate-y-1/2 rotate-45" />
        </div>
        <div className="absolute top-3 right-3 w-3 h-3 bg-[#111] rounded-full" style={{ boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.1), 1px 1px 2px rgba(0,0,0,0.5)' }}>
          <div className="absolute top-1/2 left-1/2 w-2 h-[1px] bg-[#222] -translate-x-1/2 -translate-y-1/2 rotate-45" />
        </div>
        <div className="absolute bottom-3 left-3 w-3 h-3 bg-[#111] rounded-full" style={{ boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.1), 1px 1px 2px rgba(0,0,0,0.5)' }}>
          <div className="absolute top-1/2 left-1/2 w-2 h-[1px] bg-[#222] -translate-x-1/2 -translate-y-1/2 rotate-45" />
        </div>
        <div className="absolute bottom-3 right-3 w-3 h-3 bg-[#111] rounded-full" style={{ boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.1), 1px 1px 2px rgba(0,0,0,0.5)' }}>
          <div className="absolute top-1/2 left-1/2 w-2 h-[1px] bg-[#222] -translate-x-1/2 -translate-y-1/2 rotate-45" />
        </div>

        <div className="p-6 sm:p-8 relative z-10">
          {/* Header */}
          <header className="border-b-2 border-black pb-5 mb-6 relative">
            <div className="absolute bottom-[-3px] left-0 w-full h-[1px] bg-white/10" />
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-[0.4em] text-[#F2D57C] font-black uppercase">
                    Strategic Liquidity Vault
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-[#00ff66]/20 text-[#00ff66] font-bold rounded border border-[#00ff66]/30">
                    V3
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] font-bold rounded border border-[#3b82f6]/30">
                    zRouter
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                  {currentStrategy.name}
                </h1>
              </div>
              <div className="text-left sm:text-right font-mono">
                <div className="inline-flex items-center gap-2 bg-black px-3 py-1.5 border border-white/10"
                  style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
                >
                  <div className="w-1.5 h-1.5 bg-[#00ff66] rounded-full animate-pulse" style={{ boxShadow: '0 0 8px #00ff66' }} />
                  <span className="text-[11px] text-[#00ff66] uppercase tracking-wider">Active Protocol</span>
                </div>
                <div className="text-[11px] text-[#71717a] mt-2">
                  ADDR: <span className="text-white">{truncateAddress(currentStrategy.contract)}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Liquidity Distribution Panel */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <span className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                  Liquidity Distribution
                </span>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <span className="font-mono text-2xl text-white">{formatNumber(currentStrategy.token0Amount, 4)}</span>
                    <span className="block text-[11px] text-[#71717a] uppercase mt-1">{currentStrategy.token0} Balance</span>
                  </div>
                  <div>
                    <span className="font-mono text-2xl text-white">{formatNumber(currentStrategy.token1Amount, 2)}</span>
                    <span className="block text-[11px] text-[#71717a] uppercase mt-1">{currentStrategy.token1} Balance</span>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-[#222] flex justify-between items-center">
                  <span className="text-[12px] text-[#71717a]">TOTAL VALUE (USD)</span>
                  <span className="font-mono font-bold text-[#F2D57C] text-lg">{formatUSD(currentStrategy.totalValue)}</span>
                </div>
              </div>

              {/* Range Monitor Panel */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <span className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                  Concentrated Range Monitor
                </span>
                <div className="flex justify-between font-mono text-[10px] mb-2">
                  <span>TICK_LOWER: {currentStrategy.tickLower}</span>
                  <span className="text-[#00ff66]">IN_RANGE</span>
                  <span>TICK_UPPER: {currentStrategy.tickUpper}</span>
                </div>
                {/* Range Visualizer */}
                <div className="h-14 bg-black border border-[#222] relative overflow-hidden">
                  <div 
                    className="absolute h-full flex items-center justify-center font-mono text-[9px] text-[#00ff66]"
                    style={{ 
                      left: '20%', 
                      right: '25%', 
                      background: 'rgba(0, 255, 102, 0.1)',
                      borderLeft: '1px solid #00ff66',
                      borderRight: '1px solid #00ff66'
                    }}
                  >
                    ACTIVE_OPTIMAL_ZONE
                  </div>
                  <div 
                    className="absolute h-full w-[2px] bg-white z-10"
                    style={{ left: '48%', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-white whitespace-nowrap">
                      {currentStrategy.poolPrice}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-mono text-base text-white">{currentStrategy.poolPrice}</span>
                    <span className="block text-[11px] text-[#71717a] uppercase mt-1">
                      POOL PRICE ({currentStrategy.token1}/{currentStrategy.token0})
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-base text-white">{currentStrategy.feeTier}</span>
                    <span className="block text-[11px] text-[#71717a] uppercase mt-1">UNISWAP_FEE_TIER</span>
                  </div>
                </div>
              </div>

              {/* Event Log Panel */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <span className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                  Real-time Execution Log
                </span>
                <div className="h-28 overflow-y-auto font-mono text-[10px] bg-[#080808] border border-black p-2.5">
                  {eventLog.map((entry, i) => (
                    <div key={i} className="flex gap-3 mb-1">
                      <span className="text-[#444]">[{entry.time}]</span>
                      <span className={entry.type === 'success' ? 'text-[#00ff66]' : 'text-[#aaa]'}>
                        {entry.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Controls */}
            <div className="space-y-6">
              {/* Safety Configuration */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <span className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                  Safety Configuration
                </span>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                    <span className="text-[11px] text-[#71717a] uppercase">Max Swap %</span>
                    <span className="font-mono text-white text-[13px]">30.0</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                    <span className="text-[11px] text-[#71717a] uppercase">Swap Slippage</span>
                    <span className="font-mono text-white text-[13px]">3.00%</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                    <span className="text-[11px] text-[#71717a] uppercase">Deposit Slip</span>
                    <span className="font-mono text-white text-[13px]">5.00%</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                    <span className="text-[11px] text-[#71717a] uppercase">Allocation</span>
                    <span className="font-mono text-[#F2D57C] text-[13px]">{formatNumber(currentStrategy.allocation, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                    <span className="text-[11px] text-[#71717a] uppercase">Fee Tier</span>
                    <span className="font-mono text-[#00ff66] text-[13px]">Auto-Discovery</span>
                  </div>
                </div>
              </div>

              {/* V3 Features */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <span className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 text-[9px] font-bold text-[#00ff66] uppercase tracking-wider">
                  V3 Features
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#00ff66] rounded-full" />
                    <span className="text-[11px] text-white">zRouter Gas Optimization</span>
                    <span className="text-[9px] text-[#00ff66] ml-auto">8-18% savings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#00ff66] rounded-full" />
                    <span className="text-[11px] text-white">Auto Fee Tier Discovery</span>
                    <span className="text-[9px] text-[#3b82f6] ml-auto">Best liquidity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#00ff66] rounded-full" />
                    <span className="text-[11px] text-white">Bidirectional Swaps</span>
                    <span className="text-[9px] text-[#F2D57C] ml-auto">Any direction</span>
                  </div>
                </div>
              </div>

              {/* External Links */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <span className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                  External Links
                </span>
                <div className="space-y-2">
                  <a
                    href={currentStrategy.charmLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-center py-3 px-4 text-[12px] font-bold uppercase tracking-wider transition-all duration-100 relative
                      bg-gradient-to-b from-[#2a2c31] to-[#1a1b1e] border border-black text-white
                      hover:brightness-125"
                    style={{ boxShadow: '0 4px 0 #000' }}
                  >
                    <span className="absolute top-[1px] left-[1px] right-[1px] h-[1px] bg-white/20" />
                    View on Charm Finance ↗
                  </a>
                  <a
                    href={`https://etherscan.io/address/${currentStrategy.contract}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-center py-3 px-4 text-[12px] font-bold uppercase tracking-wider transition-all duration-100 relative
                      bg-gradient-to-b from-[#2a2c31] to-[#1a1b1e] border border-black text-white
                      hover:brightness-125"
                    style={{ boxShadow: '0 4px 0 #000' }}
                  >
                    <span className="absolute top-[1px] left-[1px] right-[1px] h-[1px] bg-white/20" />
                    View Contract ↗
                  </a>
                </div>
              </div>

              {/* System Status */}
              <div className="font-mono text-[9px] text-[#444] leading-relaxed">
                SYSTEM_MODE: ATOMIC_SINGLE_ASSET<br />
                REENTRANCY_GUARD: ARMED<br />
                ZROUTER: <span className="text-[#00ff66]">ENABLED</span><br />
                AUTO_FEE_TIER: <span className="text-[#00ff66]">ACTIVE</span><br />
                CHARM_VAULT: {truncateAddress(currentStrategy.charmVault)}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>{/* End Neumorphic Container */}

      {/* Coming Soon Strategy */}
      <div className="mt-4 rounded-xl overflow-hidden
        bg-gradient-to-br from-gray-900/50 to-gray-800/30
        shadow-[4px_4px_8px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.03)]
        border border-gray-700/20 p-4 opacity-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] text-[#71717a] font-bold tracking-[0.2em] uppercase">Strategy #3</div>
            <div className="text-sm font-bold text-[#71717a]">Additional Strategies</div>
            <div className="text-[10px] text-[#444] mt-1">More yield optimization strategies are in development.</div>
          </div>
          <span className="text-[10px] px-2 py-1 bg-[#1a1b1e] text-[#71717a] font-mono uppercase">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}

