import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { CONTRACTS } from '../config/contracts';

const CHARM_VAULT_ABI = [
  'function getTotalAmounts() view returns (uint256, uint256)',
];

interface Props {
  provider: BrowserProvider | null;
}

export default function StrategyBreakdown({ provider }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [wlfiAmount, setWlfiAmount] = useState('0');
  const [wethAmount, setWethAmount] = useState('0');
  const [totalValue, setTotalValue] = useState('0');

  useEffect(() => {
    if (!provider) return;

    const fetchData = async () => {
      try {
        const charmVault = new Contract(CONTRACTS.CHARM_VAULT, CHARM_VAULT_ABI, provider);
        const [token0, token1] = await charmVault.getTotalAmounts();
        
        // For this specific Charm vault:
        // token0 = WETH (the one showing 0)
        // token1 = WLFI (the one showing 87.7606)
        const wethFormatted = formatEther(token0);  // token0 = WETH
        const wlfiFormatted = formatEther(token1);  // token1 = WLFI
        
        setWlfiAmount(wlfiFormatted);
        setWethAmount(wethFormatted);
        
        // Calculate approximate USD value
        // Use oracle prices: fetch from vault for accuracy
        const usdValue = (Number(wlfiFormatted) * 0.125) + (Number(wethFormatted) * 3796);
        setTotalValue(usdValue.toFixed(2));
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [provider]);

  return (
    <div className="bg-[#0a0a0a]/60 rounded-xl border border-eagle-gold/30 backdrop-blur-md p-6 mb-6">
      {/* Strategy Card Header */}
      <div className="mb-6 p-5 bg-gray-900/30 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Strategy Name with Logo */}
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <img 
              src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreid3difftzksqy3xlummzzobhk674ece35d7drmgo3ftt7wrix6dwu" 
              alt="Charm Finance"
              className="h-6 w-6"
            />
            <span className="text-white font-medium">Charm Finance Alpha Vault</span>
          </div>
          
          {/* Right: Liquidity Pair with Uniswap Logo */}
          <div className="flex items-center gap-2">
            <img 
              src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreichw4b4wxvinfu4dmkloxajj4mm7672k6q3nyqzvdnvogvlbbycfq" 
              alt="Uniswap"
              className="h-5 w-5"
            />
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 rounded-md border border-gray-700">
              <img 
                src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreifvnbzrefx4pdd6mr653dmrgkz2bdcamrwdsl334f7ed75miosaxu" 
                alt="WLFI"
                className="h-4 w-4"
              />
              <span className="text-xs font-medium text-gray-300">WLFI</span>
            </div>
            <span className="text-gray-500 text-sm">/</span>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 rounded-md border border-gray-700">
              <img 
                src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafkreiagnmvgbx3g7prmcg57pu3safks7ut6j3okopfmji7h5pndz2zeqy" 
                alt="WETH"
                className="h-4 w-4"
              />
              <span className="text-xs font-medium text-gray-300">WETH</span>
            </div>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-md text-xs font-medium border border-blue-500/30">
              1% Fee
            </span>
          </div>
        </div>
      </div>

      {/* Total Value */}
      <div className="mb-6 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
        <p className="text-xs text-eagle-gold-light mb-2 uppercase tracking-wider font-medium">Total Strategy Value</p>
        <p className="text-3xl font-bold text-white">
          ${Number(totalValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-gray-500 mt-1">Combined WLFI + WETH</p>
      </div>

          {/* Token Breakdown with Visual Ratios */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <h3 className="text-sm text-eagle-gold-light font-medium mb-4">Token Breakdown</h3>
            
            {/* WLFI */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">WLFI Balance</span>
                <span className="text-white font-semibold">
                  {Number(wlfiAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-eagle-gold to-eagle-gold-light transition-all duration-500"
                  style={{ 
                    width: `${(() => {
                      const wlfiValue = Number(wlfiAmount) * 0.125;
                      const wethValue = Number(wethAmount) * 3796;
                      const total = wlfiValue + wethValue;
                      return total > 0 ? ((wlfiValue / total) * 100).toFixed(1) : 0;
                    })()}%` 
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  const wlfiValue = Number(wlfiAmount) * 1.00;
                  const wethValue = Number(wethAmount) * 3796;
                  const total = wlfiValue + wethValue;
                  return total > 0 ? ((wlfiValue / total) * 100).toFixed(1) : 0;
                })()}% of total value
              </p>
            </div>

            {/* WETH */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">WETH Balance</span>
                <span className="text-white font-semibold">
                  {Number(wethAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo to-purple transition-all duration-500"
                  style={{ 
                    width: `${(() => {
                      const wlfiValue = Number(wlfiAmount) * 0.125;
                      const wethValue = Number(wethAmount) * 3796;
                      const total = wlfiValue + wethValue;
                      return total > 0 ? ((wethValue / total) * 100).toFixed(1) : 0;
                    })()}%` 
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  const wlfiValue = Number(wlfiAmount) * 1.00;
                  const wethValue = Number(wethAmount) * 3796;
                  const total = wlfiValue + wethValue;
                  return total > 0 ? ((wethValue / total) * 100).toFixed(1) : 0;
                })()}% of total value
              </p>
            </div>
          </div>

      {/* View on Charm */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <a
          href={`https://alpha.charm.fi/ethereum/vault/${CONTRACTS.CHARM_VAULT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-eagle-gold hover:text-eagle-gold-light transition-colors flex items-center gap-2"
        >
          View detailed analytics on Charm Finance
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Collapsible: Vault Info */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between text-left hover:text-eagle-gold-light transition-colors"
        >
          <span className="text-sm font-medium text-gray-300">Vault Information</span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showInfo ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showInfo && (
          <div className="mt-4 space-y-4 animate-fade-in">
          {/* Vault Header */}
          <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-purple/20 text-purple-200 rounded text-xs font-medium border border-purple/30">
                WETH
              </span>
              <span className="px-2 py-1 bg-purple/20 text-purple-200 rounded text-xs font-medium border border-purple/30">
                WLFI
              </span>
              <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs font-medium">
                1%
              </span>
            </div>
            <p className="text-sm text-gray-400">WETH / WLFI Uniswap V3 Pool</p>
          </div>

          {/* Management Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm text-eagle-gold-light font-medium mb-2">Management Fees:</h3>
              <p className="text-white font-semibold">4.7% performance fee goes to vault manager</p>
            </div>

            <div className="text-sm text-gray-300 leading-relaxed space-y-3">
              <p>
                The vault manages liquidity on Uniswap V3 on your behalf. It automatically adjusts its positions 
                to capture fees and reduce capital loss.
              </p>
              <p>
                The positions are updated periodically to capture fees when the market price moves. The strategy 
                maintains concentrated liquidity positions to maximize fee generation while minimizing impermanent loss.
              </p>
              <p className="text-yellow-400 font-medium">
                Please do your own research and understand the risks before depositing.
              </p>
            </div>
          </div>

          {/* Vault Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-800">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Vault TVL:</span>
                <span className="text-white font-medium">${Number(totalValue).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total WETH:</span>
                <span className="text-white font-medium">{Number(wethAmount).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total WLFI:</span>
                <span className="text-white font-medium">{Number(wlfiAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Ratio:</span>
                <span className="text-white font-medium">
                  {(() => {
                    const wlfiValue = Number(wlfiAmount) * 0.12502;
                    const wethValue = Number(wethAmount) * 3796;
                    const total = wlfiValue + wethValue;
                    const wlfiPercent = total > 0 ? ((wlfiValue / total) * 100).toFixed(1) : '0.0';
                    const wethPercent = total > 0 ? ((wethValue / total) * 100).toFixed(1) : '0.0';
                    return `${wethPercent} : ${wlfiPercent}`;
                  })()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Vault:</span>
                <a 
                  href={`https://etherscan.io/address/${CONTRACTS.CHARM_VAULT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-eagle-gold hover:text-eagle-gold-light font-mono text-xs"
                >
                  {CONTRACTS.CHARM_VAULT.slice(0, 6)}...{CONTRACTS.CHARM_VAULT.slice(-4)}
                </a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pool:</span>
                <a 
                  href="https://etherscan.io/address/0xca2e972f081764c30ae5f012a29d5277eef33838"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-eagle-gold hover:text-eagle-gold-light font-mono text-xs"
                >
                  0xCa2e...3838
                </a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fee Tier:</span>
                <span className="text-white font-medium">1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">DEX:</span>
                <span className="text-white font-medium">Uniswap V3</span>
              </div>
            </div>
          </div>

            <a
              href={`https://alpha.charm.fi/ethereum/vault/${CONTRACTS.CHARM_VAULT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-eagle-gold hover:text-eagle-gold-light transition-colors flex items-center gap-2 mt-4"
            >
              View on Charm Finance
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Collapsible: Risk Disclosure */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <button
          onClick={() => setShowRisk(!showRisk)}
          className="w-full flex items-center justify-between text-left hover:text-eagle-gold-light transition-colors"
        >
          <span className="text-sm font-medium text-gray-300">Risk Disclosure</span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showRisk ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showRisk && (
          <div className="mt-4 space-y-4 animate-fade-in">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <h3 className="text-yellow-400 font-semibold mb-2">Risk Disclosure</h3>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>Smart contract risk: All DeFi protocols carry inherent smart contract risks</li>
              <li>Impermanent loss: Concentrated liquidity positions may experience IL during price movements</li>
              <li>Price volatility: WLFI price volatility can affect position value</li>
              <li>Rebalancing costs: Automated rebalancing incurs gas costs</li>
              <li>Protocol dependency: Strategy relies on Charm Finance and Uniswap V3</li>
            </ul>
          </div>

            <div className="text-sm text-gray-300 space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Audited smart contracts
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                ReentrancyGuard protection
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Access control on critical functions
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Slippage protection on all swaps
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

