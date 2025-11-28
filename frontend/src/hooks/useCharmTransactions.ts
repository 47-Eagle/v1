import { useState, useEffect } from 'react';
import { CONTRACTS } from '../config/contracts';

interface Transaction {
  hash: string;
  type: 'Deposit' | 'Withdrawal' | 'Rebalance' | 'Collect';
  timestamp: number;
  date: string;
}

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

// Charm vault function signatures (first 4 bytes of keccak256 hash)
// These are common function selectors for ERC4626 vaults
const CHARM_FUNCTIONS = {
  deposit: '0x6e553f65', // deposit(uint256,address) - but Charm might use different signature
  withdraw: '0x2e1a7d4d', // withdraw(uint256,address,address)
  // Charm Alpha vaults use custom functions, so we'll infer from value and logs
};

export function useCharmTransactions(charmVaultAddress: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!charmVaultAddress) {
      setTransactions([]);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const multisigAddress = CONTRACTS.MULTISIG.toLowerCase();
        
        // First, fetch transactions from the multisig address
        const txResponse = await fetch(
          `${ETHERSCAN_API_URL}?module=account&action=txlist&address=${multisigAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`
        );

        const txData = await txResponse.json();

        if (txData.status === '0' && txData.message !== 'No transactions found') {
          throw new Error(txData.message || 'Failed to fetch transactions');
        }

        // Filter transactions where to address is the Charm vault
        const charmVaultLower = charmVaultAddress.toLowerCase();
        const multisigTransactions = (txData.result || []).filter(
          (tx: any) => tx.to?.toLowerCase() === charmVaultLower
        );

        // Fetch event logs for better transaction type detection
        // Charm Finance vaults emit events like Deposit, Withdraw, Rebalance
        const logsResponse = await fetch(
          `${ETHERSCAN_API_URL}?module=logs&action=getLogs&address=${charmVaultAddress}&fromBlock=0&toBlock=latest&page=1&offset=100&apikey=${ETHERSCAN_API_KEY}`
        );
        
        let eventLogs: any[] = [];
        try {
          const logsData = await logsResponse.json();
          if (logsData.status === '1' && logsData.result) {
            eventLogs = logsData.result;
          }
        } catch (logError) {
          console.warn('[useCharmTransactions] Failed to fetch event logs:', logError);
        }

        // Create a map of transaction hash to event type
        const txHashToType: Record<string, Transaction['type']> = {};
        eventLogs.forEach((log: any) => {
          const txHash = log.transactionHash?.toLowerCase();
          if (!txHash) return;
          
          // Check event signature (first topic)
          const eventSig = log.topics?.[0]?.toLowerCase() || '';
          
          // Common ERC4626 event signatures (keccak256 hashes)
          const DEPOSIT_EVENT_SIG = '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7'; // Deposit(address,address,uint256,uint256)
          const WITHDRAW_EVENT_SIG = '0xfbde797d714c0ea510b0b6a534908ee2818bea7b6a936a7a13fd402e618d90b4'; // Withdraw(address,address,address,uint256,uint256)
          
          if (eventSig === DEPOSIT_EVENT_SIG) {
            txHashToType[txHash] = 'Deposit';
          } else if (eventSig === WITHDRAW_EVENT_SIG) {
            txHashToType[txHash] = 'Withdrawal';
          } else if (log.topics?.some((t: string) => t && typeof t === 'string' && t.toLowerCase().includes('rebalance'))) {
            // Check if any topic contains "rebalance" (case-insensitive)
            txHashToType[txHash] = 'Rebalance';
          }
        });

        // Parse transactions and determine type
        const parsedTransactions: Transaction[] = multisigTransactions
          .slice(0, 5) // Limit to 5 most recent
          .map((tx: any) => {
            const timestamp = parseInt(tx.timeStamp) * 1000;
            const date = new Date(timestamp);
            const dateStr = date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const timeStr = date.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const txHashLower = tx.hash?.toLowerCase() || '';
            
            // First, check if we have event log data
            let type: Transaction['type'] = txHashToType[txHashLower] || 'Rebalance';
            
            // Fallback: Determine transaction type based on input data and value
            if (!txHashToType[txHashLower]) {
              const inputData = tx.input?.toLowerCase() || '';
              const value = BigInt(tx.value || '0');
              
              if (value > 0n) {
                type = 'Deposit';
              } else if (inputData.includes('withdraw')) {
                type = 'Withdrawal';
              } else if (inputData.includes('deposit')) {
                type = 'Deposit';
              } else if (inputData.includes('rebalance')) {
                type = 'Rebalance';
              } else if (inputData.includes('collect')) {
                type = 'Collect';
              } else if (inputData.length > 10) {
                // Has input data but unknown function - likely a rebalance or other operation
                type = 'Rebalance';
              }
            }

            return {
              hash: tx.hash,
              type,
              timestamp,
              date: `${dateStr}, ${timeStr}`,
            };
          });

        setTransactions(parsedTransactions);
      } catch (err: any) {
        console.error('[useCharmTransactions] Error fetching transactions:', err);
        setError(err.message || 'Failed to fetch transactions');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTransactions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [charmVaultAddress]);

  return { transactions, loading, error };
}

