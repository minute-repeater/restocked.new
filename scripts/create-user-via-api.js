#!/usr/bin/env node
/**
 * Create a test user via the production API
 * Usage: node scripts/create-user-via-api.js
 */

const API_BASE_URL = 'https://restockednew-production.up.railway.app';
const EMAIL = 'admin@test.com';
const PASSWORD = 'TestPassword123!';

async function createUser() {
  console.log('Creating user via API...');
  console.log(`Email: ${EMAIL}`);
  console.log(`API: ${API_BASE_URL}/auth/register\n`);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
      console.log('✅ User created successfully!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Plan: ${data.user.plan || 'free'}`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      console.log('\nYou can now login with these credentials.');
      return { success: true, data };
    } else {
      if (response.status === 409) {
        console.log('⚠️  User already exists (this is OK - user was created previously)');
        console.log(`   Error: ${data.error?.message || 'Email already registered'}`);
        return { success: true, data: { message: 'User already exists' } };
      } else {
        console.error('❌ Registration failed:');
        console.error(`   Status: ${response.status}`);
        console.error(`   Error: ${JSON.stringify(data, null, 2)}`);
        return { success: false, error: data };
      }
    }
  } catch (error) {
    console.error('❌ Error creating user:');
    console.error(`   ${error.message}`);
    if (error.cause) {
      console.error(`   Cause: ${error.cause}`);
    }
    return { success: false, error: error.message };
  }
}

// Run the script
createUser()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });



