# 🚀 Eagle LP Deployment Guide

Your app is now configured to deploy to production! Choose your preferred platform:

---

## Option 1: Vercel (Recommended) ⚡

**Pros:** Fastest, automatic builds, great for React apps
**Cost:** Free tier available

### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd /home/akitav2/eagle-ovault-clean/bAlanciaga-master
   vercel
   ```

4. **Set Environment Variables** (in Vercel dashboard):
   - `VITE_DYNAMIC_ENVIRONMENT_ID`
   - `VITE_GRAPH_API_KEY`
   - `VITE_ALCHEMY_API_KEY`

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

**Your app will be live at:** `https://your-app.vercel.app`

---

## Option 2: Netlify 🌐

**Pros:** Simple drag-and-drop, good free tier
**Cost:** Free tier available

### Steps:

1. **Build your app**
   ```bash
   npm run build
   ```

2. **Go to [Netlify](https://app.netlify.com/)**

3. **Drag and drop the `dist` folder**

4. **Set Environment Variables** (in Site settings > Environment variables):
   - `VITE_DYNAMIC_ENVIRONMENT_ID=1817ad15-5595-4a39-8b12-4893dfda3282`
   - `VITE_GRAPH_API_KEY=eyJhbGci...` (your JWT token)
   - `VITE_ALCHEMY_API_KEY=omeyMm6mGtblMX7rCT-QTGQvTLFD4J9F`

5. **Redeploy**

**Your app will be live at:** `https://your-app.netlify.app`

---

## Option 3: GitHub Pages (Free) 📄

**Pros:** Completely free, integrated with GitHub
**Cons:** No environment variables support (need to hardcode)

### Steps:

1. **Update `vite.config.ts`** - add base URL:
   ```typescript
   export default defineConfig({
     base: '/eagle-lp/', // Your repo name
     // ... rest of config
   })
   ```

2. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy script to `package.json`**
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

**Your app will be live at:** `https://yourusername.github.io/eagle-lp/`

---

## Option 4: Cloudflare Pages 🔶

**Pros:** Fast CDN, generous free tier, good DX
**Cost:** Free tier available

### Steps:

1. **Push to GitHub** (if not already)

2. **Go to [Cloudflare Pages](https://pages.cloudflare.com/)**

3. **Connect your GitHub repo**

4. **Build settings:**
   - Build command: `npm run build`
   - Build output: `dist`
   - Framework preset: `Vite`

5. **Set Environment Variables:**
   - `VITE_DYNAMIC_ENVIRONMENT_ID`
   - `VITE_GRAPH_API_KEY`
   - `VITE_ALCHEMY_API_KEY`

**Your app will be live at:** `https://eagle-lp.pages.dev`

---

## 🔒 Important: Environment Variables

**NEVER commit `.env` to GitHub!** Make sure it's in `.gitignore`.

For each platform, set these variables in their dashboard:
```env
VITE_DYNAMIC_ENVIRONMENT_ID=1817ad15-5595-4a39-8b12-4893dfda3282
VITE_GRAPH_API_KEY=eyJhbGci... (your full JWT token)
VITE_ALCHEMY_API_KEY=omeyMm6mGtblMX7rCT-QTGQvTLFD4J9F
```

---

## 🎯 Recommended: Vercel

For your use case, **Vercel is the best choice** because:
- ✅ Zero config needed (we already added `vercel.json`)
- ✅ Automatic deployments on git push
- ✅ Built-in analytics
- ✅ Perfect for Vite/React apps
- ✅ Free SSL certificate
- ✅ Global CDN

---

## 🚀 Quick Deploy (Vercel):

```bash
# One-time setup
npm install -g vercel

# Deploy
cd /home/akitav2/eagle-ovault-clean/bAlanciaga-master
vercel

# Follow prompts, then production deploy:
vercel --prod
```

**Done! Your app is live! 🎉**

