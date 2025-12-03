#!/bin/bash

TOKEN=$(cat /tmp/auth_token.txt 2>/dev/null || echo "")
BASE_URL="http://localhost:3000"

if [ -z "$TOKEN" ]; then
    echo "❌ No auth token found. Please login first."
    exit 1
fi

echo "🔐 Testing with token: ${TOKEN:0:20}..."
echo ""

# Test URLs
URLS=(
    "https://www.apple.com/shop/product/MME73AM/A/airpods-3rd-generation"
    "https://www.nike.com/t/air-force-1-shadow-womens-shoes-K3VfDD"
    "https://www.zara.com/us/en/textured-knit-dress-p01234567.html"
    "https://www.amazon.com/dp/B09G3HRMVB"
    "https://www.sephora.com/product/rare-beauty-soft-pinch-blush-P474343"
)

echo "═══════════════════════════════════════════════════════════════"
echo "STEP 1: Check Current State"
echo "═══════════════════════════════════════════════════════════════"
echo ""

CURRENT_ITEMS=$(curl -s -X GET "${BASE_URL}/me/tracked-items" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.items | length')
echo "Current tracked items: ${CURRENT_ITEMS}"

PLAN=$(curl -s -X GET "${BASE_URL}/me/plan" \
    -H "Authorization: Bearer ${TOKEN}" | jq -r '.plan')
echo "User plan: ${PLAN}"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "STEP 2: Test Product URLs"
echo "═══════════════════════════════════════════════════════════════"
echo ""

for i in "${!URLS[@]}"; do
    URL="${URLS[$i]}"
    NUM=$((i+1))
    
    echo "[${NUM}/5] Testing: ${URL}"
    
    # Step 1: Create product by URL
    echo "  → Creating product..."
    PRODUCT_RESPONSE=$(curl -s -X POST "${BASE_URL}/products" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"${URL}\"}")
    
    PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.product.id // empty')
    PRODUCT_NAME=$(echo "$PRODUCT_RESPONSE" | jq -r '.product.name // "N/A"')
    VARIANTS_COUNT=$(echo "$PRODUCT_RESPONSE" | jq -r '.variants | length // 0')
    
    if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
        ERROR=$(echo "$PRODUCT_RESPONSE" | jq -r '.error.message // "Unknown error"')
        echo "  ❌ Product creation failed: ${ERROR}"
        echo ""
        continue
    fi
    
    echo "  ✓ Product created: ${PRODUCT_NAME} (ID: ${PRODUCT_ID}, Variants: ${VARIANTS_COUNT})"
    
    # Step 2: Track the product
    echo "  → Tracking product..."
    TRACK_RESPONSE=$(curl -s -X POST "${BASE_URL}/me/tracked-items" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"product_id\":${PRODUCT_ID}}")
    
    TRACKED_ID=$(echo "$TRACK_RESPONSE" | jq -r '.tracked_item.id // empty')
    
    if [ -z "$TRACKED_ID" ] || [ "$TRACKED_ID" = "null" ]; then
        ERROR=$(echo "$TRACK_RESPONSE" | jq -r '.error.message // .error.code // "Unknown error"')
        echo "  ❌ Tracking failed: ${ERROR}"
    else
        echo "  ✓ Product tracked (Tracked Item ID: ${TRACKED_ID})"
    fi
    
    echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo "STEP 3: Verify Tracked Items"
echo "═══════════════════════════════════════════════════════════════"
echo ""

FINAL_ITEMS=$(curl -s -X GET "${BASE_URL}/me/tracked-items" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.items | length')
echo "Final tracked items count: ${FINAL_ITEMS}"

echo ""
echo "Tracked items list:"
curl -s -X GET "${BASE_URL}/me/tracked-items" \
    -H "Authorization: Bearer ${TOKEN}" | jq -r '.items[] | "  - \(.product.name // "N/A") (Product ID: \(.product_id))"'

echo ""
echo "✅ Testing complete!"

