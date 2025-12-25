import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * NOTE:
 * This endpoint previously depended on Prisma. That caused Vercel builds to fail
 * (Prisma client not generated / type mismatch), which prevented the frontend
 * from deploying and showing updated strategies.
 *
 * Until the analytics DB pipeline is properly wired for Vercel (DATABASE_URL,
 * prisma generate, migrations, etc.), this endpoint returns a lightweight stub.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Cache for 5 minutes
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  return res.status(200).json({
    success: true,
    data: {
      vaults: {},
      syncStatus: {},
      meta: {
        disabled: true,
        reason: 'analytics backend not configured',
        generatedAt: new Date().toISOString(),
      },
    },
  });
}

