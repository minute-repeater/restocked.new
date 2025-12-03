#!/bin/bash
# Script to push restocked-now monorepo to GitHub

echo "═══════════════════════════════════════════════════════════════"
echo "Push Restocked.now Monorepo to GitHub"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if remote already exists
if git remote get-url origin 2>/dev/null; then
  echo "⚠️  Remote 'origin' already exists:"
  git remote -v
  echo ""
  read -p "Do you want to update it? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter your GitHub username:"
    read GITHUB_USERNAME
    git remote set-url origin https://github.com/$GITHUB_USERNAME/restocked-now.git
  else
    echo "Using existing remote"
    GITHUB_USERNAME=$(git remote get-url origin | sed -n 's|.*github.com/\([^/]*\)/.*|\1|p')
  fi
else
  echo "Enter your GitHub username:"
  read GITHUB_USERNAME
  git remote add origin https://github.com/$GITHUB_USERNAME/restocked-now.git
fi

echo ""
echo "📦 Repository: https://github.com/$GITHUB_USERNAME/restocked-now"
echo ""
echo "🚀 Pushing to GitHub..."
echo ""

# Ensure we're on main branch
git branch -M main

# Push
if git push -u origin main; then
  echo ""
  echo "✅ Successfully pushed to GitHub!"
  echo ""
  echo "Repository URL: https://github.com/$GITHUB_USERNAME/restocked-now"
  echo ""
  echo "Next steps:"
  echo "1. Verify on GitHub: https://github.com/$GITHUB_USERNAME/restocked-now"
  echo "2. Check that you see: landing/, frontend/, src/, etc."
  echo "3. Connect to Vercel using VERCEL_SETUP.md instructions"
else
  echo ""
  echo "❌ Push failed. Common solutions:"
  echo ""
  echo "Option 1: Use GitHub CLI"
  echo "  gh auth login"
  echo "  git push -u origin main"
  echo ""
  echo "Option 2: Use Personal Access Token"
  echo "  1. Go to: https://github.com/settings/tokens"
  echo "  2. Generate new token with 'repo' scope"
  echo "  3. Use token as password when prompted"
  echo ""
  echo "Option 3: Use SSH"
  echo "  git remote set-url origin git@github.com:$GITHUB_USERNAME/restocked-now.git"
  echo "  git push -u origin main"
fi
