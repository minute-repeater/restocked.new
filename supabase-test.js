/**
 * Standalone Supabase Database Connection Test
 * 
 * Usage: node --import dotenv/config supabase-test.js
 * 
 * This script tests connectivity to Supabase PostgreSQL database
 * and provides detailed error information for diagnostics.
 */

import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function testConnection() {
  console.log('🔍 Supabase Database Connection Test\n');
  console.log('=' .repeat(60));
  
  // Step 1: Check if DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.log('\nMake sure your .env file contains:');
    console.log('DATABASE_URL=postgresql://postgres:PASSWORD@db.houlnusxqoupkaulciiw.supabase.co:5432/postgres');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is set');
  console.log(`   Length: ${databaseUrl.length} characters`);
  
  // Step 2: Parse and display connection details (hide password)
  try {
    const url = new URL(databaseUrl);
    console.log('\n📋 Connection Details:');
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Username: ${url.username}`);
    console.log(`   Password: ${'*'.repeat(url.password?.length || 0)} (${url.password?.length || 0} chars)`);
    console.log(`   Hostname: ${url.hostname}`);
    console.log(`   Port: ${url.port || '5432 (default)'}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
  } catch (parseError) {
    console.error('❌ ERROR: Failed to parse DATABASE_URL');
    console.error(`   Error: ${parseError.message}`);
    process.exit(1);
  }
  
  // Step 3: Create PostgreSQL client
  console.log('\n🔌 Attempting database connection...');
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000, // 10 second timeout
  });
  
  // Step 4: Attempt connection
  const startTime = Date.now();
  
  try {
    await client.connect();
    const connectTime = Date.now() - startTime;
    console.log(`✅ Connection established in ${connectTime}ms`);
    
    // Step 5: Test query
    console.log('\n📊 Testing query: SELECT 1');
    const result = await client.query('SELECT 1 as test, NOW() as current_time');
    
    if (result.rows[0]?.test === 1) {
      console.log('✅ Query successful!');
      console.log(`   Test value: ${result.rows[0].test}`);
      console.log(`   Server time: ${result.rows[0].current_time}`);
      console.log('\n🎉 All tests passed! Database connection is working.');
    } else {
      console.error('❌ Query returned unexpected result');
      console.log(`   Result: ${JSON.stringify(result.rows)}`);
    }
    
    await client.end();
    process.exit(0);
    
  } catch (error) {
    const connectTime = Date.now() - startTime;
    console.error(`\n❌ Connection failed after ${connectTime}ms\n`);
    
    // Detailed error information
    console.log('📋 Error Details:');
    console.log('=' .repeat(60));
    console.log(`Error Code:     ${error.code || 'N/A'}`);
    console.log(`Error Message:  ${error.message || 'N/A'}`);
    console.log(`Error Name:     ${error.name || 'N/A'}`);
    
    if (error.errno !== undefined) {
      console.log(`Errno:          ${error.errno}`);
    }
    
    if (error.address) {
      console.log(`Address:        ${error.address}`);
    }
    
    if (error.port) {
      console.log(`Port:           ${error.port}`);
    }
    
    if (error.syscall) {
      console.log(`Syscall:        ${error.syscall}`);
    }
    
    // Common error codes and meanings
    console.log('\n🔍 Error Code Meanings:');
    console.log('=' .repeat(60));
    
    const errorMeanings = {
      'EHOSTUNREACH': 'Host is unreachable - network routing issue or host is down',
      'ETIMEDOUT': 'Connection timed out - firewall blocking or host not responding',
      'ECONNREFUSED': 'Connection refused - port is closed or service not running',
      'ENOTFOUND': 'DNS resolution failed - hostname cannot be resolved',
      'EAI_AGAIN': 'DNS temporary failure - try again later',
      'ENETUNREACH': 'Network is unreachable - no route to host',
      'EACCES': 'Permission denied - firewall or IP allowlist blocking',
    };
    
    if (error.code && errorMeanings[error.code]) {
      console.log(`   ${error.code}: ${errorMeanings[error.code]}`);
    } else {
      console.log(`   ${error.code || 'Unknown'}: See error message above`);
    }
    
    // Stack trace
    console.log('\n📚 Stack Trace:');
    console.log('=' .repeat(60));
    console.log(error.stack || 'No stack trace available');
    
    // Diagnostic suggestions
    console.log('\n💡 Diagnostic Suggestions:');
    console.log('=' .repeat(60));
    
    if (error.code === 'EHOSTUNREACH' || error.code === 'ENETUNREACH') {
      console.log('1. Check if Supabase project is paused or sleeping');
      console.log('2. Verify hostname is correct: db.houlnusxqoupkaulciiw.supabase.co');
      console.log('3. Check network connectivity: ping db.houlnusxqoupkaulciiw.supabase.co');
      console.log('4. Check DNS resolution: nslookup db.houlnusxqoupkaulciiw.supabase.co');
      console.log('5. Verify firewall settings (macOS System Settings > Firewall)');
      console.log('6. Check if VPN/proxy is interfering');
      console.log('7. Try IPv4 instead of IPv6 (if applicable)');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('1. Check Supabase IP allowlist settings');
      console.log('2. Verify port 5432 is not blocked by firewall');
      console.log('3. Check if ISP blocks port 5432');
      console.log('4. Try Supabase connection pooler port (if available)');
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      console.log('1. Check DNS resolution: nslookup db.houlnusxqoupkaulciiw.supabase.co');
      console.log('2. Try using different DNS server (8.8.8.8)');
      console.log('3. Verify hostname spelling is correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('1. Verify Supabase project is active (not paused)');
      console.log('2. Check if database is in sleep mode (free tier)');
      console.log('3. Verify port 5432 is correct');
    }
    
    await client.end().catch(() => {}); // Ignore errors when ending failed connection
    process.exit(1);
  }
}

// Run the test
testConnection().catch((error) => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});

