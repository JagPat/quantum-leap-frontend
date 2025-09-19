#!/usr/bin/env node

/**
 * Test OAuth Setup Endpoint
 * Tests the setupOAuth endpoint with valid and invalid data
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'https://web-production-de0bc.up.railway.app';
const TIMEOUT = 10000; // 10 seconds

console.log('🧪 Testing OAuth Setup Endpoint');
console.log('================================');
console.log(`🌐 Backend URL: ${BASE_URL}`);
console.log('');

async function testOAuthSetup(testName, payload, expectedStatus = 200) {
  try {
    console.log(`🔍 Testing: ${testName}`);
    console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/modules/auth/broker/setup-oauth`, payload, {
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Accept all status codes
    });
    
    console.log(`📥 Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === expectedStatus) {
      console.log(`✅ SUCCESS - Got expected status ${expectedStatus}`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ FAILED - Expected ${expectedStatus}, got ${response.status}`);
      return { success: false, error: `Wrong status code`, data: response.data };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.code) {
      console.log(`🔍 Error Code: ${error.code}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting OAuth Setup Tests...\n');
  
  const tests = [
    {
      name: 'Valid OAuth Setup Request',
      payload: {
        api_key: 'test_api_key_1234567890',
        api_secret: 'test_api_secret_1234567890',
        user_id: 'test_user_123',
        frontend_url: 'http://localhost:3000'
      },
      expectedStatus: 200
    },
    {
      name: 'OAuth Setup Without user_id (should auto-generate)',
      payload: {
        api_key: 'test_api_key_1234567890',
        api_secret: 'test_api_secret_1234567890',
        frontend_url: 'http://localhost:3000'
      },
      expectedStatus: 200
    },
    {
      name: 'OAuth Setup Without frontend_url (optional)',
      payload: {
        api_key: 'test_api_key_1234567890',
        api_secret: 'test_api_secret_1234567890',
        user_id: 'test_user_123'
      },
      expectedStatus: 200
    },
    {
      name: 'Invalid Request - Missing api_key',
      payload: {
        api_secret: 'test_api_secret_1234567890',
        user_id: 'test_user_123'
      },
      expectedStatus: 400
    },
    {
      name: 'Invalid Request - Missing api_secret',
      payload: {
        api_key: 'test_api_key_1234567890',
        user_id: 'test_user_123'
      },
      expectedStatus: 400
    },
    {
      name: 'Invalid Request - api_key too short',
      payload: {
        api_key: 'short',
        api_secret: 'test_api_secret_1234567890',
        user_id: 'test_user_123'
      },
      expectedStatus: 400
    },
    {
      name: 'Invalid Request - Empty payload',
      payload: {},
      expectedStatus: 400
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await testOAuthSetup(test.name, test.payload, test.expectedStatus);
    if (result.success) passed++;
    console.log(''); // Add spacing between tests
  }
  
  // Summary
  console.log('📋 Test Summary');
  console.log('===============');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! OAuth setup endpoint is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error.message);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});