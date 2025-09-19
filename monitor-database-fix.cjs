#!/usr/bin/env node

/**
 * Database Fix Monitor
 * Continuously monitors the database connection status until it's fixed
 */

const https = require('https');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';
const CHECK_INTERVAL = 10000; // 10 seconds

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
        'User-Agent': 'DB-Fix-Monitor/1.0'
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
            data: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
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

async function checkDatabaseStatus() {
  try {
    const response = await makeRequest('/api/modules/auth/broker/health');
    
    if (response.status === 200 && response.data.success) {
      const components = response.data.data.components || {};
      
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
      
      return {
        connected: dbErrors.length === 0,
        errors: dbErrors,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        connected: false,
        errors: ['Health endpoint not responding'],
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      connected: false,
      errors: [error.message],
      timestamp: new Date().toISOString()
    };
  }
}

async function testOAuthEndpoint() {
  try {
    const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
      api_key: 'monitor_test_key',
      api_secret: 'monitor_test_secret',
      user_id: 'monitor_test_user'
    });
    
    const hasDbError = response.data.message?.includes('Database connection not initialized');
    const isValidationError = response.status === 400 && response.data.error === 'Invalid request data';
    const isSuccess = response.status === 200 && response.data.success;
    
    return {
      working: isSuccess || isValidationError,
      hasDbError: hasDbError,
      status: response.status,
      response: response.data
    };
  } catch (error) {
    return {
      working: false,
      hasDbError: false,
      error: error.message
    };
  }
}

async function monitorDatabaseFix() {
  console.log('🔍 Database Fix Monitor');
  console.log('======================');
  console.log(`🌐 Monitoring: ${BACKEND_URL}`);
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL / 1000}s`);
  console.log(`🚀 Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('💡 Waiting for DATABASE_URL to be configured in Railway...');
  console.log('📋 Follow the steps in RAILWAY_DATABASE_FIX_GUIDE.md');
  console.log('');

  let checkCount = 0;
  
  const monitor = setInterval(async () => {
    checkCount++;
    const timestamp = new Date().toISOString();
    
    console.log(`🔍 Check #${checkCount} at ${timestamp}`);
    
    // Check database status
    const dbStatus = await checkDatabaseStatus();
    
    if (dbStatus.connected) {
      console.log('✅ DATABASE CONNECTION RESTORED!');
      console.log('🎉 Database connection is now working');
      
      // Test OAuth endpoint
      const oauthTest = await testOAuthEndpoint();
      
      if (oauthTest.working) {
        console.log('✅ OAUTH ENDPOINT WORKING!');
        console.log('🚀 System is now fully operational');
        console.log('');
        console.log('🎯 Final verification:');
        console.log('   Run: node fix-and-verify-db-connection.cjs');
        console.log('');
        clearInterval(monitor);
        process.exit(0);
      } else {
        console.log('⚠️ OAuth endpoint still has issues');
        console.log(`   Status: ${oauthTest.status}`);
        console.log(`   Has DB Error: ${oauthTest.hasDbError}`);
      }
    } else {
      console.log('❌ Database connection still not working');
      console.log(`   Errors in: ${dbStatus.errors.join(', ')}`);
      console.log('💡 Continue following the Railway fix guide...');
    }
    
    console.log('');
  }, CHECK_INTERVAL);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Monitoring stopped by user');
    clearInterval(monitor);
    process.exit(0);
  });
}

// CLI interface
if (require.main === module) {
  monitorDatabaseFix().catch(error => {
    console.error('💥 Monitor failed:', error);
    process.exit(1);
  });
}

module.exports = {
  checkDatabaseStatus,
  testOAuthEndpoint,
  monitorDatabaseFix
};