import { useEffect, useMemo, useState } from 'react';
import { CONTRACTS } from '../config/contracts';

type Tx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  input: string;
  blockNumber?: string;
  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
  isError?: string;
  txreceipt_status?: string;
  methodId?: string;
  functionName?: string;
};

type TxGroup = {
  label: string;
  address: string;
  txs: Tx[];
};

const CONTRACT_GROUPS: TxGroup[] = [
  { label: 'EagleOVault', address: CONTRACTS.VAULT, txs: [] },
  { label: 'Strategy USD1/WLFI', address: CONTRACTS.STRATEGY_USD1, txs: [] },
  { label: 'Strategy WETH/WLFI', address: CONTRACTS.STRATEGY_WETH, txs: [] },
  { label: 'Charm Vault USD1/WLFI', address: CONTRACTS.CHARM_VAULT_USD1, txs: [] },
  { label: 'Charm Vault WETH/WLFI', address: CONTRACTS.CHARM_VAULT_WETH, txs: [] },
];

const shorten = (s: string, len = 6) => `${s.slice(0, len)}...${s.slice(-4)}`;
const etherscanLink = (addr: string, explorer: string) => `${explorer}/address/${addr}`;

const formatValueEth = (wei: string) => {
  try {
    const bn = BigInt(wei);
    return Number(bn) / 1e18;
  } catch {
    return 0;
  }
};

const formatGwei = (wei?: string) => {
  if (!wei) return '';
  try {
    const bn = BigInt(wei);
    return (Number(bn) / 1e9).toFixed(2);
  } catch {
    return '';
  }
};

const formatDate = (ts: string) => {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
};

const formatAge = (ts: string) => {
  const diff = Date.now() - Number(ts) * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const formatEth = (n: number) => (n >= 0.001 ? n.toFixed(3) : n.toFixed(6));

export function ActivityTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<TxGroup[]>(CONTRACT_GROUPS);

  const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
  const rpcExplorer = 'https://etherscan.io';

  const fetchGroup = async (g: TxGroup) => {
    // Use Etherscan V2 API (V1 is deprecated)
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${g.address}&page=1&offset=25&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    const results = json?.result || json?.data || [];
    if (!Array.isArray(results) || results.length === 0) return { ...g, txs: [] };
    const txs: Tx[] = results.map((t: any) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value,
      timeStamp: t.timeStamp,
      input: t.input || '',
      blockNumber: t.blockNumber,
      gas: t.gas,
      gasPrice: t.gasPrice,
      gasUsed: t.gasUsed,
      isError: t.isError,
      txreceipt_status: t.txreceipt_status,
      methodId: t.methodId,
      functionName: t.functionName,
    }));
    return { ...g, txs };
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!apiKey) {
        setError('Missing Etherscan API key');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const results = [];
        for (const g of CONTRACT_GROUPS) {
          // Stagger requests to be gentle with rate limits
          // eslint-disable-next-line no-await-in-loop
          const r = await fetchGroup(g);
          results.push(r);
          // Small pause
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, 250));
        }
        if (!cancelled) setGroups(results);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const allEmpty = useMemo(() => groups.every((g) => g.txs.length === 0), [groups]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-[#9ca3af]">
        Recent on-chain activity for vault, strategies, and Charm vaults. Powered by Etherscan.
      </div>

      {loading && <div className="text-sm text-[#9ca3af]">Loading transactions…</div>}
      {error && <div className="text-sm text-red-400">Error: {error}</div>}

      {allEmpty && !loading && !error && (
        <div className="text-sm text-[#9ca3af]">No recent transactions found.</div>
      )}

      {groups.map((g) => (
        <div key={g.address} className="bg-[#141517] border border-black p-4 rounded-lg">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <div className="text-xs uppercase text-[#9ca3af]">{g.label}</div>
                <a
                  href={etherscanLink(g.address, rpcExplorer)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#F2D57C] font-mono break-all"
                >
                  {g.address}
                </a>
              </div>
              <div className="text-xs text-[#9ca3af] whitespace-nowrap">{g.txs.length} tx</div>
            </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {g.txs.map((t) => (
              <div key={t.hash} className="text-xs bg-[#0c0c0d] border border-[#222] p-3 rounded">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <a
                    href={`${rpcExplorer}/tx/${t.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F2D57C] font-mono"
                  >
                    {shorten(t.hash, 10)}
                  </a>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span
                      className={
                        t.isError === '1' || t.txreceipt_status === '0'
                          ? 'px-2 py-0.5 rounded bg-red-900/40 text-red-300'
                          : 'px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300'
                      }
                    >
                      {t.isError === '1' || t.txreceipt_status === '0' ? 'Failed' : 'Success'}
                    </span>
                    <span className="text-[#9ca3af]">{formatAge(t.timeStamp)} · {formatDate(t.timeStamp)}</span>
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-[#9ca3af] font-mono">
                  <span>
                    Fn: {t.functionName || t.methodId || (t.input ? t.input.slice(0, 10) : '0x')}
                  </span>
                  <span>Block: {t.blockNumber || '-'}</span>
                </div>
                <div className="mt-1 text-[#9ca3af] font-mono space-y-1">
                  <div className="flex gap-1 items-start">
                    <span>From:</span>
                    <a
                      href={`${rpcExplorer}/address/${t.from}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F2D57C] break-all"
                    >
                      {t.from}
                    </a>
                  </div>
                  <div className="flex gap-1 items-start">
                    <span>To:</span>
                    <a
                      href={`${rpcExplorer}/address/${t.to}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F2D57C] break-all"
                    >
                      {t.to}
                    </a>
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-[#9ca3af] font-mono">
                  <span>Value: {formatEth(formatValueEth(t.value))} ETH</span>
                  <span>
                    Gas: {t.gasUsed || '-'} @ {formatGwei(t.gasPrice)} gwei
                  </span>
                </div>
                {t.gas && t.gasPrice && t.gasUsed && (
                  <div className="flex justify-between mt-1 text-[#6b7280] font-mono">
                    <span>
                      Max Gas: {t.gas} · Est fee @ {formatGwei(t.gasPrice)} gwei
                    </span>
                    <span>
                      Gas Used: {t.gasUsed}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {g.txs.length === 0 && <div className="text-[#6b7280] text-xs">No recent tx</div>}
          </div>
        </div>
      ))}
    </div>
  );
}


