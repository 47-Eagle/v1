import { useState, useEffect, useCallback } from 'react';
import { CONTRACTS } from '../config/contracts';

// The Graph Studio endpoint for Eagle OVault subgraph
const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.4';

// Strategy addresses for labeling
const STRATEGY_LABELS: Record<string, string> = {
  [CONTRACTS.STRATEGY_USD1.toLowerCase()]: 'USD1/WLFI V4',
  [CONTRACTS.STRATEGY_WETH.toLowerCase()]: 'WETH/WLFI V4',
  // Current V4 strategies (explicit)
  '0x3e872d07c5a73e684b13a3b097c3599bf608c6e3': 'USD1/WLFI V4',
  '0xbf66f01c18f31a843172a24a4ff8984de691d415': 'WETH/WLFI V4',
  // Previous V3 strategies
  '0x6c638f745b7adc2873a52de0d732163b32144f0b': 'USD1/WLFI V3',
  '0x55e78798a926bac07b4d90f7b1bec769b72e76a6': 'WETH/WLFI V3',
  // Legacy V2 strategies
  '0xa7f6f4b1134c0ad4646ab18240a19f01e08ba90e': 'USD1/WLFI V2',
  '0xce1884b2dc7a2980d401c9c568cd59b2eaa07338': 'WETH/WLFI V2',
  // Legacy V1 strategies
  '0x47b2659747d6a7e00c8251c3c3f7e92625a8cf6f': 'USD1/WLFI V1',
  '0x5c525af4153b1c43f9c06c31d32a84637c617ffe': 'WETH/WLFI V1',
};

export interface StrategyEvent {
  id: string;
  type: 'deposit' | 'withdrawal' | 'rebalance' | 'fee_collection';
  strategy: string;
  strategyLabel: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  // Additional data based on event type
  amount0?: string;
  amount1?: string;
  assets?: string;
  shares?: string;
}

interface UseStrategyDeploymentsResult {
  events: StrategyEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Format large numbers for display
function formatAmount(value: string, decimals: number = 18): string {
  const num = parseFloat(value) / Math.pow(10, decimals);
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

// Get strategy label from address
function getStrategyLabel(address: string): string {
  const label = STRATEGY_LABELS[address.toLowerCase()];
  if (label) return label;
  return `Strategy ${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function useStrategyDeployments(limit: number = 20): UseStrategyDeploymentsResult {
  const [events, setEvents] = useState<StrategyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch multiple event types in parallel from subgraph
      const query = `
        query GetRecentStrategyEvents($limit: Int!) {
          # Recent vault snapshots (captures all major events)
          vaultSnapshots(
            first: $limit
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            timestamp
            totalAssets
            totalSupply
            sharePrice
            usd1StrategyTVL
            wethStrategyTVL
          }
          
          # Recent rebalances
          rebalances(
            first: $limit
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            strategy
            timestamp
            blockNumber
            transactionHash
          }
          
          # Recent fee collections
          collectFeeEvents(
            first: $limit
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            strategy
            charmVault
            amount0
            amount1
            timestamp
            blockNumber
            transactionHash
          }
          
          # Recent deposits
          deposits(
            first: $limit
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            assets
            shares
            timestamp
            blockNumber
            transactionHash
          }
          
          # Recent withdrawals
          withdrawals(
            first: $limit
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            assets
            shares
            timestamp
            blockNumber
            transactionHash
          }
        }
      `;

      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { limit } })
      });

      const result = await response.json();

      if (result.errors) {
        console.error('[useStrategyDeployments] GraphQL errors:', result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL query failed');
      }

      const data = result.data;
      const allEvents: StrategyEvent[] = [];

      // Process rebalances
      if (data.rebalances) {
        data.rebalances.forEach((r: any) => {
          allEvents.push({
            id: r.id,
            type: 'rebalance',
            strategy: r.strategy,
            strategyLabel: getStrategyLabel(r.strategy),
            timestamp: parseInt(r.timestamp),
            blockNumber: parseInt(r.blockNumber),
            transactionHash: r.transactionHash,
          });
        });
      }

      // Process fee collections
      if (data.collectFeeEvents) {
        data.collectFeeEvents.forEach((f: any) => {
          allEvents.push({
            id: f.id,
            type: 'fee_collection',
            strategy: f.strategy,
            strategyLabel: getStrategyLabel(f.strategy),
            timestamp: parseInt(f.timestamp),
            blockNumber: parseInt(f.blockNumber),
            transactionHash: f.transactionHash,
            amount0: f.amount0,
            amount1: f.amount1,
          });
        });
      }

      // Process deposits (these are vault deposits, which trigger strategy deployments)
      if (data.deposits) {
        data.deposits.forEach((d: any) => {
          allEvents.push({
            id: d.id,
            type: 'deposit',
            strategy: CONTRACTS.VAULT,
            strategyLabel: 'Eagle Vault',
            timestamp: parseInt(d.timestamp),
            blockNumber: parseInt(d.blockNumber),
            transactionHash: d.transactionHash,
            assets: d.assets,
            shares: d.shares,
          });
        });
      }

      // Process withdrawals
      if (data.withdrawals) {
        data.withdrawals.forEach((w: any) => {
          allEvents.push({
            id: w.id,
            type: 'withdrawal',
            strategy: CONTRACTS.VAULT,
            strategyLabel: 'Eagle Vault',
            timestamp: parseInt(w.timestamp),
            blockNumber: parseInt(w.blockNumber),
            transactionHash: w.transactionHash,
            assets: w.assets,
            shares: w.shares,
          });
        });
      }

      // Sort all events by timestamp (most recent first)
      allEvents.sort((a, b) => b.timestamp - a.timestamp);

      // Take only the most recent events
      setEvents(allEvents.slice(0, limit));

    } catch (err: any) {
      console.error('[useStrategyDeployments] Error:', err);
      setError(err.message || 'Failed to fetch strategy deployments');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchDeployments();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDeployments, 30000);
    return () => clearInterval(interval);
  }, [fetchDeployments]);

  return {
    events,
    loading,
    error,
    refetch: fetchDeployments,
  };
}

// Helper to format event for display
export function formatStrategyEvent(event: StrategyEvent): { message: string; type: 'success' | 'info' | 'warning' } {
  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  switch (event.type) {
    case 'deposit':
      return {
        message: `Deposit: ${formatAmount(event.assets || '0')} WLFI → ${formatAmount(event.shares || '0')} vEAGLE`,
        type: 'success',
      };
    case 'withdrawal':
      return {
        message: `Withdrawal: ${formatAmount(event.shares || '0')} vEAGLE → ${formatAmount(event.assets || '0')} WLFI`,
        type: 'warning',
      };
    case 'rebalance':
      return {
        message: `Rebalance: ${event.strategyLabel} strategy optimized`,
        type: 'info',
      };
    case 'fee_collection':
      const fee0 = formatAmount(event.amount0 || '0');
      const fee1 = formatAmount(event.amount1 || '0');
      return {
        message: `Fees Collected: ${fee0} + ${fee1} from ${event.strategyLabel}`,
        type: 'success',
      };
    default:
      return {
        message: `Event: ${event.type}`,
        type: 'info',
      };
  }
}

// Export time formatter for components
export function formatEventTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}
