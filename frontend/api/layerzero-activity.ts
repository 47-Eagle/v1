import type { VercelRequest, VercelResponse } from '@vercel/node';

declare const process: { env: Record<string, string | undefined> };

// NOTE:
// The LayerZeroScan "public app" UI shows recent messages for an application, but the
// Scan API message-list endpoints are not reliably accessible without an API key.
//
// To avoid API keys entirely (and keep the in-app feed always-on), we:
// 1) Pull recent tx hashes by scanning recent logs from the OFT contract on-chain.
// 2) Resolve those tx hashes via LayerZeroScan's public `/tx/{hash}` endpoint.
//
// This yields accurate message status + dst tx hash when available.
const LZ_SCAN_BASE = 'https://api-mainnet.layerzero-scan.com';
const LZ_TX_LOOKUP = (txHash: string) => `${LZ_SCAN_BASE}/tx/${txHash}`;

const EAGLE_OFT = '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E';

// Keep this small to avoid heavy RPC usage on every page view.
const CHAINS_TO_SCAN = [
  { key: 'ethereum', rpc: 'https://eth.llamarpc.com', lookbackBlocks: 5_000 },
  { key: 'base', rpc: 'https://mainnet.base.org', lookbackBlocks: 20_000 },
  { key: 'monad', rpc: 'https://monad-mainnet.drpc.org,https://monad-mainnet.api.onfinality.io/public,https://rpc-mainnet.monadinfra.com', lookbackBlocks: 30_000 },
] as const;

type ChainKey = (typeof CHAINS_TO_SCAN)[number]['key'];

function normalizeMessage(m: any) {
  const pathway = m?.pathway || {};
  const status = m?.status?.name || m?.status || m?.statusName;
  return {
    id: String(
      m?.id ||
        m?.guid ||
        `${m?.srcTxHash || m?.srcTx?.hash || ''}-${m?.dstTxHash || m?.dstTx?.hash || ''}-${m?.nonce || ''}`
    ),
    srcEid: Number(pathway?.srcEid || m?.srcEid || m?.srcChainId || 0) || undefined,
    dstEid: Number(pathway?.dstEid || m?.dstEid || m?.dstChainId || 0) || undefined,
    status: typeof status === 'string' ? status : undefined,
    created: m?.created || m?.createdAt || m?.timestamp || undefined,
    updated: m?.updated || m?.updatedAt || undefined,
    srcTxHash: m?.srcTxHash || m?.srcTx?.hash || m?.sourceTxHash || undefined,
    dstTxHash: m?.dstTxHash || m?.dstTx?.hash || m?.destinationTxHash || undefined,
  };
}

async function fetchWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 6000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`LayerZeroScan HTTP ${res.status}: ${text.slice(0, 180)}`);
    const json = JSON.parse(text);
    const data = (json?.data || json?.messages || json?.items || []) as any[];
    return data;
  } finally {
    clearTimeout(t);
  }
}

async function rpcCallWithTimeout(rpc: string, method: string, params: any[], timeoutMs = 6000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    if (!json) throw new Error('Invalid RPC response');
    if (json.error) throw new Error(json.error.message || 'RPC error');
    return json.result as any;
  } finally {
    clearTimeout(t);
  }
}

async function rpcCallWithFallback(rpcs: string[], method: string, params: any[], timeoutMs = 6000) {
  let lastErr: any = null;
  for (const rpc of rpcs) {
    try {
      return await rpcCallWithTimeout(rpc, method, params, timeoutMs);
    } catch (e: any) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error('RPC failed');
}

function getRpcList(chainKey: ChainKey, fallback: string) {
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
}

function hexToNumberSafe(hex: string): number {
  if (!hex || typeof hex !== 'string') return 0;
  try {
    return Number(BigInt(hex));
  } catch {
    return 0;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };

    // 1) Collect recent tx hashes from recent OFT logs on each chain.
    const txCandidates: Array<{ txHash: string; chain: ChainKey; blockNumber: number }> = [];
    const logsSettled = await Promise.allSettled(
      CHAINS_TO_SCAN.map(async (c) => {
        const rpcs = getRpcList(c.key, c.rpc);
        const latestHex = await rpcCallWithFallback(rpcs, 'eth_blockNumber', [], 4000);
        const latest = hexToNumberSafe(latestHex);
        const from = Math.max(0, latest - c.lookbackBlocks);
        const logs = await rpcCallWithFallback(
          rpcs,
          'eth_getLogs',
          [
            {
              address: EAGLE_OFT,
              fromBlock: `0x${from.toString(16)}`,
              toBlock: 'latest',
            },
          ],
          6000
        );

        if (Array.isArray(logs)) {
          for (const l of logs) {
            const txHash = String(l?.transactionHash || '');
            const bn = hexToNumberSafe(String(l?.blockNumber || '0x0'));
            if (/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
              txCandidates.push({ txHash, chain: c.key, blockNumber: bn });
            }
          }
        }
      })
    );

    // If RPCs are totally down, surface a helpful warning.
    if (txCandidates.length === 0 && logsSettled.every((r) => r.status === 'rejected')) {
      const firstErr = (logsSettled[0] as PromiseRejectedResult)?.reason?.message || 'RPC unavailable';
      return res.status(200).json({ success: true, enabled: true, items: [], warning: firstErr });
    }

    // 2) Resolve unique tx hashes via LayerZeroScan's public /tx endpoint.
    const uniqTx = Array.from(
      new Map(
        txCandidates
          .sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0))
          .map((x) => [x.txHash, x])
      ).values()
    )
      .slice(0, Math.min(40, limit * 6))
      .map((x) => x.txHash);

    const txLookupsSettled = await Promise.allSettled(
      uniqTx.map(async (txHash) => {
        const url = LZ_TX_LOOKUP(txHash);
        const json = await fetchWithTimeout(url, headers, 6000);
        // /tx returns { messages: [...] }
        const messages = (json?.messages || json?.data || []) as any[];
        return Array.isArray(messages) ? messages : [];
      })
    );

    const merged = ([] as any[]).concat(
      ...txLookupsSettled
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
        .map((r) => r.value)
    );

    const normalized = merged.map(normalizeMessage).filter((x) => x.id);

    const byId = new Map<string, ReturnType<typeof normalizeMessage>>();
    for (const it of normalized) byId.set(it.id, it);
    const items = Array.from(byId.values())
      .sort((a, b) => {
        const ta = a.updated ? Date.parse(a.updated) : a.created ? Date.parse(a.created) : 0;
        const tb = b.updated ? Date.parse(b.updated) : b.created ? Date.parse(b.created) : 0;
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
      })
      .slice(0, limit);

    // Cache briefly
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
    return res.status(200).json({ success: true, enabled: true, items });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e?.message || 'Failed to fetch LayerZero activity',
    });
  }
}

