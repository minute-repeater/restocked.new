#!/bin/bash

# Railway Project Status Check Script
# Run this after: railway login

echo "=========================================="
echo "RAILWAY PROJECT AUDIT"
echo "=========================================="
echo ""

# Check authentication
echo "1. Checking authentication..."
railway whoami || {
    echo "❌ Not authenticated. Run: railway login"
    exit 1
}
echo "✅ Authenticated"
echo ""

# List projects
echo "2. Listing Railway projects..."
railway list
echo ""

# Check if linked to a project
echo "3. Checking current project link..."
if railway status &>/dev/null; then
    echo "✅ Linked to a project"
    railway status
else
    echo "⚠️  Not linked to a project"
    echo "Run: railway link"
    echo ""
    echo "Available projects:"
    railway list
fi
echo ""

# List services
echo "4. Checking services in project..."
railway service list 2>/dev/null || echo "⚠️  Could not list services (may need to link project)"
echo ""

# Check environment variables
echo "5. Checking environment variables..."
railway variables 2>/dev/null || echo "⚠️  Could not check variables (may need to link project)"
echo ""

# Get public domain
echo "6. Checking public domain..."
railway domain 2>/dev/null || echo "⚠️  Could not get domain (may need to link project)"
echo ""

# Check recent logs
echo "7. Recent logs (last 50 lines)..."
railway logs --tail 50 2>/dev/null || echo "⚠️  Could not get logs (may need to link project)"
echo ""

echo "=========================================="
echo "AUDIT COMPLETE"
echo "=========================================="



