#!/bin/bash
# Force Rebuild Script for Vercel Deployment
# This script ensures a clean rebuild with correct environment variables

set -e

echo "🔄 Force Rebuild Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Clear local build artifacts
echo "1. Clearing local build artifacts..."
rm -rf dist
rm -rf node_modules/.vite
echo "   ✅ Local artifacts cleared"
echo ""

# Step 2: Verify environment variables
echo "2. Checking environment variables..."
if [ -z "$VITE_API_BASE_URL" ]; then
  echo "   ⚠️  VITE_API_BASE_URL not set in local environment"
  echo "   ℹ️  This is OK - Vercel will inject it during build"
else
  echo "   ✅ VITE_API_BASE_URL = $VITE_API_BASE_URL"
fi
echo ""

# Step 3: Check for typo variable
if [ -n "$VITE_APT_BASE_URL" ]; then
  echo "   ❌ VITE_APT_BASE_URL found (typo variable)"
  echo "   ⚠️  This should be deleted in Vercel"
else
  echo "   ✅ VITE_APT_BASE_URL not found (good!)"
fi
echo ""

# Step 4: Build locally to test
echo "3. Testing local build..."
npm run build
echo "   ✅ Local build successful"
echo ""

# Step 5: Instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo ""
echo "1. Go to Vercel Dashboard → Project → Settings → Environment Variables"
echo "2. Delete: VITE_APT_BASE_URL (if exists)"
echo "3. Verify: VITE_API_BASE_URL = https://restockednew-production.up.railway.app"
echo "4. Go to Deployments → Latest → Redeploy"
echo "5. Uncheck: 'Use existing Build Cache'"
echo "6. Click: Redeploy"
echo "7. Monitor build logs for diagnostic output"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
