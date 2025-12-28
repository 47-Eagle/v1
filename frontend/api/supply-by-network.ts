import type { VercelRequest, VercelResponse } from '@vercel/node';

declare const process: { env: Record<string, string | undefined> };

// Server-side supply aggregation (avoids browser RPC/CORS flakiness).
// Uses JSON-RPC eth_call to fetch `decimals()` + `totalSupply()` for the OFT address on each chain.

const ERC20_TOTAL_SUPPLY_SIG = '0x18160ddd'; // totalSupply()
const ERC20_BALANCE_OF_SIG = '0x70a08231'; // balanceOf(address)

const EAGLE_OFT = '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E';
const EAGLE_DECIMALS = 18;

const CHAINS = [
  { key: 'ethereum', name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  { key: 'base', name: 'Base', rpc: 'https://mainnet.base.org' },
  { key: 'sonic', name: 'Sonic', rpc: 'https://rpc.soniclabs.com' },
  { key: 'hyperevm', name: 'HyperEVM', rpc: 'https://rpc.hyperliquid.xyz/evm' },
  // Monad public RPCs can be rate-limited; try multiple fallbacks.
  { key: 'monad', name: 'Monad', rpc: 'https://monad-mainnet.drpc.org,https://monad-mainnet.api.onfinality.io/public,https://rpc-mainnet.monadinfra.com' },
  { key: 'bsc', name: 'BNB Chain', rpc: 'https://bsc-dataseed.binance.org' },
  { key: 'avalanche', name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  { key: 'arbitrum', name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
] as const;

type ChainKey = (typeof CHAINS)[number]['key'];

async function rpcCall(rpc: string, method: string, params: any[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
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

async function rpcCallWithFallback(rpcs: string[], method: string, params: any[]) {
  let lastErr: any = null;
  for (const rpc of rpcs) {
    try {
      return await rpcCall(rpc, method, params);
    } catch (e: any) {
      lastErr = e;
      // If we're rate-limited, try the next RPC quickly.
      const msg = String(e?.message || '');
      if (msg.includes('429')) continue;
      continue;
    }
  }
  throw lastErr || new Error('RPC failed');
}

function hexToBigIntSafe(hex: string): bigint {
  if (!hex || typeof hex !== 'string') return 0n;
  if (hex === '0x') return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
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

type CachedSupply = { ts: number; supply: number };
const SUPPLY_CACHE_TTL_MS = 2 * 60 * 1000;
const SUPPLY_CACHE: Record<string, CachedSupply> =
  // @ts-expect-error - allow global cache on the serverless runtime
  (globalThis.__EAGLE_SUPPLY_CACHE ??= {});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const account = typeof req.query.account === 'string' && isAddress(req.query.account) ? req.query.account : null;

    const getRpcList = (chainKey: ChainKey, fallback: string) => {
      const upper = chainKey.toUpperCase();
      const envKey = `${upper}_RPC_URL`;
      const candidates = [
        process.env[envKey],
        process.env[`VITE_${envKey}`],
        process.env[`${upper}_RPC`],
        process.env[`VITE_${upper}_RPC`],
        process.env[`${upper}_RPC_ENDPOINT`],
        process.env[`VITE_${upper}_RPC_ENDPOINT`],
      ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
      const raw = (candidates[0] || fallback).trim();
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const rows = await Promise.all(
      CHAINS.map(async (c) => {
        const chain = c.key as ChainKey;
        const cacheKey = `supply:${chain}`;
        const cached = SUPPLY_CACHE[cacheKey];
        const now = Date.now();

        const rpcs = getRpcList(chain, c.rpc);

        try {
          // Keep RPC usage minimal: EAGLE is 18 decimals, so we only need totalSupply().
          const supplyHex = await rpcCallWithFallback(rpcs, 'eth_call', [{ to: EAGLE_OFT, data: ERC20_TOTAL_SUPPLY_SIG }, 'latest']);
          const supply = formatUnits(hexToBigIntSafe(supplyHex), EAGLE_DECIMALS);
          SUPPLY_CACHE[cacheKey] = { ts: now, supply };

          let userBalance: number | null = null;
          if (account) {
            try {
              const balHex = await rpcCallWithFallback(rpcs, 'eth_call', [{ to: EAGLE_OFT, data: encodeBalanceOfData(account) }, 'latest']);
              userBalance = formatUnits(hexToBigIntSafe(balHex), EAGLE_DECIMALS);
            } catch {
              // Balance is optional; don't fail the whole chain if it errors.
              userBalance = null;
            }
          }

          return { chain, name: c.name, supply, userBalance, ok: true as const };
        } catch (e: any) {
          if (cached && now - cached.ts <= SUPPLY_CACHE_TTL_MS) {
            return { chain, name: c.name, supply: cached.supply, userBalance: null, ok: true as const };
          }
          return { chain, name: c.name, supply: 0, userBalance: null, ok: false as const, error: e?.message || 'failed' };
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

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ success: true, token: EAGLE_OFT, total, items });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to compute supply' });
  }
}

