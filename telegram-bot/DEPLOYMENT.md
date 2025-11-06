# 🚀 Deploying Your Telegram Bot 24/7

## Option 1: Railway.app (Easiest - Recommended)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Get $5 free credit

### Step 2: Deploy
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select this repository
5. Railway will auto-detect and deploy!

### Step 3: Add Environment Variables
In Railway dashboard, go to your project → Variables tab:

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
ETHEREUM_RPC_URL=your_rpc_url
UNISWAP_V4_POOL_MANAGER=0x000000000004444c5dc75cB358380D2e3dE08A90
MONITORED_POOLS=your_pool_id
MONITORED_TOKEN=0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E
MIN_BUY_AMOUNT_USD=1
ETHERSCAN_API_KEY=your_key
```

### Step 4: Deploy
- Railway automatically builds and starts your bot
- Bot will restart on crashes
- Logs available in dashboard

**Cost:** $5/month for hobby tier

---

## Option 2: DigitalOcean Droplet (More Control)

### Step 1: Create Droplet
1. Go to https://digitalocean.com
2. Create account (use referral for $200 credit)
3. Create new Droplet:
   - Ubuntu 22.04 LTS
   - Basic plan ($4-6/month)
   - Choose datacenter close to you

### Step 2: SSH into Server
```bash
ssh root@your_droplet_ip
```

### Step 3: Setup Server
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone your repo
git clone your_repo_url
cd telegram-bot

# Install dependencies
npm install

# Copy .env file (manually edit with your values)
nano .env

# Build project
npm run build

# Start with PM2
pm2 start npm --name "eagle-bot" -- start
pm2 save
pm2 startup
```

### Step 4: Keep Running Forever
```bash
# PM2 will auto-restart on crashes
# To update bot:
git pull
npm run build
pm2 restart eagle-bot
```

**Cost:** $4-6/month

---

## Option 3: Render.com (Free Tier Available)

### Step 1: Create Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: New Web Service
1. Click "New +"
2. Select "Web Service"
3. Connect GitHub repo
4. Configure:
   - Name: eagle-bot
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: Free (or $7/month for always-on)

### Step 3: Environment Variables
Add all your environment variables in the dashboard

**Note:** Free tier sleeps after 15 minutes of inactivity

**Cost:** Free (with sleep) or $7/month (always-on)

---

## Option 4: AWS EC2 Free Tier

### Step 1: Launch EC2 Instance
1. Go to AWS Console
2. Launch EC2 instance (t2.micro - free tier)
3. Use Ubuntu 22.04
4. Download .pem key file

### Step 2: Connect
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your_ec2_ip
```

### Step 3: Setup (Same as DigitalOcean)
Follow same steps as DigitalOcean Droplet setup above

**Cost:** Free for 12 months (750 hours/month)

---

## 🔧 Monitoring Your Bot

### Railway/Render
- Built-in logs in dashboard
- Email alerts on crashes

### VPS (DigitalOcean/AWS)
```bash
# View logs
pm2 logs eagle-bot

# Check status
pm2 status

# Restart
pm2 restart eagle-bot

# Stop
pm2 stop eagle-bot
```

---

## 📊 Database Considerations

Your bot uses SQLite (local file database). For cloud deployment:

1. **Railway/Render:** Use persistent volume or PostgreSQL
2. **VPS:** SQLite works fine (file stored on server)

To migrate to PostgreSQL (optional for Railway):
```bash
# Update schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# Add DATABASE_URL to environment variables
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## ✅ Recommended: Railway.app

For your use case, **Railway.app is the easiest**:
- ✅ No server management
- ✅ Auto-deploys from GitHub
- ✅ Built-in monitoring
- ✅ Easy environment variables
- ✅ $5/month
- ✅ Can upgrade anytime

**Get started:** https://railway.app

