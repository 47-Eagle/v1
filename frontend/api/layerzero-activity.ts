import type { VercelRequest, VercelResponse } from '@vercel/node';

declare const process: { env: Record<string, string | undefined> };

const LZ_SCAN_BASE = 'https://api-mainnet.layerzero-scan.com';

// These two “Omnichain Application” addresses are shown on LayerZeroScan for `47eagle`.
// We query across all supported EIDs using the Scan API `messages/oapp/{eid}/{address}` endpoint.
const APP_ADDRESSES = [
  '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',
  '0x2437f6555350c131647daa0c655c4b49a7af3621',
];

// LayerZero V2 Endpoint IDs (EIDs) for the networks surfaced in the Bridge UI.
// Keep in sync with `frontend/src/config/contracts.ts` (CHAIN_CONFIG.*.eid).
const EIDS = [
  30101, // Ethereum
  30184, // Base
  30390, // Monad
  30110, // Arbitrum
  30102, // BNB Chain
  30106, // Avalanche
  30367, // HyperEVM
  30332, // Sonic
] as const;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const apiKey =
    process.env.LAYERZERO_SCAN_API_KEY ||
    // Back-compat: some setups stored this as OFT_API_KEY
    process.env.OFT_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      success: true,
      enabled: false,
      reason: 'LAYERZERO_SCAN_API_KEY (or OFT_API_KEY) not set',
      items: [],
    });
  }

  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'x-api-key': apiKey,
    };

    const queries = EIDS.flatMap((eid) => APP_ADDRESSES.map((addr) => ({ eid, addr })));

    const listsSettled = await Promise.allSettled(
      queries.map(({ eid, addr }) => {
        const url = `${LZ_SCAN_BASE}/messages/oapp/${eid}/${addr.toLowerCase()}?limit=${limit}`;
        return fetchWithTimeout(url, headers, 6000);
      })
    );

    const merged = ([] as any[]).concat(
      ...listsSettled
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
        .map((r) => r.value)
    );

    if (merged.length === 0 && listsSettled.every((r) => r.status === 'rejected')) {
      const firstErr = (listsSettled[0] as PromiseRejectedResult)?.reason?.message || 'LayerZeroScan unavailable';
      return res.status(200).json({
        success: true,
        enabled: true,
        items: [],
        warning: firstErr,
      });
    }

    const normalized = merged
      .map(normalizeMessage)
      .filter((x) => x.id);

    // De-dupe and sort newest-first
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

