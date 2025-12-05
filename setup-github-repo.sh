#!/bin/bash
# Complete GitHub repo setup script

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "GitHub Repository Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if gh is authenticated
if gh auth status &> /dev/null; then
  echo "✅ GitHub CLI authenticated"
  GITHUB_USER=$(gh api user --jq .login)
  echo "📝 Username: $GITHUB_USER"
  echo ""
  
  echo "🚀 Creating repository 'restocked-now'..."
  gh repo create restocked-now \
    --public \
    --description "Restocked.now – landing, app frontend, and backend" \
    --source=. \
    --remote=origin \
    --push
  
  echo ""
  echo "✅ Repository created and pushed!"
  echo ""
  echo "Repository URL: https://github.com/$GITHUB_USER/restocked-now"
  echo ""
  echo "Verify on GitHub that you see:"
  echo "  - landing/ folder"
  echo "  - frontend/ folder"
  echo "  - src/ folder"
  echo "  - README.md"
  
else
  echo "⚠️  GitHub CLI not authenticated"
  echo ""
  echo "Authenticating GitHub CLI..."
  echo "This will open a browser for authentication."
  echo ""
  read -p "Press Enter to continue with gh auth login..."
  
  gh auth login
  
  # Retry after auth
  echo ""
  echo "Retrying repository creation..."
  GITHUB_USER=$(gh api user --jq .login)
  
  gh repo create restocked-now \
    --public \
    --description "Restocked.now – landing, app frontend, and backend" \
    --source=. \
    --remote=origin \
    --push
  
  echo ""
  echo "✅ Repository created and pushed!"
  echo "Repository URL: https://github.com/$GITHUB_USER/restocked-now"
fi
