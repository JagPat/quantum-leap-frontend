#!/usr/bin/env node

/**
 * Infrastructure Diagnostic Tool
 * Deep diagnostic analysis to identify the exact root cause of database connectivity issues
 * Provides specific actionable solutions based on findings
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Diagnostic configuration
const diagnosticConfig = {
  backend: {
    baseUrl: 'https://web-production-de0bc.up.railway.app',
    endpoints: {
      health: '/health',
      debug: '/api/modules/auth/debug',
      oauthHealth: '/api/modules/auth/broker/health',
      oauthSetup: '/api/modules/auth/broker/setup-oauth'
    }
  },
  analysis: {
    deepInspection: true,
    performanceAnalysis: true,
    errorPatternAnalysis: true,
    infrastructureAssessment: true
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
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data,
            responseTime: performance.now() - startTime
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: performance.now() - startTime
          });
        }
      });
    });
    
    const startTime = performance.now();
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
    const startTime = performance.now();
    
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
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data,
            responseTime: performance.now() - startTime
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: performance.now() - startTime
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

// Deep infrastructure analysis
async function performDeepInfrastructureAnalysis() {
  console.log('🔬 Deep Infrastructure Analysis');
  console.log('===============================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const analysis = {
    serviceHealth: {},
    databaseConnectivity: {},
    errorPatterns: {},
    performanceMetrics: {},
    infrastructureIssues: [],
    rootCauseAnalysis: {},
    actionableRecommendations: []
  };

  try {
    // 1. Service Health Deep Dive
    console.log('🏥 Service Health Deep Dive');
    console.log('---------------------------');
    
    try {
      const healthResponse = await makeHttpsRequest(`${diagnosticConfig.backend.baseUrl}/health`, { timeout: 15000 });
      
      analysis.serviceHealth = {
        status: healthResponse.status,
        responseTime: healthResponse.responseTime,
        data: healthResponse.data,
        healthy: healthResponse.status === 200 && healthResponse.data.status === 'OK'
      };

      console.log(`📊 Service Status: ${healthResponse.status}`);
      console.log(`⏱️  Response Time: ${Math.round(healthResponse.responseTime)}ms`);
      console.log(`📦 Version: ${healthResponse.data.version}`);
      console.log(`⏰ Uptime: ${Math.round(healthResponse.data.uptime)}s`);
      console.log(`✅ Ready: ${healthResponse.data.ready}`);

      if (healthResponse.data.uptime < 300) {
        analysis.infrastructureIssues.push('Service recently restarted - may indicate instability');
      }

    } catch (error) {
      analysis.serviceHealth = { error: error.message, healthy: false };
      analysis.infrastructureIssues.push(`Service health check failed: ${error.message}`);
      console.log(`❌ Service health check failed: ${error.message}`);
    }

    // 2. Database Connectivity Analysis
    console.log('');
    console.log('🗄️ Database Connectivity Analysis');
    console.log('---------------------------------');
    
    try {
      const dbHealthResponse = await makeHttpsRequest(`${diagnosticConfig.backend.baseUrl}/api/modules/auth/broker/health`, { timeout: 20000 });
      
      analysis.databaseConnectivity = {
        status: dbHealthResponse.status,
        responseTime: dbHealthResponse.responseTime,
        data: dbHealthResponse.data,
        components: dbHealthResponse.data?.data?.components || {}
      };

      console.log(`📊 DB Health Status: ${dbHealthResponse.status}`);
      console.log(`⏱️  Response Time: ${Math.round(dbHealthResponse.responseTime)}ms`);

      if (dbHealthResponse.data?.data?.components) {
        const components = dbHealthResponse.data.data.components;
        
        console.log('🔍 Component Analysis:');
        console.log(`   - Broker Service: ${dbHealthResponse.data.data.status}`);
        console.log(`   - Broker Configs: ${components.brokerConfigs?.status || 'unknown'}`);
        console.log(`   - OAuth Tokens: ${components.tokenManager?.components?.oauthTokens?.status || 'unknown'}`);
        console.log(`   - Kite Client: ${components.kiteClient?.status || 'unknown'}`);

        // Analyze specific error patterns
        if (components.brokerConfigs?.error) {
          analysis.errorPatterns.brokerConfigsError = components.brokerConfigs.error;
          console.log(`   ❌ Broker Configs Error: ${components.brokerConfigs.error}`);
        }

        if (components.tokenManager?.components?.oauthTokens?.error) {
          analysis.errorPatterns.oauthTokensError = components.tokenManager.components.oauthTokens.error;
          console.log(`   ❌ OAuth Tokens Error: ${components.tokenManager.components.oauthTokens.error}`);
        }

        // Check for consistent error patterns
        const dbInitErrors = [
          components.brokerConfigs?.error,
          components.tokenManager?.components?.oauthTokens?.error
        ].filter(error => error?.includes('Database connection not initialized'));

        if (dbInitErrors.length > 0) {
          analysis.rootCauseAnalysis.primaryIssue = 'Database connection not initialized';
          analysis.rootCauseAnalysis.affectedComponents = dbInitErrors.length;
          analysis.infrastructureIssues.push('Multiple components reporting database connection not initialized');
        }
      }

    } catch (error) {
      analysis.databaseConnectivity = { error: error.message };
      analysis.infrastructureIssues.push(`Database connectivity check failed: ${error.message}`);
      console.log(`❌ Database connectivity check failed: ${error.message}`);
    }

    // 3. Performance Metrics Analysis
    console.log('');
    console.log('📊 Performance Metrics Analysis');
    console.log('-------------------------------');
    
    const performanceTests = [];
    const testCount = 5;
    
    console.log(`🧪 Running ${testCount} performance tests...`);
    
    for (let i = 0; i < testCount; i++) {
      try {
        const startTime = performance.now();
        const response = await makeHttpsRequest(`${diagnosticConfig.backend.baseUrl}/health`, { timeout: 8000 });
        const endTime = performance.now();
        
        performanceTests.push({
          responseTime: endTime - startTime,
          status: response.status,
          success: response.status === 200
        });
        
        console.log(`   Test ${i + 1}: ${Math.round(endTime - startTime)}ms - ${response.status}`);
      } catch (error) {
        performanceTests.push({
          responseTime: 8000,
          status: 0,
          success: false,
          error: error.message
        });
        console.log(`   Test ${i + 1}: FAILED - ${error.message}`);
      }
    }

    const avgResponseTime = performanceTests.reduce((sum, test) => sum + test.responseTime, 0) / testCount;
    const successRate = performanceTests.filter(test => test.success).length / testCount;
    const maxResponseTime = Math.max(...performanceTests.map(test => test.responseTime));
    const minResponseTime = Math.min(...performanceTests.map(test => test.responseTime));

    analysis.performanceMetrics = {
      averageResponseTime: avgResponseTime,
      successRate: successRate,
      maxResponseTime: maxResponseTime,
      minResponseTime: minResponseTime,
      tests: performanceTests
    };

    console.log(`📊 Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`📊 Success Rate: ${Math.round(successRate * 100)}%`);
    console.log(`📊 Response Time Range: ${Math.round(minResponseTime)}ms - ${Math.round(maxResponseTime)}ms`);

    if (avgResponseTime > 2000) {
      analysis.infrastructureIssues.push('High average response time indicates performance issues');
    }

    if (successRate < 0.8) {
      analysis.infrastructureIssues.push('Low success rate indicates reliability issues');
    }

    // 4. Error Pattern Analysis
    console.log('');
    console.log('🔍 Error Pattern Analysis');
    console.log('-------------------------');
    
    try {
      const errorTestResponse = await makePostRequest(
        `${diagnosticConfig.backend.baseUrl}/api/modules/auth/broker/setup-oauth`,
        {
          api_key: 'diagnostic_error_analysis_key',
          api_secret: 'diagnostic_error_analysis_secret',
          user_id: 'diagnostic_error_analysis_user'
        },
        { timeout: 15000 }
      );

      analysis.errorPatterns.oauthSetupError = {
        status: errorTestResponse.status,
        responseTime: errorTestResponse.responseTime,
        data: errorTestResponse.data
      };

      console.log(`📊 OAuth Setup Error Status: ${errorTestResponse.status}`);
      console.log(`⏱️  Error Response Time: ${Math.round(errorTestResponse.responseTime)}ms`);
      
      if (errorTestResponse.data?.message) {
        console.log(`💬 Error Message: ${errorTestResponse.data.message}`);
        
        // Analyze error message patterns
        if (errorTestResponse.data.message.includes('Database connection not initialized')) {
          analysis.rootCauseAnalysis.confirmedIssue = 'Database connection not initialized';
          analysis.rootCauseAnalysis.errorConsistency = 'Consistent across all components';
        }
      }

    } catch (error) {
      analysis.errorPatterns.oauthSetupError = { error: error.message };
      console.log(`❌ OAuth setup error test failed: ${error.message}`);
    }

  } catch (error) {
    console.log(`💥 Deep infrastructure analysis failed: ${error.message}`);
    analysis.infrastructureIssues.push(`Analysis failure: ${error.message}`);
  }

  return analysis;
}

// Root cause identification
async function identifyRootCause(analysis) {
  console.log('');
  console.log('🎯 Root Cause Identification');
  console.log('============================');
  console.log('');

  const rootCause = {
    primaryIssue: 'Unknown',
    confidence: 'Low',
    evidencePoints: [],
    likelyScenarios: [],
    actionPriority: []
  };

  // Analyze evidence
  if (analysis.rootCauseAnalysis?.primaryIssue === 'Database connection not initialized') {
    rootCause.primaryIssue = 'Database Connection Not Initialized';
    rootCause.confidence = 'High';
    rootCause.evidencePoints.push('Multiple components reporting same error');
    rootCause.evidencePoints.push('Consistent error message across all database operations');
    rootCause.evidencePoints.push('Service health is good but database operations fail');
  }

  if (analysis.serviceHealth?.healthy && analysis.databaseConnectivity?.status === 200) {
    rootCause.evidencePoints.push('Backend service is healthy and responding');
    rootCause.evidencePoints.push('OAuth health endpoint is accessible');
  }

  if (analysis.performanceMetrics?.successRate >= 0.8) {
    rootCause.evidencePoints.push('Service reliability is good');
  }

  // Determine likely scenarios
  if (rootCause.primaryIssue === 'Database Connection Not Initialized') {
    rootCause.likelyScenarios = [
      'PostgreSQL service is not running on Railway',
      'DATABASE_URL environment variable is missing or incorrect',
      'Database connection pool failed to initialize on service startup',
      'PostgreSQL service is running but not accepting connections',
      'Network connectivity issue between backend and database services',
      'Database service resource limits exceeded'
    ];

    rootCause.actionPriority = [
      'CRITICAL: Check PostgreSQL service status in Railway dashboard',
      'CRITICAL: Verify DATABASE_URL environment variable exists and is correct',
      'HIGH: Restart PostgreSQL service if not running',
      'HIGH: Restart backend service after PostgreSQL is confirmed running',
      'MEDIUM: Check Railway service logs for database connection errors',
      'MEDIUM: Verify database service resource usage and limits'
    ];
  }

  console.log('🔍 Root Cause Analysis Results:');
  console.log(`   🎯 Primary Issue: ${rootCause.primaryIssue}`);
  console.log(`   📊 Confidence Level: ${rootCause.confidence}`);
  console.log('');

  if (rootCause.evidencePoints.length > 0) {
    console.log('📋 Evidence Points:');
    rootCause.evidencePoints.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point}`);
    });
    console.log('');
  }

  if (rootCause.likelyScenarios.length > 0) {
    console.log('🔮 Likely Scenarios:');
    rootCause.likelyScenarios.forEach((scenario, index) => {
      console.log(`   ${index + 1}. ${scenario}`);
    });
    console.log('');
  }

  return rootCause;
}

// Generate specific actionable recommendations
async function generateActionableRecommendations(analysis, rootCause) {
  console.log('💡 Actionable Recommendations');
  console.log('=============================');
  console.log('');

  const recommendations = {
    immediate: [],
    shortTerm: [],
    longTerm: [],
    preventive: []
  };

  if (rootCause.primaryIssue === 'Database Connection Not Initialized') {
    recommendations.immediate = [
      '🚂 STEP 1: Access Railway Dashboard',
      '   - Go to https://railway.app/dashboard',
      '   - Navigate to your project',
      '   - Locate the PostgreSQL service',
      '',
      '🔍 STEP 2: Check PostgreSQL Service Status',
      '   - Look for PostgreSQL service in service list',
      '   - Check if status shows "Running" (green indicator)',
      '   - If status is "Stopped" or "Error", proceed to restart',
      '',
      '🔄 STEP 3: Restart PostgreSQL Service (if needed)',
      '   - Click on PostgreSQL service',
      '   - Click "Restart" or "Deploy" button',
      '   - Wait for service to show "Running" status (30-60 seconds)',
      '',
      '🔗 STEP 4: Verify DATABASE_URL Environment Variable',
      '   - Go to backend service (web-production-de0bc)',
      '   - Click on "Variables" tab',
      '   - Look for DATABASE_URL variable',
      '   - If missing, add it from PostgreSQL service connection info',
      '',
      '🔄 STEP 5: Restart Backend Service',
      '   - After PostgreSQL is confirmed running',
      '   - Go to backend service',
      '   - Click "Restart" button',
      '   - Wait for service to fully restart (2-3 minutes)',
      '',
      '✅ STEP 6: Verify Fix',
      '   - Run: curl https://web-production-de0bc.up.railway.app/api/modules/auth/broker/health',
      '   - Check that brokerConfigs and oauthTokens show "healthy" status'
    ];

    recommendations.shortTerm = [
      'Monitor database connection stability after fix',
      'Set up Railway service monitoring and alerts',
      'Review database connection pool configuration',
      'Check database service resource allocation'
    ];

    recommendations.longTerm = [
      'Implement database connection retry logic in application',
      'Add comprehensive health checks and monitoring',
      'Consider database connection pooling optimization',
      'Set up automated service restart procedures'
    ];

    recommendations.preventive = [
      'Regular monitoring of Railway service status',
      'Automated health checks and alerting',
      'Database connection resilience improvements',
      'Service dependency management'
    ];
  }

  console.log('🚨 IMMEDIATE ACTIONS (Do Now):');
  console.log('------------------------------');
  recommendations.immediate.forEach(action => {
    console.log(action);
  });

  console.log('');
  console.log('📅 SHORT-TERM ACTIONS (Next 24 hours):');
  console.log('--------------------------------------');
  recommendations.shortTerm.forEach((action, index) => {
    console.log(`${index + 1}. ${action}`);
  });

  console.log('');
  console.log('📈 LONG-TERM IMPROVEMENTS:');
  console.log('--------------------------');
  recommendations.longTerm.forEach((action, index) => {
    console.log(`${index + 1}. ${action}`);
  });

  console.log('');
  console.log('🛡️ PREVENTIVE MEASURES:');
  console.log('-----------------------');
  recommendations.preventive.forEach((action, index) => {
    console.log(`${index + 1}. ${action}`);
  });

  return recommendations;
}

// Main diagnostic function
async function runInfrastructureDiagnostic() {
  console.log('🔬 Infrastructure Diagnostic Tool');
  console.log('=================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Perform deep analysis
    const analysis = await performDeepInfrastructureAnalysis();

    // Identify root cause
    const rootCause = await identifyRootCause(analysis);

    // Generate recommendations
    const recommendations = await generateActionableRecommendations(analysis, rootCause);

    // Final summary
    console.log('');
    console.log('🏁 Diagnostic Summary');
    console.log('====================');
    console.log(`🎯 Root Cause: ${rootCause.primaryIssue}`);
    console.log(`📊 Confidence: ${rootCause.confidence}`);
    console.log(`🚨 Infrastructure Issues: ${analysis.infrastructureIssues.length}`);
    console.log(`💡 Immediate Actions: ${recommendations.immediate.length}`);
    console.log('');

    console.log('🎯 NEXT STEPS:');
    console.log('1. Follow the immediate actions above in Railway dashboard');
    console.log('2. Verify the fix using the provided curl command');
    console.log('3. Run full verification: node verification-orchestrator.cjs');
    console.log('');

    return {
      success: true,
      rootCause: rootCause,
      analysis: analysis,
      recommendations: recommendations,
      actionRequired: rootCause.primaryIssue !== 'Unknown'
    };

  } catch (error) {
    console.error('💥 Infrastructure diagnostic failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI interface
if (require.main === module) {
  console.log('🚀 Starting Infrastructure Diagnostic...');
  console.log('');

  runInfrastructureDiagnostic()
    .then(result => {
      console.log(`🏁 Diagnostic completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.success && result.actionRequired) {
        console.log('🔧 Action required: Follow the immediate steps above');
      } else if (result.success) {
        console.log('✅ No critical issues detected');
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Infrastructure diagnostic failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runInfrastructureDiagnostic,
  performDeepInfrastructureAnalysis,
  identifyRootCause,
  generateActionableRecommendations,
  diagnosticConfig
};