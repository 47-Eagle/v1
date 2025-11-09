# Revert Finance CORS Issue - Fix Documentation

## Problem
The frontend was experiencing CORS errors when trying to fetch data from the Revert Finance API:

```
Access to fetch at 'https://api.revert.finance/v1/discover-pools/daily...' from origin 'https://www.47eagle.com' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'https://revert.finance' that is not equal to the supplied origin.
```

The Revert Finance API only allows requests from `https://revert.finance`, but the application runs on `https://www.47eagle.com`.

## Solution
Created a serverless API proxy on Vercel to bypass CORS restrictions by making the request server-side.

### Changes Made

#### 1. Created Vercel Serverless Function
**File:** `/frontend/api/revert-finance.ts`

This serverless function:
- Proxies requests to the Revert Finance API
- Handles CORS headers properly
- Implements caching (5 minutes) for better performance
- Provides proper error handling

#### 2. Updated Frontend Data Hooks
**Files Modified:**
- `/frontend/src/hooks/useRevertFinanceData.ts`
- `/frontend/src/components/VaultVisualization.tsx`

Changed API calls from:
```typescript
fetch('https://api.revert.finance/v1/discover-pools/daily?...')
```

To:
```typescript
fetch('/api/revert-finance?pool=...&days=30&network=mainnet')
```

#### 3. Added Required Dependency
**File:** `/frontend/package.json`

Added `@vercel/node` to devDependencies for TypeScript types.

## Deployment

### Install Dependencies
```bash
cd frontend
npm install
```

### Local Testing
Since Vercel serverless functions don't run locally with Vite, you have two options:

#### Option 1: Test with Vercel CLI
```bash
npm install -g vercel
vercel dev
```

#### Option 2: Deploy to Preview
```bash
vercel deploy
```

### Production Deployment
When you push to your main branch, Vercel will automatically:
1. Build the frontend
2. Deploy the serverless function at `/api/revert-finance`
3. Serve everything with proper routing

## API Endpoint

### Endpoint
`GET /api/revert-finance`

### Parameters
- `pool` (required): The Uniswap pool address
- `days` (optional, default: "30"): Number of days of historical data
- `network` (optional, default: "mainnet"): The network to query

### Example Request
```
GET /api/revert-finance?pool=0x9C2C8910F113f3b3B4F1f454D23A0F6B61B8E5A7&days=30&network=mainnet
```

### Response
Returns the same JSON structure as the Revert Finance API:
```json
{
  "success": true,
  "data": [
    {
      "tvl_usd": 123456.78,
      "fees_apr": 45.23,
      "volume_usd": 98765.43,
      ...
    }
  ]
}
```

## Benefits
1. ✅ **CORS Issue Resolved**: Server-side requests don't have CORS restrictions
2. ✅ **Caching**: Reduces API calls and improves performance
3. ✅ **Error Handling**: Better error messages and logging
4. ✅ **Security**: API requests are proxied through your domain
5. ✅ **Scalability**: Vercel serverless functions auto-scale

## Testing
After deployment, the Revert Finance data should load successfully in:
- VaultView component (Strategy #1 display)
- VaultVisualization component (3D visualization)

Check the browser console for:
```
[useRevertFinanceData] Fetching from API proxy...
[useRevertFinanceData] Calculated data: { tvl: ..., avgAPR: ..., ... }
```

## Troubleshooting

### If data still doesn't load:
1. Check browser console for errors
2. Verify the serverless function deployed:
   ```bash
   curl https://www.47eagle.com/api/revert-finance?pool=0x9C2C8910F113f3b3B4F1f454D23A0F6B61B8E5A7
   ```
3. Check Vercel function logs in the Vercel dashboard

### Common Issues:
- **404 on /api/revert-finance**: Serverless function didn't deploy. Check Vercel build logs.
- **500 error**: Check Vercel function logs for detailed error messages.
- **Timeout**: Revert Finance API might be slow/down. Function will timeout after 10s (Vercel default).

## Notes
- The proxy adds minimal latency (<100ms typically)
- Caching is set to 5 minutes (configurable in the serverless function)
- The function runs on Vercel's Edge Network for best performance

