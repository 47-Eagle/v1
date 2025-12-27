import type { VercelRequest, VercelResponse } from '@vercel/node';

declare const process: { env: Record<string, string | undefined> };

// Server-side supply aggregation (avoids browser RPC/CORS flakiness).
// Uses JSON-RPC eth_call to fetch `decimals()` + `totalSupply()` for the OFT address on each chain.

const ERC20_DECIMALS_SIG = '0x313ce567'; // decimals()
const ERC20_TOTAL_SUPPLY_SIG = '0x18160ddd'; // totalSupply()
const ERC20_BALANCE_OF_SIG = '0x70a08231'; // balanceOf(address)

const EAGLE_OFT = '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E';

const CHAINS = [
  { key: 'ethereum', name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  { key: 'base', name: 'Base', rpc: 'https://mainnet.base.org' },
  { key: 'sonic', name: 'Sonic', rpc: 'https://rpc.soniclabs.com' },
  { key: 'hyperevm', name: 'HyperEVM', rpc: 'https://rpc.hyperliquid.xyz/evm' },
  { key: 'monad', name: 'Monad', rpc: 'https://rpc-mainnet.monadinfra.com' },
  { key: 'bsc', name: 'BNB Chain', rpc: 'https://bsc-dataseed.binance.org' },
  { key: 'avalanche', name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  { key: 'arbitrum', name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
] as const;

type ChainKey = (typeof CHAINS)[number]['key'];

async function rpcCall(rpc: string, method: string, params: any[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error(`RPC HTTP ${r.status}`);
    }
    if (!json) throw new Error('Invalid RPC response');
    if (json.error) throw new Error(json.error.message || 'RPC error');
    return json.result as string;
  } finally {
    clearTimeout(timeout);
  }
}

function hexToBigInt(hex: string): bigint {
  if (!hex || typeof hex !== 'string') return 0n;
  return BigInt(hex);
}

function isAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function encodeBalanceOfData(address: string): string {
  // calldata = selector + 32-byte padded address
  const clean = address.toLowerCase().replace(/^0x/, '');
  const padded = clean.padStart(64, '0');
  return `${ERC20_BALANCE_OF_SIG}${padded}`;
}

function formatUnits(value: bigint, decimals: number): number {
  if (decimals <= 0) return Number(value);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  // keep 6 decimals for UI purposes
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 6);
  const asNum = Number(`${whole.toString()}.${fracStr}`);
  return Number.isFinite(asNum) ? asNum : Number(whole);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const account = typeof req.query.account === 'string' && isAddress(req.query.account) ? req.query.account : null;

    const getRpc = (chainKey: ChainKey, fallback: string) => {
      const envKey = `${chainKey.toUpperCase()}_RPC_URL`;
      return process.env[envKey] || fallback;
    };

    const rows = await Promise.all(
      CHAINS.map(async (c) => {
        try {
          const rpc = getRpc(c.key as ChainKey, c.rpc);
          const decimalsHex = await rpcCall(rpc, 'eth_call', [{ to: EAGLE_OFT, data: ERC20_DECIMALS_SIG }, 'latest']);
          const supplyHex = await rpcCall(rpc, 'eth_call', [{ to: EAGLE_OFT, data: ERC20_TOTAL_SUPPLY_SIG }, 'latest']);

          const decimals = Number(hexToBigInt(decimalsHex));
          const supply = formatUnits(hexToBigInt(supplyHex), Number.isFinite(decimals) ? decimals : 18);
          let userBalance: number | null = null;
          if (account) {
            const balHex = await rpcCall(rpc, 'eth_call', [{ to: EAGLE_OFT, data: encodeBalanceOfData(account) }, 'latest']);
            userBalance = formatUnits(hexToBigInt(balHex), Number.isFinite(decimals) ? decimals : 18);
          }

          return { chain: c.key as ChainKey, name: c.name, supply, userBalance, ok: true as const };
        } catch (e: any) {
          return { chain: c.key as ChainKey, name: c.name, supply: 0, userBalance: null, ok: false as const, error: e?.message || 'failed' };
        }
      })
    );

    const total = rows.reduce((sum, r) => sum + (r.supply || 0), 0);
    const items = rows
      .map((r) => ({
        chain: r.chain,
        name: r.name,
        supply: r.supply,
        percent: total > 0 ? (r.supply / total) * 100 : 0,
        ok: r.ok,
        error: r.ok ? undefined : r.error,
        userBalance: r.userBalance,
      }))
      .sort((a, b) => b.supply - a.supply);

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({ success: true, token: EAGLE_OFT, total, items });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to compute supply' });
  }
}

