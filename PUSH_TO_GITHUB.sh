#!/bin/bash
# Safe GitHub push script - uses HTTPS with token support

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "GitHub Repository Push Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if remote exists
if git remote get-url origin &>/dev/null; then
  echo "⚠️  Remote 'origin' already exists:"
  git remote get-url origin
  read -p "Do you want to update it? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Get GitHub username
if [ -z "$GITHUB_USERNAME" ]; then
  read -p "Enter your GitHub username: " GITHUB_USERNAME
fi

if [ -z "$GITHUB_USERNAME" ]; then
  echo "❌ GitHub username is required"
  exit 1
fi

REPO_NAME="restocked-now"
REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo ""
echo "Repository URL: ${REPO_URL}"
echo ""

# Check if repo exists (optional - just a warning)
echo "⚠️  Make sure you've created the repo at:"
echo "   https://github.com/new"
echo "   Name: ${REPO_NAME}"
echo "   Public, no README/gitignore/license"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Add/update remote
echo ""
echo "📡 Configuring remote..."
if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$REPO_URL"
  echo "✅ Updated remote 'origin'"
else
  git remote add origin "$REPO_URL"
  echo "✅ Added remote 'origin'"
fi

# Ensure we're on main branch
echo ""
echo "🌿 Ensuring branch is 'main'..."
git branch -M main

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo ""
  echo "⚠️  You have uncommitted changes:"
  git status --short
  echo ""
  read -p "Commit these changes before pushing? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add -A
    git commit -m "Add helper scripts and finalize for GitHub push"
    echo "✅ Changes committed"
  fi
fi

# Push
echo ""
echo "🚀 Pushing to GitHub..."
echo ""
echo "💡 If prompted for credentials:"
echo "   Username: ${GITHUB_USERNAME}"
echo "   Password: Use a Personal Access Token (not your GitHub password)"
echo "   Create token: https://github.com/settings/tokens"
echo "   Required scope: 'repo'"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "✅ SUCCESS! Repository pushed to GitHub"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "Repository URL: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
  echo ""
  echo "Next steps:"
  echo "1. Verify files on GitHub: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
  echo "2. Connect to Vercel:"
  echo "   - Landing: Root Directory = 'landing'"
  echo "   - Frontend: Root Directory = 'frontend'"
  echo "3. Update Railway backend env vars with Vercel URLs"
else
  echo ""
  echo "❌ Push failed. Common issues:"
  echo "   1. Repository doesn't exist - create it at https://github.com/new"
  echo "   2. Authentication failed - use Personal Access Token"
  echo "   3. Network issue - check internet connection"
  exit 1
fi
