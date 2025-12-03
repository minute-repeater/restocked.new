#!/bin/bash
# Script to set up GitHub repository for restocked-landing

echo "═══════════════════════════════════════════════════════════════"
echo "GitHub Repository Setup for restocked-landing"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Step 1: Create repository on GitHub"
echo "  1. Go to: https://github.com/new"
echo "  2. Repository name: restocked-landing"
echo "  3. Make it Public"
echo "  4. DO NOT initialize with README"
echo "  5. Click 'Create repository'"
echo ""
read -p "Press Enter after you've created the repository..."
echo ""
echo "Step 2: Enter your GitHub username:"
read GITHUB_USERNAME
echo ""
echo "Step 3: Pushing to GitHub..."
git remote add origin https://github.com/$GITHUB_USERNAME/restocked-landing.git 2>/dev/null || git remote set-url origin https://github.com/$GITHUB_USERNAME/restocked-landing.git
git push -u origin main
echo ""
echo "✅ Done! Repository: https://github.com/$GITHUB_USERNAME/restocked-landing"
