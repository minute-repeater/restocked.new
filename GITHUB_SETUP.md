# GitHub Repository Setup

## Repository Information

**Repository Name:** `restocked-now`  
**Description:** "Restocked.now – landing, app frontend, and backend"  
**Visibility:** Public

## Create Repository

1. Go to **https://github.com/new**
2. **Repository name:** `restocked-now`
3. **Description:** "Restocked.now – landing, app frontend, and backend"
4. **Visibility:** Public
5. **⚠️ IMPORTANT:** Do NOT initialize with:
   - README
   - .gitignore
   - License
   
   (We already have these in the local repo)

6. Click **"Create repository"**

## Push Code

After creating the repository, run these commands from the project root:

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/restocked-now.git

# Ensure we're on main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## Verify Repository Structure

After pushing, verify on GitHub that the repository shows:

```
restocked-now/
├── landing/          ✅ Marketing site
├── frontend/         ✅ App dashboard
├── src/              ✅ Backend API
├── db/               ✅ Database migrations
├── scripts/          ✅ Utility scripts
├── README.md         ✅ Main documentation
├── DEPLOYMENT.md     ✅ Deployment guide
├── VERCEL_SETUP.md   ✅ Vercel instructions
├── package.json      ✅ Root package.json
└── .gitignore        ✅ Git ignore rules
```

## Authentication

If push fails due to authentication:

### Option 1: Use GitHub CLI
```bash
gh auth login
git push -u origin main
```

### Option 2: Use Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` scope
3. Use token as password when prompted:
   ```bash
   git push -u origin main
   # Username: YOUR_USERNAME
   # Password: YOUR_TOKEN
   ```

### Option 3: Use SSH
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/restocked-now.git
git push -u origin main
```

## Repository URL

After successful push:
**https://github.com/YOUR_USERNAME/restocked-now**

---

**Status:** ✅ Ready to push  
**Last Updated:** 2025-12-03

