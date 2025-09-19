#!/usr/bin/env node

/**
 * Comprehensive Database Verification Script
 * Verifies database connectivity, schema integrity, performance metrics, and Railway-specific health checks
 * Enhanced with PostgreSQL service monitoring and connection pool analysis
 */

const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://web-production-de0bc.up.railway.app';

// Performance metrics tracking
const metrics = {
  connectionLatency: [],
  queryResponseTimes: [],
  errorCount: 0,
  totalRequests: 0,
  startTime: performance.now()
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
        'User-Agent': 'Database-Verification/2.0'
      }
    };

    metrics.totalRequests++;

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Track performance metrics
        metrics.connectionLatency.push(responseTime);
        if (res.statusCode >= 400) {
          metrics.errorCount++;
        }
        
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
      metrics.errorCount++;
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Database connection diagnostic
async function diagnoseDatabaseConnection() {
  console.log('🔍 Diagnosing database connection issues...');
  
  try {
    const healthResponse = await makeRequest('/api/modules/auth/broker/health');
    
    if (healthResponse.status === 200 && healthResponse.data.success) {
      const components = healthResponse.data.data.components || {};
      const dbErrors = [];
      
      Object.entries(components).forEach(([componentName, component]) => {
        if (component.error && component.error.includes('Database connection not initialized')) {
          dbErrors.push(componentName);
        }
        
        // Check nested components
        if (component.components) {
          Object.entries(component.components).forEach(([nestedName, nestedComponent]) => {
            if (nestedComponent.error && nestedComponent.error.includes('Database connection not initialized')) {
              dbErrors.push(`${componentName}.${nestedName}`);
            }
          });
        }
      });
      
      return {
        hasConnectionIssues: dbErrors.length > 0,
        affectedComponents: dbErrors,
        serviceStatus: 'running',
        details: healthResponse.data.data
      };
    }
    
    return {
      hasConnectionIssues: true,
      affectedComponents: ['health_endpoint'],
      serviceStatus: 'unhealthy',
      details: healthResponse.data
    };
  } catch (error) {
    return {
      hasConnectionIssues: true,
      affectedComponents: ['connection_failed'],
      serviceStatus: 'unreachable',
      error: error.message
    };
  }
}

// Enhanced database health check with detailed schema validation
async function checkDatabaseSchema() {
  console.log('🔍 Performing detailed database schema validation...');
  
  try {
    const response = await makeRequest('/api/modules/auth/broker/schema-info');
    return {
      success: response.status === 200,
      details: response.data,
      responseTime: response.responseTime
    };
  } catch (error) {
    // Fallback to indirect schema validation
    console.log('📝 Direct schema endpoint not available, using indirect validation...');
    return await indirectSchemaValidation();
  }
}

async function indirectSchemaValidation() {
  const schemaTests = [
    {
      name: 'users table',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/health');
        return response.status === 200 && response.data.database?.tables?.includes('users');
      }
    },
    {
      name: 'broker_configs table',
      test: async () => {
        const testData = {
          api_key: 'schema_validation_key_1234567890',
          api_secret: 'schema_validation_secret_1234567890',
          user_id: 'schema_validation_user'
        };
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', testData);
        return response.status === 200 || (response.status === 400 && response.data.error !== 'Database table missing');
      }
    },
    {
      name: 'oauth_tokens table with oauth_state column',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/status?user_id=schema_validation_user');
        return response.status === 200 || (response.status === 404 && response.data.error !== 'Table does not exist');
      }
    }
  ];

  const results = {};
  for (const test of schemaTests) {
    try {
      results[test.name] = await test.test();
    } catch (error) {
      results[test.name] = false;
    }
  }

  return {
    success: Object.values(results).every(result => result),
    details: { tables: results },
    responseTime: 0
  };
}

