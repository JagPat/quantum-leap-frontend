#!/usr/bin/env node

/**
 * Database Repair Tool
 * Comprehensive tool to diagnose and repair database connectivity issues
 * Focuses on Railway PostgreSQL service and connection initialization
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Database repair configuration
const repairConfig = {
  backend: {
    baseUrl: 'https://web-production-de0bc.up.railway.app',
    healthEndpoint: '/health',
    oauthHealthEndpoint: '/api/modules/auth/broker/health',
    debugEndpoint: '/api/modules/auth/debug',
    timeout: 30000
  },
  database: {
    maxRetries: 5,
    retryDelay: 3000,
    connectionTimeout: 15000,
    testQueries: [
      'SELECT 1',
      'SELECT NOW()',
      'SELECT version()'
    ]
  },
  repair: {
    restartAttempts: 3,
    restartDelay: 10000,
    validationTimeout: 60000
  }
};

// Utility functions
function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: options.timeout || 10000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function makePostRequest(url, payload, options = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...options.headers
      },
      timeout: options.timeout || 10000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Database diagnostic functions
async function diagnoseDatabaseIssues() {
  console.log('🔍 Database Diagnostic Analysis');
  console.log('===============================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const diagnostics = {
    serviceHealth: false,
    connectionPool: false,
    databaseReachable: false,
    environmentVariables: false,
    oauthModuleStatus: false,
    specificErrors: [],
    recommendations: []
  };

  try {
    // Step 1: Check overall service health
    console.log('🏥 Step 1: Service Health Check');
    console.log('-------------------------------');
    
    try {
      const healthResponse = await makeHttpsRequest(
        `${repairConfig.backend.baseUrl}${repairConfig.backend.healthEndpoint}`,
        { timeout: repairConfig.backend.timeout }
      );

      console.log(`📊 Service Status: ${healthResponse.status}`);
      console.log(`📊 Service Data: ${JSON.stringify(healthResponse.data, null, 2)}`);

      if (healthResponse.status === 200 && healthResponse.data.status === 'OK') {
        diagnostics.serviceHealth = true;
        console.log('✅ Backend service is healthy');
      } else {
        console.log('❌ Backend service health issues detected');
        diagnostics.specificErrors.push('Backend service not responding correctly');
      }
    } catch (error) {
      console.log(`❌ Service health check failed: ${error.message}`);
      diagnostics.specificErrors.push(`Service unreachable: ${error.message}`);
    }

    // Step 2: Check OAuth module health
    console.log('');
    console.log('🔐 Step 2: OAuth Module Health Check');
    console.log('------------------------------------');
    
    try {
      const oauthHealthResponse = await makeHttpsRequest(
        `${repairConfig.backend.baseUrl}${repairConfig.backend.oauthHealthEndpoint}`,
        { timeout: repairConfig.backend.timeout }
      );

      console.log(`📊 OAuth Health Status: ${oauthHealthResponse.status}`);
      
      if (oauthHealthResponse.status === 200 && oauthHealthResponse.data.success) {
        const components = oauthHealthResponse.data.data.components;
        
        console.log('🔍 Component Analysis:');
        console.log(`   - Broker Service: ${oauthHealthResponse.data.data.status}`);
        console.log(`   - Broker Configs: ${components.brokerConfigs?.status || 'unknown'}`);
        console.log(`   - OAuth Tokens: ${components.tokenManager?.components?.oauthTokens?.status || 'unknown'}`);
        console.log(`   - Kite Client: ${components.kiteClient?.status || 'unknown'}`);

        // Analyze specific database errors
        if (components.brokerConfigs?.error?.includes('Database connection not initialized')) {
          diagnostics.specificErrors.push('Database connection not initialized in brokerConfigs');
        }
        
        if (components.tokenManager?.components?.oauthTokens?.error?.includes('Database connection not initialized')) {
          diagnostics.specificErrors.push('Database connection not initialized in oauthTokens');
        }

        // Check if any components are healthy
        const hasHealthyComponents = components.kiteClient?.status === 'healthy';
        if (hasHealthyComponents) {
          diagnostics.oauthModuleStatus = true;
          console.log('✅ OAuth module is partially functional');
        } else {
          console.log('❌ OAuth module has issues');
        }
      } else {
        console.log('❌ OAuth health check failed');
        diagnostics.specificErrors.push('OAuth module not responding correctly');
      }
    } catch (error) {
      console.log(`❌ OAuth health check failed: ${error.message}`);
      diagnostics.specificErrors.push(`OAuth module unreachable: ${error.message}`);
    }

    // Step 3: Test database connection attempts
    console.log('');
    console.log('🗄️ Step 3: Database Connection Testing');
    console.log('--------------------------------------');
    
    const testPayload = {
      api_key: 'diagnostic_test_key_1234567890',
      api_secret: 'diagnostic_test_secret_1234567890',
      user_id: 'diagnostic_test_user'
    };

    try {
      const dbTestResponse = await makePostRequest(
        `${repairConfig.backend.baseUrl}/api/modules/auth/broker/setup-oauth`,
        testPayload,
        { timeout: repairConfig.database.connectionTimeout }
      );

      console.log(`📊 Database Test Status: ${dbTestResponse.status}`);
      console.log(`📊 Database Test Response: ${JSON.stringify(dbTestResponse.data, null, 2)}`);

      if (dbTestResponse.status === 200 && dbTestResponse.data.success) {
        diagnostics.databaseReachable = true;
        console.log('✅ Database connection is working');
      } else if (dbTestResponse.data.message?.includes('Database connection not initialized')) {
        console.log('❌ Database connection not initialized');
        diagnostics.specificErrors.push('Database connection initialization failure');
      } else {
        console.log('⚠️  Database test returned unexpected response');
        diagnostics.specificErrors.push(`Unexpected database response: ${dbTestResponse.data.message}`);
      }
    } catch (error) {
      console.log(`❌ Database connection test failed: ${error.message}`);
      diagnostics.specificErrors.push(`Database connection test error: ${error.message}`);
    }

    // Step 4: Environment variable analysis
    console.log('');
    console.log('🌍 Step 4: Environment Analysis');
    console.log('-------------------------------');
    
    try {
      const debugResponse = await makeHttpsRequest(
        `${repairConfig.backend.baseUrl}${repairConfig.backend.debugEndpoint}`,
        { timeout: repairConfig.backend.timeout }
      );

      if (debugResponse.status === 200) {
        console.log('✅ Debug endpoint accessible');
        // Note: We don't want to log sensitive environment variables
        diagnostics.environmentVariables = true;
      } else {
        console.log('⚠️  Debug endpoint not available or restricted');
      }
    } catch (error) {
      console.log(`⚠️  Debug endpoint test: ${error.message}`);
    }

    // Generate recommendations based on findings
    console.log('');
    console.log('💡 Generating Recommendations');
    console.log('-----------------------------');
    
    if (diagnostics.specificErrors.some(error => error.includes('Database connection not initialized'))) {
      diagnostics.recommendations.push('DATABASE_URL environment variable may be missing or incorrect');
      diagnostics.recommendations.push('PostgreSQL service on Railway may not be running');
      diagnostics.recommendations.push('Database connection pool may need reinitialization');
      diagnostics.recommendations.push('Check Railway service logs for database connection errors');
    }

    if (!diagnostics.serviceHealth) {
      diagnostics.recommendations.push('Backend service may need restart');
      diagnostics.recommendations.push('Check Railway deployment status');
    }

    if (!diagnostics.databaseReachable) {
      diagnostics.recommendations.push('Verify PostgreSQL service is provisioned and running');
      diagnostics.recommendations.push('Check database connection string format');
      diagnostics.recommendations.push('Verify database user permissions');
    }

    if (diagnostics.recommendations.length === 0) {
      diagnostics.recommendations.push('Database issues may be intermittent - monitor for patterns');
      diagnostics.recommendations.push('Consider implementing connection retry logic');
    }

  } catch (error) {
    console.log(`💥 Diagnostic analysis failed: ${error.message}`);
    diagnostics.specificErrors.push(`Diagnostic failure: ${error.message}`);
  }

  console.log('');
  console.log('📊 Diagnostic Summary');
  console.log('=====================');
  console.log(`🏥 Service Health: ${diagnostics.serviceHealth ? 'HEALTHY' : 'ISSUES'}`);
  console.log(`🔗 Connection Pool: ${diagnostics.connectionPool ? 'WORKING' : 'ISSUES'}`);
  console.log(`🗄️  Database Reachable: ${diagnostics.databaseReachable ? 'YES' : 'NO'}`);
  console.log(`🌍 Environment Variables: ${diagnostics.environmentVariables ? 'ACCESSIBLE' : 'UNKNOWN'}`);
  console.log(`🔐 OAuth Module: ${diagnostics.oauthModuleStatus ? 'PARTIAL' : 'ISSUES'}`);
  console.log(`❌ Specific Errors: ${diagnostics.specificErrors.length}`);
  console.log(`💡 Recommendations: ${diagnostics.recommendations.length}`);
  console.log('');

  return diagnostics;
}

// Database repair functions
async function attemptDatabaseRepair(diagnostics) {
  console.log('🔧 Database Repair Attempts');
  console.log('===========================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const repairResults = {
    connectionRestored: false,
    oauthFunctional: false,
    repairAttempts: 0,
    successfulMethods: [],
    failedMethods: []
  };

  try {
    // Repair Method 1: Connection Pool Reset (via multiple requests)
    console.log('🔄 Repair Method 1: Connection Pool Reset');
    console.log('-----------------------------------------');
    
    repairResults.repairAttempts++;
    
    try {
      console.log('📡 Sending multiple health check requests to reset connection pool...');
      
      const poolResetPromises = [];
      for (let i = 0; i < 5; i++) {
        poolResetPromises.push(
          makeHttpsRequest(
            `${repairConfig.backend.baseUrl}${repairConfig.backend.oauthHealthEndpoint}`,
            { timeout: 10000 }
          )
        );
      }

      const poolResetResults = await Promise.allSettled(poolResetPromises);
      const successfulRequests = poolResetResults.filter(result => 
        result.status === 'fulfilled' && result.value.status === 200
      ).length;

      console.log(`📊 Successful requests: ${successfulRequests}/5`);

      if (successfulRequests >= 3) {
        console.log('✅ Connection pool reset appears successful');
        
        // Test if database connection is now working
        const testResponse = await makePostRequest(
          `${repairConfig.backend.baseUrl}/api/modules/auth/broker/setup-oauth`,
          {
            api_key: 'repair_test_key_1234567890',
            api_secret: 'repair_test_secret_1234567890',
            user_id: 'repair_test_user'
          },
          { timeout: 15000 }
        );

        if (testResponse.status === 200 && testResponse.data.success) {
          console.log('✅ Database connection restored via connection pool reset!');
          repairResults.connectionRestored = true;
          repairResults.oauthFunctional = true;
          repairResults.successfulMethods.push('Connection Pool Reset');
        } else if (!testResponse.data.message?.includes('Database connection not initialized')) {
          console.log('⚠️  Connection improved but still has issues');
          repairResults.successfulMethods.push('Partial Connection Pool Reset');
        } else {
          console.log('❌ Connection pool reset did not resolve database issues');
          repairResults.failedMethods.push('Connection Pool Reset');
        }
      } else {
        console.log('❌ Connection pool reset failed');
        repairResults.failedMethods.push('Connection Pool Reset');
      }
    } catch (error) {
      console.log(`❌ Connection pool reset failed: ${error.message}`);
      repairResults.failedMethods.push('Connection Pool Reset');
    }

    // Repair Method 2: Service Warm-up (if connection not restored)
    if (!repairResults.connectionRestored) {
      console.log('');
      console.log('🔥 Repair Method 2: Service Warm-up');
      console.log('-----------------------------------');
      
      repairResults.repairAttempts++;
      
      try {
        console.log('🌡️  Warming up service with gradual load...');
        
        // Gradual warm-up sequence
        const warmupSequence = [
          { endpoint: '/health', delay: 1000 },
          { endpoint: '/api/modules/auth/debug', delay: 2000 },
          { endpoint: '/api/modules/auth/broker/health', delay: 3000 },
          { endpoint: '/api/modules/auth/broker/health', delay: 2000 },
          { endpoint: '/api/modules/auth/broker/health', delay: 1000 }
        ];

        for (const step of warmupSequence) {
          console.log(`📡 Warming up: ${step.endpoint}`);
          
          try {
            const warmupResponse = await makeHttpsRequest(
              `${repairConfig.backend.baseUrl}${step.endpoint}`,
              { timeout: 10000 }
            );
            
            console.log(`   Status: ${warmupResponse.status}`);
            
            if (step.delay) {
              console.log(`   Waiting ${step.delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, step.delay));
            }
          } catch (error) {
            console.log(`   Error: ${error.message}`);
          }
        }

        // Test database connection after warm-up
        console.log('🧪 Testing database connection after warm-up...');
        
        const warmupTestResponse = await makePostRequest(
          `${repairConfig.backend.baseUrl}/api/modules/auth/broker/setup-oauth`,
          {
            api_key: 'warmup_test_key_1234567890',
            api_secret: 'warmup_test_secret_1234567890',
            user_id: 'warmup_test_user'
          },
          { timeout: 15000 }
        );

        if (warmupTestResponse.status === 200 && warmupTestResponse.data.success) {
          console.log('✅ Database connection restored via service warm-up!');
          repairResults.connectionRestored = true;
          repairResults.oauthFunctional = true;
          repairResults.successfulMethods.push('Service Warm-up');
        } else if (!warmupTestResponse.data.message?.includes('Database connection not initialized')) {
          console.log('⚠️  Service warm-up improved connection but issues remain');
          repairResults.successfulMethods.push('Partial Service Warm-up');
        } else {
          console.log('❌ Service warm-up did not resolve database issues');
          repairResults.failedMethods.push('Service Warm-up');
        }
      } catch (error) {
        console.log(`❌ Service warm-up failed: ${error.message}`);
        repairResults.failedMethods.push('Service Warm-up');
      }
    }

    // Repair Method 3: Extended Monitoring (if still not resolved)
    if (!repairResults.connectionRestored) {
      console.log('');
      console.log('📊 Repair Method 3: Extended Monitoring');
      console.log('---------------------------------------');
      
      repairResults.repairAttempts++;
      
      try {
        console.log('🔍 Monitoring database connection over extended period...');
        
        const monitoringResults = [];
        const monitoringDuration = 30000; // 30 seconds
        const checkInterval = 5000; // 5 seconds
        const checksCount = monitoringDuration / checkInterval;

        for (let i = 0; i < checksCount; i++) {
          console.log(`📡 Monitoring check ${i + 1}/${checksCount}`);
          
          try {
            const monitorResponse = await makeHttpsRequest(
              `${repairConfig.backend.baseUrl}${repairConfig.backend.oauthHealthEndpoint}`,
              { timeout: 8000 }
            );

            const isHealthy = monitorResponse.status === 200 && 
                            monitorResponse.data.success &&
                            !monitorResponse.data.data.components.brokerConfigs?.error?.includes('Database connection not initialized');

            monitoringResults.push({
              timestamp: new Date().toISOString(),
              healthy: isHealthy,
              status: monitorResponse.status
            });

            console.log(`   Result: ${isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);

            if (i < checksCount - 1) {
              await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
          } catch (error) {
            monitoringResults.push({
              timestamp: new Date().toISOString(),
              healthy: false,
              error: error.message
            });
            console.log(`   Error: ${error.message}`);
          }
        }

        const healthyChecks = monitoringResults.filter(result => result.healthy).length;
        const healthyPercentage = (healthyChecks / checksCount) * 100;

        console.log(`📊 Monitoring Results: ${healthyChecks}/${checksCount} healthy (${Math.round(healthyPercentage)}%)`);

        if (healthyPercentage >= 50) {
          console.log('⚠️  Database connection is intermittent but partially functional');
          repairResults.successfulMethods.push('Extended Monitoring - Intermittent Connection');
        } else {
          console.log('❌ Database connection consistently failing');
          repairResults.failedMethods.push('Extended Monitoring');
        }
      } catch (error) {
        console.log(`❌ Extended monitoring failed: ${error.message}`);
        repairResults.failedMethods.push('Extended Monitoring');
      }
    }

  } catch (error) {
    console.log(`💥 Database repair failed: ${error.message}`);
  }

  console.log('');
  console.log('📊 Repair Results Summary');
  console.log('=========================');
  console.log(`🔧 Repair Attempts: ${repairResults.repairAttempts}`);
  console.log(`🔗 Connection Restored: ${repairResults.connectionRestored ? 'YES' : 'NO'}`);
  console.log(`🔐 OAuth Functional: ${repairResults.oauthFunctional ? 'YES' : 'NO'}`);
  console.log(`✅ Successful Methods: ${repairResults.successfulMethods.length}`);
  console.log(`❌ Failed Methods: ${repairResults.failedMethods.length}`);
  console.log('');

  if (repairResults.successfulMethods.length > 0) {
    console.log('✅ Successful Repair Methods:');
    repairResults.successfulMethods.forEach((method, index) => {
      console.log(`   ${index + 1}. ${method}`);
    });
    console.log('');
  }

  if (repairResults.failedMethods.length > 0) {
    console.log('❌ Failed Repair Methods:');
    repairResults.failedMethods.forEach((method, index) => {
      console.log(`   ${index + 1}. ${method}`);
    });
    console.log('');
  }

  return repairResults;
}

// Main database repair function
async function runDatabaseRepair() {
  console.log('🛠️  Database Repair Tool');
  console.log('========================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Phase 1: Diagnose issues
    const diagnostics = await diagnoseDatabaseIssues();

    // Phase 2: Attempt repairs
    const repairResults = await attemptDatabaseRepair(diagnostics);

    // Phase 3: Final validation
    console.log('✅ Final Validation');
    console.log('==================');
    
    try {
      const finalTestResponse = await makePostRequest(
        `${repairConfig.backend.baseUrl}/api/modules/auth/broker/setup-oauth`,
        {
          api_key: 'final_validation_key_1234567890',
          api_secret: 'final_validation_secret_1234567890',
          user_id: 'final_validation_user'
        },
        { timeout: 15000 }
      );

      const finalSuccess = finalTestResponse.status === 200 && finalTestResponse.data.success;
      
      console.log(`📊 Final Test Status: ${finalTestResponse.status}`);
      console.log(`✅ Database Fully Functional: ${finalSuccess ? 'YES' : 'NO'}`);
      
      if (finalSuccess) {
        console.log('🎉 Database repair successful!');
      } else {
        console.log('⚠️  Database issues persist - manual intervention may be required');
      }

      return {
        success: finalSuccess,
        diagnostics: diagnostics,
        repairResults: repairResults,
        finalTest: {
          status: finalTestResponse.status,
          functional: finalSuccess
        }
      };
    } catch (error) {
      console.log(`❌ Final validation failed: ${error.message}`);
      
      return {
        success: false,
        diagnostics: diagnostics,
        repairResults: repairResults,
        finalTest: {
          error: error.message,
          functional: false
        }
      };
    }

  } catch (error) {
    console.error('💥 Database repair tool failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI interface
if (require.main === module) {
  console.log('🚀 Starting Database Repair Tool...');
  console.log('');

  runDatabaseRepair()
    .then(result => {
      console.log(`🏁 Database repair completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.success) {
        console.log('🎯 Database is now functional!');
      } else {
        console.log('⚠️  Database issues require manual intervention');
        console.log('💡 Check Railway PostgreSQL service status and DATABASE_URL');
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Database repair tool failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runDatabaseRepair,
  diagnoseDatabaseIssues,
  attemptDatabaseRepair,
  repairConfig
};