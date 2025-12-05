#!/usr/bin/env node
/**
 * Frontend → Backend Communication Test
 * Simulates frontend requests to verify compatibility
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://restockednew-production.up.railway.app';
const FRONTEND_ORIGIN = 'https://app.restocked.now';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
  results.push({ name, status, message, details });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function testHealthEndpoint() {
  console.log('\n1. Testing GET /health endpoint...\n');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN,
      },
    });

    const data = await response.json();
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
    };

    if (response.ok && data.status === 'ok' && data.database === 'connected') {
      logResult(
        'Health Endpoint',
        'pass',
        'Health endpoint responds correctly',
        { status: data.status, database: data.database, statusCode: response.status }
      );
    } else {
      logResult(
        'Health Endpoint',
        'fail',
        'Health endpoint returned unexpected response',
        { statusCode: response.status, response: data }
      );
    }

    // Check CORS headers
    if (corsHeaders['access-control-allow-origin']) {
      const allowedOrigin = corsHeaders['access-control-allow-origin'];
      if (allowedOrigin === FRONTEND_ORIGIN || allowedOrigin === '*') {
        logResult(
          'CORS Headers',
          'pass',
          'CORS headers are correct',
          corsHeaders
        );
      } else {
        logResult(
          'CORS Headers',
          'warning',
          `CORS allows origin: ${allowedOrigin}, expected: ${FRONTEND_ORIGIN}`,
          corsHeaders
        );
      }
    } else {
      logResult(
        'CORS Headers',
        'warning',
        'CORS headers not found (may be configured differently)',
        corsHeaders
      );
    }
  } catch (error: any) {
    logResult(
      'Health Endpoint',
      'fail',
      'Failed to reach health endpoint',
      { error: error.message }
    );
  }
}

async function testCORS() {
  console.log('\n2. Testing CORS configuration...\n');

  try {
    // Test OPTIONS preflight request
    const preflightResponse = await fetch(`${BACKEND_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    const corsHeaders = {
      'access-control-allow-origin': preflightResponse.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': preflightResponse.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': preflightResponse.headers.get('access-control-allow-headers'),
      'access-control-max-age': preflightResponse.headers.get('access-control-max-age'),
    };

    if (preflightResponse.status === 204 || preflightResponse.status === 200) {
      logResult(
        'CORS Preflight',
        'pass',
        'Preflight request handled correctly',
        { statusCode: preflightResponse.status, headers: corsHeaders }
      );
    } else {
      logResult(
        'CORS Preflight',
        'warning',
        `Preflight returned status ${preflightResponse.status}`,
        { statusCode: preflightResponse.status, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    logResult(
      'CORS Preflight',
      'fail',
      'Preflight request failed',
      { error: error.message }
    );
  }
}

async function testLogin() {
  console.log('\n3. Testing POST /auth/login endpoint...\n');

  // First, try to register a test user
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Register user
    const registerResponse = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const registerData = await registerResponse.json();
    
    if (registerResponse.ok || registerResponse.status === 201) {
      logResult(
        'User Registration',
        'pass',
        'User registration successful',
        { email: testEmail, statusCode: registerResponse.status }
      );
    } else {
      logResult(
        'User Registration',
        'warning',
        'User registration returned unexpected status',
        { statusCode: registerResponse.status, response: registerData }
      );
    }

    // Now test login
    const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginData = await loginResponse.json();

    if (loginResponse.ok && loginData.token && loginData.user) {
      logResult(
        'Login Endpoint',
        'pass',
        'Login successful',
        { 
          statusCode: loginResponse.status,
          hasToken: !!loginData.token,
          hasUser: !!loginData.user,
          userEmail: loginData.user?.email,
        }
      );

      // Test authenticated endpoint
      const authHeaders = {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      };

      const trackedItemsResponse = await fetch(`${BACKEND_URL}/me/tracked-items`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (trackedItemsResponse.ok) {
        logResult(
          'Authenticated Request',
          'pass',
          'Authenticated endpoint accessible',
          { statusCode: trackedItemsResponse.status }
        );
      } else {
        logResult(
          'Authenticated Request',
          'fail',
          'Authenticated endpoint returned error',
          { statusCode: trackedItemsResponse.status, response: await trackedItemsResponse.text() }
        );
      }
    } else {
      logResult(
        'Login Endpoint',
        'fail',
        'Login failed',
        { statusCode: loginResponse.status, response: loginData }
      );
    }
  } catch (error: any) {
    logResult(
      'Login Test',
      'fail',
      'Login test failed',
      { error: error.message }
    );
  }
}

async function testErrorHandling() {
  console.log('\n4. Testing error handling...\n');

  try {
    // Test invalid login
    const invalidLoginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      }),
    });

    const invalidLoginData = await invalidLoginResponse.json();

    if (invalidLoginResponse.status === 401) {
      logResult(
        'Error Handling - Invalid Login',
        'pass',
        'Invalid login returns 401 as expected',
        { statusCode: invalidLoginResponse.status, error: invalidLoginData.error?.message }
      );
    } else {
      logResult(
        'Error Handling - Invalid Login',
        'warning',
        `Invalid login returned status ${invalidLoginResponse.status}`,
        { statusCode: invalidLoginResponse.status, response: invalidLoginData }
      );
    }

    // Test unauthorized request
    const unauthorizedResponse = await fetch(`${BACKEND_URL}/me/tracked-items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
      },
    });

    if (unauthorizedResponse.status === 401) {
      logResult(
        'Error Handling - Unauthorized',
        'pass',
        'Unauthorized request returns 401 as expected',
        { statusCode: unauthorizedResponse.status }
      );
    } else {
      logResult(
        'Error Handling - Unauthorized',
        'warning',
        `Unauthorized request returned status ${unauthorizedResponse.status}`,
        { statusCode: unauthorizedResponse.status }
      );
    }
  } catch (error: any) {
    logResult(
      'Error Handling',
      'fail',
      'Error handling test failed',
      { error: error.message }
    );
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('FRONTEND → BACKEND COMPATIBILITY REPORT');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}\n`);

  console.log('\nDetailed Results:\n');
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();
  });

  // Summary
  if (failed === 0 && warnings === 0) {
    console.log('\n✅ All tests passed! Frontend → Backend communication is fully compatible.\n');
  } else if (failed === 0) {
    console.log('\n⚠️  All critical tests passed, but some warnings were found. Review warnings above.\n');
  } else {
    console.log('\n❌ Some tests failed. Review failures above and fix issues.\n');
  }

  console.log('='.repeat(80));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Frontend → Backend Communication Test');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend Origin: ${FRONTEND_ORIGIN}\n`);

  await testHealthEndpoint();
  await testCORS();
  await testLogin();
  await testErrorHandling();

  generateReport();

  const hasFailures = results.some(r => r.status === 'fail');
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



