import React, { useState, useEffect } from 'react';
import { getAddress } from 'ethers';
import { ICONS } from '../config/icons';

interface TokenIconProps {
  symbol: string;
  address?: string;
  className?: string;
  alt?: string;
  chainId?: number;
}

export const TokenIcon: React.FC<TokenIconProps> = ({ 
  symbol, 
  address, 
  className = "w-6 h-6 rounded-full", 
  alt,
  chainId = 1 
}) => {
  const [srcIndex, setSrcIndex] = useState(0);
  const [error, setError] = useState(false);

  // Construct the list of sources based on priority
  // Priority: 
  // 1. Internal Overrides (ICONS) - ALWAYS FIRST
  // 2. TrustWallet SVG
  // 3. Uniswap/Rainbow SVG
  // 4. Fallbacks (PNGs)
  const getSources = () => {
    const sources: string[] = [];
    const iconKey = symbol.toUpperCase() as keyof typeof ICONS;

    // 1. Internal/Manual overrides - HIGHEST PRIORITY
    // This includes EAGLE, WLFI, USD1 from icons.ts
    if (ICONS[iconKey]) {
      sources.push(ICONS[iconKey]);
    }

    // Map common symbols to keys if needed (e.g. ETH -> ETHEREUM, WETH -> ETHEREUM)
    if ((symbol.toUpperCase() === 'ETH' || symbol.toUpperCase() === 'WETH') && ICONS.ETHEREUM) {
      if (!sources.includes(ICONS.ETHEREUM)) {
        sources.push(ICONS.ETHEREUM);
      }
    }

    // Only add external sources if we have an address
    if (address) {
      try {
        const checksumAddress = getAddress(address);
        
        // 2. TrustWallet SVG
        sources.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.svg`);
        
        // 3. Rainbow SVG
        sources.push(`https://raw.githubusercontent.com/rainbow-me/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.svg`);
        
        // 4. Uniswap PNG
        sources.push(`https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.png`);

        // 5. TrustWallet PNG (Fallback)
        sources.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.png`);

      } catch (e) {
        // Invalid address or not checksummable
        console.warn('[TokenIcon] Invalid address for', symbol, ':', address);
      }
    }
    
    return sources;
  };

  const sources = getSources();

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn(`[TokenIcon] Failed to load logo for ${symbol} from source ${srcIndex}:`, sources[srcIndex]);
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    } else {
      console.error(`[TokenIcon] All sources failed for ${symbol}, using fallback`);
      setError(true);
    }
  };

  // Reset if props change
  useEffect(() => {
    setSrcIndex(0);
    setError(false);
  }, [symbol, address]);

  if (error || sources.length === 0) {
    // Render fallback: Circle with first letter
    return (
      <div 
        className={`${className} bg-gray-700 border border-gray-600 flex items-center justify-center text-white font-medium text-xs`} 
        title={alt || symbol}
      >
         {symbol[0]?.toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={alt || symbol}
      className={className}
      onError={handleError}
      crossOrigin="anonymous"
      loading="lazy"
    />
  );
};
