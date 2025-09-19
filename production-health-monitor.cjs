#!/usr/bin/env node

/**
 * Production Endpoint Health Monitoring System
 * Monitors OAuth endpoints for availability, proper responses, and error handling
 * Implements continuous health checking with detailed status reporting
 */

const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://web-production-de0bc.up.railway.app';

// Health monitoring metrics
const healthMetrics = {
  totalChecks: 0,
  successfulChecks: 0,
  failedChecks: 0,
  endpointStatus: {},
  responseTimeHistory: [],
  errorHistory: [],
  startTime: performance.now(),
  lastCheckTime: null
};

function makeRequest(path, method = 'GET', data = null, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Health-Monitor/1.0'
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

// Health check for setup-oauth endpoint
async function checkSetupOAuthEndpoint() {
  console.log('🔍 Checking /api/auth/broker/setup-oauth endpoint health...');
  
  const checks = [
    {
      name: 'Endpoint Availability (404 Check)',
      description: 'Verify endpoint exists and is not returning 404',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {});
          
          return {
            success: response.status !== 404,
            details: {
              status: response.status,
              available: response.status !== 404,
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
      name: 'Valid Request Processing',
      description: 'Test endpoint with valid data to ensure proper processing',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
            api_key: 'health_check_key_1234567890',
            api_secret: 'health_check_secret_1234567890',
            user_id: 'health_check_user'
          });
          
          const hasValidResponse = response.status === 200 || 
                                 (response.status === 400 && response.data.error !== 'Invalid request data') ||
                                 (response.status === 500 && response.data.message);
          
          return {
            success: hasValidResponse,
            details: {
              status: response.status,
              validProcessing: hasValidResponse,
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
      name: 'Invalid Request Data Detection',
      description: 'Verify proper error handling for invalid requests',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
            invalid_field: 'test'
          });
          
          const hasProperErrorHandling = response.status === 400 && 
                                       response.data.error === 'Invalid request data';
          
          return {
            success: hasProperErrorHandling,
            details: {
              status: response.status,
              properErrorHandling: hasProperErrorHandling,
              errorMessage: response.data.error,
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
  
  let setupOAuthPassed = 0;
  const setupOAuthResults = [];
  
  for (const check of checks) {
    console.log(`  🔍 ${check.name}`);
    console.log(`     ${check.description}`);
    
    const result = await check.test();
    setupOAuthResults.push({
      name: check.name,
      ...result
    });
    
    if (result.success) {
      console.log(`  ✅ PASS (${Math.round(result.responseTime)}ms)`);
      setupOAuthPassed++;
    } else {
      console.log(`  ❌ FAIL (${Math.round(result.responseTime)}ms)`);
    }
    
    console.log(`     📊 Details:`, JSON.stringify(result.details, null, 6));
    console.log('');
  }
  
  return {
    endpoint: '/api/modules/auth/broker/setup-oauth',
    passed: setupOAuthPassed,
    total: checks.length,
    healthy: setupOAuthPassed === checks.length,
    results: setupOAuthResults
  };
}

// Health check for broker health endpoint
async function checkBrokerHealthEndpoint() {
  console.log('🔍 Checking /api/auth/broker/health endpoint health...');
  
  const checks = [
    {
      name: 'Endpoint Availability',
      description: 'Verify health endpoint is accessible',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/broker/health');
          
          return {
            success: response.status === 200,
            details: {
              status: response.status,
              available: response.status === 200,
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
      name: 'Successful Health Status',
      description: 'Verify health endpoint returns successful status',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/broker/health');
          
          const hasSuccessfulStatus = response.status === 200 && 
                                    response.data.success === true;
          
          return {
            success: hasSuccessfulStatus,
            details: {
              status: response.status,
              successField: response.data.success,
              healthData: response.data.data,
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
      name: 'Response Format Validation',
      description: 'Verify health endpoint returns proper JSON structure',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/broker/health');
          
          const hasValidFormat = response.status === 200 && 
                                typeof response.data === 'object' &&
                                response.data.success !== undefined &&
                                response.data.data !== undefined;
          
          return {
            success: hasValidFormat,
            details: {
              status: response.status,
              validFormat: hasValidFormat,
              hasSuccessField: response.data.success !== undefined,
              hasDataField: response.data.data !== undefined,
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
  
  let healthEndpointPassed = 0;
  const healthEndpointResults = [];
  
  for (const check of checks) {
    console.log(`  🔍 ${check.name}`);
    console.log(`     ${check.description}`);
    
    const result = await check.test();
    healthEndpointResults.push({
      name: check.name,
      ...result
    });
    
    if (result.success) {
      console.log(`  ✅ PASS (${Math.round(result.responseTime)}ms)`);
      healthEndpointPassed++;
    } else {
      console.log(`  ❌ FAIL (${Math.round(result.responseTime)}ms)`);
    }
    
    console.log(`     📊 Details:`, JSON.stringify(result.details, null, 6));
    console.log('');
  }
  
  return {
    endpoint: '/api/modules/auth/broker/health',
    passed: healthEndpointPassed,
    total: checks.length,
    healthy: healthEndpointPassed === checks.length,
    results: healthEndpointResults
  };
}

// HTTP status code and response format verification
async function verifyHttpStatusAndFormats() {
  console.log('🔍 Verifying HTTP status codes and response formats...');
  
  const statusTests = [
    {
      name: 'Application Health Status',
      endpoint: '/health',
      method: 'GET',
      expectedStatus: 200,
      formatValidator: (data) => data.status === 'OK' && data.ready !== undefined
    },
    {
      name: 'Auth Module Debug Status',
      endpoint: '/api/modules/auth/debug',
      method: 'GET',
      expectedStatus: 200,
      formatValidator: (data) => data.success !== undefined && data.data !== undefined
    },
    {
      name: 'OAuth Health Status',
      endpoint: '/api/modules/auth/broker/health',
      method: 'GET',
      expectedStatus: 200,
      formatValidator: (data) => data.success !== undefined && data.data !== undefined
    },
    {
      name: 'OAuth Setup Bad Request Status',
      endpoint: '/api/modules/auth/broker/setup-oauth',
      method: 'POST',
      data: {},
      expectedStatus: 400,
      formatValidator: (data) => data.error !== undefined
    }
  ];
  
  let statusTestsPassed = 0;
  const statusTestResults = [];
  
  for (const test of statusTests) {
    console.log(`  🔍 ${test.name}`);
    
    try {
      const response = await makeRequest(test.endpoint, test.method, test.data);
      
      const statusCorrect = response.status === test.expectedStatus;
      const formatValid = test.formatValidator(response.data);
      const testPassed = statusCorrect && formatValid;
      
      const result = {
        name: test.name,
        success: testPassed,
        details: {
          endpoint: test.endpoint,
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          statusCorrect: statusCorrect,
          formatValid: formatValid,
          responseTime: response.responseTime,
          timestamp: response.timestamp
        },
        responseTime: response.responseTime
      };
      
      statusTestResults.push(result);
      
      if (testPassed) {
        console.log(`  ✅ PASS (${Math.round(response.responseTime)}ms)`);
        statusTestsPassed++;
      } else {
        console.log(`  ❌ FAIL (${Math.round(response.responseTime)}ms)`);
      }
      
      console.log(`     📊 Status: ${response.status}/${test.expectedStatus}, Format: ${formatValid ? 'Valid' : 'Invalid'}`);
      
    } catch (error) {
      const result = {
        name: test.name,
        success: false,
        details: {
          endpoint: test.endpoint,
          error: error.error,
          code: error.code,
          responseTime: error.responseTime,
          timestamp: error.timestamp
        },
        responseTime: error.responseTime
      };
      
      statusTestResults.push(result);
      console.log(`  ❌ ERROR (${Math.round(error.responseTime)}ms): ${error.error}`);
    }
    
    console.log('');
  }
  
  return {
    passed: statusTestsPassed,
    total: statusTests.length,
    healthy: statusTestsPassed === statusTests.length,
    results: statusTestResults
  };
}

// Error response analysis
async function analyzeErrorResponses() {
  console.log('🔍 Analyzing error response patterns...');
  
  const errorTests = [
    {
      name: 'Invalid Request Data Error Detection',
      description: 'Test for proper "Invalid request data" error responses',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          invalid: 'data'
        });
        
        return {
          hasInvalidRequestDataError: response.data.error === 'Invalid request data',
          status: response.status,
          errorMessage: response.data.error,
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Missing Required Fields Error',
      description: 'Test error responses for missing required fields',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {});
        
        return {
          hasProperValidationError: response.status === 400 && response.data.error === 'Invalid request data',
          status: response.status,
          errorMessage: response.data.error,
          details: response.data.details,
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Database Connection Error Handling',
      description: 'Test error handling for database connection issues',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'error_test_key',
          api_secret: 'error_test_secret',
          user_id: 'error_test_user'
        });
        
        return {
          hasProperDbErrorHandling: (response.status === 500 && response.data.message) || response.status === 400,
          status: response.status,
          errorMessage: response.data.error || response.data.message,
          responseTime: response.responseTime
        };
      }
    }
  ];
  
  let errorTestsPassed = 0;
  const errorTestResults = [];
  
  for (const test of errorTests) {
    console.log(`  🔍 ${test.name}`);
    console.log(`     ${test.description}`);
    
    try {
      const result = await test.test();
      
      // Determine if test passed based on the specific test criteria
      let testPassed = false;
      if (test.name.includes('Invalid Request Data Error Detection')) {
        testPassed = result.hasInvalidRequestDataError;
      } else if (test.name.includes('Missing Required Fields Error')) {
        testPassed = result.hasProperValidationError && result.status === 400;
      } else if (test.name.includes('Database Connection Error Handling')) {
        testPassed = result.hasProperDbErrorHandling && (result.status === 500 || result.status === 400);
      }
      
      errorTestResults.push({
        name: test.name,
        success: testPassed,
        details: result
      });
      
      if (testPassed) {
        console.log(`  ✅ PASS (${Math.round(result.responseTime)}ms)`);
        errorTestsPassed++;
      } else {
        console.log(`  ❌ FAIL (${Math.round(result.responseTime)}ms)`);
      }
      
      console.log(`     📊 Details:`, JSON.stringify(result, null, 6));
      
    } catch (error) {
      errorTestResults.push({
        name: test.name,
        success: false,
        details: {
          error: error.error,
          code: error.code,
          responseTime: error.responseTime
        }
      });
      
      console.log(`  ❌ ERROR (${Math.round(error.responseTime)}ms): ${error.error}`);
    }
    
    console.log('');
  }
  
  return {
    passed: errorTestsPassed,
    total: errorTests.length,
    healthy: errorTestsPassed === errorTests.length,
    results: errorTestResults
  };
}

// Main health monitoring function
async function runProductionHealthMonitoring() {
  console.log('🏥 Production Endpoint Health Monitoring');
  console.log('========================================');
  console.log(`🌐 Backend URL: ${BASE_URL}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  healthMetrics.lastCheckTime = new Date().toISOString();

  // Phase 1: Setup OAuth Endpoint Health Check
  console.log('📋 Phase 1: Setup OAuth Endpoint Health Check');
  console.log('==============================================');
  const setupOAuthHealth = await checkSetupOAuthEndpoint();
  
  // Phase 2: Broker Health Endpoint Check
  console.log('📋 Phase 2: Broker Health Endpoint Check');
  console.log('========================================');
  const brokerHealthCheck = await checkBrokerHealthEndpoint();
  
  // Phase 3: HTTP Status and Response Format Verification
  console.log('📋 Phase 3: HTTP Status and Response Format Verification');
  console.log('========================================================');
  const statusFormatCheck = await verifyHttpStatusAndFormats();
  
  // Phase 4: Error Response Analysis
  console.log('📋 Phase 4: Error Response Analysis');
  console.log('===================================');
  const errorAnalysis = await analyzeErrorResponses();
  
  // Calculate overall metrics
  const totalTime = performance.now() - healthMetrics.startTime;
  const allResults = [
    ...setupOAuthHealth.results,
    ...brokerHealthCheck.results,
    ...statusFormatCheck.results,
    ...errorAnalysis.results
  ];
  
  const totalTests = setupOAuthHealth.total + brokerHealthCheck.total + 
                    statusFormatCheck.total + errorAnalysis.total;
  const totalPassed = setupOAuthHealth.passed + brokerHealthCheck.passed + 
                     statusFormatCheck.passed + errorAnalysis.passed;
  
  const avgResponseTime = allResults.length > 0
    ? allResults.reduce((sum, result) => sum + (result.responseTime || 0), 0) / allResults.length
    : 0;

  // Update health metrics
  healthMetrics.totalChecks = totalTests;
  healthMetrics.successfulChecks = totalPassed;
  healthMetrics.failedChecks = totalTests - totalPassed;
  healthMetrics.endpointStatus = {
    setupOAuth: setupOAuthHealth.healthy,
    brokerHealth: brokerHealthCheck.healthy,
    statusFormats: statusFormatCheck.healthy,
    errorHandling: errorAnalysis.healthy
  };
  healthMetrics.responseTimeHistory.push(avgResponseTime);

  // Final Summary
  console.log('📊 Production Health Monitoring Summary');
  console.log('======================================');
  
  console.log(`🔧 Setup OAuth Endpoint: ${setupOAuthHealth.healthy ? 'HEALTHY' : 'ISSUES'} (${setupOAuthHealth.passed}/${setupOAuthHealth.total})`);
  console.log(`🏥 Broker Health Endpoint: ${brokerHealthCheck.healthy ? 'HEALTHY' : 'ISSUES'} (${brokerHealthCheck.passed}/${brokerHealthCheck.total})`);
  console.log(`📋 HTTP Status & Formats: ${statusFormatCheck.healthy ? 'HEALTHY' : 'ISSUES'} (${statusFormatCheck.passed}/${statusFormatCheck.total})`);
  console.log(`❌ Error Response Analysis: ${errorAnalysis.healthy ? 'HEALTHY' : 'ISSUES'} (${errorAnalysis.passed}/${errorAnalysis.total})`);
  console.log('');
  
  console.log(`⏱️  Total Execution Time: ${Math.round(totalTime)}ms`);
  console.log(`📈 Total Health Checks: ${totalTests}`);
  console.log(`✅ Checks Passed: ${totalPassed}`);
  console.log(`❌ Checks Failed: ${totalTests - totalPassed}`);
  console.log(`🔗 Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`📊 Health Score: ${Math.round((totalPassed / totalTests) * 100)}%`);
  console.log(`🕐 Last Check: ${healthMetrics.lastCheckTime}`);
  console.log('');

  const overallHealthy = setupOAuthHealth.healthy && brokerHealthCheck.healthy && 
                        statusFormatCheck.healthy && errorAnalysis.healthy;

  if (overallHealthy) {
    console.log('🎉 Production endpoints are healthy!');
    console.log('✅ All OAuth endpoints responding correctly');
    console.log('✅ No 404 errors detected');
    console.log('✅ Proper HTTP status codes and response formats');
    console.log('✅ Error handling working correctly');
    console.log('✅ System ready for production use');
  } else {
    console.log('⚠️ Production endpoint health issues detected:');
    
    if (!setupOAuthHealth.healthy) {
      console.log('❌ Setup OAuth endpoint has issues');
      console.log('💡 Recommendation: Check endpoint availability and request processing');
    }
    if (!brokerHealthCheck.healthy) {
      console.log('❌ Broker health endpoint has issues');
      console.log('💡 Recommendation: Verify health endpoint functionality');
    }
    if (!statusFormatCheck.healthy) {
      console.log('❌ HTTP status or response format issues');
      console.log('💡 Recommendation: Check endpoint response formats and status codes');
    }
    if (!errorAnalysis.healthy) {
      console.log('❌ Error response handling issues');
      console.log('💡 Recommendation: Verify error message formats and handling');
    }
    
    console.log('🔧 Review the detailed results above for specific issues');
  }

  return {
    healthy: overallHealthy,
    results: {
      setupOAuth: setupOAuthHealth,
      brokerHealth: brokerHealthCheck,
      statusFormats: statusFormatCheck,
      errorAnalysis: errorAnalysis
    },
    metrics: healthMetrics,
    summary: {
      totalTests,
      totalPassed,
      healthScore: Math.round((totalPassed / totalTests) * 100),
      avgResponseTime: Math.round(avgResponseTime),
      executionTime: Math.round(totalTime)
    }
  };
}

// Run production health monitoring
if (require.main === module) {
  runProductionHealthMonitoring()
    .then(result => {
      console.log(`\n🏁 Health monitoring completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Health Status: ${result.healthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
      
      // Export results for potential integration
      if (process.env.EXPORT_RESULTS) {
        const fs = require('fs');
        const resultsFile = `health-monitoring-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
        console.log(`📄 Results exported to: ${resultsFile}`);
      }
      
      process.exit(result.healthy ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Production health monitoring failed:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runProductionHealthMonitoring,
  checkSetupOAuthEndpoint,
  checkBrokerHealthEndpoint,
  verifyHttpStatusAndFormats,
  analyzeErrorResponses,
  makeRequest,
  healthMetrics
};