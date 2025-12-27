import type { VercelRequest, VercelResponse } from '@vercel/node';

declare const process: { env: Record<string, string | undefined> };

const LZ_SCAN_BASE = 'https://api-mainnet.layerzero-scan.com';

// These two “Omnichain Application” addresses are shown on LayerZeroScan for `47eagle`.
const APP_ADDRESSES = [
  '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',
  '0x2437f6555350c131647daa0c655c4b49a7af3621',
];

function normalizeMessage(m: any) {
  const pathway = m?.pathway || {};
  const status = m?.status?.name || m?.status || m?.statusName;
  return {
    id: String(m?.id || `${m?.srcTxHash || m?.srcTx?.hash || ''}-${m?.dstTxHash || m?.dstTx?.hash || ''}-${m?.nonce || ''}`),
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

  const apiKey = process.env.LAYERZERO_SCAN_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      success: true,
      enabled: false,
      reason: 'LAYERZERO_SCAN_API_KEY not set',
      items: [],
    });
  }

  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'x-api-key': apiKey,
    };

    const listsSettled = await Promise.allSettled(
      APP_ADDRESSES.map((addr) => {
        const url = `${LZ_SCAN_BASE}/messages?applicationAddress=${addr.toLowerCase()}&limit=${limit}`;
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

    const items = merged
      .map(normalizeMessage)
      .filter((x) => x.id && (x.srcEid || x.dstEid || x.srcTxHash))
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