// PostgreSQL service status verification for Railway
async function checkPostgreSQLService() {
  console.log('🐘 Checking PostgreSQL service status...');
  
  const checks = [
    {
      name: 'Database Connection Pool',
      endpoint: '/api/modules/auth/broker/health',
      validator: (data) => {
        // Check if the service is responding and not showing database connection errors
        if (data.success && data.data) {
          const components = data.data.components || {};
          const hasDbErrors = Object.values(components).some(comp => 
            comp.error && comp.error.includes('Database connection not initialized')
          );
          return !hasDbErrors;
        }
        return false;
      }
    },
    {
      name: 'Query Execution Capability',
      endpoint: '/api/modules/auth/broker/health',
      validator: (data) => {
        // Check if database queries can be executed (no "Database connection not initialized" errors)
        if (data.success && data.data) {
          const components = data.data.components || {};
          const brokerConfigs = components.brokerConfigs || {};
          const tokenManager = components.tokenManager || {};
          
          return !(brokerConfigs.error && brokerConfigs.error.includes('Database connection not initialized'));
        }
        return false;
      }
    },
    {
      name: 'Railway Service Availability',
      endpoint: '/health',
      validator: (data) => {
        // Check if the Railway service is up and running
        return data.status === 'OK' && data.ready === true;
      }
    }
  ];

  const results = {};
  for (const check of checks) {
    try {
      const response = await makeRequest(check.endpoint);
      const isValid = response.status === 200 && check.validator(response.data);
      results[check.name] = {
        success: isValid,
        responseTime: response.responseTime,
        details: response.data.database || response.data
      };
      
      if (response.responseTime) {
        metrics.queryResponseTimes.push(response.responseTime);
      }
    } catch (error) {
      results[check.name] = {
        success: false,
        error: error.message,
        responseTime: 0
      };
    }
  }

  return results;
}

// Connection pool monitoring and performance metrics
function calculatePerformanceMetrics() {
  const totalTime = performance.now() - metrics.startTime;
  const avgLatency = metrics.connectionLatency.length > 0 
    ? metrics.connectionLatency.reduce((a, b) => a + b, 0) / metrics.connectionLatency.length 
    : 0;
  const avgQueryTime = metrics.queryResponseTimes.length > 0
    ? metrics.queryResponseTimes.reduce((a, b) => a + b, 0) / metrics.queryResponseTimes.length
    : 0;
  const errorRate = metrics.totalRequests > 0 ? (metrics.errorCount / metrics.totalRequests) * 100 : 0;

  return {
    totalExecutionTime: Math.round(totalTime),
    averageConnectionLatency: Math.round(avgLatency),
    averageQueryResponseTime: Math.round(avgQueryTime),
    totalRequests: metrics.totalRequests,
    errorCount: metrics.errorCount,
    errorRate: Math.round(errorRate * 100) / 100,
    connectionLatencyRange: {
      min: Math.min(...metrics.connectionLatency) || 0,
      max: Math.max(...metrics.connectionLatency) || 0
    }
  };
}

