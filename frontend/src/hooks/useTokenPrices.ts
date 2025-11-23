import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { CONTRACTS } from '../config/contracts';

export interface TokenPrices {
  WLFI: number; // Price in USD
  USD1: number; // Price in USD (should be ~1.0)
  WETH: number; // Price in USD
  isLoading: boolean;
  error: string | null;
}

const VAULT_ABI = [
  'function getWLFIPrice() view returns (uint256)',
  'function getUSD1Price() view returns (uint256)',
];

/**
 * Hook to fetch token prices from multiple sources with fallbacks
 * Priority: Vault Oracles > DEXScreener API > CoinGecko API > Hardcoded fallback
 */
export function useTokenPrices(provider: BrowserProvider | null): TokenPrices {
  const [prices, setPrices] = useState<TokenPrices>({
    WLFI: 0.132, // Fallback
    USD1: 1.0,
    WETH: 3500.0, // Fallback
    isLoading: true,
    error: null,
  });

  const fetchPrices = useCallback(async () => {
    if (!provider) {
      setPrices(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setPrices(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Primary: Try vault oracles (most accurate, on-chain)
      try {
        const vault = new Contract(CONTRACTS.VAULT, VAULT_ABI, provider);
        const [wlfiPriceRaw, usd1PriceRaw] = await Promise.all([
          vault.getWLFIPrice(),
          vault.getUSD1Price(),
        ]);

        const wlfiPrice = parseFloat(formatUnits(wlfiPriceRaw, 18));
        const usd1Price = parseFloat(formatUnits(usd1PriceRaw, 18));

        // Fetch WETH price from DEXScreener (vault doesn't have WETH price)
        let wethPrice = 3500.0;
        try {
          const wethResponse = await fetch(
            'https://api.dexscreener.com/latest/dex/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            { signal: AbortSignal.timeout(5000) }
          );
          if (!wethResponse.ok) {
            throw new Error(`DEXScreener API returned ${wethResponse.status}`);
          }
          const wethData = await wethResponse.json();
          console.log('[useTokenPrices] DEXScreener WETH response:', wethData);
          
          // Find pair with highest liquidity (same logic as fallback)
          if (wethData?.pairs?.length) {
            const bestPair = wethData.pairs.reduce((best: any, current: any) => {
              return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
            });
            if (bestPair?.priceUsd) {
              const parsedPrice = parseFloat(bestPair.priceUsd);
              if (parsedPrice > 100 && parsedPrice < 10000) { // Sanity check: WETH should be $100-$10k
                wethPrice = parsedPrice;
                console.log('[useTokenPrices] WETH price from DEXScreener:', wethPrice);
              } else {
                console.warn('[useTokenPrices] WETH price out of range, using fallback:', parsedPrice);
              }
            } else {
              console.warn('[useTokenPrices] No valid WETH price in DEXScreener response');
            }
          } else {
            console.warn('[useTokenPrices] No pairs found in DEXScreener WETH response');
          }
        } catch (e: any) {
          console.warn('[useTokenPrices] Failed to fetch WETH price from DEXScreener:', e?.message || e, '- using fallback');
        }

        console.log('✅ Prices fetched from vault oracles:', {
          WLFI: `$${wlfiPrice.toFixed(4)}`,
          USD1: `$${usd1Price.toFixed(4)}`,
          WETH: `$${wethPrice.toFixed(2)}`,
        });
        
        setPrices({
          WLFI: wlfiPrice,
          USD1: usd1Price,
          WETH: wethPrice,
          isLoading: false,
          error: null,
        });
        return;
      } catch (vaultError: any) {
        console.warn('Vault oracle prices failed (may be stale):', vaultError?.reason || vaultError?.message);
        // Fall through to API fallbacks
      }

      // Secondary: Try DEXScreener API (free, no API key)
      try {
        const [wlfiResponse, wethResponse] = await Promise.all([
          fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${CONTRACTS.WLFI}`,
            { signal: AbortSignal.timeout(5000) }
          ),
          fetch(
            'https://api.dexscreener.com/latest/dex/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            { signal: AbortSignal.timeout(5000) }
          ),
        ]);

        const wlfiData = await wlfiResponse.json();
        const wethData = await wethResponse.json();

        // Find pair with highest liquidity
        const getBestPrice = (data: any) => {
          if (!data?.pairs?.length) return null;
          const bestPair = data.pairs.reduce((best: any, current: any) => {
            return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
          });
          return bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : null;
        };

        const wlfiPrice = getBestPrice(wlfiData) || 0.132;
        const wethPrice = getBestPrice(wethData) || 3500.0;

        setPrices({
          WLFI: wlfiPrice,
          USD1: 1.0, // USD1 is stablecoin, always ~$1
          WETH: wethPrice,
          isLoading: false,
          error: null,
        });
        return;
      } catch (apiError) {
        console.warn('DEXScreener API failed:', apiError);
        // Fall through to CoinGecko
      }

      // Tertiary: Try CoinGecko API
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await response.json();
        if (data?.ethereum?.usd) {
          setPrices({
            WLFI: 0.132, // CoinGecko doesn't have WLFI, use fallback
            USD1: 1.0,
            WETH: data.ethereum.usd,
            isLoading: false,
            error: null,
          });
          return;
        }
      } catch (cgError) {
        console.warn('CoinGecko API failed:', cgError);
      }

      // Final fallback: Use hardcoded values
      setPrices({
        WLFI: 0.132,
        USD1: 1.0,
        WETH: 3500.0,
        isLoading: false,
        error: 'Using fallback prices - oracles unavailable',
      });
    } catch (error: any) {
      console.error('Error fetching token prices:', error);
      setPrices(prev => ({
        ...prev,
        isLoading: false,
        error: error?.message || 'Failed to fetch prices',
      }));
    }
  }, [provider]);

  useEffect(() => {
    fetchPrices();
    // Refresh prices every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return prices;
}



