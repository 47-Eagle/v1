# ⚡ Quick Command Reference

## 🚀 Getting Started

```bash
# Navigate to frontend
cd frontend-v3

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 🎉

---

## 🔧 Setup Commands

### First Time Setup
```bash
# Copy environment template (already done)
# cp .env.example .env

# Edit .env file
nano .env
# or
code .env
```

Add your WalletConnect Project ID from https://cloud.walletconnect.com/

---

## 💻 Development Commands

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm run start

# Run linter
npm run lint

# Show setup instructions
npm run setup
```

---

## 🚢 Deployment Commands

### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
# or
npm run deploy
```

### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
# or
npm run deploy:netlify
```

### Docker
```bash
# Build image
docker build -t eagle-vault-v3 .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id \
  eagle-vault-v3
```

---

## 🧹 Cleanup Commands

```bash
# Remove node_modules and package-lock
rm -rf node_modules package-lock.json

# Clean Next.js cache
rm -rf .next

# Fresh install
npm install

# Full cleanup and reinstall
rm -rf node_modules package-lock.json .next && npm install
```

---

## 🔍 Testing Commands

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check for outdated packages
npm outdated

# Update packages
npm update

# Audit security
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## 📦 Build & Deploy Pipeline

### Local Testing
```bash
npm install
npm run dev
# Test at http://localhost:3000
```

### Production Build
```bash
npm run build
npm run start
# Test production build locally
```

### Deploy
```bash
git add .
git commit -m "Deploy Eagle Vault V3"
git push origin main
# Then deploy via Vercel/Netlify dashboard
```

---

## 🎯 One-Liners

### Complete Setup
```bash
cd frontend-v3 && npm install && npm run dev
```

### Fresh Install
```bash
rm -rf node_modules .next && npm install && npm run dev
```

### Build and Test Production
```bash
npm run build && npm run start
```

### Git + Deploy
```bash
git add . && git commit -m "Update" && git push && vercel --prod
```

---

## 📝 Environment Setup

### Set WalletConnect ID (Linux/Mac)
```bash
export NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
npm run dev
```

### Set WalletConnect ID (Windows)
```powershell
set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
npm run dev
```

---

## 🔗 Useful URLs

- **Local Dev**: http://localhost:3000
- **WalletConnect**: https://cloud.walletconnect.com/
- **Vercel Deploy**: https://vercel.com/new
- **Netlify Deploy**: https://app.netlify.com/
- **Arbiscan**: https://arbiscan.io

---

## 🆘 Quick Fixes

### Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# or use different port
PORT=3001 npm run dev
```

### Module not found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build errors
```bash
rm -rf .next
npm run build
```

### Git issues
```bash
git reset --hard HEAD
git clean -fd
```

---

## 💡 Pro Tips

```bash
# Run in background
npm run dev &

# Run with specific port
PORT=3001 npm run dev

# Run with more memory (if needed)
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Watch for file changes
npm run dev -- --turbo

# Production preview with environment file
npm run build && npm run start
```

---

## 📋 Pre-Deploy Checklist Commands

```bash
# 1. Check for errors
npm run lint

# 2. Build test
npm run build

# 3. Type check
npx tsc --noEmit

# 4. Security audit
npm audit

# 5. All clear? Deploy!
npm run deploy
```

---

That's it! Use these commands to manage your Eagle Vault V3 frontend. 🦅

