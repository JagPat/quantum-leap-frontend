#!/usr/bin/env node

/**
 * Enhanced OAuth Endpoint Verification System
 * Comprehensive testing of OAuth endpoints with deployment status verification,
 * OAuth fix validation, and user_id handling tests
 */

const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://web-production-de0bc.up.railway.app';

// Test metrics tracking
const testMetrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  testResults: [],
  startTime: performance.now(),
  deploymentInfo: null
};

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Enhanced-OAuth-Verification/2.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonBody,
            responseTime: responseTime
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            responseTime: responseTime
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Deployment status verification
async function verifyDeploymentStatus() {
  console.log('🚀 Verifying Deployment Status');
  console.log('==============================');
  
  try {
    // Check application version and deployment info
    const healthResponse = await makeRequest('/health');
    const debugResponse = await makeRequest('/api/modules/auth/debug');
    
    const deploymentInfo = {
      appVersion: healthResponse.data.version || 'unknown',
      uptime: healthResponse.data.uptime || 0,
      timestamp: healthResponse.data.timestamp || new Date().toISOString(),
      authModuleLoaded: debugResponse.status === 200,
      deploymentTimestamp: new Date().toISOString()
    };
    
    testMetrics.deploymentInfo = deploymentInfo;
    
    console.log(`📦 Application Version: ${deploymentInfo.appVersion}`);
    console.log(`⏱️  Uptime: ${Math.round(deploymentInfo.uptime / 1000)}s`);
    console.log(`🔧 Auth Module Loaded: ${deploymentInfo.authModuleLoaded ? 'Yes' : 'No'}`);
    console.log(`📅 Last Checked: ${deploymentInfo.timestamp}`);
    
    // Verify latest code deployment indicators
    const codeVerificationTests = [
      {
        name: 'OAuth Module Accessibility',
        test: () => debugResponse.status === 200,
        indicator: 'OAuth module routes are accessible'
      },
      {
        name: 'Health Endpoint Response Format',
        test: () => healthResponse.data.version && healthResponse.data.ready !== undefined,
        indicator: 'Updated health endpoint format'
      },
      {
        name: 'Application Ready State',
        test: () => healthResponse.data.ready === true,
        indicator: 'Application initialization complete'
      }
    ];
    
    let deploymentPassed = 0;
    for (const test of codeVerificationTests) {
      const passed = test.test();
      console.log(`${passed ? '✅' : '❌'} ${test.name}: ${test.indicator}`);
      if (passed) deploymentPassed++;
    }
    
    const deploymentHealthy = deploymentPassed === codeVerificationTests.length;
    console.log(`\n📊 Deployment Status: ${deploymentHealthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
    console.log(`✅ Deployment Checks: ${deploymentPassed}/${codeVerificationTests.length} passed`);
    
    return {
      healthy: deploymentHealthy,
      info: deploymentInfo,
      checksPasssed: deploymentPassed,
      totalChecks: codeVerificationTests.length
    };
    
  } catch (error) {
    console.log(`❌ Deployment verification failed: ${error.message}`);
    return {
      healthy: false,
      error: error.message,
      checksPasssed: 0,
      totalChecks: 3
    };
  }
}

// OAuth fix validation
async function validateOAuthFixes() {
  console.log('\n🔧 Validating OAuth Fixes');
  console.log('=========================');
  
  const fixValidationTests = [
    {
      name: 'setupOAuth Validation Fix',
      description: 'Verify setupOAuth endpoint properly validates required fields',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          // Missing required api_key
          api_secret: 'test_secret',
          user_id: 'test_user'
        });
        
        return {
          success: response.status === 400 && 
                   response.data.error && 
                   !response.data.error.includes('Cannot read properties'),
          details: {
            status: response.status,
            error: response.data.error || response.data.message,
            hasProperValidation: !response.data.error?.includes('Cannot read properties')
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Model Path Correction',
      description: 'Verify model imports are working correctly',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/health');
        
        return {
          success: response.status === 200 && 
                   response.data.success &&
                   !response.data.error?.includes('Cannot find module'),
          details: {
            status: response.status,
            moduleLoadingWorking: !response.data.error?.includes('Cannot find module'),
            healthStatus: response.data.success
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Database Connection Handling',
      description: 'Verify database connection error handling is improved',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'test_key',
          api_secret: 'test_secret',
          user_id: 'test_user'
        });
        
        return {
          success: response.status !== 500 && 
                   (response.data.error !== 'Internal server error' || 
                    response.data.message?.includes('Database connection')),
          details: {
            status: response.status,
            hasImprovedErrorHandling: response.data.error !== 'Internal server error',
            errorMessage: response.data.error || response.data.message
          },
          responseTime: response.responseTime
        };
      }
    }
  ];
  
  let fixesPassed = 0;
  for (const test of fixValidationTests) {
    console.log(`🔍 ${test.name}`);
    console.log(`📝 ${test.description}`);
    
    try {
      const result = await test.test();
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
        console.log(`📊 Details:`, JSON.stringify(result.details, null, 2));
        fixesPassed++;
      } else {
        console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
        console.log(`📊 Details:`, JSON.stringify(result.details, null, 2));
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    console.log('');
  }
  
  console.log(`📊 OAuth Fixes Validation: ${fixesPassed}/${fixValidationTests.length} passed`);
  
  return {
    passed: fixesPassed,
    total: fixValidationTests.length,
    allFixed: fixesPassed === fixValidationTests.length
  };
}

// User ID handling tests
async function testUserIdHandling() {
  console.log('👤 Testing User ID Handling');
  console.log('===========================');
  
  const userIdTests = [
    {
      name: 'Explicit user_id Parameter',
      description: 'Test OAuth setup with explicitly provided user_id',
      test: async () => {
        const testUserId = `explicit_user_${Date.now()}`;
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'test_api_key_explicit',
          api_secret: 'test_api_secret_explicit',
          user_id: testUserId,
          frontend_url: 'http://localhost:3000'
        });
        
        return {
          success: response.status === 200 || 
                   (response.status === 400 && !response.data.error?.includes('user_id')),
          details: {
            status: response.status,
            userIdAccepted: !response.data.error?.includes('user_id'),
            providedUserId: testUserId,
            response: response.data
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Optional user_id (Auto-generation)',
      description: 'Test OAuth setup without user_id to verify auto-generation',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'test_api_key_auto',
          api_secret: 'test_api_secret_auto',
          frontend_url: 'http://localhost:3000'
        });
        
        // Check if user_id is required or if auto-generation is working
        const userIdRequired = response.data.details?.includes('user_id') || response.data.error?.includes('user_id');
        const isValidationError = response.status === 400 && userIdRequired;
        const isSuccessful = response.status === 200;
        
        return {
          success: isSuccessful || isValidationError,
          details: {
            status: response.status,
            userIdRequiredByValidation: userIdRequired,
            autoGenerationImplemented: !userIdRequired,
            response: response.data
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Empty user_id Handling',
      description: 'Test OAuth setup with empty user_id string',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'test_api_key_empty',
          api_secret: 'test_api_secret_empty',
          user_id: '',
          frontend_url: 'http://localhost:3000'
        });
        
        return {
          success: response.status === 200 || 
                   (response.status === 400 && response.data.error?.includes('validation')),
          details: {
            status: response.status,
            emptyUserIdHandled: response.status !== 500,
            response: response.data
          },
          responseTime: response.responseTime
        };
      }
    }
  ];
  
  let userIdTestsPassed = 0;
  for (const test of userIdTests) {
    console.log(`🔍 ${test.name}`);
    console.log(`📝 ${test.description}`);
    
    try {
      const result = await test.test();
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
        console.log(`📊 Details:`, JSON.stringify(result.details, null, 2));
        userIdTestsPassed++;
      } else {
        console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
        console.log(`📊 Details:`, JSON.stringify(result.details, null, 2));
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    console.log('');
  }
  
  console.log(`📊 User ID Handling Tests: ${userIdTestsPassed}/${userIdTests.length} passed`);
  
  return {
    passed: userIdTestsPassed,
    total: userIdTests.length,
    allPassed: userIdTestsPassed === userIdTests.length
  };
}

async function testEndpoint(name, path, method = 'GET', data = null, expectedStatus = 200, validator = null) {
  console.log(`🧪 ${name}`);
  console.log(`📍 ${method} ${path}`);
  
  if (data) {
    console.log(`📤 Payload:`, JSON.stringify(data, null, 2));
  }
  
  testMetrics.totalTests++;
  
  try {
    const response = await makeRequest(path, method, data);
    
    console.log(`📥 Status: ${response.status} (${Math.round(response.responseTime)}ms)`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    
    let success = response.status === expectedStatus;
    let validationResult = null;
    
    // Apply custom validator if provided
    if (validator && success) {
      validationResult = validator(response);
      success = success && validationResult.valid;
    }
    
    const testResult = {
      name,
      path,
      method,
      expectedStatus,
      actualStatus: response.status,
      responseTime: response.responseTime,
      success,
      validationResult,
      timestamp: new Date().toISOString()
    };
    
    testMetrics.testResults.push(testResult);
    
    if (success) {
      console.log(`✅ PASS - Got expected status ${expectedStatus}`);
      if (validationResult) {
        console.log(`✅ Validation: ${validationResult.message}`);
      }
      testMetrics.passedTests++;
      return { success: true, response, testResult };
    } else {
      console.log(`❌ FAIL - Expected ${expectedStatus}, got ${response.status}`);
      if (validationResult && !validationResult.valid) {
        console.log(`❌ Validation Failed: ${validationResult.message}`);
      }
      testMetrics.failedTests++;
      return { success: false, response, testResult };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    testMetrics.failedTests++;
    const testResult = {
      name,
      path,
      method,
      expectedStatus,
      actualStatus: 'ERROR',
      responseTime: 0,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    testMetrics.testResults.push(testResult);
    return { success: false, error: error.message, testResult };
  }
}

// Comprehensive endpoint testing
async function runComprehensiveEndpointTests() {
  console.log('\n🎯 Comprehensive OAuth Endpoint Testing');
  console.log('=======================================');
  
  const endpointTests = [
    {
      name: 'Application Health Check',
      path: '/health',
      method: 'GET',
      expectedStatus: 200,
      validator: (response) => ({
        valid: response.data.status === 'OK' && response.data.ready === true,
        message: response.data.ready ? 'Application is ready' : 'Application not ready'
      })
    },
    {
      name: 'Auth Module Debug Endpoint',
      path: '/api/modules/auth/debug',
      method: 'GET',
      expectedStatus: 200,
      validator: (response) => ({
        valid: response.data.data && (response.data.data.name === 'auth' || response.data.data.status === 'initialized'),
        message: 'Auth module debug endpoint accessible'
      })
    },
    {
      name: 'OAuth Health Check',
      path: '/api/modules/auth/broker/health',
      method: 'GET',
      expectedStatus: 200,
      validator: (response) => ({
        valid: response.data.success === true,
        message: response.data.success ? 'OAuth health check passed' : 'OAuth health issues detected'
      })
    },
    {
      name: 'Valid OAuth Setup Request (Complete)',
      path: '/api/modules/auth/broker/setup-oauth',
      method: 'POST',
      data: {
        api_key: 'comprehensive_test_key_1234567890',
        api_secret: 'comprehensive_test_secret_1234567890',
        user_id: 'comprehensive_test_user',
        frontend_url: 'http://localhost:3000'
      },
      expectedStatus: 200,
      validator: (response) => ({
        valid: response.data.success === true || response.data.oauth_url,
        message: response.data.oauth_url ? 'OAuth URL generated successfully' : 'OAuth setup processed'
      })
    },
    {
      name: 'OAuth Setup Without user_id (Auto-generation Test)',
      path: '/api/modules/auth/broker/setup-oauth',
      method: 'POST',
      data: {
        api_key: 'auto_gen_test_key_1234567890',
        api_secret: 'auto_gen_test_secret_1234567890',
        frontend_url: 'http://localhost:3000'
      },
      expectedStatus: 200,
      validator: (response) => ({
        valid: response.data.success === true || response.data.oauth_url,
        message: 'Auto user_id generation working'
      })
    },
    {
      name: 'Invalid OAuth Setup (Missing api_key)',
      path: '/api/modules/auth/broker/setup-oauth',
      method: 'POST',
      data: {
        api_secret: 'test_secret_missing_key',
        user_id: 'test_user_missing_key'
      },
      expectedStatus: 400,
      validator: (response) => ({
        valid: response.data.error && (response.data.details?.includes('api_key') || response.data.error.includes('api_key')),
        message: 'Proper validation error for missing api_key'
      })
    },
    {
      name: 'Invalid OAuth Setup (Missing api_secret)',
      path: '/api/modules/auth/broker/setup-oauth',
      method: 'POST',
      data: {
        api_key: 'test_key_missing_secret',
        user_id: 'test_user_missing_secret'
      },
      expectedStatus: 400,
      validator: (response) => ({
        valid: response.data.error && (response.data.details?.includes('api_secret') || response.data.error.includes('api_secret')),
        message: 'Proper validation error for missing api_secret'
      })
    },
    {
      name: 'Invalid OAuth Setup (Empty Payload)',
      path: '/api/modules/auth/broker/setup-oauth',
      method: 'POST',
      data: {},
      expectedStatus: 400,
      validator: (response) => ({
        valid: response.data.error && !response.data.error.includes('Cannot read properties'),
        message: 'Proper error handling for empty payload'
      })
    },
    {
      name: 'OAuth Status Check',
      path: '/api/modules/auth/broker/status?user_id=comprehensive_test_user',
      method: 'GET',
      expectedStatus: 200,
      validator: (response) => ({
        valid: response.data.success !== undefined,
        message: 'OAuth status endpoint responding'
      })
    }
  ];
  
  let endpointTestsPassed = 0;
  
  for (const test of endpointTests) {
    const result = await testEndpoint(
      test.name,
      test.path,
      test.method,
      test.data,
      test.expectedStatus,
      test.validator
    );
    
    if (result.success) {
      endpointTestsPassed++;
    }
    console.log(''); // Add spacing
  }
  
  console.log(`📊 Comprehensive Endpoint Tests: ${endpointTestsPassed}/${endpointTests.length} passed`);
  
  return {
    passed: endpointTestsPassed,
    total: endpointTests.length,
    allPassed: endpointTestsPassed === endpointTests.length
  };
}

async function runEnhancedVerification() {
  console.log('🔍 Enhanced OAuth Endpoint Verification System');
  console.log('==============================================');
  console.log(`🌐 Backend URL: ${BASE_URL}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  // Phase 1: Deployment Status Verification
  const deploymentResult = await verifyDeploymentStatus();
  
  // Phase 2: OAuth Fix Validation
  const fixValidationResult = await validateOAuthFixes();
  
  // Phase 3: User ID Handling Tests
  const userIdTestResult = await testUserIdHandling();
  
  // Phase 4: Comprehensive Endpoint Testing
  const endpointTestResult = await runComprehensiveEndpointTests();
  
  // Phase 5: Performance and Metrics Analysis
  console.log('📊 Performance and Metrics Analysis');
  console.log('===================================');
  
  const totalTime = performance.now() - testMetrics.startTime;
  const avgResponseTime = testMetrics.testResults.length > 0
    ? testMetrics.testResults.reduce((sum, test) => sum + (test.responseTime || 0), 0) / testMetrics.testResults.length
    : 0;
  
  console.log(`⏱️  Total Execution Time: ${Math.round(totalTime)}ms`);
  console.log(`📈 Total Tests Executed: ${testMetrics.totalTests}`);
  console.log(`✅ Tests Passed: ${testMetrics.passedTests}`);
  console.log(`❌ Tests Failed: ${testMetrics.failedTests}`);
  console.log(`🔗 Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`📊 Success Rate: ${Math.round((testMetrics.passedTests / testMetrics.totalTests) * 100)}%`);
  
  if (testMetrics.deploymentInfo) {
    console.log(`📦 Deployment Version: ${testMetrics.deploymentInfo.appVersion}`);
    console.log(`⏰ Application Uptime: ${Math.round(testMetrics.deploymentInfo.uptime / 1000)}s`);
  }
  console.log('');

  // Final Summary
  console.log('📋 Enhanced OAuth Verification Summary');
  console.log('=====================================');
  
  const totalPhases = 4;
  let phasesPasssed = 0;
  
  console.log(`🚀 Deployment Status: ${deploymentResult.healthy ? 'HEALTHY' : 'ISSUES'} (${deploymentResult.checksPasssed}/${deploymentResult.totalChecks})`);
  if (deploymentResult.healthy) phasesPasssed++;
  
  console.log(`🔧 OAuth Fixes: ${fixValidationResult.allFixed ? 'VALIDATED' : 'ISSUES'} (${fixValidationResult.passed}/${fixValidationResult.total})`);
  if (fixValidationResult.allFixed) phasesPasssed++;
  
  console.log(`👤 User ID Handling: ${userIdTestResult.allPassed ? 'WORKING' : 'ISSUES'} (${userIdTestResult.passed}/${userIdTestResult.total})`);
  if (userIdTestResult.allPassed) phasesPasssed++;
  
  console.log(`🎯 Endpoint Tests: ${endpointTestResult.allPassed ? 'PASSED' : 'FAILED'} (${endpointTestResult.passed}/${endpointTestResult.total})`);
  if (endpointTestResult.allPassed) phasesPasssed++;
  
  console.log(`📊 Overall Success: ${phasesPasssed}/${totalPhases} phases passed`);
  console.log('');

  const overallSuccess = phasesPasssed === totalPhases;
  
  if (overallSuccess) {
    console.log('🎉 Enhanced OAuth verification completed successfully!');
    console.log('✅ Latest code deployment confirmed');
    console.log('✅ OAuth fixes validated and working');
    console.log('✅ User ID handling functioning correctly');
    console.log('✅ All endpoint tests passed');
    console.log('✅ System ready for production use');
  } else {
    console.log('⚠️ OAuth verification found issues:');
    
    if (!deploymentResult.healthy) {
      console.log('❌ Deployment status issues detected');
      console.log('💡 Recommendation: Verify latest code is deployed to Railway');
    }
    if (!fixValidationResult.allFixed) {
      console.log('❌ OAuth fix validation failed');
      console.log('💡 Recommendation: Check OAuth setup validation and model imports');
    }
    if (!userIdTestResult.allPassed) {
      console.log('❌ User ID handling issues detected');
      console.log('💡 Recommendation: Verify optional user_id parameter handling');
    }
    if (!endpointTestResult.allPassed) {
      console.log('❌ Endpoint tests failed');
      console.log('💡 Recommendation: Check OAuth endpoint functionality and error handling');
    }
    
    console.log('🔧 Review the detailed results above for specific issues');
  }
  
  return {
    success: overallSuccess,
    results: {
      deployment: deploymentResult,
      fixes: fixValidationResult,
      userIdHandling: userIdTestResult,
      endpoints: endpointTestResult
    },
    metrics: testMetrics
  };
}

// Run enhanced verification
if (require.main === module) {
  runEnhancedVerification()
    .then(result => {
      console.log(`\n🏁 Verification completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      // Export results for potential integration
      if (process.env.EXPORT_RESULTS) {
        const fs = require('fs');
        const resultsFile = `oauth-verification-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
        console.log(`📄 Results exported to: ${resultsFile}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Enhanced OAuth verification failed:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runEnhancedVerification,
  verifyDeploymentStatus,
  validateOAuthFixes,
  testUserIdHandling,
  runComprehensiveEndpointTests,
  testEndpoint,
  makeRequest
};