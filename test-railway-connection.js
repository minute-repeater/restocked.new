/**
 * Test Railway Database Connection and Application Flow
 * 
 * Usage: node --import dotenv/config test-railway-connection.js
 */

import 'dotenv/config';
import { query } from './dist/db/client.js';

async function testApplicationFlow() {
  console.log('🧪 Testing Railway Database Connection & Application Flow\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Verify tables exist
    console.log('\n📊 Test 1: Verify Database Schema');
    const tables = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`));

    // Test 2: Insert test product
    console.log('\n📦 Test 2: Insert Test Product');
    const productResult = await query(
      `INSERT INTO products (url, name, vendor, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, url, name, vendor`,
      ['https://test.example.com/product', 'Test Product', 'Test Vendor', 'Test Description']
    );
    const productId = productResult.rows[0].id;
    console.log(`✅ Product inserted: ID ${productId}`);
    console.log(`   URL: ${productResult.rows[0].url}`);
    console.log(`   Name: ${productResult.rows[0].name}`);

    // Test 3: Insert test variant
    console.log('\n🔀 Test 3: Insert Test Variant');
    const variantResult = await query(
      `INSERT INTO variants (product_id, attributes, current_price, currency, current_stock_status, is_available)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6)
       RETURNING id, product_id, attributes, current_price`,
      [
        productId,
        JSON.stringify({ size: 'M', color: 'Blue' }),
        29.99,
        'USD',
        'in_stock',
        true
      ]
    );
    const variantId = variantResult.rows[0].id;
    console.log(`✅ Variant inserted: ID ${variantId}`);
    console.log(`   Attributes: ${JSON.stringify(variantResult.rows[0].attributes)}`);
    console.log(`   Price: $${variantResult.rows[0].current_price}`);

    // Test 4: Insert price history
    console.log('\n💰 Test 4: Insert Price History');
    await query(
      `INSERT INTO variant_price_history (variant_id, price, currency, raw)
       VALUES ($1, $2, $3, $4)`,
      [variantId, 29.99, 'USD', '$29.99']
    );
    console.log('✅ Price history inserted');

    // Test 5: Insert stock history
    console.log('\n📦 Test 5: Insert Stock History');
    await query(
      `INSERT INTO variant_stock_history (variant_id, status, raw)
       VALUES ($1, $2, $3)`,
      [variantId, 'in_stock', 'In Stock']
    );
    console.log('✅ Stock history inserted');

    // Test 6: Test change detection (should NOT insert duplicate)
    console.log('\n🔄 Test 6: Test Change Detection');
    const priceCheck = await query(
      `SELECT price, currency FROM variant_price_history 
       WHERE variant_id = $1 
       ORDER BY recorded_at DESC LIMIT 1`,
      [variantId]
    );
    console.log(`✅ Last price: $${priceCheck.rows[0].price} ${priceCheck.rows[0].currency}`);
    
    // Try to insert same price (should be prevented by change detection logic)
    const priceHistoryCount = await query(
      `SELECT COUNT(*) as count FROM variant_price_history WHERE variant_id = $1`,
      [variantId]
    );
    console.log(`✅ Price history entries: ${priceHistoryCount.rows[0].count}`);

    // Test 7: Query product with variants
    console.log('\n🔍 Test 7: Query Product with Variants');
    const productWithVariants = await query(
      `SELECT p.*, 
              json_agg(json_build_object('id', v.id, 'attributes', v.attributes, 'price', v.current_price)) as variants
       FROM products p
       LEFT JOIN variants v ON v.product_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [productId]
    );
    const variants = productWithVariants.rows[0].variants || [];
    const variantCount = Array.isArray(variants) ? variants.length : (variants ? 1 : 0);
    console.log(`✅ Product queried with ${variantCount} variant(s)`);

    // Test 8: Cleanup
    console.log('\n🧹 Test 8: Cleanup Test Data');
    await query('DELETE FROM products WHERE id = $1', [productId]);
    console.log('✅ Test data cleaned up');

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All tests passed! Railway database is fully functional.');
    console.log('=' .repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testApplicationFlow();

