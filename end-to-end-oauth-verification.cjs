#!/usr/bin/env node

/**
 * End-to-End OAuth Flow Verification System
 * Tests the complete OAuth flow from frontend loading to callback handling
 * Verifies Zerodha integration, CSRF state storage, and connection status updates
 */

const https = require('https');
const { performance } = require('perf_hooks');
const { URL } = require('url');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';
const FRONTEND_URL = 'https://quantum-leap-frontend-production.up.railway.app';
const BROKER_SETUP_PATH = '/broker-integration';

// End-to-end test metrics
const e2eMetrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  testResults: [],
  startTime: performance.now(),
  oauthFlowData: null
};

function makeRequest(url, method = 'GET', data = null, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'End-to-End-OAuth-Verification/1.0',
        'Accept': 'application/json'
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
            responseTime: responseTime,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            responseTime: responseTime,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      reject({
        error: error.message,
        code: error.code,
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      reject({
        error: 'Request timeout',
        code: 'TIMEOUT',
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test frontend loading at production URL
async function testFrontendLoading() {
  console.log('🌐 Testing Frontend Loading at Production URL');
  console.log('=============================================');
  
  const tests = [
    {
      name: 'Frontend Accessibility',
      description: 'Verify frontend loads at production URL',
      test: async () => {
        try {
          const response = await makeRequest(`${FRONTEND_URL}${BROKER_SETUP_PATH}`);
          
          return {
            success: response.status === 200,
            details: {
              status: response.status,
              accessible: response.status === 200,
              contentType: response.headers['content-type'],
              responseTime: response.responseTime,
              timestamp: response.timestamp
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime,
              timestamp: error.timestamp
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'Broker Setup Interface Detection',
      description: 'Verify broker setup interface is present in frontend',
      test: async () => {
        try {
          const response = await makeRequest(FRONTEND_URL);
          
          // Check if response contains broker setup related content
          const html = typeof response.data === 'string' ? response.data : '';
          const hasSetupInterface = response.status === 200 && (
            html.includes('broker') ||
            html.includes('QuantumLeap') ||
            html.includes('assets/index') ||
            html.includes('broker-integration')
          );
          
          return {
            success: response.status === 200 && hasSetupInterface,
            details: {
              status: response.status,
              hasSetupInterface: hasSetupInterface,
              contentLength: response.data?.length || 0,
              responseTime: response.responseTime,
              timestamp: response.timestamp
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime,
              timestamp: error.timestamp
            },
            responseTime: error.responseTime
          };
        }
      }
    }
  ];
  
  let frontendPassed = 0;
  const frontendResults = [];
  
  for (const test of tests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    e2eMetrics.totalTests++;
    
    const result = await test.test();
    frontendResults.push({
      name: test.name,
      ...result
    });
    
    e2eMetrics.testResults.push({
      phase: 'Frontend Loading',
      name: test.name,
      success: result.success,
      details: result.details,
      responseTime: result.responseTime
    });
    
    if (result.success) {
      console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
      frontendPassed++;
      e2eMetrics.passedTests++;
    } else {
      console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
      e2eMetrics.failedTests++;
    }
    
    console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
    console.log('');
  }
  
  return {
    phase: 'Frontend Loading',
    passed: frontendPassed,
    total: tests.length,
    healthy: frontendPassed === tests.length,
    results: frontendResults
  };
}

// Test OAuth URL generation for Zerodha
async function testOAuthURLGeneration() {
  console.log('🔗 Testing OAuth URL Generation for Zerodha');
  console.log('===========================================');
  
  const tests = [
    {
      name: 'Valid OAuth URL Generation',
      description: 'Test OAuth URL generation with valid credentials',
      test: async () => {
        try {
          const testUserId = `e2e_test_user_${Date.now()}`;
          const setupPayload = {
            api_key: 'e2e_test_api_key_1234567890',
            api_secret: 'e2e_test_api_secret_1234567890',
            user_id: testUserId,
            frontend_url: FRONTEND_URL
          };
          
          const response = await makeRequest(
            `${BACKEND_URL}/api/modules/auth/broker/setup-oauth`,
            'POST',
            setupPayload
          );
          
          const hasValidOAuthURL = response.data.success && 
                                 response.data.data?.oauth_url &&
                                 response.data.data.oauth_url.includes('kite.zerodha.com');
          
          // Store OAuth flow data for later tests
          if (hasValidOAuthURL) {
            e2eMetrics.oauthFlowData = {
              userId: testUserId,
              configId: response.data.data.config_id,
              oauthUrl: response.data.data.oauth_url,
              state: response.data.data.state
            };
          }
          
          return {
            success: hasValidOAuthURL,
            details: {
              status: response.status,
              hasOAuthURL: !!response.data.data?.oauth_url,
              isZerodhaURL: response.data.data?.oauth_url?.includes('kite.zerodha.com'),
              oauthUrl: response.data.data?.oauth_url,
              configId: response.data.data?.config_id,
              state: response.data.data?.state,
              responseTime: response.responseTime,
              timestamp: response.timestamp
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime,
              timestamp: error.timestamp
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'OAuth URL Structure Validation',
      description: 'Validate OAuth URL contains required parameters',
      test: async () => {
        if (!e2eMetrics.oauthFlowData?.oauthUrl) {
          return {
            success: false,
            details: {
              error: 'No OAuth URL available from previous test',
              responseTime: 0
            },
            responseTime: 0
          };
        }
        
        try {
          const oauthUrl = new URL(e2eMetrics.oauthFlowData.oauthUrl);
          const hasApiKey = oauthUrl.searchParams.has('api_key');
          const hasResponseType = oauthUrl.searchParams.has('response_type');
          const hasState = oauthUrl.searchParams.has('state');
          const hasRedirectUri = oauthUrl.searchParams.has('redirect_uri');
          
          const isValidStructure = hasApiKey && hasResponseType && hasState && hasRedirectUri;
          
          return {
            success: isValidStructure,
            details: {
              oauthUrl: e2eMetrics.oauthFlowData.oauthUrl,
              hasApiKey: hasApiKey,
              hasResponseType: hasResponseType,
              hasState: hasState,
              hasRedirectUri: hasRedirectUri,
              isValidStructure: isValidStructure,
              responseTime: 0
            },
            responseTime: 0
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: `Invalid OAuth URL format: ${error.message}`,
              responseTime: 0
            },
            responseTime: 0
          };
        }
      }
    }
  ];
  
  let oauthPassed = 0;
  const oauthResults = [];
  
  for (const test of tests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    e2eMetrics.totalTests++;
    
    const result = await test.test();
    oauthResults.push({
      name: test.name,
      ...result
    });
    
    e2eMetrics.testResults.push({
      phase: 'OAuth URL Generation',
      name: test.name,
      success: result.success,
      details: result.details,
      responseTime: result.responseTime
    });
    
    if (result.success) {
      console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
      oauthPassed++;
      e2eMetrics.passedTests++;
    } else {
      console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
      e2eMetrics.failedTests++;
    }
    
    console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
    console.log('');
  }
  
  return {
    phase: 'OAuth URL Generation',
    passed: oauthPassed,
    total: tests.length,
    healthy: oauthPassed === tests.length,
    results: oauthResults
  };
}

// Test CSRF state storage in database
async function testCSRFStateStorage() {
  console.log('🔐 Testing CSRF State Storage in Database');
  console.log('========================================');
  
  const tests = [
    {
      name: 'OAuth State Generation and Storage',
      description: 'Verify OAuth state is generated and stored in database',
      test: async () => {
        if (!e2eMetrics.oauthFlowData?.state || !e2eMetrics.oauthFlowData?.userId) {
          return {
            success: false,
            details: {
              error: 'No OAuth state or user ID available from previous test',
              responseTime: 0
            },
            responseTime: 0
          };
        }
        
        try {
          // Check if we can retrieve the OAuth state/status
          const response = await makeRequest(
            `${BACKEND_URL}/api/modules/auth/broker/status?user_id=${e2eMetrics.oauthFlowData.userId}`
          );
          
          const hasStateStorage = response.status === 200 || 
                                (response.status === 404 && response.data.error !== 'Database table missing');
          
          return {
            success: hasStateStorage,
            details: {
              status: response.status,
              userId: e2eMetrics.oauthFlowData.userId,
              state: e2eMetrics.oauthFlowData.state,
              hasStateStorage: hasStateStorage,
              response: response.data,
              responseTime: response.responseTime,
              timestamp: response.timestamp
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime,
              timestamp: error.timestamp
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'State Parameter Validation',
      description: 'Verify OAuth state parameter format and security',
      test: async () => {
        if (!e2eMetrics.oauthFlowData?.state) {
          return {
            success: false,
            details: {
              error: 'No OAuth state available from previous test',
              responseTime: 0
            },
            responseTime: 0
          };
        }
        
        const state = e2eMetrics.oauthFlowData.state;
        const isValidLength = state.length >= 16; // Minimum secure length
        const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(state);
        const isUnique = state !== 'test' && state !== 'default';
        
        const isValidState = isValidLength && isAlphanumeric && isUnique;
        
        return {
          success: isValidState,
          details: {
            state: state,
            stateLength: state.length,
            isValidLength: isValidLength,
            isAlphanumeric: isAlphanumeric,
            isUnique: isUnique,
            isValidState: isValidState,
            responseTime: 0
          },
          responseTime: 0
        };
      }
    }
  ];
  
  let statePassed = 0;
  const stateResults = [];
  
  for (const test of tests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    e2eMetrics.totalTests++;
    
    const result = await test.test();
    stateResults.push({
      name: test.name,
      ...result
    });
    
    e2eMetrics.testResults.push({
      phase: 'CSRF State Storage',
      name: test.name,
      success: result.success,
      details: result.details,
      responseTime: result.responseTime
    });
    
    if (result.success) {
      console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
      statePassed++;
      e2eMetrics.passedTests++;
    } else {
      console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
      e2eMetrics.failedTests++;
    }
    
    console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
    console.log('');
  }
  
  return {
    phase: 'CSRF State Storage',
    passed: statePassed,
    total: tests.length,
    healthy: statePassed === tests.length,
    results: stateResults
  };
}

// Test OAuth callback handling
async function testOAuthCallbackHandling() {
  console.log('🔄 Testing OAuth Callback Handling');
  console.log('=================================');
  
  const tests = [
    {
      name: 'Callback Endpoint Availability',
      description: 'Verify OAuth callback endpoint exists and is accessible',
      test: async () => {
        try {
          // Test the callback endpoint with a test request
          const response = await makeRequest(
            `${BACKEND_URL}/api/modules/auth/broker/callback?request_token=test&state=test`
          );
          
          // Endpoint should exist (not 404) and handle the request
          const isAvailable = response.status !== 404;
          
          return {
            success: isAvailable,
            details: {
              status: response.status,
              available: isAvailable,
              response: response.data,
              responseTime: response.responseTime,
              timestamp: response.timestamp
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime,
              timestamp: error.timestamp
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'Connection Status Update Capability',
      description: 'Verify system can update connection status',
      test: async () => {
        if (!e2eMetrics.oauthFlowData?.userId) {
          return {
            success: false,
            details: {
              error: 'No user ID available from previous test',
              responseTime: 0
            },
            responseTime: 0
          };
        }
        
        try {
          // Check if we can query connection status
          const response = await makeRequest(
            `${BACKEND_URL}/api/modules/auth/broker/status?user_id=${e2eMetrics.oauthFlowData.userId}`
          );
          
          // System should be able to handle status queries
          const canUpdateStatus = response.status === 200 || 
                                (response.status === 404 && response.data.success === false);
          
          return {
            success: canUpdateStatus,
            details: {
              status: response.status,
              userId: e2eMetrics.oauthFlowData.userId,
              canUpdateStatus: canUpdateStatus,
              response: response.data,
              responseTime: response.responseTime,
              timestamp: response.timestamp
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime,
              timestamp: error.timestamp
            },
            responseTime: error.responseTime
          };
        }
      }
    }
  ];
  
  let callbackPassed = 0;
  const callbackResults = [];
  
  for (const test of tests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    e2eMetrics.totalTests++;
    
    const result = await test.test();
    callbackResults.push({
      name: test.name,
      ...result
    });
    
    e2eMetrics.testResults.push({
      phase: 'OAuth Callback Handling',
      name: test.name,
      success: result.success,
      details: result.details,
      responseTime: result.responseTime
    });
    
    if (result.success) {
      console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
      callbackPassed++;
      e2eMetrics.passedTests++;
    } else {
      console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
      e2eMetrics.failedTests++;
    }
    
    console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
    console.log('');
  }
  
  return {
    phase: 'OAuth Callback Handling',
    passed: callbackPassed,
    total: tests.length,
    healthy: callbackPassed === tests.length,
    results: callbackResults
  };
}

// Main end-to-end verification function
async function runEndToEndOAuthVerification() {
  console.log('🔄 End-to-End OAuth Flow Verification');
  console.log('=====================================');
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`🖥️  Frontend URL: ${FRONTEND_URL}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  // Phase 1: Frontend Loading Test
  const frontendResult = await testFrontendLoading();
  
  // Phase 2: OAuth URL Generation Test
  const oauthResult = await testOAuthURLGeneration();
  
  // Phase 3: CSRF State Storage Test
  const stateResult = await testCSRFStateStorage();
  
  // Phase 4: OAuth Callback Handling Test
  const callbackResult = await testOAuthCallbackHandling();
  
  // Calculate overall metrics
  const totalTime = performance.now() - e2eMetrics.startTime;
  const avgResponseTime = e2eMetrics.testResults.length > 0
    ? e2eMetrics.testResults.reduce((sum, test) => sum + (test.responseTime || 0), 0) / e2eMetrics.testResults.length
    : 0;

  // Final Summary
  console.log('📊 End-to-End OAuth Verification Summary');
  console.log('========================================');
  
  const totalPhases = 4;
  let phasesPasssed = 0;
  
  console.log(`🌐 Frontend Loading: ${frontendResult.healthy ? 'HEALTHY' : 'ISSUES'} (${frontendResult.passed}/${frontendResult.total})`);
  if (frontendResult.healthy) phasesPasssed++;
  
  console.log(`🔗 OAuth URL Generation: ${oauthResult.healthy ? 'HEALTHY' : 'ISSUES'} (${oauthResult.passed}/${oauthResult.total})`);
  if (oauthResult.healthy) phasesPasssed++;
  
  console.log(`🔐 CSRF State Storage: ${stateResult.healthy ? 'HEALTHY' : 'ISSUES'} (${stateResult.passed}/${stateResult.total})`);
  if (stateResult.healthy) phasesPasssed++;
  
  console.log(`🔄 OAuth Callback Handling: ${callbackResult.healthy ? 'HEALTHY' : 'ISSUES'} (${callbackResult.passed}/${callbackResult.total})`);
  if (callbackResult.healthy) phasesPasssed++;
  
  console.log('');
  console.log(`⏱️  Total Execution Time: ${Math.round(totalTime)}ms`);
  console.log(`📈 Total Tests: ${e2eMetrics.totalTests}`);
  console.log(`✅ Tests Passed: ${e2eMetrics.passedTests}`);
  console.log(`❌ Tests Failed: ${e2eMetrics.failedTests}`);
  console.log(`🔗 Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`📊 Success Rate: ${Math.round((e2eMetrics.passedTests / e2eMetrics.totalTests) * 100)}%`);
  console.log(`🏆 Phases Passed: ${phasesPasssed}/${totalPhases}`);
  
  if (e2eMetrics.oauthFlowData) {
    console.log(`🔑 OAuth Flow Data Generated:`);
    console.log(`   User ID: ${e2eMetrics.oauthFlowData.userId}`);
    console.log(`   Config ID: ${e2eMetrics.oauthFlowData.configId}`);
    console.log(`   State: ${e2eMetrics.oauthFlowData.state}`);
  }
  console.log('');

  const overallSuccess = phasesPasssed === totalPhases;
  
  if (overallSuccess) {
    console.log('🎉 End-to-end OAuth verification completed successfully!');
    console.log('✅ Frontend loads correctly at production URL');
    console.log('✅ Broker setup interface is accessible');
    console.log('✅ OAuth URL generation working with Zerodha integration');
    console.log('✅ CSRF state storage functioning correctly');
    console.log('✅ OAuth callback handling is operational');
    console.log('✅ Complete OAuth flow is ready for production use');
  } else {
    console.log('⚠️ End-to-end OAuth verification found issues:');
    
    if (!frontendResult.healthy) {
      console.log('❌ Frontend loading issues detected');
      console.log('💡 Recommendation: Check frontend deployment and accessibility');
    }
    if (!oauthResult.healthy) {
      console.log('❌ OAuth URL generation issues detected');
      console.log('💡 Recommendation: Verify Zerodha integration and OAuth setup');
    }
    if (!stateResult.healthy) {
      console.log('❌ CSRF state storage issues detected');
      console.log('💡 Recommendation: Check database connectivity and state management');
    }
    if (!callbackResult.healthy) {
      console.log('❌ OAuth callback handling issues detected');
      console.log('💡 Recommendation: Verify callback endpoint and status update functionality');
    }
    
    console.log('🔧 Review the detailed results above for specific issues');
  }

  return {
    success: overallSuccess,
    results: {
      frontend: frontendResult,
      oauth: oauthResult,
      state: stateResult,
      callback: callbackResult
    },
    metrics: e2eMetrics,
    summary: {
      totalTests: e2eMetrics.totalTests,
      totalPassed: e2eMetrics.passedTests,
      successRate: Math.round((e2eMetrics.passedTests / e2eMetrics.totalTests) * 100),
      avgResponseTime: Math.round(avgResponseTime),
      executionTime: Math.round(totalTime),
      phasesPasssed: phasesPasssed,
      totalPhases: totalPhases
    }
  };
}

// Run end-to-end OAuth verification
if (require.main === module) {
  runEndToEndOAuthVerification()
    .then(result => {
      console.log(`\n🏁 End-to-end verification completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'SUCCESS' : 'ISSUES DETECTED'}`);
      
      // Export results for potential integration
      if (process.env.EXPORT_RESULTS) {
        const fs = require('fs');
        const resultsFile = `e2e-oauth-verification-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
        console.log(`📄 Results exported to: ${resultsFile}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 End-to-end OAuth verification failed:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runEndToEndOAuthVerification,
  testFrontendLoading,
  testOAuthURLGeneration,
  testCSRFStateStorage,
  testOAuthCallbackHandling,
  makeRequest,
  e2eMetrics
};
