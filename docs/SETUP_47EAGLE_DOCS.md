# 🦅 Setup Guide for 47 Eagle Docs Repository

## 🎯 Goal
Auto-deploy documentation to: `https://github.com/47-Eagle/docs` → `https://docs.47eagle.com/team/Updates/Smart-Contracts`

## 🔐 Step 1: Create Personal Access Token

Since deploy keys are disabled, you'll need a Personal Access Token (PAT).

### 1.1 Create the Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Fill out the form:
   ```
   Note: Eagle Documentation Deploy Token
   Expiration: 90 days (you can extend later)
   
   Select scopes:
   ✅ repo (Full control of private repositories)
      ✅ repo:status
      ✅ repo_deployment  
      ✅ public_repo
      ✅ repo:invite
   ✅ workflow (Update GitHub Action workflows)
   ```
4. Click **"Generate token"**
5. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 1.2 Save the Token
Store it somewhere safe temporarily - you'll need it in the next step.

## 🔧 Step 2: Add Secrets to This Repository

Go to your `eagle-ovault-clean` repository on GitHub:

1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**

### Add Secret 1:
```
Name: DOCS_DEPLOY_TOKEN
Value: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
(Paste the token you just created)

### Add Secret 2:
```
Name: DOCS_REPO_URL  
Value: github.com/47-Eagle/docs.git
```

## ✅ Step 3: Verify Workflow Configuration

The workflow is already configured for your setup! It will:

1. ✅ Clone your docs repo using the token
2. ✅ Copy files to `team/Updates/Smart-Contracts/`
3. ✅ Commit and push changes
4. ✅ Create deployment summary

## 🧪 Step 4: Test the Setup

### 4.1 Test Locally First
```bash
cd /home/akitav2/eagle-ovault-clean

# Generate docs locally to verify everything works
npm run docs:generate

# Check what was created
ls -la docs-export/team/Updates/Smart-Contracts/
```

### 4.2 Test the Full Workflow
```bash
# Make a test commit
git add .
git commit -m "docs: Testing automatic deployment to 47-Eagle/docs"
git push origin main
```

### 4.3 Monitor the Deployment
1. Go to your **eagle-ovault-clean** repository
2. Click the **Actions** tab
3. You should see "Update Documentation" workflow running
4. Click on it to see the progress

## 📂 Expected File Structure in Docs Repo

After successful deployment, your `47-Eagle/docs` repo will have:

```
47-Eagle/docs/
└── team/
    └── Updates/
        └── Smart-Contracts/
            ├── index.html                          # Landing page
            ├── README.md                           # Markdown index
            ├── CONTRACT_DOCUMENTATION.md           # All contracts
            ├── UPDATES.md                          # Changelog
            ├── UPDATE_SUMMARY.md                   # Summary
            ├── CONTRACT_STATS.md                   # Statistics
            ├── VAULT_INJECTION_IMPLEMENTATION.md   # Implementation guide
            ├── VAULT_INJECTION_QUICK_REFERENCE.md  # Quick reference
            ├── feed.json                           # JSON feed
            ├── contract-metadata.json              # Machine-readable data
            └── webhook-payload.json                # Webhook data
```

## 🌐 Accessing the Documentation

Once deployed, your documentation will be available at:
- **GitHub**: https://github.com/47-Eagle/docs/tree/main/team/Updates/Smart-Contracts
- **Website**: https://docs.47eagle.com/team/Updates/Smart-Contracts (if your docs site is configured)

## 🔍 Troubleshooting

### ❌ "Authentication failed"
**Fix**: Check that your Personal Access Token:
- Has `repo` and `workflow` scopes
- Hasn't expired
- Is correctly copied (no extra spaces)

### ❌ "Repository not found" 
**Fix**: Verify the DOCS_REPO_URL secret is exactly:
```
github.com/47-Eagle/docs.git
```

### ❌ "Permission denied"
**Fix**: Make sure the token owner has write access to the docs repository

### ❌ Workflow doesn't trigger
**Fix**: 
- Check that GitHub Actions is enabled on your repo
- Verify the workflow file is in `.github/workflows/update-docs.yml`
- Make sure you're pushing to `main` or `master` branch

## 🔄 Future Maintenance

### Token Expiration
Your token will expire in 90 days. To renew:
1. Go to GitHub Settings → Personal access tokens
2. Find "Eagle Documentation Deploy Token"
3. Click "Regenerate token"
4. Update the `DOCS_DEPLOY_TOKEN` secret with the new value

### Changing Repository
If you need to deploy to a different repository:
1. Update the `DOCS_REPO_URL` secret
2. Ensure the new repository exists and you have write access
3. The token must have access to the new repository

## 📊 What Happens on Each Push

Every time you push changes to contracts or docs:

1. ✅ **Triggers**: Workflow detects changes
2. ✅ **Generates**: Creates fresh documentation 
3. ✅ **Clones**: Downloads your docs repository
4. ✅ **Updates**: Copies new files to `team/Updates/Smart-Contracts/`
5. ✅ **Commits**: Creates a commit with timestamp
6. ✅ **Pushes**: Uploads changes to your docs repo
7. ✅ **Notifies**: Shows success/failure in Actions tab

## 🎨 Customization

### Change the Target Directory
Edit `.github/workflows/update-docs.yml`:
```yaml
# Change this line:
mkdir -p docs-repo/team/Updates/Smart-Contracts

# To your preferred path:
mkdir -p docs-repo/your/preferred/path
```

### Modify Commit Messages
Edit the commit message in the workflow:
```yaml
git commit -m "🤖 Auto-update: Smart Contract docs (${{ steps.generate_log.outputs.timestamp }})"

# Change to:
git commit -m "📝 Updated smart contract documentation"
```

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ GitHub Actions shows green checkmark
2. ✅ New commit appears in 47-Eagle/docs repository
3. ✅ Files exist at `team/Updates/Smart-Contracts/`
4. ✅ Timestamp in commit message matches your push time
5. ✅ Documentation is accessible at your docs URL

## 📞 Need Help?

If you encounter issues:

1. **Check the Actions tab** for detailed error logs
2. **Verify secrets** are set correctly (no typos)
3. **Test token permissions** by manually cloning the repo:
   ```bash
   git clone https://YOUR_TOKEN@github.com/47-Eagle/docs.git test-clone
   ```
4. **Review workflow logs** for specific error messages

## 🚀 Ready to Deploy!

Your setup is ready! Just:

1. ✅ Create Personal Access Token (with `repo` + `workflow` scopes)
2. ✅ Add `DOCS_DEPLOY_TOKEN` and `DOCS_REPO_URL` secrets
3. ✅ Push a commit
4. ✅ Watch it deploy to https://github.com/47-Eagle/docs! 🎊

---

**Next Steps:**
- Test with `npm run docs:generate` locally
- Push a commit and check the Actions tab
- Verify files appear in your docs repository
- Share the documentation URL with your team! 🦅
