import { useEffect, useMemo, useState } from 'react';
import { CONTRACTS } from '../config/contracts';

type Tx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  input: string;
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

const formatValueEth = (wei: string) => {
  try {
    const bn = BigInt(wei);
    return Number(bn) / 1e18;
  } catch {
    return 0;
  }
};

const formatDate = (ts: string) => {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
};

export function ActivityTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<TxGroup[]>(CONTRACT_GROUPS);

  const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;

  const fetchGroup = async (g: TxGroup) => {
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${g.address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== '1') return { ...g, txs: [] };
    const txs: Tx[] = json.result.map((t: any) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value,
      timeStamp: t.timeStamp,
      input: t.input || '',
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase text-[#9ca3af]">{g.label}</div>
              <div className="text-xs text-[#6b7280] font-mono">{shorten(g.address)}</div>
            </div>
            <div className="text-xs text-[#9ca3af]">{g.txs.length} tx</div>
          </div>
          <div className="space-y-2">
            {g.txs.map((t) => (
              <div key={t.hash} className="text-xs bg-[#0c0c0d] border border-[#222] p-3 rounded">
                <div className="flex justify-between">
                  <a
                    href={`https://etherscan.io/tx/${t.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F2D57C] font-mono"
                  >
                    {shorten(t.hash, 10)}
                  </a>
                  <span className="text-[#9ca3af]">{formatDate(t.timeStamp)}</span>
                </div>
                <div className="flex justify-between mt-1 text-[#9ca3af] font-mono">
                  <span>From: {shorten(t.from)}</span>
                  <span>To: {shorten(t.to)}</span>
                </div>
                <div className="flex justify-between mt-1 text-[#9ca3af] font-mono">
                  <span>Value: {formatValueEth(t.value).toFixed(6)} ETH</span>
                  <span>Method: {t.input ? t.input.slice(0, 10) : '0x'}</span>
                </div>
              </div>
            ))}
            {g.txs.length === 0 && <div className="text-[#6b7280] text-xs">No recent tx</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

