#!/bin/bash
# Simple script to push to GitHub (assumes repo already created)

echo "═══════════════════════════════════════════════════════════════"
echo "Push Restocked.now to GitHub"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Get GitHub username
if command -v gh &> /dev/null && gh auth status &> /dev/null; then
  GITHUB_USER=$(gh api user --jq .login)
  echo "✅ Detected GitHub username: $GITHUB_USER"
else
  echo "Enter your GitHub username:"
  read GITHUB_USER
fi

echo ""
echo "Repository will be: https://github.com/$GITHUB_USER/restocked-now"
echo ""

# Check if repo exists
if git ls-remote "https://github.com/$GITHUB_USER/restocked-now.git" &> /dev/null; then
  echo "✅ Repository exists on GitHub"
else
  echo "⚠️  Repository not found on GitHub"
  echo ""
  echo "Please create it first:"
  echo "  1. Go to: https://github.com/new"
  echo "  2. Name: restocked-now"
  echo "  3. Description: Restocked.now – landing, app frontend, and backend"
  echo "  4. Public, no README"
  echo "  5. Click 'Create repository'"
  echo ""
  read -p "Press Enter after creating the repository..."
fi

echo ""
echo "Adding remote..."
git remote add origin "https://github.com/$GITHUB_USER/restocked-now.git" 2>/dev/null || \
  git remote set-url origin "https://github.com/$GITHUB_USER/restocked-now.git"

echo "Setting branch to main..."
git branch -M main

echo ""
echo "Pushing to GitHub..."
if git push -u origin main; then
  echo ""
  echo "✅ Successfully pushed!"
  echo ""
  echo "Repository URL: https://github.com/$GITHUB_USER/restocked-now"
  echo ""
  echo "Verify on GitHub that you see:"
  echo "  - landing/ folder"
  echo "  - frontend/ folder"
  echo "  - src/ folder"
  echo "  - README.md"
else
  echo ""
  echo "❌ Push failed"
  echo ""
  echo "Solutions:"
  echo "  1. Use Personal Access Token as password"
  echo "     Create at: https://github.com/settings/tokens"
  echo "  2. Or authenticate GitHub CLI:"
  echo "     gh auth login"
  echo "     Then run this script again"
fi
