# 🤖 Automatic Documentation System

## 🎯 TL;DR

Every time you **push a commit**, documentation automatically updates at:
**https://docs.47eagle.com/team/Updates/Smart-Contracts**

## ⚡ 30-Second Setup

1. **Add secrets to GitHub** (Settings → Secrets → Actions):
   ```
   DOCS_DEPLOY_TOKEN=<your-github-token>
   DOCS_REPO_URL=github.com/47eagle/docs-site.git
   ```

2. **Push a commit**:
   ```bash
   git add .
   git commit -m "docs: Testing auto-docs"
   git push
   ```

3. **Done!** Check the Actions tab to see it working.

## 📚 Documentation Files

- 🚀 **[Quick Start](./AUTO_DOCS_QUICKSTART.md)** - 5-minute setup
- 📖 **[Full Setup Guide](./AUTO_DOCS_SETUP.md)** - Detailed instructions
- 📋 **[Summary](./AUTO_DOCS_SUMMARY.md)** - What's included

## 🧪 Test Locally

```bash
# Generate docs locally
npm run docs:generate

# Preview
open docs-export/team/Updates/Smart-Contracts/index.html
```

## 📦 What Gets Generated

- ✅ Contract documentation (auto-extracted from code)
- ✅ Update logs (from git commits)
- ✅ Statistics dashboard
- ✅ Vault implementation guides
- ✅ Beautiful landing page
- ✅ JSON feed for integrations

## 🔧 Files Created

### Workflow
- `.github/workflows/update-docs.yml` - GitHub Actions workflow

### Scripts
- `scripts/generate-contract-docs.js` - Extract contract info
- `scripts/generate-update-log.js` - Create changelog
- `scripts/create-docs-index.js` - Build landing page

### Docs
- `docs/AUTO_DOCS_QUICKSTART.md` - Quick start
- `docs/AUTO_DOCS_SETUP.md` - Full guide
- `docs/AUTO_DOCS_SUMMARY.md` - Summary

## 🎨 Output Structure

```
docs.47eagle.com/team/Updates/Smart-Contracts/
├── index.html                          # Landing page
├── CONTRACT_DOCUMENTATION.md           # All contracts
├── UPDATES.md                          # Changelog
├── CONTRACT_STATS.md                   # Statistics
├── VAULT_INJECTION_IMPLEMENTATION.md   # Vault guide
├── VAULT_INJECTION_QUICK_REFERENCE.md  # Quick ref
└── feed.json                           # JSON feed
```

## 🚀 Deployment Options

Choose one:

1. **Separate Docs Repo** - Best for existing docs site
2. **GitHub Pages** - Free hosting, 2-minute setup
3. **FTP/SFTP** - Direct upload to your server
4. **Webhook/API** - Custom integration

Details in [AUTO_DOCS_SETUP.md](./AUTO_DOCS_SETUP.md)

## 💡 Features

- ✨ Automatic on every push
- 📝 Extracts info from Solidity contracts
- 🏷️ Categorizes commits (features, fixes, etc.)
- 📊 Generates statistics
- 🎨 Beautiful HTML landing page
- 📡 JSON feed for integrations
- 🔄 Works with any git workflow

## 🎯 Next Steps

1. Read [AUTO_DOCS_QUICKSTART.md](./AUTO_DOCS_QUICKSTART.md)
2. Add your deployment secrets
3. Push a commit
4. Enjoy automatic docs! 🎉

## 📞 Need Help?

Check the troubleshooting sections in:
- [AUTO_DOCS_QUICKSTART.md](./AUTO_DOCS_QUICKSTART.md)
- [AUTO_DOCS_SETUP.md](./AUTO_DOCS_SETUP.md)

---

**Made with ❤️ for 47 Eagle**

