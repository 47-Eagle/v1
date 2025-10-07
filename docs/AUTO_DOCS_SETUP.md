# 🤖 Automatic Documentation Updates Setup

This guide explains how to set up automatic documentation updates to https://docs.47eagle.com/team/Updates/Smart-Contracts whenever you push commits.

## 📋 Overview

When you push commits to the `main` or `master` branch, GitHub Actions will automatically:

1. ✅ Generate contract documentation from Solidity files
2. ✅ Create update logs from git commits
3. ✅ Generate statistics and metrics
4. ✅ Create a beautiful index page
5. ✅ Deploy to your docs site at https://docs.47eagle.com

## 🚀 Quick Setup

### Step 1: Choose Your Deployment Method

The workflow supports **4 deployment methods**. Choose the one that fits your docs hosting:

#### Option 1: Separate Docs Repository (Recommended)
If your docs are in a separate GitHub repository:

```bash
# In GitHub, go to: Settings → Secrets and variables → Actions → New repository secret

Name: DOCS_REPO_URL
Value: github.com/your-org/docs-repo.git

Name: DOCS_DEPLOY_TOKEN
Value: ghp_your_personal_access_token_here
```

#### Option 2: GitHub Pages
If using GitHub Pages on this repo:

```bash
# Set environment variable in workflow (no secrets needed)
# Edit .github/workflows/update-docs.yml and uncomment the GitHub Pages section
```

#### Option 3: FTP/SFTP Deploy
If your docs are on a web server:

```bash
# Add these secrets:
FTP_SERVER=docs.47eagle.com
FTP_USERNAME=your_ftp_username
FTP_PASSWORD=your_ftp_password
```

#### Option 4: Webhook/API
If you have a custom API endpoint:

```bash
# Add these secrets:
DOCS_UPDATE_WEBHOOK=https://your-api.com/webhook
DOCS_UPDATE_SECRET=your_webhook_secret_key
```

### Step 2: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click **Actions** tab
3. If prompted, click **Enable GitHub Actions**
4. The workflow will run automatically on next push

### Step 3: Test It

```bash
# Make a test commit
git add .
git commit -m "test: Testing automatic docs update"
git push origin main

# Check Actions tab on GitHub to see the workflow run
```

## 📝 Configuration Details

### Option 1: Separate Docs Repository (Detailed)

This is ideal if you have a dedicated documentation repository.

