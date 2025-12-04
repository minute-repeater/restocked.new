#!/bin/bash
# Google OAuth Verification Script
# Run this after setting env vars in Railway and Vercel

echo "🔍 Verifying Google OAuth Configuration..."
echo ""

BACKEND_URL="https://restockednew-production.up.railway.app"
FRONTEND_URL="https://app.restocked.now"

echo "1. Testing backend OAuth endpoint..."
RESPONSE=$(curl -s -X GET "$BACKEND_URL/auth/google/url" \
  -H "Origin: $FRONTEND_URL" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Backend OAuth is configured!"
  echo "   Response: $BODY" | head -c 100
  echo "..."
elif [ "$HTTP_CODE" = "400" ]; then
  echo "❌ Backend OAuth is NOT configured"
  echo "   Error: $BODY"
  echo ""
  echo "   Check Railway env vars:"
  echo "   - GOOGLE_CLIENT_ID"
  echo "   - GOOGLE_CLIENT_SECRET"
  echo "   - GOOGLE_REDIRECT_URL"
else
  echo "⚠️  Unexpected response: HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi

echo ""
echo "2. Testing frontend login page..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/login")

if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "✅ Frontend login page is accessible"
  echo "   Visit: $FRONTEND_URL/login"
  echo "   Check if 'Sign in with Google' button appears"
else
  echo "⚠️  Frontend returned HTTP $FRONTEND_STATUS"
fi

echo ""
echo "3. Next steps:"
echo "   - Visit $FRONTEND_URL/login"
echo "   - Verify Google button appears"
echo "   - Click button and test OAuth flow"
echo "   - Check Railway logs for: 'Google OAuth login successful'"
