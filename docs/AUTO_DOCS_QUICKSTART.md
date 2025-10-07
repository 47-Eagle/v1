# 🚀 Auto-Docs Quick Start Guide

Get your automatic documentation updates running in **5 minutes**!

## ⚡ Super Quick Setup

### 1. Choose Your Method

Pick the easiest option for your setup:

```bash
# Option A: Using a separate docs repository (RECOMMENDED)
# ✅ Best for existing documentation sites
# ✅ Clean separation of code and docs
# ⏱️  Setup time: 3 minutes

# Option B: Using GitHub Pages
# ✅ Free hosting by GitHub
# ✅ No additional services needed  
# ⏱️  Setup time: 2 minutes

# Option C: Using FTP/SFTP
# ✅ Direct upload to your server
# ✅ Works with any web host
# ⏱️  Setup time: 3 minutes

# Option D: Using a webhook/API
# ✅ Full control over deployment
# ✅ Integrate with your custom system
# ⏱️  Setup time: 5 minutes
```

### 2. Add Required Secrets

**For Option A (Separate Docs Repository):**

```bash
# Go to: GitHub repo → Settings → Secrets → Actions → New secret

# Secret 1:
Name: DOCS_DEPLOY_TOKEN
Value: <your GitHub personal access token>

# Secret 2:
Name: DOCS_REPO_URL
Value: github.com/47eagle/docs-site.git
```

**For Option B (GitHub Pages):**
No secrets needed! Just enable GitHub Pages in repo settings.

**For Option C (FTP):**

```bash
# Add these secrets:
FTP_SERVER=docs.47eagle.com
FTP_USERNAME=your_username
FTP_PASSWORD=your_password
```

**For Option D (Webhook):**

```bash
DOCS_UPDATE_WEBHOOK=https://your-api.com/webhook
DOCS_UPDATE_SECRET=your_secret_key
```

### 3. Push a Commit

```bash
git add .
git commit -m "feat: Added vault injection feature"
git push origin main
```

### 4. Watch It Work! 🎉

1. Go to your repo → **Actions** tab
2. You'll see "Update Documentation" running
3. Wait ~1-2 minutes
4. Visit: **https://docs.47eagle.com/team/Updates/Smart-Contracts**

That's it! 🎊

## 🧪 Test Locally First

Before pushing, test the documentation generation:

```bash
# Generate documentation locally
npm run docs:generate

# Preview in browser (Mac/Linux)
npm run docs:preview

# Or manually open:
open docs-export/team/Updates/Smart-Contracts/index.html
```

## 📝 What Gets Generated

Every time you push:

```
✅ Contract Documentation (all contracts with functions/events)
✅ Latest Updates (changelog from your commits)
✅ Statistics (metrics about your contracts)
✅ Vault Guides (implementation + quick reference)
✅ Beautiful Index Page (landing page for all docs)
✅ JSON Feed (for integrations)
```

## 🎯 Where Files Go

Files are deployed to:

```
https://docs.47eagle.com/team/Updates/Smart-Contracts/
├── index.html              ← Main landing page
├── CONTRACT_DOCUMENTATION.md
├── UPDATES.md
├── CONTRACT_STATS.md
├── VAULT_INJECTION_IMPLEMENTATION.md
├── VAULT_INJECTION_QUICK_REFERENCE.md
└── feed.json
```

## 🔧 Common Issues & Fixes

### ❌ "Workflow not running"

**Fix:** Enable GitHub Actions in repo settings

### ❌ "Permission denied"

**Fix:** Check your Personal Access Token has `repo` scope

### ❌ "Files not showing up"

**Fix:** 
1. Check Actions tab for errors
2. Verify secrets are correct
3. Wait a few minutes for deployment

### ❌ "No commits found"

**Fix:** You need at least one commit in your repo

## 📖 Need More Details?

See the full setup guide: [AUTO_DOCS_SETUP.md](./AUTO_DOCS_SETUP.md)

## 💡 Pro Tips

1. **Use conventional commits** for better changelogs:
   ```bash
   feat: Add new feature
   fix: Fix a bug
   docs: Update documentation
   test: Add tests
   refactor: Refactor code
   ```

2. **Test locally** before pushing:
   ```bash
   npm run docs:generate
   ```

3. **Monitor the Actions** tab to catch issues early

4. **Customize the workflow** in `.github/workflows/update-docs.yml`

## 🎨 Customize

Want to change the look or add sections?

```javascript
// Edit these files:
scripts/create-docs-index.js     // Index page styling
scripts/generate-contract-docs.js // Contract docs format
scripts/generate-update-log.js    // Update log categories
```

## 🆘 Need Help?

1. Check [AUTO_DOCS_SETUP.md](./AUTO_DOCS_SETUP.md) for detailed instructions
2. Review the workflow logs in GitHub Actions
3. Ensure all secrets are properly set

## ✨ Enjoy Automated Docs!

Now every commit automatically updates your documentation at **https://docs.47eagle.com** 🚀

No more manual work needed!

