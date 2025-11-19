import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Globe, 
  Zap, 
  Shield, 
  Layers, 
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Copy,
  CheckCircle,
  Box,
  Sparkles
} from 'lucide-react';

import { NeoButton } from '../components/neumorphic/NeoButton';
import { NeoCard } from '../components/neumorphic/NeoCard';
import { NeoStatCard } from '../components/neumorphic/NeoStatCard';
import { ICONS } from '../config/icons';

// --- Constants ---
const CONTRACTS = {
  eagle: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',
  wlfiBase: '0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e',
  wlfiAdapter: '0x2437F6555350c131647daA0C655c4B49A7aF3621',
  composer: '0x0c74174b5F04ec15d3Fb94D15Dc13c91fAc6C21F',
  charmUSD1: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
  charmWETH: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
  registry: '0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e',
  vault: '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953',
  wrapper: '0x47dAc5063c526dBc6f157093dd1D62d9DE8891c5'
};

const CHARM_STRATEGIES = [
  {
    name: "USD1 / WLFI",
    pool: "Uniswap V3 (1%)",
    address: "0x2282...B444B71",
    apy: "42.5%",
    tvl: "$4.2M"
  },
  {
    name: "WETH / WLFI", 
    pool: "Uniswap V3 (1%)",
    address: "0x3314...F0AEF", 
    apy: "38.2%",
    tvl: "$2.8M"
  }
];

// --- SVGs for Partners ---
const Logos = {
  Base: () => (
    <svg viewBox="0 0 111 111" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
    </svg>
  ),
  Ethereum: () => (
    <svg viewBox="0 0 256 417" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
      <path fill="#627EEA" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity=".602"/>
      <path fill="#627EEA" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
      <path fill="#627EEA" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity=".602"/>
      <path fill="#627EEA" d="M127.962 416.905v-104.72L0 236.585z"/>
      <path fill="#627EEA" d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity=".2"/>
      <path fill="#627EEA" d="M0 212.32l127.96 75.638v-133.8z" fillOpacity=".602"/>
    </svg>
  )
};

// --- Feature Card Component ---
const FeatureCard = ({ title, description, icon: Icon, className = "" }: any) => (
  <NeoCard className={`h-full flex flex-col !p-6 hover:!border-amber-500/30 group transition-all duration-500 ${className}`} hoverable>
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-amber-500 shadow-inner">
        <Icon size={24} />
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-amber-500 transition-colors" />
    </div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
      {description}
    </p>
  </NeoCard>
);

// --- Copy Button Component ---
const CopyButton = ({ text, label }: { text: string, label?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: any) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy}
      className="group flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded transition-colors"
    >
      {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white" />}
      {label && <span className="text-xs font-mono text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">{label}</span>}
    </button>
  );
};