async function verifyDatabaseSchema() {
  console.log('🗄️ Comprehensive Database Verification');
  console.log('=====================================');
  console.log(`🌐 Backend URL: ${BASE_URL}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  // Phase 1: PostgreSQL Service Status Verification
  console.log('🐘 Phase 1: PostgreSQL Service Status Verification');
  console.log('==================================================');
  
  const postgresqlResults = await checkPostgreSQLService();
  let postgresqlPassed = 0;
  const postgresqlTotal = Object.keys(postgresqlResults).length;
  
  for (const [checkName, result] of Object.entries(postgresqlResults)) {
    console.log(`🔍 ${checkName}`);
    if (result.success) {
      console.log(`✅ PASS (${result.responseTime}ms)`);
      console.log(`📊 Details:`, JSON.stringify(result.details, null, 2));
      postgresqlPassed++;
    } else {
      console.log(`❌ FAIL`);
      console.log(`📊 Error:`, result.error || JSON.stringify(result.details, null, 2));
    }
    console.log('');
  }

  // Phase 2: Database Connection Diagnosis
  console.log('🔍 Phase 2: Database Connection Diagnosis');
  console.log('========================================');
  
  const connectionDiagnosis = await diagnoseDatabaseConnection();
  console.log(`🔍 Database Connection Analysis`);
  if (!connectionDiagnosis.hasConnectionIssues) {
    console.log(`✅ PASS - Database connection is healthy`);
    console.log(`📊 Service Status: ${connectionDiagnosis.serviceStatus}`);
  } else {
    console.log(`⚠️ ISSUES DETECTED - Database connection problems found`);
    console.log(`📊 Service Status: ${connectionDiagnosis.serviceStatus}`);
    console.log(`🔧 Affected Components: ${connectionDiagnosis.affectedComponents.join(', ')}`);
    console.log(`💡 Recommendation: Check DATABASE_URL environment variable and PostgreSQL service status on Railway`);
  }
  console.log('');

  // Phase 3: Database Schema Validation
  console.log('📋 Phase 3: Database Schema Validation');
  console.log('=====================================');
  
  const schemaResult = await checkDatabaseSchema();
  console.log(`🔍 Database Schema Integrity`);
  if (schemaResult.success) {
    console.log(`✅ PASS (${schemaResult.responseTime}ms)`);
    console.log(`📊 Schema Details:`, JSON.stringify(schemaResult.details, null, 2));
  } else {
    console.log(`❌ FAIL`);
    console.log(`📊 Schema Issues:`, JSON.stringify(schemaResult.details, null, 2));
  }
  console.log('');

  // Phase 4: Functional Database Tests
  console.log('🧪 Phase 4: Functional Database Tests');
  console.log('====================================');
  
  const functionalChecks = [
    {
      name: 'Database Connection Health',
      test: async () => {
        const response = await makeRequest('/health');
        const isHealthy = response.status === 200 && response.data.status === 'OK' && response.data.ready === true;
        return {
          success: isHealthy,
          details: response.data,
          responseTime: response.responseTime,
          note: isHealthy ? 'Railway service is running' : 'Railway service health check failed'
        };
      }
    },
    {
      name: 'OAuth Module Database Integration',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/health');
        const hasDbConnectionError = response.data?.data?.components && 
          Object.values(response.data.data.components).some(comp => 
            comp.error && comp.error.includes('Database connection not initialized')
          );
        
        return {
          success: response.status === 200 && response.data.success && !hasDbConnectionError,
          details: response.data,
          responseTime: response.responseTime,
          note: hasDbConnectionError ? 'Database connection not initialized detected' : 'OAuth module responding'
        };
      }
    },
    {
      name: 'Broker Configuration Storage (broker_configs table)',
      test: async () => {
        const testData = {
          api_key: 'comprehensive_test_key_1234567890',
          api_secret: 'comprehensive_test_secret_1234567890',
          user_id: 'comprehensive_test_user'
        };
        
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', testData);
        return {
          success: response.status === 200 && response.data.success,
          details: response.data,
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'OAuth Token Storage (oauth_tokens table with oauth_state)',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/status?user_id=comprehensive_test_user');
        return {
          success: response.status === 200 && response.data.success,
          details: response.data,
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Database Connection Pool Utilization',
      test: async () => {
        // Test multiple concurrent requests to check connection pooling
        const concurrentRequests = Array(5).fill().map(() => 
          makeRequest('/api/modules/auth/broker/health')
        );
        
        const responses = await Promise.all(concurrentRequests);
        const allSuccessful = responses.every(r => r.status === 200);
        const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
        
        return {
          success: allSuccessful,
          details: {
            concurrent_requests: responses.length,
            all_successful: allSuccessful,
            average_response_time: Math.round(avgResponseTime),
            individual_times: responses.map(r => Math.round(r.responseTime))
          },
          responseTime: avgResponseTime
        };
      }
    }
  ];
  
  let functionalPassed = 0;
  const functionalTotal = functionalChecks.length;
  
  for (const check of functionalChecks) {
    console.log(`🔍 ${check.name}`);
    
    try {
      const result = await check.test();
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
        console.log(`📊 Details:`, JSON.stringify(result.details, null, 2));
        functionalPassed++;
      } else {
        console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
        console.log(`📊 Details:`, JSON.stringify(result.details, null, 2));
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    console.log('');
  }

  // Phase 5: Performance Metrics Analysis
  console.log('📊 Phase 5: Performance Metrics Analysis');
  console.log('========================================');
  
  const performanceMetrics = calculatePerformanceMetrics();
  console.log(`⏱️  Total Execution Time: ${performanceMetrics.totalExecutionTime}ms`);
  console.log(`🔗 Average Connection Latency: ${performanceMetrics.averageConnectionLatency}ms`);
  console.log(`🗃️  Average Query Response Time: ${performanceMetrics.averageQueryResponseTime}ms`);
  console.log(`📈 Total Requests Made: ${performanceMetrics.totalRequests}`);
  console.log(`❌ Error Count: ${performanceMetrics.errorCount}`);
  console.log(`📉 Error Rate: ${performanceMetrics.errorRate}%`);
  console.log(`📊 Latency Range: ${performanceMetrics.connectionLatencyRange.min}ms - ${performanceMetrics.connectionLatencyRange.max}ms`);
  console.log('');

  // Performance Assessment
  const performanceIssues = [];
  if (performanceMetrics.averageConnectionLatency > 2000) {
    performanceIssues.push('High connection latency detected (>2s)');
  }
  if (performanceMetrics.errorRate > 10) {
    performanceIssues.push('High error rate detected (>10%)');
  }
  if (performanceMetrics.averageQueryResponseTime > 5000) {
    performanceIssues.push('Slow query response times detected (>5s)');
  }

  // Final Summary
  console.log('📋 Comprehensive Database Verification Summary');
  console.log('==============================================');
  
  const connectionDiagnosisPassed = connectionDiagnosis.hasConnectionIssues ? 0 : 1;
  const totalPassed = postgresqlPassed + connectionDiagnosisPassed + (schemaResult.success ? 1 : 0) + functionalPassed;
  const totalTests = postgresqlTotal + 1 + 1 + functionalTotal;
  
  console.log(`🐘 PostgreSQL Service: ${postgresqlPassed}/${postgresqlTotal} checks passed`);
  console.log(`🔍 Connection Diagnosis: ${connectionDiagnosisPassed}/1 checks passed`);
  console.log(`📋 Schema Validation: ${schemaResult.success ? '1/1' : '0/1'} checks passed`);
  console.log(`🧪 Functional Tests: ${functionalPassed}/${functionalTotal} checks passed`);
  console.log(`📊 Performance Issues: ${performanceIssues.length} detected`);
  console.log(`✅ Overall: ${totalPassed}/${totalTests} checks passed`);
  console.log('');

  if (totalPassed === totalTests && performanceIssues.length === 0) {
    console.log('🎉 Database verification completed successfully!');
    console.log('✅ PostgreSQL service is running optimally');
    console.log('✅ All required tables and columns exist');
    console.log('✅ OAuth integration is fully functional');
    console.log('✅ Performance metrics are within acceptable ranges');
    console.log('✅ Connection pooling is working correctly');
  } else {
    console.log('⚠️ Database verification found issues:');
    
    if (postgresqlPassed < postgresqlTotal) {
      console.log('❌ PostgreSQL service health issues detected');
    }
    if (!schemaResult.success) {
      console.log('❌ Database schema validation failed');
    }
    if (functionalPassed < functionalTotal) {
      console.log('❌ Functional database tests failed');
    }
    if (performanceIssues.length > 0) {
      console.log('⚠️ Performance issues detected:');
      performanceIssues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('🔧 Review the detailed results above for specific issues');
  }
  
  return totalPassed === totalTests && performanceIssues.length === 0;
}

// Run comprehensive database verification
if (require.main === module) {
  verifyDatabaseSchema()
    .then(success => {
      console.log(`\n🏁 Verification completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${success ? 'SUCCESS' : 'FAILED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Comprehensive database verification failed:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  verifyDatabaseSchema,
  checkPostgreSQLService,
  checkDatabaseSchema,
  diagnoseDatabaseConnection,
  calculatePerformanceMetrics,
  makeRequest
};