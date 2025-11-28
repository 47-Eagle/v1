import React, { useState, useEffect } from 'react';
import { ICONS } from '../config/icons';
import { SupportedChain } from '../config/contracts';

// Minimal fallbacks - only used if ALL image sources fail
const BaseSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="50" cy="50" r="50" fill="#0052FF"/>
  </svg>
);

const EthereumSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYMid">
    <path fill="#627EEA" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity=".602"/>
    <path fill="#627EEA" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
    <path fill="#627EEA" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity=".602"/>
    <path fill="#627EEA" d="M127.962 416.905v-104.72L0 236.585z"/>
    <path fill="#627EEA" d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity=".2"/>
    <path fill="#627EEA" d="M0 212.32l127.96 75.638v-133.8z" fillOpacity=".602"/>
  </svg>
);

const ArbitrumSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="50" fill="#12AAFF"/>
  </svg>
);

const AvalancheSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="50" fill="#E84142"/>
  </svg>
);

const BnbSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="50" fill="#F0B90B"/>
  </svg>
);

const MonadSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="50" fill="#836EF9"/>
  </svg>
);

const HyperEvmSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="50" fill="#00D395"/>
    <path d="M30 50h15v-20h10v20h15v10h-15v20h-10v-20h-15z" fill="white"/>
  </svg>
);

const SonicSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="50" fill="#1E90FF"/>
    <path d="M35 65c0-8 6-14 14-14h2c-8 0-14-6-14-14 0 8-6 14-14 14h2c8 0 14 6 14 14zm16-28c0 6 5 11 11 11h1c-6 0-11 5-11 11 0-6-5-11-11-11h1c6 0 10-5 10-11zm14 14c0 4 3 7 7 7-4 0-7 3-7 7 0-4-3-7-7-7 4 0 7-3 7-7z" fill="white"/>
  </svg>
);

const FALLBACK_SVGS: Record<SupportedChain, React.FC<{ className?: string }>> = {
  ethereum: EthereumSVG,
  base: BaseSVG,
  monad: MonadSVG,
  arbitrum: ArbitrumSVG,
  avalanche: AvalancheSVG,
  bsc: BnbSVG,
  hyperevm: HyperEvmSVG,
  sonic: SonicSVG
};

// Mapping for ICONS key
const CHAIN_TO_ICON_KEY: Partial<Record<SupportedChain, keyof typeof ICONS>> = {
  bsc: 'BNB',
  avalanche: 'AVAX',
  hyperevm: 'HYPEREVM',
  sonic: 'SONIC',
};

// Mapping for TrustWallet
const CHAIN_TO_TRUSTWALLET_KEY: Partial<Record<SupportedChain, string>> = {
  bsc: 'smartchain',
  avalanche: 'avalanchec',
};

interface ChainIconProps {
  chain: SupportedChain;
  className?: string;
  alt?: string;
}

export const ChainIcon: React.FC<ChainIconProps> = ({ chain, className = "w-6 h-6", alt }) => {
  const [srcIndex, setSrcIndex] = useState(0);
  const [error, setError] = useState(false);

  const getSources = () => {
    const sources: string[] = [];
    
    // 1. Internal Overrides (ICONS) - Highest Priority
    let iconKey = CHAIN_TO_ICON_KEY[chain] as keyof typeof ICONS;
    if (!iconKey) {
      // @ts-ignore
      iconKey = chain.toUpperCase();
    }
    if (iconKey && ICONS[iconKey]) {
      sources.push(ICONS[iconKey]);
    }

    // 2. TrustWallet Assets - Most Reliable (verified working URLs)
    const trustWalletChain = CHAIN_TO_TRUSTWALLET_KEY[chain] || chain;
    const twUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletChain}/info/logo.png`;
    if (sources[0] !== twUrl) {
      sources.push(twUrl);
    }

    // 3. CoinGecko CDN - Very reliable fallback
    const coingeckoMap: Record<string, string> = {
      ethereum: '279',
      base: '31199',
      arbitrum: '11841',
      bsc: '1839',
      avalanche: '12559',
    };
    if (coingeckoMap[chain]) {
      sources.push(`https://assets.coingecko.com/coins/images/${coingeckoMap[chain]}/small/${chain}.png`);
    }

    // 4. Rainbow Assets - Backup
    let rainbowChain: string = chain;
    if (chain === 'bsc') rainbowChain = 'binance';
    sources.push(`https://raw.githubusercontent.com/rainbow-me/assets/master/blockchains/${rainbowChain}/info/logo.png`);

    return sources;
  };

  const sources = getSources();

  const handleError = () => {
    console.warn(`[ChainIcon] Failed to load logo for ${chain} from source ${srcIndex}:`, sources[srcIndex]);
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    } else {
      console.error(`[ChainIcon] All sources failed for ${chain}, using fallback SVG`);
      setError(true);
    }
  };

  // Reset state when chain prop changes
  useEffect(() => {
    setSrcIndex(0);
    setError(false);
  }, [chain]);

  if (error || sources.length === 0) {
    const Fallback = FALLBACK_SVGS[chain] || EthereumSVG;
    return <Fallback className={className} />;
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={alt || chain}
      className={className}
      onError={handleError}
      crossOrigin="anonymous"
      loading="lazy"
    />
  );
};
