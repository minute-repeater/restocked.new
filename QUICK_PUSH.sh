#!/bin/bash
# Quick push script - assumes repo already exists on GitHub

echo "Enter your GitHub username:"
read GITHUB_USERNAME

echo ""
echo "Adding remote and pushing..."
git remote add origin https://github.com/$GITHUB_USERNAME/restocked-now.git 2>/dev/null || \
  git remote set-url origin https://github.com/$GITHUB_USERNAME/restocked-now.git

git branch -M main

echo ""
echo "Pushing to GitHub..."
if git push -u origin main; then
  echo ""
  echo "✅ Successfully pushed!"
  echo ""
  echo "Repository: https://github.com/$GITHUB_USERNAME/restocked-now"
else
  echo ""
  echo "❌ Push failed. Try:"
  echo "  1. Ensure repo exists: https://github.com/new"
  echo "  2. Use Personal Access Token as password"
  echo "  3. Or run: gh auth login (then retry)"
fi
