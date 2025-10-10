# 🚢 Deployment Guide - Eagle Vault V3 Frontend

Step-by-step guide for deploying your Eagle Vault V3 frontend to production.

## 🎯 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All contract addresses are correct in `.env`
- [ ] WalletConnect Project ID is configured
- [ ] App tested locally on mainnet
- [ ] Smart contracts are verified on Arbiscan
- [ ] Security audit completed (if applicable)
- [ ] Error handling tested
- [ ] Mobile responsiveness verified
- [ ] All console errors resolved

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Easiest)

**Best for**: Quick deployment, automatic CI/CD, free SSL

#### Step-by-Step:

1. **Prepare Repository**
```bash
git init
git add .
git commit -m "Initial deployment"
git branch -M main
git remote add origin https://github.com/yourusername/eagle-vault-v3.git
git push -u origin main
```

2. **Deploy to Vercel**
   - Visit https://vercel.com
   - Click "Import Project"
   - Connect GitHub and select repository
   - Configure project:
     - Framework Preset: Next.js
     - Root Directory: `frontend-v3`
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Add Environment Variables**
   
   In Vercel dashboard → Settings → Environment Variables:
   
   ```
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   NEXT_PUBLIC_VAULT_ADDRESS=0xYourVaultAddress
   NEXT_PUBLIC_WLFI_ADDRESS=0xYourWLFIAddress
   NEXT_PUBLIC_USD1_ADDRESS=0xYourUSD1Address
   NEXT_PUBLIC_ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your site is live! 🎉

5. **Custom Domain (Optional)**
   - Go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

**Vercel Features**:
- ✅ Automatic deployments on git push
- ✅ Free SSL certificates
- ✅ Global CDN
- ✅ Preview deployments for PRs
- ✅ Analytics built-in

---

### Option 2: Netlify

**Best for**: Alternative to Vercel, drag-and-drop deployment

#### Step-by-Step:

1. **Build the Project**
```bash
npm run build
```

2. **Deploy via Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

3. **Or Deploy via Web Interface**
   - Visit https://netlify.com
   - Drag and drop `.next` folder
   - Configure environment variables in dashboard

4. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18.x

---

### Option 3: AWS Amplify

**Best for**: AWS ecosystem integration

#### Step-by-Step:

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

2. **AWS Amplify Console**
   - Visit AWS Amplify Console
   - Connect repository
   - Configure build settings:
   
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd frontend-v3
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: frontend-v3/.next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Add Environment Variables**
   - In Amplify Console → Environment variables
   - Add all `NEXT_PUBLIC_*` variables

4. **Deploy**
   - Amplify will auto-deploy on git push

---

### Option 4: Self-Hosted VPS

**Best for**: Full control, custom infrastructure

#### Requirements:
- VPS with Node.js 18+
- Nginx or Apache
- PM2 for process management
- SSL certificate (Let's Encrypt)

#### Step-by-Step:

1. **Setup VPS**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx
```

2. **Clone and Build**
```bash
git clone your-repo-url
cd eagle-vault-v3/frontend-v3
npm install
npm run build
```

3. **Create `.env`**
```bash
nano .env
# Add all environment variables
```

4. **Start with PM2**
```bash
pm2 start npm --name "eagle-vault" -- start
pm2 save
pm2 startup
```

5. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/eagle-vault
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/eagle-vault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

7. **Auto-restart on Reboot**
```bash
pm2 startup
pm2 save
```

---

### Option 5: Docker Deployment

**Best for**: Containerized environments, Kubernetes

#### Step-by-Step:

1. **Create Dockerfile**

Create `frontend-v3/Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Add environment variables here or pass at runtime
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""
ENV NEXT_PUBLIC_VAULT_ADDRESS=""
ENV NEXT_PUBLIC_WLFI_ADDRESS=""
ENV NEXT_PUBLIC_USD1_ADDRESS=""

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

2. **Update `next.config.js`**
```javascript
module.exports = {
  output: 'standalone',
  // ... other config
};
```

3. **Build Docker Image**
```bash
docker build -t eagle-vault-v3 .
```

4. **Run Container**
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id \
  -e NEXT_PUBLIC_VAULT_ADDRESS=0x... \
  -e NEXT_PUBLIC_WLFI_ADDRESS=0x... \
  -e NEXT_PUBLIC_USD1_ADDRESS=0x... \
  eagle-vault-v3
```

5. **Docker Compose (Optional)**

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${WALLETCONNECT_ID}
      - NEXT_PUBLIC_VAULT_ADDRESS=${VAULT_ADDRESS}
      - NEXT_PUBLIC_WLFI_ADDRESS=${WLFI_ADDRESS}
      - NEXT_PUBLIC_USD1_ADDRESS=${USD1_ADDRESS}
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

---

## 🔒 Post-Deployment Security

### 1. Environment Variables
- Never commit `.env` files
- Use platform-specific secret management
- Rotate credentials regularly

### 2. CORS Configuration
Configure in `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
      ],
    },
  ];
}
```

### 3. Rate Limiting
Add rate limiting for API routes (if any):
```bash
npm install express-rate-limit
```

### 4. Security Headers
Configure in `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ];
}
```

---

## 📊 Monitoring & Analytics

### 1. Vercel Analytics
```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Google Analytics
```bash
npm install nextjs-google-analytics
```

### 3. Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: ./frontend-v3
        run: npm ci
        
      - name: Build
        working-directory: ./frontend-v3
        run: npm run build
        env:
          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: ${{ secrets.WALLETCONNECT_ID }}
          NEXT_PUBLIC_VAULT_ADDRESS: ${{ secrets.VAULT_ADDRESS }}
          NEXT_PUBLIC_WLFI_ADDRESS: ${{ secrets.WLFI_ADDRESS }}
          NEXT_PUBLIC_USD1_ADDRESS: ${{ secrets.USD1_ADDRESS }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend-v3
```

---

## ✅ Deployment Verification

After deployment, verify:

1. **Wallet Connection**
   - [ ] MetaMask connects
   - [ ] WalletConnect works
   - [ ] Correct network (Arbitrum)

2. **Data Loading**
   - [ ] Prices load from oracles
   - [ ] TVL displays correctly
   - [ ] User balance shows

3. **Transactions**
   - [ ] Deposits work
   - [ ] Withdrawals work
   - [ ] Approvals succeed

4. **Performance**
   - [ ] Page loads < 3 seconds
   - [ ] Images optimized
   - [ ] No console errors

5. **Mobile**
   - [ ] Responsive on phone
   - [ ] Wallet mobile deep-linking works
   - [ ] All features accessible

---

## 🆘 Troubleshooting Deployment

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables Not Working
- Ensure they start with `NEXT_PUBLIC_`
- Restart dev server after changes
- Check platform-specific docs

### 404 on Refresh
Configure rewrites in `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/:path*',
      destination: '/',
    },
  ];
}
```

---

## 📈 Performance Optimization

1. **Enable Edge Runtime** (Vercel)
```typescript
export const runtime = 'edge';
```

2. **Image Optimization**
```typescript
// next.config.js
images: {
  domains: ['your-cdn.com'],
  formats: ['image/avif', 'image/webp'],
}
```

3. **Font Optimization**
Already done with `next/font`

---

## 🎉 Success!

Your Eagle Vault V3 frontend is now live in production!

**Next Steps:**
- Share your URL with users
- Monitor analytics
- Collect feedback
- Plan improvements

---

**Need help?** Check our [SETUP_GUIDE.md](./SETUP_GUIDE.md) or open an issue on GitHub.

