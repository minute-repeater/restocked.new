#!/bin/bash

# Test OAuth endpoint after deployment
# Usage: ./test-oauth-endpoint.sh

BACKEND_URL="https://restockednew-production.up.railway.app"
FRONTEND_URL="https://app.restocked.now"

echo "🔍 Testing OAuth endpoint..."
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BACKEND_URL/health")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Health check passed"
  echo "Response: $BODY"
else
  echo "❌ Health check failed (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
  exit 1
fi

echo ""
echo "2️⃣ Testing OAuth URL endpoint (without Origin header)..."
OAUTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BACKEND_URL/auth/google/url")
HTTP_STATUS=$(echo "$OAUTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$OAUTH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ OAuth URL endpoint works (no Origin)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_STATUS" = "400" ]; then
  echo "⚠️  OAuth not configured (HTTP 400)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ OAuth URL endpoint failed (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
fi

echo ""
echo "3️⃣ Testing OAuth URL endpoint (with Origin header)..."
OAUTH_RESPONSE_ORIGIN=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Origin: $FRONTEND_URL" \
  "$BACKEND_URL/auth/google/url")
HTTP_STATUS=$(echo "$OAUTH_RESPONSE_ORIGIN" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$OAUTH_RESPONSE_ORIGIN" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ OAuth URL endpoint works (with Origin)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_STATUS" = "400" ]; then
  echo "⚠️  OAuth not configured (HTTP 400)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ OAuth URL endpoint failed (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
fi

echo ""
echo "4️⃣ Testing CORS preflight (OPTIONS request)..."
OPTIONS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "$BACKEND_URL/auth/google/url")
HTTP_STATUS=$(echo "$OPTIONS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ CORS preflight passed (HTTP $HTTP_STATUS)"
else
  echo "❌ CORS preflight failed (HTTP $HTTP_STATUS)"
fi

echo ""
echo "✅ Testing complete!"