#### 1. Create a Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Give it a name: `Docs Deploy Token`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Click **Generate token**
6. **Copy the token immediately** (you won't see it again!)

#### 2. Add Token to Repository Secrets

```bash
# In your eagle-ovault-clean repository:
# Settings → Secrets and variables → Actions → New repository secret

Name: DOCS_DEPLOY_TOKEN
Value: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 3. Add Docs Repository URL

```bash
Name: DOCS_REPO_URL  
Value: github.com/47eagle/docs-site.git
```

#### 4. Edit Workflow File

In `.github/workflows/update-docs.yml`, ensure this section is enabled:

```yaml
env:
  DOCS_REPO_URL: ${{ secrets.DOCS_REPO_URL }}
  DOCS_DEPLOY_TOKEN: ${{ secrets.DOCS_DEPLOY_TOKEN }}
```

### Option 2: GitHub Pages (Detailed)

#### 1. Enable GitHub Pages

1. Go to repository Settings → Pages
2. Source: **GitHub Actions**
3. Save

#### 2. Update Workflow

In `.github/workflows/update-docs.yml`, set:

```yaml
env:
  USE_GITHUB_PAGES: 'true'
```

#### 3. Access Your Docs

After the workflow runs, docs will be at:
```
https://your-username.github.io/eagle-ovault-clean/team/Updates/Smart-Contracts/
```

### Option 3: FTP/SFTP Deploy (Detailed)

#### 1. Add FTP Credentials as Secrets

```bash
FTP_SERVER=docs.47eagle.com
FTP_USERNAME=docs_deploy_user
FTP_PASSWORD=your_secure_password
```

#### 2. Update Workflow

In `.github/workflows/update-docs.yml`, set:

```yaml
env:
  FTP_SERVER: ${{ secrets.FTP_SERVER }}
```

The files will be uploaded to `/team/Updates/Smart-Contracts/` on your server.

### Option 4: Custom Webhook/API (Detailed)

#### 1. Add Webhook URL and Secret

```bash
DOCS_UPDATE_WEBHOOK=https://api.47eagle.com/docs/webhook
DOCS_UPDATE_SECRET=your_webhook_signing_secret
```

#### 2. Webhook Payload Format

Your webhook will receive:

```json
{
  "event": "documentation_update",
  "timestamp": "2025-10-07T12:00:00.000Z",
  "repository": "eagle-ovault-clean",
  "commits": 15,
  "latest_commit": {
    "hash": "abc123...",
    "author": "Your Name",
    "message": "feat: Added vault injection"
  },
  "summary": [
    { "category": "✨ Features", "count": 5 },
    { "category": "🐛 Bug Fixes", "count": 3 }
  ]
}
```

## 📂 Generated Files

After running, these files are created:

```
docs-export/team/Updates/Smart-Contracts/
├── index.html                          # Beautiful landing page
├── README.md                           # Markdown index
├── CONTRACT_DOCUMENTATION.md           # Full contract docs
├── UPDATES.md                          # Changelog from git
├── UPDATE_SUMMARY.md                   # Summary of changes
├── CONTRACT_STATS.md                   # Statistics
├── VAULT_INJECTION_IMPLEMENTATION.md   # Vault guide
├── VAULT_INJECTION_QUICK_REFERENCE.md  # Quick reference
├── feed.json                           # JSON feed
├── contract-metadata.json              # Machine-readable metadata
└── webhook-payload.json                # Webhook data
```

## 🎨 Customization

### Change Update Frequency

Edit `.github/workflows/update-docs.yml`:

```yaml
on:
  push:
    branches:
      - main
  schedule:
    # Run daily at midnight UTC
    - cron: '0 0 * * *'
```

### Filter Which Files Trigger Updates

```yaml
on:
  push:
    paths:
      - 'contracts/**'           # Only contract changes
      - 'docs/**'               # Or doc changes
      - '!contracts/mocks/**'   # Except mocks
```

### Customize Commit Categories

Edit `scripts/generate-update-log.js`:

```javascript
function categorizeCommit(message) {
    const lower = message.toLowerCase();
    
    // Add your own categories
    if (lower.includes('vault')) {
        return { category: '💰 Vault Updates', emoji: '💰' };
    }
    // ... existing categories
}
```

### Modify Documentation Style

Edit `scripts/create-docs-index.js` to customize:
- Colors and branding
- Layout and structure
- Links and navigation
- Additional sections

## 🔍 Troubleshooting

### Workflow Fails with "Permission Denied"

**Solution:** Check that your Personal Access Token has `repo` and `workflow` scopes.

### Docs Not Updating on Website

**Solution:** 
1. Check GitHub Actions tab for errors
2. Verify secrets are set correctly
3. Check FTP credentials if using FTP deploy
4. Ensure webhook URL is accessible if using webhook

### "No commits found" Error

**Solution:** Ensure you have git history:
```bash
git fetch --unshallow  # If shallow clone
git log  # Verify commits exist
```

### Files Not Appearing in Correct Location

**Solution:** Check the `destination_dir` or `server-dir` in the workflow matches your docs structure.

## 📊 Monitoring

### View Workflow Runs

1. Go to repository → Actions tab
2. Click on "Update Documentation"
3. See run history and logs

### Set Up Notifications

GitHub → Settings → Notifications → Actions:
- ✅ Email me when workflow fails
- ✅ Email me when workflow succeeds (optional)

## 🔐 Security Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Limit token scope** - Only grant necessary permissions
3. **Rotate tokens periodically** - Update every 90 days
4. **Use environment-specific secrets** - Different tokens for production vs staging
5. **Review workflow logs** - Check for sensitive data before sharing

## 📞 Support

If you encounter issues:

1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Review workflow logs in the Actions tab
3. Ensure all secrets are properly configured
4. Test with a simple commit message

## 🎉 Success!

Once set up, every commit will automatically:

✅ Generate fresh documentation  
✅ Create update logs  
✅ Deploy to https://docs.47eagle.com/team/Updates/Smart-Contracts  
✅ Keep your docs synchronized  

**No manual work required!** 🚀

---

**Next Steps:**
1. Choose your deployment method above
2. Add the required secrets
3. Push a commit
4. Watch the magic happen! ✨

