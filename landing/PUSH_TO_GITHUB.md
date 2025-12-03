# Push to GitHub - Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `restocked-landing`
3. Description: "Landing page for Restocked.now - Product tracking and alert service"
4. Make it **Public**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Push Code

After creating the repository, GitHub will show you commands. Use these:

```bash
cd landing
git remote add origin https://github.com/YOUR_USERNAME/restocked-landing.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Verify

After pushing, verify:
- All files are in the repository
- `dist/` folder is NOT in the repo (it's in .gitignore)
- `node_modules/` is NOT in the repo (it's in .gitignore)
- `package.json`, `vite.config.ts`, `index.html` are present
- `src/` folder with all components is present

## Repository URL

After pushing, your repository will be at:
**https://github.com/YOUR_USERNAME/restocked-landing**

