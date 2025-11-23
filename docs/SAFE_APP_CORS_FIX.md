# Safe App CORS Fix Guide

## Issues Fixed

1. ✅ Added CORS headers via `vercel.json`
2. ✅ Updated manifest.json URL to `https://47eagle.com`
3. ✅ Configured CSP to allow Safe iframe embedding

## Files Changed

### `/frontend/vercel.json` (NEW)
```json
{
  "headers": [
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "frame-ancestors 'self' https://app.safe.global ..." }
      ]
    }
  ]
}
```

### `/frontend/public/manifest.json` (UPDATED)
- Changed `url` from `eagle-vault.vercel.app` to `47eagle.com`

## Deployment Steps

### 1. Deploy Updated Files

```bash
cd /home/akitav2/eagle-ovault-clean
git add -A
git commit -m "fix: Add CORS headers for Safe App integration"
git push
```

### 2. Verify Deployment

After Vercel deploys (2-3 minutes):

```bash
# Test manifest.json is accessible
curl -I https://47eagle.com/manifest.json

# Should see:
# HTTP/2 200
# access-control-allow-origin: *
# content-type: application/json
```

### 3. Test in Safe

1. Go to https://app.safe.global/
2. Apps → "Add Custom App"
3. Enter: `https://47eagle.com`
4. Click "Add"

## Troubleshooting

### If CORS errors persist:

**Check Vercel Configuration:**
```bash
# Make sure vercel.json is in the frontend directory
ls /home/akitav2/eagle-ovault-clean/frontend/vercel.json
```

**Verify deployment:**
- Go to Vercel dashboard
- Check deployment logs
- Ensure `vercel.json` was deployed

### If manifest.json not found:

**Check file exists:**
```bash
ls /home/akitav2/eagle-ovault-clean/frontend/public/manifest.json
```

**Verify build output:**
- manifest.json should be copied to `dist/` or `build/` directory
- Check Vercel build settings

### If still blocked:

**Alternative: Add public/_headers (Vercel fallback)**

Create `/frontend/public/_headers`:
```
/manifest.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  
/*
  X-Frame-Options: ALLOW-FROM https://app.safe.global
  Content-Security-Policy: frame-ancestors 'self' https://app.safe.global https://*.safe.global
  Access-Control-Allow-Origin: *
```

## Expected Console Output (After Fix)

✅ No CORS errors
✅ manifest.json loads successfully
✅ App iframe loads in Safe
✅ Can connect wallet
✅ Transactions work

## DNS Configuration (If using custom domain)

Make sure `47eagle.com` points to your Vercel deployment:

1. Vercel Dashboard → Settings → Domains
2. Add `47eagle.com`
3. Update DNS records:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

## Testing Checklist

After deployment:

- [ ] No CORS errors in console
- [ ] manifest.json accessible at `https://47eagle.com/manifest.json`
- [ ] App loads in Safe iframe
- [ ] Safe address shows in UI
- [ ] Deposit/withdraw works
- [ ] Admin panel visible
- [ ] Transactions sign through Safe

## Support

If issues persist:

1. **Check Vercel logs**: https://vercel.com/dashboard
2. **Browser console**: Look for specific error messages
3. **Network tab**: Inspect failed requests
4. **Safe Discord**: https://chat.safe.global

## Production URL

- **Production**: https://47eagle.com
- **Safe App URL**: https://47eagle.com (add this in Safe)
- **Manifest**: https://47eagle.com/manifest.json

---

**Status**: Ready to deploy
**Action Required**: Push changes and redeploy

