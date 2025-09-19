#!/usr/bin/env node

/**
 * Database Connectivity Fix Script
 * Diagnoses and provides solutions for Railway PostgreSQL connectivity issues
 * Provides step-by-step instructions to resolve database connection problems
 */

const https = require('https');
const { performance } = require('perf_hooks');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';

// Database connectivity diagnostics
async function diagnoseDatabaseConnectivity() {
  console.log('🔍 Database Connectivity Diagnosis');
  console.log('==================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const diagnostics = {
    serviceRunning: false,
    databaseConfigured: false,
    connectionInitialized: false,
    specificError: null,
    recommendations: []
  };

  try {
    // Check if backend service is running
    console.log('1. Checking Backend Service Status...');
    const healthResponse = await makeRequest('/health');
    diagnostics.serviceRunning = healthResponse.status === 200 && healthResponse.data.ready === true;
    console.log(`   ✅ Backend Service: ${diagnostics.serviceRunning ? 'RUNNING' : 'NOT RUNNING'}`);
    
    if (diagnostics.serviceRunning) {
      console.log(`   📦 Version: ${healthResponse.data.version}`);
      console.log(`   ⏰ Uptime: ${Math.round(healthResponse.data.uptime / 1000)}s`);
    }
    console.log('');

    // Check database configuration through OAuth health endpoint
    console.log('2. Checking Database Configuration...');
    const oauthHealthResponse = await makeRequest('/api/modules/auth/broker/health');
    
    if (oauthHealthResponse.status === 200 && oauthHealthResponse.data.success) {
      const components = oauthHealthResponse.data.data.components || {};
      
      // Check for database connection errors
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
      
      diagnostics.connectionInitialized = dbErrors.length === 0;
      diagnostics.specificError = dbErrors.length > 0 ? 'Database connection not initialized' : null;
      
      console.log(`   ✅ OAuth Health Endpoint: RESPONDING`);
      console.log(`   ${diagnostics.connectionInitialized ? '✅' : '❌'} Database Connection: ${diagnostics.connectionInitialized ? 'INITIALIZED' : 'NOT INITIALIZED'}`);
      
      if (dbErrors.length > 0) {
        console.log(`   🚨 Affected Components: ${dbErrors.join(', ')}`);
      }
    } else {
      console.log(`   ❌ OAuth Health Endpoint: NOT RESPONDING (Status: ${oauthHealthResponse.status})`);
    }
    console.log('');

    // Test database operations
    console.log('3. Testing Database Operations...');
    const dbTestResponse = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
      api_key: 'connectivity_test_key',
      api_secret: 'connectivity_test_secret',
      user_id: 'connectivity_test_user'
    });
    
    if (dbTestResponse.status === 500 && 
        dbTestResponse.data.message && 
        dbTestResponse.data.message.includes('Database connection not initialized')) {
      diagnostics.databaseConfigured = false;
      console.log(`   ❌ Database Operations: FAILING`);
      console.log(`   🚨 Error: ${dbTestResponse.data.message}`);
    } else if (dbTestResponse.status === 400) {
      diagnostics.databaseConfigured = true;
      console.log(`   ✅ Database Operations: WORKING (Got validation error, which means DB is accessible)`);
    } else {
      console.log(`   ⚠️  Database Operations: UNKNOWN STATUS (Status: ${dbTestResponse.status})`);
    }
    console.log('');

  } catch (error) {
    console.log(`❌ Diagnosis failed: ${error.message}`);
    diagnostics.specificError = error.message;
  }

  return diagnostics;
}