// --- Terminal Component (Hero) ---
const TerminalWindow = () => {
  const [lines, setLines] = useState([
    { text: "> INITIALIZING_SECURE_HANDSHAKE...", color: "text-gray-500" },
    { text: "> ESTABLISHING_CONNECTION [BASE -> ETHEREUM]", color: "text-amber-600" },
    { text: "> VERIFYING_DVN_SIGNATURES", color: "text-amber-500" },
    { text: "> EXECUTING_COMPOSE_V2...", color: "text-gray-400" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLines(prev => {
        const newLines = [...prev];
        if (newLines.length > 5) newLines.shift();
        const nextSteps = [
           "UNWRAPPING_VAULT_SHARES...",
           "REDEEMING_WLFI...",
           "BRIDGING_RETURN_ASSETS...",
           "TRANSACTION_CONFIRMED [LATENCY: 12ms]"
        ];
        const randomStep = nextSteps[Math.floor(Math.random() * nextSteps.length)];
        const color = randomStep.includes("CONFIRMED") ? "text-green-500" : "text-gray-500";
        newLines.push({ text: `> ${randomStep}`, color });
        return newLines;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden font-mono text-xs shadow-2xl shadow-amber-900/5 mt-8 lg:mt-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#111]">
        <div className="flex gap-1.5 opacity-50">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
        </div>
        <span className="text-gray-600 tracking-widest text-[10px]">LIVE_FEED</span>
      </div>
      <div className="p-4 space-y-2 h-48 overflow-hidden flex flex-col justify-end">
        {lines.map((line, i) => (
          <div key={i} className={`${line.color} animate-fade-in font-medium`}>
             {line.text}
          </div>
        ))}
        <div className="w-2 h-4 bg-amber-500/50 animate-pulse" />
      </div>
    </div>
  );
};

// --- Charm Strategy Visualizer Component ---
const CharmStrategyVisualizer = () => {
  return (
    <NeoCard className="w-full !p-0 overflow-hidden border-0 bg-transparent shadow-none">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-neo-raised dark:shadow-neo-raised-dark">
        {/* Charm Brand Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
               <Box className="text-blue-500" size={20} />
            </div>
            <div>
               <h3 className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">Charm Alpha Vault</h3>
               <div className="flex items-center gap-2">
                  <span className="text-xs text-green-500 font-mono font-semibold">Active Strategy</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">Uniswap V3</span>
               </div>
            </div>
          </div>
          <div className="text-right hidden md:block">
             <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">42.5%</div>
             <div className="text-xs text-amber-500 tracking-widest font-bold">EST. APY</div>
          </div>
        </div>
  
        {/* Visualizer Graphs */}
        <div className="grid md:grid-cols-2 gap-8 relative z-10">
           {/* Graph 1: Liquidity Distribution */}
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Liquidity Distribution</span>
                 <span className="text-xs text-green-500 font-medium">In Range</span>
              </div>
              
              {/* CSS Art Graph mimicking Charm UI */}
              <div className="h-48 w-full bg-gray-100 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 relative flex items-end overflow-hidden">
                 {/* Base Liquidity */}
                 <div className="w-full h-[40%] bg-teal-500/10 absolute bottom-0 left-0"></div>
                 
                 {/* Concentrated Range 1 */}
                 <div className="w-[60%] h-[60%] bg-blue-500/20 absolute bottom-0 left-[20%] border-t border-blue-500/30"></div>
                 
                 {/* Concentrated Range 2 (Current) */}
                 <div className="w-[30%] h-[85%] bg-pink-500/20 absolute bottom-0 left-[35%] border-t border-pink-500/50 animate-pulse"></div>
                 
                 {/* Current Price Line */}
                 <div className="h-full w-0.5 bg-gray-400 dark:bg-gray-600 absolute left-[50%] top-0 border-r border-dashed border-gray-400 dark:border-gray-600"></div>
                 <div className="absolute top-2 left-[50%] translate-x-[-50%] bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-bold border border-gray-200 dark:border-gray-700">Current</div>
              </div>
              
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                 <span>1.00 USD1</span>
                 <span>Price</span>
                 <span>1.01 USD1</span>
              </div>
           </div>
  
           {/* Graph 2: Rebalance History */}
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Recent Rebalances</span>
                 <a href="https://alpha.charm.fi/ethereum/vault/0x22828dbf15f5fba2394ba7cf8fa9a96bdb444b71" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                    View on Charm <ExternalLink size={10} />
                 </a>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                 {[
                   { type: 'Rebalance', time: '2h ago', range: 'Adjusted +2%', hash: '0x4a...9f' },
                   { type: 'Deposit', time: '5h ago', range: '1000 WLFI', hash: '0x32...d6' },
                   { type: 'Collect', time: '1d ago', range: 'Fees Auto-Compound', hash: '0x16...a8' },
                   { type: 'Rebalance', time: '2d ago', range: 'Adjusted -1.5%', hash: '0x42...62' },
                 ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                       <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${tx.type === 'Rebalance' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{tx.type}</span>
                       </div>
                       <span className="text-gray-500 font-mono">{tx.range}</span>
                       <span className="text-gray-400">{tx.time}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </NeoCard>
  );
};

// --- Yield Ecosystem Section ---
const YieldEcosystem = () => {
  return (
    <section className="py-24 bg-white dark:bg-gray-900 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-start gap-16">
          
          {/* Left: Stack Explained */}
          <div className="lg:w-1/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/5 mb-6">
              <Sparkles size={12} className="text-amber-500" />
              <span className="text-xs font-mono text-amber-600 dark:text-amber-500 tracking-wider font-bold">YIELD ARCHITECTURE</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">EagleOVault</span> <br/>
              + Charm Strategies
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-sm">
              EAGLE is a liquid wrapper for <strong>vEAGLE</strong> shares. Behind the scenes, the <strong>EagleOVault</strong> intelligently deploys assets into <strong>Charm Finance Alpha Vaults</strong>, generating passive income from Uniswap V3 trading fees without impermanent loss risk.
            </p>
            
            {/* Strategy Cards */}
            <div className="space-y-3">
               {CHARM_STRATEGIES.map((strat, i) => (
                 <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between group hover:border-amber-500/30 transition-colors cursor-pointer shadow-sm">
                    <div>
                       <div className="text-gray-900 dark:text-white font-bold text-sm">{strat.name}</div>
                       <div className="text-[10px] text-gray-500 font-mono">{strat.pool}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-green-600 dark:text-green-400 font-mono text-sm font-bold">{strat.apy}</div>
                       <div className="text-[10px] text-gray-500">APY</div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Right: Visualizer */}
          <div className="lg:w-2/3 w-full">
             <CharmStrategyVisualizer />
          </div>

        </div>
      </div>
    </section>
  );
};

// --- Addresses Section ---
const Addresses = () => (
  <section id="contracts" className="py-24 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
         <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Contract Addresses</h2>
         <div className="flex gap-4 mt-4 md:mt-0">
           <button className="px-4 py-2 text-xs font-mono border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all">
             VIEW ON GITHUB
           </button>
         </div>
      </div>
      
      <div className="space-y-2 font-mono text-sm">
        <div className="hidden md:grid grid-cols-12 px-4 py-2 text-gray-500 text-[10px] tracking-widest uppercase font-semibold">
           <div className="col-span-3">Network</div>
           <div className="col-span-3">Contract</div>
           <div className="col-span-5">Address</div>
           <div className="col-span-1 text-right">Action</div>
        </div>

        {[
          { net: 'MULTICHAIN', type: 'Eagle OFT', addr: CONTRACTS.eagle, icon: Layers },
          { net: 'BASE', type: 'WLFI OFT', addr: CONTRACTS.wlfiBase, icon: Logos.Base },
          { net: 'ETHEREUM', type: 'Composer V2', addr: CONTRACTS.composer, icon: Logos.Ethereum },
          { net: 'ETH / BNB', type: 'WLFI Adapter', addr: CONTRACTS.wlfiAdapter, icon: Logos.Ethereum },
          { net: 'ETHEREUM', type: 'Eagle Registry', addr: CONTRACTS.registry, icon: Globe },
          { net: 'ETHEREUM', type: 'Eagle Vault', addr: CONTRACTS.vault, icon: Shield },
          { net: 'ETHEREUM', type: 'Vault Wrapper', addr: CONTRACTS.wrapper, icon: RefreshCw },
        ].map((row, i) => {
          const Icon = row.icon;
          return (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-0 items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-amber-500/30 hover:shadow-md transition-all group">
               <div className="col-span-3 flex items-center gap-3 text-gray-800 dark:text-gray-200 font-bold">
                 <div className="w-6 h-6 opacity-70 group-hover:opacity-100 transition-opacity">
                   <Icon size={24} className="text-amber-500" />
                 </div>
                 {row.net}
               </div>
               <div className="col-span-3 text-gray-500 flex items-center gap-2 text-xs font-medium">
                 {row.type}
                 {i === 0 && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">CORE</span>}
               </div>
               <div className="col-span-5 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors truncate">
                 {row.addr}
               </div>
               <div className="col-span-1 flex justify-end">
                  <CopyButton text={row.addr} />
               </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// --- Main Landing Page Component ---

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    setTimeout(() => {
      navigate('/app');
    }, 600); // Wait for animation
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] font-sans selection:bg-amber-500/30 transition-colors duration-500 overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-200/20 dark:bg-amber-900/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-200/20 dark:bg-blue-900/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>

      {/* Dive Animation Overlay - Warm Transition */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div
            className="fixed inset-0 z-[100] bg-[#fdfbf7] dark:bg-[#0c0a09] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={isLaunching ? { 
          scale: 1.1, 
          opacity: 0,
          filter: "blur(5px)"
        } : { 
          scale: 1, 
          opacity: 1,
          filter: "blur(0px)"
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="relative z-10"
      >
        {/* Navigation */}
        <nav className="fixed w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="container mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 drop-shadow-md">
                <img src={ICONS.EAGLE} alt="Eagle Protocol" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold tracking-tight text-xl text-gray-900 dark:text-white">47 EAGLE</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
              <a href="#features" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Features</a>
              <a href="#ecosystem" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Ecosystem</a>
              <a 
                href="https://docs.47eagle.com" 
                target="_blank" 
                rel="noreferrer" 
                className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                Docs <ExternalLink size={12} />
              </a>
            </div>
            
            <NeoButton 
              label="Launch App" 
              onClick={handleLaunch}
              className="!py-2 !px-6 !text-sm"
              glowing
            />
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="lg:w-1/2 text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-widest uppercase mb-8 shadow-sm">
                  <Zap size={12} className="text-amber-500" />
                  <span>V2.1.0 Live on Mainnet</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
                  Automate Your <br className="hidden lg:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500">
                    Cross-Chain Yield
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                  The first omnichain yield aggregator for WLFI. Bridge, stake, and compound in a single transaction. Powered by LayerZero V2.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <NeoButton 
                    label="Start Earning" 
                    icon={<ArrowRight size={18} />}
                    onClick={handleLaunch}
                    glowing
                    className="w-full sm:w-auto min-w-[180px]"
                  />
                  <NeoButton 
                    label="Read Docs" 
                    onClick={() => window.open('https://docs.47eagle.com', '_blank')}
                    className="w-full sm:w-auto min-w-[180px] !bg-transparent hover:!bg-gray-50 dark:hover:!bg-gray-800"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="lg:w-1/2 w-full flex justify-center lg:justify-end"
              >
                <TerminalWindow />
              </motion.div>

            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-y border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <NeoStatCard label="Total Value Locked" value="$4.2M+" subtitle="Across all chains" />
              <NeoStatCard label="Current APY" value="42.5%" subtitle="Base WLFI Strategy" highlighted />
              <NeoStatCard label="Supported Chains" value="4" subtitle="Eth, Base, BNB, Sol" />
              <NeoStatCard label="Security Score" value="98/100" subtitle="Audited Architecture" />
            </div>
          </div>
        </section>

        {/* Features / How it Works (Expanded) */}
        <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6">
            <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Core Architecture</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-xl">
                  Built on LayerZero V2 for seamless cross-chain interoperability and maximum capital efficiency.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Row 1 */}
              <FeatureCard 
                title="One-Click Atomic Withdrawal" 
                description="Withdraw EAGLE from any chain and receive WLFI on Ethereum in a single transaction. The protocol automatically bridges, unwraps vault shares, and redeems underlying assets."
                icon={Zap}
                className="md:col-span-2"
              />
              <FeatureCard 
                title="Unified Liquidity" 
                description="One address across all EVM chains. No more confusion. Assets are fungible and transferable instantaneously."
                icon={Globe}
              />

              {/* Row 2 */}
              <FeatureCard 
                title="Optimized Yield" 
                description="Assets are deployed into Charm Finance Alpha Vaults, earning trading fees from Uniswap V3 with automated rebalancing to minimize impermanent loss."
                icon={TrendingUp}
              />
              <FeatureCard 
                title="Institutional Security" 
                description="Secured by LayerZero V2's decentralized verification network (DVN), including Google Cloud verifiers for redundant message validation."
                icon={Shield}
              />
              <FeatureCard 
                title="Auto-Refund" 
                description="Fail-safe mechanisms automatically refund tokens if any step of the compose chain fails, ensuring funds are never stuck in transit."
                icon={RefreshCw}
              />
            </div>
          </div>
        </section>

        {/* Yield Ecosystem (Charm Integration) */}
        <YieldEcosystem />

        {/* Tech Stack Ecosystem */}
        <section id="ecosystem" className="py-20 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm font-semibold tracking-widest text-gray-500 uppercase mb-10">Powered By Industry Leaders</p>
            
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12">
                  <Logos.Ethereum />
                </div>
                <span className="text-xs font-medium text-gray-500">Ethereum</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12">
                  <Logos.Base />
                </div>
                <span className="text-xs font-medium text-gray-500">Base</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img src={ICONS.LAYERZERO_LOGO} alt="LayerZero" className="h-8 object-contain" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <img src={ICONS.UNISWAP} alt="Uniswap" className="h-10 w-10 object-contain" />
                <span className="text-xs font-medium text-gray-500">Uniswap V3</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img src={ICONS.CHARM} alt="Charm" className="h-10 w-10 object-contain" />
                <span className="text-xs font-medium text-gray-500">Charm Finance</span>
              </div>
            </div>
          </div>
        </section>

        {/* Addresses Section */}
        <Addresses />

        {/* Footer */}
        <footer className="py-12 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2 opacity-70">
                <img src={ICONS.EAGLE} alt="Eagle" className="w-6 h-6 grayscale" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">© 2025 47 Eagle Protocol</span>
              </div>
              
              <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Security</a>
              </div>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
