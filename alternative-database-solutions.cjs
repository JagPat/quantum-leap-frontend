#!/usr/bin/env node

/**
 * Alternative Database Solutions
 * Explores different approaches to resolve the database connectivity issue
 * without relying on manual Railway dashboard interventions
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Alternative solution configurations
const alternativeSolutions = {
  connectionPoolReset: {
    enabled: true,
    maxAttempts: 10,
    delayBetweenAttempts: 2000,
    concurrentRequests: 8
  },
  serviceWarmup: {
    enabled: true,
    warmupSequence: [
      { endpoint: '/health', count: 3, delay: 1000 },
      { endpoint: '/api/modules/auth/debug', count: 2, delay: 2000 },
      { endpoint: '/api/modules/auth/broker/health', count: 5, delay: 1500 }
    ]
  },
  databaseInitialization: {
    enabled: true,
    initEndpoints: [
      '/api/modules/auth/broker/setup-oauth',
      '/api/modules/auth/broker/status'
    ],
    maxRetries: 15,
    backoffMultiplier: 1.5
  },
  alternativeEndpoints: {
    enabled: true,
    testEndpoints: [
      '/api/auth/broker/setup-oauth',
      '/api/modules/auth/setup-oauth',
      '/api/broker/setup-oauth'
    ]
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

// Alternative Solution 1: Aggressive Connection Pool Reset
async function aggressiveConnectionPoolReset() {
  console.log('🔄 Alternative Solution 1: Aggressive Connection Pool Reset');
  console.log('===========================================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const results = {
    success: false,
    attempts: 0,
    successfulConnections: 0,
    databaseFixed: false
  };

  try {
    const config = alternativeSolutions.connectionPoolReset;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${config.maxAttempts}: Aggressive Pool Reset`);
      results.attempts++;

      // Create multiple concurrent connections to force pool reset
      const connectionPromises = [];
      for (let i = 0; i < config.concurrentRequests; i++) {
        connectionPromises.push(
          makeHttpsRequest('https://web-production-de0bc.up.railway.app/api/modules/auth/broker/health', {
            timeout: 8000
          }).catch(error => ({ error: error.message }))
        );
      }

      const connectionResults = await Promise.allSettled(connectionPromises);
      const successfulConnections = connectionResults.filter(result => 
        result.status === 'fulfilled' && 
        result.value.status === 200 &&
        !result.value.error
      ).length;

      results.successfulConnections += successfulConnections;
      console.log(`   📊 Successful connections: ${successfulConnections}/${config.concurrentRequests}`);

      // Test if database connection is working
      try {
        const testResponse = await makePostRequest(
          'https://web-production-de0bc.up.railway.app/api/modules/auth/broker/setup-oauth',
          {
            api_key: 'aggressive_test_key_1234567890',
            api_secret: 'aggressive_test_secret_1234567890',
            user_id: 'aggressive_test_user'
          },
          { timeout: 12000 }
        );

        console.log(`   🧪 Database test status: ${testResponse.status}`);
        
        if (testResponse.status === 200 && testResponse.data.success) {
          console.log('   ✅ Database connection restored!');
          results.success = true;
          results.databaseFixed = true;
          break;
        } else if (!testResponse.data.message?.includes('Database connection not initialized')) {
          console.log('   ⚠️  Database connection improved but not fully restored');
        } else {
          console.log('   ❌ Database still not initialized');
        }
      } catch (error) {
        console.log(`   ❌ Database test failed: ${error.message}`);
      }

      if (attempt < config.maxAttempts) {
        console.log(`   ⏳ Waiting ${config.delayBetweenAttempts}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenAttempts));
      }
    }

  } catch (error) {
    console.log(`💥 Aggressive connection pool reset failed: ${error.message}`);
  }

  console.log('');
  console.log('📊 Aggressive Pool Reset Results:');
  console.log(`   🔄 Total Attempts: ${results.attempts}`);
  console.log(`   🔗 Successful Connections: ${results.successfulConnections}`);
  console.log(`   ✅ Database Fixed: ${results.databaseFixed ? 'YES' : 'NO'}`);
  console.log(`   🎯 Overall Success: ${results.success ? 'YES' : 'NO'}`);
  console.log('');

  return results;
}

// Alternative Solution 2: Extended Service Warmup
async function extendedServiceWarmup() {
  console.log('🔥 Alternative Solution 2: Extended Service Warmup');
  console.log('==================================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const results = {
    success: false,
    warmupSteps: 0,
    databaseFixed: false,
    performanceImproved: false
  };

  try {
    const config = alternativeSolutions.serviceWarmup;
    
    console.log('🌡️  Executing extended warmup sequence...');
    
    for (const step of config.warmupSequence) {
      console.log(`🔥 Warming up: ${step.endpoint} (${step.count} requests)`);
      results.warmupSteps++;

      const stepPromises = [];
      for (let i = 0; i < step.count; i++) {
        stepPromises.push(
          makeHttpsRequest(
            `https://web-production-de0bc.up.railway.app${step.endpoint}`,
            { timeout: 10000 }
          ).catch(error => ({ error: error.message }))
        );
      }

      const stepResults = await Promise.allSettled(stepPromises);
      const successfulRequests = stepResults.filter(result => 
        result.status === 'fulfilled' && 
        result.value.status === 200 &&
        !result.value.error
      ).length;

      console.log(`   📊 Successful requests: ${successfulRequests}/${step.count}`);

      if (step.delay) {
        console.log(`   ⏳ Waiting ${step.delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
    }

    // Test database connection after extended warmup
    console.log('🧪 Testing database connection after extended warmup...');
    
    try {
      const warmupTestResponse = await makePostRequest(
        'https://web-production-de0bc.up.railway.app/api/modules/auth/broker/setup-oauth',
        {
          api_key: 'warmup_extended_key_1234567890',
          api_secret: 'warmup_extended_secret_1234567890',
          user_id: 'warmup_extended_user'
        },
        { timeout: 15000 }
      );

      console.log(`📊 Warmup test status: ${warmupTestResponse.status}`);
      
      if (warmupTestResponse.status === 200 && warmupTestResponse.data.success) {
        console.log('✅ Database connection restored via extended warmup!');
        results.success = true;
        results.databaseFixed = true;
      } else if (!warmupTestResponse.data.message?.includes('Database connection not initialized')) {
        console.log('⚠️  Extended warmup improved connection but issues remain');
        results.performanceImproved = true;
      } else {
        console.log('❌ Extended warmup did not resolve database issues');
      }
    } catch (error) {
      console.log(`❌ Warmup test failed: ${error.message}`);
    }

  } catch (error) {
    console.log(`💥 Extended service warmup failed: ${error.message}`);
  }

  console.log('');
  console.log('📊 Extended Warmup Results:');
  console.log(`   🔥 Warmup Steps Completed: ${results.warmupSteps}`);
  console.log(`   ✅ Database Fixed: ${results.databaseFixed ? 'YES' : 'NO'}`);
  console.log(`   ⚡ Performance Improved: ${results.performanceImproved ? 'YES' : 'NO'}`);
  console.log(`   🎯 Overall Success: ${results.success ? 'YES' : 'NO'}`);
  console.log('');

  return results;
}

// Alternative Solution 3: Database Initialization Retry
async function databaseInitializationRetry() {
  console.log('🗄️ Alternative Solution 3: Database Initialization Retry');
  console.log('========================================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const results = {
    success: false,
    retries: 0,
    databaseFixed: false,
    bestResponse: null
  };

  try {
    const config = alternativeSolutions.databaseInitialization;
    let currentDelay = 1000;

    for (let retry = 1; retry <= config.maxRetries; retry++) {
      console.log(`🔄 Database Init Retry ${retry}/${config.maxRetries}`);
      results.retries++;

      // Try multiple initialization approaches
      const initAttempts = [];
      
      // Attempt 1: Standard OAuth setup
      initAttempts.push(
        makePostRequest(
          'https://web-production-de0bc.up.railway.app/api/modules/auth/broker/setup-oauth',
          {
            api_key: `init_retry_${retry}_key_1234567890`,
            api_secret: `init_retry_${retry}_secret_1234567890`,
            user_id: `init_retry_${retry}_user`
          },
          { timeout: 15000 }
        ).catch(error => ({ error: error.message, attempt: 'oauth_setup' }))
      );

      // Attempt 2: Status check to trigger initialization
      initAttempts.push(
        makeHttpsRequest(
          `https://web-production-de0bc.up.railway.app/api/modules/auth/broker/status?user_id=init_retry_${retry}_user`,
          { timeout: 10000 }
        ).catch(error => ({ error: error.message, attempt: 'status_check' }))
      );

      const initResults = await Promise.allSettled(initAttempts);
      
      // Analyze results
      for (const [index, result] of initResults.entries()) {
        if (result.status === 'fulfilled' && !result.value.error) {
          const response = result.value;
          console.log(`   📊 Attempt ${index + 1} status: ${response.status}`);
          
          if (response.status === 200 && response.data.success) {
            console.log('   ✅ Database initialization successful!');
            results.success = true;
            results.databaseFixed = true;
            results.bestResponse = response.data;
            return results;
          } else if (response.status !== 500) {
            console.log(`   ⚠️  Non-500 response: ${response.status}`);
            if (!results.bestResponse || response.status < results.bestResponse.status) {
              results.bestResponse = response.data;
            }
          }
        } else {
          console.log(`   ❌ Attempt ${index + 1} failed`);
        }
      }

      if (retry < config.maxRetries) {
        console.log(`   ⏳ Waiting ${currentDelay}ms before next retry...`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay = Math.min(currentDelay * config.backoffMultiplier, 10000);
      }
    }

  } catch (error) {
    console.log(`💥 Database initialization retry failed: ${error.message}`);
  }

  console.log('');
  console.log('📊 Database Initialization Results:');
  console.log(`   🔄 Total Retries: ${results.retries}`);
  console.log(`   ✅ Database Fixed: ${results.databaseFixed ? 'YES' : 'NO'}`);
  console.log(`   📊 Best Response: ${results.bestResponse ? 'Available' : 'None'}`);
  console.log(`   🎯 Overall Success: ${results.success ? 'YES' : 'NO'}`);
  console.log('');

  return results;
}

// Alternative Solution 4: Alternative Endpoint Discovery
async function alternativeEndpointDiscovery() {
  console.log('🔍 Alternative Solution 4: Alternative Endpoint Discovery');
  console.log('========================================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const results = {
    success: false,
    workingEndpoints: [],
    databaseFixed: false,
    alternativeFound: false
  };

  try {
    const config = alternativeSolutions.alternativeEndpoints;
    
    console.log('🔍 Testing alternative OAuth endpoints...');
    
    for (const endpoint of config.testEndpoints) {
      console.log(`🧪 Testing: ${endpoint}`);
      
      try {
        const testResponse = await makePostRequest(
          `https://web-production-de0bc.up.railway.app${endpoint}`,
          {
            api_key: 'alternative_test_key_1234567890',
            api_secret: 'alternative_test_secret_1234567890',
            user_id: 'alternative_test_user'
          },
          { timeout: 12000 }
        );

        console.log(`   📊 Status: ${testResponse.status}`);
        
        if (testResponse.status === 200 && testResponse.data.success) {
          console.log(`   ✅ Working alternative endpoint found: ${endpoint}`);
          results.workingEndpoints.push(endpoint);
          results.alternativeFound = true;
          results.databaseFixed = true;
          results.success = true;
        } else if (testResponse.status !== 404) {
          console.log(`   ⚠️  Endpoint exists but has issues: ${testResponse.status}`);
          results.workingEndpoints.push({ endpoint, status: testResponse.status, issues: true });
        } else {
          console.log(`   ❌ Endpoint not found: 404`);
        }
      } catch (error) {
        console.log(`   ❌ Endpoint test failed: ${error.message}`);
      }
    }

    // Test if any working endpoints can be used
    if (results.workingEndpoints.length > 0) {
      console.log('');
      console.log('🔄 Testing working endpoints for database functionality...');
      
      for (const endpoint of results.workingEndpoints) {
        if (typeof endpoint === 'string') {
          console.log(`🧪 Final test of: ${endpoint}`);
          
          try {
            const finalTestResponse = await makePostRequest(
              `https://web-production-de0bc.up.railway.app${endpoint}`,
              {
                api_key: 'final_alternative_key_1234567890',
                api_secret: 'final_alternative_secret_1234567890',
                user_id: 'final_alternative_user'
              },
              { timeout: 15000 }
            );

            if (finalTestResponse.status === 200 && finalTestResponse.data.success) {
              console.log(`   ✅ Database fully functional via: ${endpoint}`);
              results.success = true;
              results.databaseFixed = true;
              break;
            }
          } catch (error) {
            console.log(`   ❌ Final test failed: ${error.message}`);
          }
        }
      }
    }

  } catch (error) {
    console.log(`💥 Alternative endpoint discovery failed: ${error.message}`);
  }

  console.log('');
  console.log('📊 Alternative Endpoint Results:');
  console.log(`   🔍 Working Endpoints Found: ${results.workingEndpoints.length}`);
  console.log(`   ✅ Database Fixed: ${results.databaseFixed ? 'YES' : 'NO'}`);
  console.log(`   🔄 Alternative Found: ${results.alternativeFound ? 'YES' : 'NO'}`);
  console.log(`   🎯 Overall Success: ${results.success ? 'YES' : 'NO'}`);
  console.log('');

  return results;
}

// Main alternative solutions orchestrator
async function runAlternativeSolutions() {
  console.log('🔧 Alternative Database Solutions Orchestrator');
  console.log('==============================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const solutionResults = {
    aggressivePoolReset: null,
    extendedWarmup: null,
    databaseInitRetry: null,
    alternativeEndpoints: null,
    overallSuccess: false,
    successfulSolutions: []
  };

  try {
    // Solution 1: Aggressive Connection Pool Reset
    if (alternativeSolutions.connectionPoolReset.enabled) {
      solutionResults.aggressivePoolReset = await aggressiveConnectionPoolReset();
      if (solutionResults.aggressivePoolReset.success) {
        solutionResults.successfulSolutions.push('Aggressive Connection Pool Reset');
        solutionResults.overallSuccess = true;
        console.log('🎉 Database issue resolved via Aggressive Connection Pool Reset!');
        return solutionResults;
      }
    }

    // Solution 2: Extended Service Warmup
    if (alternativeSolutions.serviceWarmup.enabled && !solutionResults.overallSuccess) {
      solutionResults.extendedWarmup = await extendedServiceWarmup();
      if (solutionResults.extendedWarmup.success) {
        solutionResults.successfulSolutions.push('Extended Service Warmup');
        solutionResults.overallSuccess = true;
        console.log('🎉 Database issue resolved via Extended Service Warmup!');
        return solutionResults;
      }
    }

    // Solution 3: Database Initialization Retry
    if (alternativeSolutions.databaseInitialization.enabled && !solutionResults.overallSuccess) {
      solutionResults.databaseInitRetry = await databaseInitializationRetry();
      if (solutionResults.databaseInitRetry.success) {
        solutionResults.successfulSolutions.push('Database Initialization Retry');
        solutionResults.overallSuccess = true;
        console.log('🎉 Database issue resolved via Database Initialization Retry!');
        return solutionResults;
      }
    }

    // Solution 4: Alternative Endpoint Discovery
    if (alternativeSolutions.alternativeEndpoints.enabled && !solutionResults.overallSuccess) {
      solutionResults.alternativeEndpoints = await alternativeEndpointDiscovery();
      if (solutionResults.alternativeEndpoints.success) {
        solutionResults.successfulSolutions.push('Alternative Endpoint Discovery');
        solutionResults.overallSuccess = true;
        console.log('🎉 Database issue resolved via Alternative Endpoint Discovery!');
        return solutionResults;
      }
    }

  } catch (error) {
    console.log(`💥 Alternative solutions orchestrator failed: ${error.message}`);
  }

  // Final assessment
  console.log('🏁 Alternative Solutions Complete');
  console.log('=================================');
  console.log(`⏱️  Completed at: ${new Date().toISOString()}`);
  console.log(`🎯 Overall Success: ${solutionResults.overallSuccess ? 'YES' : 'NO'}`);
  console.log(`✅ Successful Solutions: ${solutionResults.successfulSolutions.length}`);
  console.log('');

  if (solutionResults.successfulSolutions.length > 0) {
    console.log('🎉 Successful Solutions:');
    solutionResults.successfulSolutions.forEach((solution, index) => {
      console.log(`   ${index + 1}. ${solution}`);
    });
  } else {
    console.log('❌ No alternative solutions were successful');
    console.log('💡 The database connectivity issue requires infrastructure-level intervention');
  }

  console.log('');
  return solutionResults;
}

// CLI interface
if (require.main === module) {
  console.log('🚀 Starting Alternative Database Solutions...');
  console.log('');

  runAlternativeSolutions()
    .then(result => {
      console.log(`🏁 Alternative solutions completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.overallSuccess ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.overallSuccess) {
        console.log('🎯 Database connectivity restored!');
        console.log('✅ OAuth system should now be fully functional');
      } else {
        console.log('⚠️  Database connectivity issue persists');
        console.log('💡 Infrastructure-level intervention may be required');
      }
      
      process.exit(result.overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Alternative solutions failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runAlternativeSolutions,
  aggressiveConnectionPoolReset,
  extendedServiceWarmup,
  databaseInitializationRetry,
  alternativeEndpointDiscovery,
  alternativeSolutions
};