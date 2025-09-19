#!/usr/bin/env node

/**
 * Database Setup Verification Script
 * Tests PostgreSQL database connection and OAuth functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'https://web-production-de0bc.up.railway.app';
const TIMEOUT = 10000; // 10 seconds

console.log('🔍 Database Setup Verification');
console.log('================================');
console.log(`🌐 Backend URL: ${BASE_URL}`);
console.log(`⏱️ Timeout: ${TIMEOUT}ms`);
console.log('');

async function testEndpoint(url, description) {
  try {
    console.log(`🧪 Testing: ${description}`);
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(url, { 
      timeout: TIMEOUT,
      validateStatus: () => true // Accept all status codes
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`   ✅ SUCCESS`);
      if (response.data) {
        console.log(`   📊 Response:`, JSON.stringify(response.data, null, 2));
      }
      return true;
    } else {
      console.log(`   ❌ FAILED (Status: ${response.status})`);
      if (response.data) {
        console.log(`   📊 Error:`, JSON.stringify(response.data, null, 2));
      }
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    if (error.code) {
      console.log(`   🔍 Error Code: ${error.code}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Database Verification Tests...\n');
  
  const tests = [
    {
      url: `${BASE_URL}/health`,
      description: 'Application Health Check'
    },
    {
      url: `${BASE_URL}/api/modules/auth/debug`,
      description: 'Auth Module Status'
    },
    {
      url: `${BASE_URL}/api/modules/auth/broker/health`,
      description: 'OAuth Database Health'
    },
    {
      url: `${BASE_URL}/api/modules/auth/broker/status`,
      description: 'OAuth Service Status'
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testEndpoint(test.url, test.description);
    if (success) passed++;
    console.log(''); // Add spacing between tests
  }
  
  // Summary
  console.log('📋 Test Summary');
  console.log('===============');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Database setup is working correctly.');
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('1. Test OAuth flow: Visit /api/modules/auth/broker/connect/zerodha');
    console.log('2. Monitor logs in Railway dashboard');
    console.log('3. Check database tables in Railway PostgreSQL service');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Verify DATABASE_URL environment variable is set');
    console.log('2. Check Railway deployment logs for errors');
    console.log('3. Ensure PostgreSQL service is running');
    console.log('4. Verify all environment variables from RAILWAY_ENV_SETUP_COMPLETE.md');
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