// Generate specific fix recommendations
function generateFixRecommendations(diagnostics) {
  console.log('💡 Database Connectivity Fix Recommendations');
  console.log('============================================');
  
  const recommendations = [];

  if (!diagnostics.serviceRunning) {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Backend Service Not Running',
      description: 'The Railway backend service is not responding',
      steps: [
        'Go to Railway dashboard (https://railway.app/dashboard)',
        'Navigate to your project',
        'Check if the backend service is running',
        'If stopped, click "Deploy" to restart the service',
        'Check service logs for any startup errors'
      ]
    });
  }

  if (!diagnostics.connectionInitialized || !diagnostics.databaseConfigured) {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Fix DATABASE_URL Environment Variable',
      description: 'The DATABASE_URL environment variable is missing or incorrect',
      steps: [
        '1. Go to Railway dashboard (https://railway.app/dashboard)',
        '2. Navigate to your project',
        '3. Click on your backend service',
        '4. Go to the "Variables" tab',
        '5. Check if DATABASE_URL exists',
        '6. If missing, add it with the correct PostgreSQL connection string',
        '7. The format should be: postgresql://username:password@host:port/database',
        '8. Get the correct URL from your PostgreSQL service in Railway',
        '9. Save the variable and redeploy the service'
      ]
    });

    recommendations.push({
      priority: 'HIGH',
      title: 'Verify PostgreSQL Service Status',
      description: 'Ensure the PostgreSQL service is running and accessible',
      steps: [
        '1. In Railway dashboard, check your PostgreSQL service',
        '2. Verify the PostgreSQL service is running (green status)',
        '3. If stopped, start the PostgreSQL service',
        '4. Check PostgreSQL service logs for any errors',
        '5. Verify the service has adequate resources allocated',
        '6. Test connectivity from the PostgreSQL service dashboard'
      ]
    });

    recommendations.push({
      priority: 'HIGH',
      title: 'Update DATABASE_URL with Correct Connection String',
      description: 'Get the correct DATABASE_URL from Railway PostgreSQL service',
      steps: [
        '1. Go to your PostgreSQL service in Railway dashboard',
        '2. Click on the "Connect" tab',
        '3. Copy the "Postgres Connection URL"',
        '4. Go to your backend service Variables tab',
        '5. Update DATABASE_URL with the copied connection string',
        '6. Ensure the URL includes all required parameters',
        '7. Save and redeploy the backend service'
      ]
    });

    recommendations.push({
      priority: 'MEDIUM',
      title: 'Restart Services in Correct Order',
      description: 'Restart services to ensure proper initialization',
      steps: [
        '1. First, ensure PostgreSQL service is running',
        '2. Wait for PostgreSQL to be fully initialized',
        '3. Then restart the backend service',
        '4. Monitor backend service logs during startup',
        '5. Verify database connection is established',
        '6. Test OAuth endpoints after restart'
      ]
    });

    recommendations.push({
      priority: 'LOW',
      title: 'Verify Database Schema',
      description: 'Ensure required tables exist in the database',
      steps: [
        '1. Connect to PostgreSQL service using Railway dashboard',
        '2. Check if required tables exist: users, broker_configs, oauth_tokens',
        '3. If tables are missing, run database migration scripts',
        '4. Verify oauth_tokens table has oauth_state column',
        '5. Check table permissions and constraints'
      ]
    });
  }

  if (diagnostics.connectionInitialized && diagnostics.databaseConfigured) {
    recommendations.push({
      priority: 'LOW',
      title: 'Database Connection Optimization',
      description: 'Optimize database connection for better performance',
      steps: [
        '1. Add connection pool parameters to DATABASE_URL',
        '2. Example: ?pool_timeout=20&connection_limit=25',
        '3. Monitor connection pool usage',
        '4. Adjust pool settings based on usage patterns'
      ]
    });
  }

  // Display recommendations
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.title} (${rec.priority} Priority)`);
    console.log(`   Description: ${rec.description}`);
    console.log(`   Steps:`);
    rec.steps.forEach(step => {
      console.log(`     ${step}`);
    });
    console.log('');
  });

  return recommendations;
}

// Test database connectivity after fixes
async function testDatabaseConnectivity() {
  console.log('🧪 Testing Database Connectivity');
  console.log('===============================');
  
  const tests = [
    {
      name: 'Health Endpoint Test',
      test: async () => {
        const response = await makeRequest('/health');
        return {
          success: response.status === 200 && response.data.ready === true,
          details: response.data
        };
      }
    },
    {
      name: 'OAuth Health Test',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/health');
        const hasDbErrors = response.data.data?.components && 
          Object.values(response.data.data.components).some(comp => 
            comp.error && comp.error.includes('Database connection not initialized')
          );
        return {
          success: response.status === 200 && !hasDbErrors,
          details: {
            status: response.status,
            hasDbErrors: hasDbErrors,
            components: response.data.data?.components
          }
        };
      }
    },
    {
      name: 'Database Operation Test',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'test_connectivity_key',
          api_secret: 'test_connectivity_secret',
          user_id: 'test_connectivity_user'
        });
        
        // Success if we get validation error (400) instead of DB error (500)
        const isDbWorking = response.status === 400 || 
                           (response.status === 200 && response.data.success);
        const isDbError = response.status === 500 && 
                         response.data.message?.includes('Database connection not initialized');
        
        return {
          success: isDbWorking && !isDbError,
          details: {
            status: response.status,
            isDbWorking: isDbWorking,
            isDbError: isDbError,
            message: response.data.message || response.data.error
          }
        };
      }
    }
  ];

  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`🔍 ${test.name}...`);
    
    try {
      const result = await test.test();
      
      if (result.success) {
        console.log(`✅ PASS`);
        passedTests++;
      } else {
        console.log(`❌ FAIL`);
      }
      
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    console.log('');
  }

  const allTestsPassed = passedTests === tests.length;
  
  console.log(`📊 Connectivity Test Results: ${passedTests}/${tests.length} passed`);
  console.log(`🎯 Database Status: ${allTestsPassed ? 'CONNECTED' : 'CONNECTION ISSUES'}`);
  
  return allTestsPassed;
}

// Helper function for making requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Database-Connectivity-Fix/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
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

// Main function
async function runDatabaseConnectivityFix() {
  console.log('🔧 Database Connectivity Fix Tool');
  console.log('=================================');
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Step 1: Diagnose the issue
    const diagnostics = await diagnoseDatabaseConnectivity();
    
    // Step 2: Generate fix recommendations
    const recommendations = generateFixRecommendations(diagnostics);
    
    // Step 3: Test current connectivity
    const isConnected = await testDatabaseConnectivity();
    
    // Final summary
    console.log('📋 Database Connectivity Fix Summary');
    console.log('===================================');
    console.log(`🔍 Service Running: ${diagnostics.serviceRunning ? 'YES' : 'NO'}`);
    console.log(`🗄️ Database Configured: ${diagnostics.databaseConfigured ? 'YES' : 'NO'}`);
    console.log(`🔗 Connection Initialized: ${diagnostics.connectionInitialized ? 'YES' : 'NO'}`);
    console.log(`🧪 Connectivity Test: ${isConnected ? 'PASSED' : 'FAILED'}`);
    console.log(`💡 Recommendations Generated: ${recommendations.length}`);
    
    if (diagnostics.specificError) {
      console.log(`🚨 Specific Error: ${diagnostics.specificError}`);
    }
    
    console.log('');
    
    if (isConnected) {
      console.log('🎉 Database connectivity is working!');
      console.log('✅ No further action required');
    } else {
      console.log('⚠️ Database connectivity issues detected');
      console.log('🔧 Follow the recommendations above to fix the issues');
      console.log('');
      console.log('🚀 Quick Fix Steps:');
      console.log('1. Go to Railway dashboard');
      console.log('2. Check PostgreSQL service is running');
      console.log('3. Copy PostgreSQL connection URL');
      console.log('4. Set DATABASE_URL in backend service variables');
      console.log('5. Restart backend service');
      console.log('6. Run this script again to verify');
    }

    return {
      success: isConnected,
      diagnostics: diagnostics,
      recommendations: recommendations,
      connectivityWorking: isConnected
    };

  } catch (error) {
    console.error('💥 Database connectivity fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI interface
if (require.main === module) {
  runDatabaseConnectivityFix()
    .then(result => {
      console.log(`\n🏁 Database connectivity fix completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'CONNECTED' : 'NEEDS FIXING'}`);
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Database connectivity fix failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runDatabaseConnectivityFix,
  diagnoseDatabaseConnectivity,
  generateFixRecommendations,
  testDatabaseConnectivity,
  makeRequest
};