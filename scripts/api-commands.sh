#!/bin/bash
# API commands for creating and verifying users
# Usage: bash scripts/api-commands.sh

API_BASE_URL="https://restockednew-production.up.railway.app"
EMAIL="admin@test.com"
PASSWORD="TestPassword123!"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Create User via API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create user
echo "Creating user: $EMAIL"
curl -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verify Login"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify login
echo "Testing login: $EMAIL"
curl -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""



