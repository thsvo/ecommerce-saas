/**
 * Test script to verify API routing from tenant subdomains
 * 
 * This script tests the login API endpoint from a tenant subdomain
 * to ensure that requests are properly routed to the backend.
 */

const fetch = require('node-fetch');

// Configuration
const TENANT_SUBDOMAIN = 'api'; // Replace with your tenant subdomain
const BASE_URL = `https://${TENANT_SUBDOMAIN}.codeopx.com`;
const LOGIN_ENDPOINT = '/api/server/auth/login';

// Test credentials - replace with valid credentials for your tenant
const TEST_CREDENTIALS = {
  email: 'admin@ecommerce.com', // Replace with a valid email
  password: '123456'     // Replace with a valid password
};

async function testTenantApiRouting() {
  console.log(`Testing API routing for tenant: ${TENANT_SUBDOMAIN}`);
  console.log(`URL: ${BASE_URL}${LOGIN_ENDPOINT}`);
  
  try {
    // Test the login endpoint
    const response = await fetch(`${BASE_URL}${LOGIN_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    const status = response.status;
    let data;
    
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Failed to parse JSON response' };
    }
    
    console.log('Response Status:', status);
    console.log('Response Headers:', response.headers.raw());
    console.log('Response Body:', JSON.stringify(data, null, 2));
    
    if (status === 200) {
      console.log('✅ API routing test PASSED');
    } else if (status === 401) {
      console.log('⚠️ Authentication failed, but API routing appears to be working');
      console.log('   Check your test credentials and try again');
    } else {
      console.log('❌ API routing test FAILED');
      console.log('   Unexpected status code:', status);
    }
  } catch (error) {
    console.error('❌ API routing test FAILED with error:');
    console.error(error);
  }
}

// Run the test
testTenantApiRouting();

/**
 * How to use this script:
 * 
 * 1. Update the TENANT_SUBDOMAIN variable with your tenant's subdomain
 * 2. Update the TEST_CREDENTIALS with valid login credentials for that tenant
 * 3. Run the script with Node.js:
 *    node scripts/test-tenant-api.js
 * 
 * Expected output for successful routing (even with invalid credentials):
 * - Status code 200 (successful login) or 401 (invalid credentials)
 * - JSON response body
 * 
 * If you see a 500 error or connection error, the API routing is not working correctly.
 */