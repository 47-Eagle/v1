import { useState, useMemo } from 'react';
import { CONTRACTS } from '../config/contracts';
import { useStrategyDeployments, formatStrategyEvent, formatEventTime } from '../hooks/useStrategyDeployments';
import { getActiveStrategies, getComingSoonStrategies, type Strategy } from '../config/strategies';

interface StrategiesTabProps {
  vaultData: any;
  revertData?: any;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function StrategiesTab({ vaultData, revertData, onToast }: StrategiesTabProps) {
  const [selectedStrategyIndex, setSelectedStrategyIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Get active strategies from config
  const activeStrategies = useMemo(() => getActiveStrategies(), []);
  
  // Fetch real strategy deployment events from subgraph
  const { events: strategyEvents, loading: eventsLoading, error: eventsError } = useStrategyDeployments(10);
  
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
  const currentRevertData = selectedStrategyIndex === 0 ? revertData?.strategy1 : revertData?.strategy2;

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

  // Build strategy display data dynamically from config
  const strategiesDisplay = useMemo(() => {
    return activeStrategies.map((strategy, index) => {
      // Map config data to display format
      const isUsd1Strategy = strategy.id.includes('usd1');
      const isWethStrategy = strategy.id.includes('weth');
      
      // Determine token pair from pool details
      const pool = strategy.details?.pool || '';
      const [token0, token1] = pool.includes('/') ? pool.split('/') : ['TOKEN', 'WLFI'];
      
      // Get appropriate values based on strategy type
      let token0Amount = 0;
      let token1Amount = 0;
      let totalValue = 0;
      let allocation = strategy.allocation || 0;
      let poolPrice = '0';
      
      if (isUsd1Strategy) {
        token0Amount = usd1InPool;
        token1Amount = wlfiInUSD1Pool;
        totalValue = usd1StrategyValue;
        allocation = usd1Allocation;
        poolPrice = wlfiPrice > 0 ? (1 / wlfiPrice).toFixed(4) : '0';
      } else if (isWethStrategy) {
        token0Amount = wethInPool;
        token1Amount = wlfiInWethPool;
        totalValue = wethStrategyValue;
        allocation = wethAllocation;
        poolPrice = (wethPrice / wlfiPrice).toFixed(2);
      }
      
      return {
        id: strategy.id,
        name: `${strategy.protocol.toUpperCase().replace(' ', '_')}_${strategy.version || 'V1'}.${pool.replace('/', '_')}`,
        fullName: strategy.name,
        version: strategy.version || 'V1',
        token0,
        token1,
        token0Amount,
        token1Amount,
        totalValue,
        allocation,
        feeTier: strategy.details?.feeTier || 'Auto',
        contract: strategy.contractAddress,
        charmVault: strategy.charmVaultAddress || '',
        charmLink: strategy.links?.analytics || '',
        poolPrice,
        tickLower: -887200,
        tickUpper: 887200,
        features: ['zRouter', 'Auto Fee Tier', 'Bidirectional Swaps'],
        protocol: strategy.protocol,
        description: strategy.description,
        color: strategy.color,
        riskLevel: strategy.details?.riskLevel || 'medium',
      };
    });
  }, [activeStrategies, usd1InPool, wlfiInUSD1Pool, usd1StrategyValue, usd1Allocation, wlfiPrice, wethInPool, wlfiInWethPool, wethStrategyValue, wethAllocation, wethPrice]);

  const currentStrategy = strategiesDisplay[selectedStrategyIndex] || strategiesDisplay[0];

  // Early return if no strategies configured
  if (!currentStrategy || strategiesDisplay.length === 0) {
    return (
      <div className="p-6 text-center text-[#71717a]">
        <p>No active strategies configured.</p>
        <p className="text-sm mt-2">Add strategies to <code>config/strategies.ts</code> to display them here.</p>
      </div>
    );
  }

  // Format real events for display
  const eventLog = strategyEvents.length > 0 
    ? strategyEvents.map(event => {
        const formatted = formatStrategyEvent(event);
        return {
          time: formatEventTime(event.timestamp),
          msg: formatted.message,
          type: formatted.type,
          txHash: event.transactionHash,
        };
      })
    : [
        // Fallback when no events loaded yet
        { time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg: eventsLoading ? 'Loading events...' : 'No recent events', type: 'info' as const, txHash: '' },
      ];

  return (
    <div className="p-3 sm:p-6 max-w-full">
      {/* Neumorphic Container */}
      <div className="rounded-2xl overflow-hidden
        bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900
        shadow-[8px_8px_16px_rgba(0,0,0,0.4),-4px_-4px_12px_rgba(255,255,255,0.05)]
        border border-gray-700/30 min-w-0">
      {/* Strategy Selector Tabs - Dynamic from config */}
      <div className="sticky top-0 z-20 flex gap-[2px] bg-[#2a2a30] overflow-x-auto">
        {strategiesDisplay.map((strategy, index) => (
          <button
            key={strategy.id}
            onClick={() => setSelectedStrategyIndex(index)}
            className={`flex-1 min-w-[160px] py-3 px-4 text-left transition-all duration-300 ${
              selectedStrategyIndex === index 
                ? 'bg-[#1a1b1e] border-t-2 border-t-[#F2D57C]' 
                : 'bg-[#0a0a0b] hover:bg-[#141517] border-t-2 border-t-transparent'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#F2D57C] font-bold tracking-[0.2em] uppercase">Strategy #{index + 1}</span>
                  <span className="text-[8px] px-1.5 py-0.5 bg-[#00ff66]/20 text-[#00ff66] font-bold rounded border border-[#00ff66]/30">
                    ACTIVE
                  </span>
                </div>
                <div className={`text-sm font-bold ${selectedStrategyIndex === index ? 'text-white' : 'text-[#71717a]'}`}>
                  {strategy.token0}/{strategy.token1}
                </div>
                <div className="text-[9px] text-[#555] mt-0.5">{strategy.protocol}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#71717a] font-mono">{formatNumber(strategy.allocation, 1)}%</div>
                <div className={`text-sm font-mono ${selectedStrategyIndex === index ? 'text-[#F2D57C]' : 'text-[#71717a]'}`}>
                  {formatUSD(strategy.totalValue)}
                </div>
              </div>
            </div>
          </button>
        ))}
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

        <div className="p-4 sm:p-8 relative z-10 min-w-0">
          {/* Header */}
          <header className="border-b-2 border-black pb-5 mb-6 relative">
            <div className="absolute bottom-[-3px] left-0 w-full h-[1px] bg-white/10" />
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
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
                <div className="mt-1 text-[11px] text-[#71717a] font-mono break-all">
                  <a
                    href={`https://etherscan.io/address/${currentStrategy.contract}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 underline decoration-white/15 hover:decoration-white/40"
                  >
                    {currentStrategy.contract}
                  </a>
                </div>
              </div>
              <div className="text-left sm:text-right font-mono min-w-0" />
            </div>
          </header>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Main Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Liquidity Distribution Panel */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <span className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                  Liquidity Distribution
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 font-mono text-[10px] mb-2 text-[#aaa]">
                  <span className="break-all">TICK_LOWER: {currentStrategy.tickLower}</span>
                  <span className="text-[#00ff66] sm:text-center">IN_RANGE</span>
                  <span className="break-all sm:text-right">TICK_UPPER: {currentStrategy.tickUpper}</span>
                </div>
                {/* Range Visualizer */}
                <div className="h-14 bg-black border border-[#222] relative overflow-hidden">
                  <div 
                    className="absolute h-full flex items-center justify-center font-mono text-[8px] sm:text-[9px] text-[#00ff66] text-center px-2"
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
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Event Log Panel - Real Strategy Deployments */}
              <div className="bg-[#141517] border border-black p-5 relative"
                style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
              >
                <div className="absolute -top-2.5 left-5 bg-[#1a1b1e] px-2 flex items-center gap-2">
                  <span className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                    Recent Strategy Activity
                  </span>
                  {eventsLoading && (
                    <span className="w-1.5 h-1.5 bg-[#F2D57C] rounded-full animate-pulse" />
                  )}
                </div>
                <div className="h-32 overflow-y-auto font-mono text-[10px] bg-[#080808] border border-black p-2.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {eventsError ? (
                    <div className="text-red-400 text-center py-2">
                      Failed to load events
                    </div>
                  ) : eventLog.length === 0 || (eventLog.length === 1 && eventLog[0].msg === 'No recent events') ? (
                    <div className="text-[#444] text-center py-2">
                      No recent strategy activity
                    </div>
                  ) : (
                    eventLog.map((entry, i) => (
                      <div key={i} className="flex gap-3 mb-1.5 items-start hover:bg-white/5 rounded px-1 -mx-1">
                        <span className="text-[#444] shrink-0">[{entry.time}]</span>
                        <span className={
                          entry.type === 'success' ? 'text-[#00ff66]' : 
                          entry.type === 'warning' ? 'text-[#F2D57C]' : 
                          'text-[#aaa]'
                        }>
                          {entry.msg}
                        </span>
                        {entry.txHash && (
                          <a
                            href={`https://etherscan.io/tx/${entry.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#3b82f6] hover:text-[#60a5fa] shrink-0 ml-auto"
                            title="View on Etherscan"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {/* Live indicator */}
                <div className="mt-2 flex items-center justify-between text-[9px] text-[#444]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#00ff66] rounded-full animate-pulse" />
                    <span>LIVE</span>
                  </div>
                  <span>Updates every 30s</span>
                </div>
              </div>
            </div>

            {/* Right Column - Controls */}
            <div className="space-y-6">
              {/* Mobile: collapse advanced panels to reduce vertical bloat */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowAdvanced(v => !v)}
                  className="w-full py-3 px-4 text-[12px] font-bold uppercase tracking-wider transition-all duration-150
                    bg-[#141517] border border-black text-white hover:brightness-110"
                  style={{ boxShadow: '0 4px 0 #000' }}
                >
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>

              <div className={`${showAdvanced ? '' : 'hidden lg:block'} space-y-6`}>
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
                  {currentStrategy.charmLink && (
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
                      View on {currentStrategy.protocol} ↗
                    </a>
                  )}
                  {currentStrategy.contract && currentStrategy.contract !== '0x0000000000000000000000000000000000000000' && (
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
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="font-mono text-[9px] text-[#444] leading-relaxed">
                SYSTEM_MODE: ATOMIC_SINGLE_ASSET<br />
                REENTRANCY_GUARD: ARMED<br />
                PROTOCOL: <span className="text-[#00ff66]">{currentStrategy.protocol?.toUpperCase()}</span><br />
                VERSION: <span className="text-[#00ff66]">{currentStrategy.version}</span><br />
                RISK_LEVEL: <span className={
                  currentStrategy.riskLevel === 'low' ? 'text-[#00ff66]' :
                  currentStrategy.riskLevel === 'medium' ? 'text-[#F2D57C]' :
                  'text-red-400'
                }>{currentStrategy.riskLevel?.toUpperCase()}</span><br />
                {currentStrategy.charmVault && (
                  <>
                    CHARM_VAULT:{' '}
                    <a
                      href={`https://etherscan.io/address/${currentStrategy.charmVault}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#aaa] underline decoration-white/10 hover:decoration-white/40 break-all"
                    >
                      {currentStrategy.charmVault}
                    </a>
                  </>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>{/* End Neumorphic Container */}

      {/* Recent Deployments Summary */}
      {strategyEvents.length > 0 && (
        <div className="mt-4 rounded-xl overflow-hidden
          bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900
          shadow-[4px_4px_8px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.03)]
          border border-gray-700/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#F2D57C] font-bold tracking-[0.2em] uppercase">Recent Deployments</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[#00ff66]/20 text-[#00ff66] font-mono rounded">
                {strategyEvents.filter(e => e.type === 'deposit').length} deposits
              </span>
            </div>
            <button 
              onClick={() => window.open('https://etherscan.io/address/' + CONTRACTS.VAULT + '#events', '_blank')}
              className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa] font-mono"
            >
              View All ↗
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {strategyEvents.slice(0, 3).map((event, i) => {
              const formatted = formatStrategyEvent(event);
              const date = new Date(event.timestamp * 1000);
              return (
                <a
                  key={event.id}
                  href={`https://etherscan.io/tx/${event.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#141517] border border-[#222] rounded-lg p-3 hover:border-[#F2D57C]/30 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase ${
                      event.type === 'deposit' ? 'text-[#00ff66]' :
                      event.type === 'withdrawal' ? 'text-[#F2D57C]' :
                      event.type === 'rebalance' ? 'text-[#3b82f6]' :
                      'text-[#a855f7]'
                    }`}>
                      {event.type.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-[#444] group-hover:text-[#666]">↗</span>
                  </div>
                  <div className="text-[11px] text-white/80 mb-1 truncate">
                    {formatted.message}
                  </div>
                  <div className="text-[9px] text-[#444] font-mono">
                    {date.toLocaleDateString()} {date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Coming Soon Strategies - Dynamic from config */}
      {(() => {
        const comingSoonStrategies = getComingSoonStrategies();
        if (comingSoonStrategies.length === 0) return null;
        
        return (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#F2D57C] font-bold tracking-[0.2em] uppercase">Coming Soon</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[#71717a]/20 text-[#71717a] font-mono rounded">
                {comingSoonStrategies.length} strategies
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {comingSoonStrategies.map((strategy: Strategy, index: number) => (
                <div 
                  key={strategy.id}
                  className="rounded-xl overflow-hidden
                    bg-gradient-to-br from-gray-900/50 to-gray-800/30
                    shadow-[4px_4px_8px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.03)]
                    border border-gray-700/20 p-4 opacity-70 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[9px] text-[#71717a] font-bold tracking-[0.2em] uppercase">
                        Strategy #{index + 3}
                      </div>
                      <div className="text-sm font-bold text-white/80">{strategy.name}</div>
                      <div className="text-[10px] text-[#71717a] mt-0.5">{strategy.protocol}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] px-2 py-0.5 bg-[#1a1b1e] text-[#71717a] font-mono uppercase rounded">
                        Coming Soon
                      </span>
                      {strategy.details?.riskLevel && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          strategy.details.riskLevel === 'low' 
                            ? 'bg-[#00ff66]/10 text-[#00ff66]' 
                            : strategy.details.riskLevel === 'medium'
                            ? 'bg-[#F2D57C]/10 text-[#F2D57C]'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {strategy.details.riskLevel} risk
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#555] leading-relaxed mb-3">
                    {strategy.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[9px]">
                    {strategy.details?.pool && (
                      <span className="px-2 py-0.5 bg-[#141517] border border-[#222] rounded text-[#71717a]">
                        Pool: {strategy.details.pool}
                      </span>
                    )}
                    {strategy.details?.feeTier && (
                      <span className="px-2 py-0.5 bg-[#141517] border border-[#222] rounded text-[#71717a]">
                        Fee: {strategy.details.feeTier}
                      </span>
                    )}
                    {strategy.details?.network && (
                      <span className="px-2 py-0.5 bg-[#141517] border border-[#222] rounded text-[#71717a]">
                        {strategy.details.network}
                      </span>
                    )}
                  </div>
                  {strategy.links && (
                    <div className="mt-3 pt-2 border-t border-[#222] flex gap-3">
                      {strategy.links.docs && (
                        <a 
                          href={strategy.links.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[#3b82f6] hover:text-[#60a5fa]"
                        >
                          Docs ↗
                        </a>
                      )}
                      {strategy.links.analytics && (
                        <a 
                          href={strategy.links.analytics}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[#3b82f6] hover:text-[#60a5fa]"
                        >
                          Analytics ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}



