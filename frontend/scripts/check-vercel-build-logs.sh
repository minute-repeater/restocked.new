#!/bin/bash
# Script to check Vercel build logs for environment variable validation output

echo "═══════════════════════════════════════════════════════════════"
echo "Vercel Build Log Analysis"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if Vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    echo ""
    echo "To install Vercel CLI:"
    echo "  npm install -g vercel"
    echo ""
    echo "Or check build logs manually in Vercel Dashboard:"
    echo "  1. Go to: https://vercel.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Go to Deployments → Latest deployment"
    echo "  4. Click 'View Build Logs'"
    echo "  5. Search for: '🔍 Build-time Environment Variable Check'"
    echo ""
    exit 1
fi

echo "Fetching latest deployment logs..."
echo ""

# Get latest deployment logs
vercel logs --follow=false 2>&1 | tee /tmp/vercel-build-logs.txt

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Searching for validation output..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Search for validation output
if grep -q "🔍 Build-time Environment Variable Check" /tmp/vercel-build-logs.txt; then
    echo "✅ Found validation output!"
    echo ""
    
    # Extract the validation section
    echo "Validation Output:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    grep -A 10 "🔍 Build-time Environment Variable Check" /tmp/vercel-build-logs.txt | head -15
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Extract VITE_API_BASE_URL value
    if grep -q "VITE_API_BASE_URL = " /tmp/vercel-build-logs.txt; then
        VALUE=$(grep "VITE_API_BASE_URL = " /tmp/vercel-build-logs.txt | head -1 | sed 's/.*VITE_API_BASE_URL = //')
        echo "📋 Extracted Value:"
        echo "   VITE_API_BASE_URL = $VALUE"
        echo ""
        
        # Check if value is valid
        if [[ "$VALUE" == "(undefined)" ]] || [[ "$VALUE" == "" ]] || [[ "$VALUE" == *"localhost"* ]]; then
            echo "❌ INVALID VALUE DETECTED"
            echo "   Status: Variable is missing or using localhost"
        else
            echo "✅ VALID VALUE DETECTED"
            echo "   Status: Variable is set correctly"
        fi
    fi
    
    # Check for error messages
    if grep -q "❌ VITE_API_BASE_URL missing" /tmp/vercel-build-logs.txt; then
        echo ""
        echo "❌ BUILD FAILED - Validation Error Detected"
        echo ""
        echo "Error Details:"
        grep -A 5 "❌ VITE_API_BASE_URL missing" /tmp/vercel-build-logs.txt | head -10
    elif grep -q "✅ VITE_API_BASE_URL validated successfully" /tmp/vercel-build-logs.txt; then
        echo ""
        echo "✅ BUILD SUCCEEDED - Validation Passed"
    fi
else
    echo "⚠️  Validation output not found in logs"
    echo ""
    echo "This could mean:"
    echo "  1. Build hasn't run yet with the new validation plugin"
    echo "  2. Build is still in progress"
    echo "  3. Logs are from an older deployment"
    echo ""
    echo "Please check the latest deployment in Vercel Dashboard"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"



