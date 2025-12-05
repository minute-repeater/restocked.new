#!/bin/bash
# Script to create GitHub repo and push code

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "Create GitHub Repository and Push Code"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check for GitHub CLI
if command -v gh &> /dev/null; then
  echo "✅ GitHub CLI found"
  
  # Check if authenticated
  if gh auth status &> /dev/null; then
    echo "✅ GitHub CLI authenticated"
    
    # Get username
    GITHUB_USERNAME=$(gh api user --jq .login)
    echo "📝 GitHub username: $GITHUB_USERNAME"
    echo ""
    
    # Create repo
    echo "🚀 Creating repository 'restocked-now'..."
    if gh repo create restocked-now \
      --public \
      --description "Restocked.now – landing, app frontend, and backend" \
      --source=. \
      --remote=origin \
      --push; then
      echo ""
      echo "✅ Repository created and pushed!"
      echo ""
      echo "Repository URL: https://github.com/$GITHUB_USERNAME/restocked-now"
      exit 0
    else
      echo "❌ Failed to create repository via GitHub CLI"
      exit 1
    fi
  else
    echo "⚠️  GitHub CLI not authenticated"
    echo "Run: gh auth login"
    exit 1
  fi
else
  echo "⚠️  GitHub CLI (gh) not installed"
  echo ""
  echo "Option 1: Install GitHub CLI"
  echo "  brew install gh"
  echo "  gh auth login"
  echo "  Then run this script again"
  echo ""
  echo "Option 2: Manual setup"
  echo "  1. Create repo at: https://github.com/new"
  echo "     Name: restocked-now"
  echo "     Public, no README"
  echo ""
  echo "  2. Enter your GitHub username:"
  read GITHUB_USERNAME
  echo ""
  echo "  3. Adding remote and pushing..."
  git remote add origin https://github.com/$GITHUB_USERNAME/restocked-now.git 2>/dev/null || \
    git remote set-url origin https://github.com/$GITHUB_USERNAME/restocked-now.git
  git branch -M main
  git push -u origin main
  echo ""
  echo "✅ Code pushed!"
  echo "Repository URL: https://github.com/$GITHUB_USERNAME/restocked-now"
fi
