#!/usr/bin/env node
/**
 * Verify login via the production API
 * Usage: node scripts/verify-login.js
 */

const API_BASE_URL = 'https://restockednew-production.up.railway.app';
const EMAIL = 'admin@test.com';
const PASSWORD = 'TestPassword123!';

async function verifyLogin() {
  console.log('Testing login via API...');
  console.log(`Email: ${EMAIL}`);
  console.log(`API: ${API_BASE_URL}/auth/login\n`);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://app.restocked.now',
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Login successful!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Plan: ${data.user.plan || 'free'}`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      console.log(`   Token length: ${data.token.length} characters`);
      console.log('\n✅ User can successfully login with these credentials.');
      return { success: true, data };
    } else {
      console.error('❌ Login failed:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${data.error?.message || JSON.stringify(data, null, 2)}`);
      
      if (response.status === 401) {
        console.error('\n⚠️  Invalid credentials. Make sure the user exists.');
        console.error('   Run: node scripts/create-user-via-api.js');
      }
      
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ Error during login:');
    console.error(`   ${error.message}`);
    if (error.cause) {
      console.error(`   Cause: ${error.cause}`);
    }
    return { success: false, error: error.message };
  }
}

// Run the script
verifyLogin()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });



