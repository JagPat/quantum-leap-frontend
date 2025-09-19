#!/usr/bin/env node

/**
 * Railway-Specific Deployment Verification System
 * Verifies Railway service status, environment variables, GitHub deployment, and database connectivity
 * Provides specific diagnostics and fixes for Railway deployment issues
 */

const https = require('https');
const { performance } = require('perf_hooks');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';

// Railway deployment metrics
const railwayMetrics = {
  totalChecks: 0,
  passedChecks: 0,
  failedChecks: 0,
  checkResults: [],
  startTime: performance.now(),
  deploymentIssues: [],
  recommendations: []
};

function makeRequest(path, method = 'GET', data = null, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const url = new URL(path, BACKEND_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Deployment-Verification/1.0'
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

// Check Railway service status
async function checkRailwayServiceStatus() {
  console.log('🚂 Checking Railway Service Status');
  console.log('==================================');
  
  const serviceChecks = [
    {
      name: 'Backend Service Availability',
      description: 'Verify Railway backend service is running and accessible',
      test: async () => {
        try {
          const response = await makeRequest('/health');
          
          const isHealthy = response.status === 200 && 
                           response.data.status === 'OK' && 
                           response.data.ready === true;
          
          return {
            success: isHealthy,
            details: {
              status: response.status,
              serviceStatus: response.data.status,
              ready: response.data.ready,
              version: response.data.version,
              uptime: response.data.uptime,
              port: response.data.port,
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'Railway Headers Verification',
      description: 'Check for Railway-specific headers indicating proper deployment',
      test: async () => {
        try {
          const response = await makeRequest('/health');
          
          const hasRailwayHeaders = response.headers['x-railway-edge'] || 
                                  response.headers['x-railway-request-id'];
          const hasProperHeaders = response.headers['server'] && 
                                 response.headers['content-type'];
          
          return {
            success: hasRailwayHeaders && hasProperHeaders,
            details: {
              hasRailwayHeaders: !!hasRailwayHeaders,
              railwayEdge: response.headers['x-railway-edge'],
              railwayRequestId: response.headers['x-railway-request-id'],
              server: response.headers['server'],
              contentType: response.headers['content-type'],
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'Service Resource Allocation',
      description: 'Verify service has adequate resources and is not resource-constrained',
      test: async () => {
        try {
          const response = await makeRequest('/health');
          
          // Check response time as indicator of resource availability
          const goodResponseTime = response.responseTime < 2000; // Under 2 seconds
          const serviceReady = response.data.ready === true;
          const hasUptime = response.data.uptime > 0;
          
          return {
            success: goodResponseTime && serviceReady && hasUptime,
            details: {
              responseTime: response.responseTime,
              goodResponseTime: goodResponseTime,
              serviceReady: serviceReady,
              uptime: response.data.uptime,
              hasUptime: hasUptime,
              resourcesAdequate: goodResponseTime && serviceReady
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    }
  ];
  
  let serviceChecksPassed = 0;
  const serviceResults = [];
  
  for (const check of serviceChecks) {
    console.log(`🔍 ${check.name}`);
    console.log(`   ${check.description}`);
    
    railwayMetrics.totalChecks++;
    
    const result = await check.test();
    serviceResults.push({
      name: check.name,
      ...result
    });
    
    railwayMetrics.checkResults.push({
      category: 'Railway Service Status',
      name: check.name,
      success: result.success,
      details: result.details,
      responseTime: result.responseTime
    });
    
    if (result.success) {
      console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
      serviceChecksPassed++;
      railwayMetrics.passedChecks++;
    } else {
      console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
      railwayMetrics.failedChecks++;
      railwayMetrics.deploymentIssues.push({
        category: 'Railway Service',
        issue: check.name,
        details: result.details
      });
    }
    
    console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
    console.log('');
  }
  
  return {
    category: 'Railway Service Status',
    passed: serviceChecksPassed,
    total: serviceChecks.length,
    healthy: serviceChecksPassed === serviceChecks.length,
    results: serviceResults
  };
}

// Check PostgreSQL service status on Railway
async function checkPostgreSQLServiceStatus() {
  console.log('🐘 Checking PostgreSQL Service Status on Railway');
  console.log('===============================================');
  
  const postgresChecks = [
    {
      name: 'Database Service Connection',
      description: 'Verify PostgreSQL service is accessible from backend',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/broker/health');
          
          const hasDbInfo = response.data.success && response.data.data;
          const dbComponents = response.data.data?.components || {};
          
          // Check if database connection errors are present
          const dbConnectionErrors = Object.values(dbComponents).filter(comp => 
            comp.error && comp.error.includes('Database connection not initialized')
          );
          
          const hasDbConnectionIssues = dbConnectionErrors.length > 0;
          
          return {
            success: hasDbInfo && !hasDbConnectionIssues,
            details: {
              hasDbInfo: hasDbInfo,
              dbConnectionErrors: dbConnectionErrors.length,
              hasDbConnectionIssues: hasDbConnectionIssues,
              components: Object.keys(dbComponents),
              errorDetails: dbConnectionErrors.map(err => err.error),
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'Database Environment Configuration',
      description: 'Check if DATABASE_URL environment variable is properly configured',
      test: async () => {
        try {
          // Try to get database configuration info through a test endpoint
          const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
            api_key: 'db_config_test_key',
            api_secret: 'db_config_test_secret',
            user_id: 'db_config_test_user'
          });
          
          // Analyze the error response to determine if it's a DB config issue
          const isDbConfigIssue = response.data.message && 
                                response.data.message.includes('Database connection not initialized');
          const isValidationError = response.data.error === 'Invalid request data';
          
          // If we get validation error, DB config might be OK but connection is failing
          // If we get DB connection error, it's definitely a config issue
          
          return {
            success: !isDbConfigIssue,
            details: {
              status: response.status,
              isDbConfigIssue: isDbConfigIssue,
              isValidationError: isValidationError,
              errorMessage: response.data.error,
              message: response.data.message,
              configurationStatus: isDbConfigIssue ? 'MISSING_OR_INVALID' : 'CONFIGURED',
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'Database Connection Pool Status',
      description: 'Verify database connection pool is properly initialized',
      test: async () => {
        try {
          // Test multiple concurrent requests to check connection pooling
          const concurrentRequests = Array(3).fill().map(() => 
            makeRequest('/api/modules/auth/broker/health')
          );
          
          const responses = await Promise.all(concurrentRequests);
          
          const allResponded = responses.every(r => r.status === 200);
          const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
          const hasConsistentErrors = responses.every(r => 
            r.data.data?.components?.brokerConfigs?.error?.includes('Database connection not initialized')
          );
          
          return {
            success: allResponded && !hasConsistentErrors,
            details: {
              allResponded: allResponded,
              avgResponseTime: Math.round(avgResponseTime),
              hasConsistentErrors: hasConsistentErrors,
              concurrentRequests: responses.length,
              connectionPoolWorking: allResponded && !hasConsistentErrors,
              responseTime: avgResponseTime
            },
            responseTime: avgResponseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    }
  ];
  
  let postgresChecksPassed = 0;
  const postgresResults = [];
  
  for (const check of postgresChecks) {
    console.log(`🔍 ${check.name}`);
    console.log(`   ${check.description}`);
    
    railwayMetrics.totalChecks++;
    
    const result = await check.test();
    postgresResults.push({
      name: check.name,
      ...result
    });
    
    railwayMetrics.checkResults.push({
      category: 'PostgreSQL Service',
      name: check.name,
      success: result.success,
      details: result.details,
      responseTime: result.responseTime
    });
    
    if (result.success) {
      console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
      postgresChecksPassed++;
      railwayMetrics.passedChecks++;
    } else {
      console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
      railwayMetrics.failedChecks++;
      railwayMetrics.deploymentIssues.push({
        category: 'PostgreSQL Service',
        issue: check.name,
        details: result.details
      });
    }
    
    console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
    console.log('');
  }
  
  return {
    category: 'PostgreSQL Service Status',
    passed: postgresChecksPassed,
    total: postgresChecks.length,
    healthy: postgresChecksPassed === postgresChecks.length,
    results: postgresResults
  };
}

// Check GitHub deployment verification
async function checkGitHubDeploymentStatus() {
  console.log('📦 Checking GitHub Deployment Status');
  console.log('===================================');
  
  const deploymentChecks = [
    {
      name: 'Latest Code Deployment',
      description: 'Verify latest code from GitHub is deployed',
      test: async () => {
        try {
          const response = await makeRequest('/health');
          
          const version = response.data.version;
          const isLatestVersion = version === '2.0.0'; // Expected latest version
          const hasVersion = !!version;
          
          return {
            success: hasVersion && isLatestVersion,
            details: {
              version: version,
              expectedVersion: '2.0.0',
              isLatestVersion: isLatestVersion,
              hasVersion: hasVersion,
              deploymentStatus: isLatestVersion ? 'LATEST' : 'OUTDATED',
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'OAuth Module Deployment',
      description: 'Verify OAuth module is properly deployed and loaded',
      test: async () => {
        try {
          const response = await makeRequest('/api/modules/auth/debug');
          
          const isOAuthModuleLoaded = response.status === 200 && 
                                    response.data.success && 
                                    response.data.data?.name === 'auth';
          const hasCorrectVersion = response.data.data?.version === '2.0.0';
          const isInitialized = response.data.data?.status === 'initialized';
          
          return {
            success: isOAuthModuleLoaded && hasCorrectVersion && isInitialized,
            details: {
              isOAuthModuleLoaded: isOAuthModuleLoaded,
              hasCorrectVersion: hasCorrectVersion,
              isInitialized: isInitialized,
              moduleVersion: response.data.data?.version,
              moduleStatus: response.data.data?.status,
              registeredAt: response.data.data?.registeredAt,
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    },
    {
      name: 'Deployment Consistency',
      description: 'Verify deployment is consistent across all endpoints',
      test: async () => {
        try {
          const endpoints = ['/health', '/api/modules/auth/debug', '/api/modules/auth/broker/health'];
          const responses = await Promise.all(
            endpoints.map(endpoint => makeRequest(endpoint))
          );
          
          const allResponding = responses.every(r => r.status === 200);
          const consistentVersions = responses.every(r => 
            !r.data.version || r.data.version === '2.0.0'
          );
          
          return {
            success: allResponding && consistentVersions,
            details: {
              allResponding: allResponding,
              consistentVersions: consistentVersions,
              endpointStatuses: endpoints.map((endpoint, index) => ({
                endpoint: endpoint,
                status: responses[index].status,
                version: responses[index].data.version
              })),
              deploymentConsistent: allResponding && consistentVersions,
              responseTime: responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length
            },
            responseTime: responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.error,
              code: error.code,
              responseTime: error.responseTime
            },
            responseTime: error.responseTime
          };
        }
      }
    }
  ];
  
  let deploymentChecksPassed = 0;
  const deploymentResults = [];
  
  for (const check of deploymentChecks) {
    console.log(`🔍 ${check.name}`);
    console.log(`   ${check.description}`);
    
    railwayMetrics.totalChecks++;
    
    const result = await check.test();
    deploymentResults.push({
      name: check.name,
      ...result
    });
    
    railwayMetrics.checkResults.push({
      category: 'GitHub Deployment',
      name: check.name,
      success: result.success,
      details: result.details,
      responseTime: result.responseTime
    });
    
    if (result.success) {
      console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
      deploymentChecksPassed++;
      railwayMetrics.passedChecks++;
    } else {
      console.log(`❌ FAIL (${Math.round(result.responseTime)}ms)`);
      railwayMetrics.failedChecks++;
      railwayMetrics.deploymentIssues.push({
        category: 'GitHub Deployment',
        issue: check.name,
        details: result.details
      });
    }
    
    console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
    console.log('');
  }
  
  return {
    category: 'GitHub Deployment Status',
    passed: deploymentChecksPassed,
    total: deploymentChecks.length,
    healthy: deploymentChecksPassed === deploymentChecks.length,
    results: deploymentResults
  };
}

// Generate Railway-specific recommendations
function generateRailwayRecommendations() {
  console.log('💡 Generating Railway-Specific Recommendations');
  console.log('==============================================');
  
  const recommendations = [];
  
  // Analyze deployment issues
  railwayMetrics.deploymentIssues.forEach(issue => {
    if (issue.category === 'PostgreSQL Service') {
      if (issue.details.isDbConfigIssue || issue.details.hasDbConnectionIssues) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'Database Configuration',
          issue: 'Database connection not initialized',
          recommendation: 'Check DATABASE_URL environment variable in Railway dashboard',
          steps: [
            '1. Go to Railway dashboard for your project',
            '2. Navigate to Variables tab',
            '3. Verify DATABASE_URL is set and points to your PostgreSQL service',
            '4. Ensure PostgreSQL service is running and accessible',
            '5. Restart the backend service after fixing the DATABASE_URL'
          ]
        });
      }
      
      if (issue.details.hasConsistentErrors) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Database Connection Pool',
          issue: 'Database connection pool not working',
          recommendation: 'Verify database connection pool configuration',
          steps: [
            '1. Check if DATABASE_URL includes connection pool parameters',
            '2. Verify PostgreSQL service has sufficient connection limits',
            '3. Check for any connection timeout issues',
            '4. Consider restarting both PostgreSQL and backend services'
          ]
        });
      }
    }
    
    if (issue.category === 'Railway Service') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Service Configuration',
        issue: 'Railway service configuration issues',
        recommendation: 'Review Railway service deployment settings',
        steps: [
          '1. Check Railway service logs for deployment errors',
          '2. Verify service has adequate resources allocated',
          '3. Ensure all required environment variables are set',
          '4. Check service networking and port configuration'
        ]
      });
    }
    
    if (issue.category === 'GitHub Deployment') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Deployment Sync',
        issue: 'GitHub deployment sync issues',
        recommendation: 'Ensure latest code is deployed from GitHub',
        steps: [
          '1. Check Railway deployment logs',
          '2. Verify GitHub repository is connected correctly',
          '3. Trigger a manual deployment if needed',
          '4. Check for any build or deployment failures'
        ]
      });
    }
  });
  
  // Add general Railway recommendations
  if (railwayMetrics.failedChecks > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'General Railway Health',
      issue: 'Multiple Railway deployment issues detected',
      recommendation: 'Perform comprehensive Railway service review',
      steps: [
        '1. Check Railway dashboard for service status',
        '2. Review all environment variables',
        '3. Check service logs for errors',
        '4. Verify database service is running',
        '5. Test database connectivity manually',
        '6. Restart services if necessary'
      ]
    });
  }
  
  railwayMetrics.recommendations = recommendations;
  
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.category} (${rec.priority})`);
    console.log(`   Issue: ${rec.issue}`);
    console.log(`   Recommendation: ${rec.recommendation}`);
    console.log(`   Steps:`);
    rec.steps.forEach(step => console.log(`     ${step}`));
    console.log('');
  });
  
  return recommendations;
}

// Main Railway deployment verification function
async function runRailwayDeploymentVerification() {
  console.log('🚂 Railway-Specific Deployment Verification');
  console.log('===========================================');
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  // Phase 1: Railway Service Status
  const serviceResult = await checkRailwayServiceStatus();
  
  // Phase 2: PostgreSQL Service Status
  const postgresResult = await checkPostgreSQLServiceStatus();
  
  // Phase 3: GitHub Deployment Status
  const deploymentResult = await checkGitHubDeploymentStatus();
  
  // Phase 4: Generate Recommendations
  const recommendations = generateRailwayRecommendations();
  
  // Calculate overall metrics
  const totalTime = performance.now() - railwayMetrics.startTime;
  
  // Final Summary
  console.log('📊 Railway Deployment Verification Summary');
  console.log('=========================================');
  
  const totalPhases = 3;
  let phasesPasssed = 0;
  
  console.log(`🚂 Railway Service: ${serviceResult.healthy ? 'HEALTHY' : 'ISSUES'} (${serviceResult.passed}/${serviceResult.total})`);
  if (serviceResult.healthy) phasesPasssed++;
  
  console.log(`🐘 PostgreSQL Service: ${postgresResult.healthy ? 'HEALTHY' : 'ISSUES'} (${postgresResult.passed}/${postgresResult.total})`);
  if (postgresResult.healthy) phasesPasssed++;
  
  console.log(`📦 GitHub Deployment: ${deploymentResult.healthy ? 'HEALTHY' : 'ISSUES'} (${deploymentResult.passed}/${deploymentResult.total})`);
  if (deploymentResult.healthy) phasesPasssed++;
  
  console.log('');
  console.log(`⏱️  Total Execution Time: ${Math.round(totalTime)}ms`);
  console.log(`📈 Total Checks: ${railwayMetrics.totalChecks}`);
  console.log(`✅ Checks Passed: ${railwayMetrics.passedChecks}`);
  console.log(`❌ Checks Failed: ${railwayMetrics.failedChecks}`);
  console.log(`📊 Success Rate: ${Math.round((railwayMetrics.passedChecks / railwayMetrics.totalChecks) * 100)}%`);
  console.log(`🏆 Phases Passed: ${phasesPasssed}/${totalPhases}`);
  console.log(`🚨 Issues Found: ${railwayMetrics.deploymentIssues.length}`);
  console.log(`💡 Recommendations: ${recommendations.length}`);
  console.log('');

  const overallHealthy = phasesPasssed === totalPhases;
  
  if (overallHealthy) {
    console.log('🎉 Railway deployment verification completed successfully!');
    console.log('✅ Railway service is running optimally');
    console.log('✅ PostgreSQL service is accessible and configured');
    console.log('✅ Latest GitHub code is deployed');
    console.log('✅ All Railway-specific checks passed');
  } else {
    console.log('⚠️ Railway deployment verification found issues:');
    
    if (!serviceResult.healthy) {
      console.log('❌ Railway service issues detected');
      console.log('💡 Recommendation: Check Railway service configuration and resources');
    }
    if (!postgresResult.healthy) {
      console.log('❌ PostgreSQL service issues detected');
      console.log('💡 Recommendation: Check DATABASE_URL and PostgreSQL service status');
    }
    if (!deploymentResult.healthy) {
      console.log('❌ GitHub deployment issues detected');
      console.log('💡 Recommendation: Verify latest code deployment from GitHub');
    }
    
    console.log('🔧 Review the detailed recommendations above for specific fixes');
  }

  return {
    healthy: overallHealthy,
    results: {
      service: serviceResult,
      postgres: postgresResult,
      deployment: deploymentResult
    },
    metrics: railwayMetrics,
    recommendations: recommendations,
    summary: {
      totalChecks: railwayMetrics.totalChecks,
      totalPassed: railwayMetrics.passedChecks,
      successRate: Math.round((railwayMetrics.passedChecks / railwayMetrics.totalChecks) * 100),
      executionTime: Math.round(totalTime),
      phasesPasssed: phasesPasssed,
      totalPhases: totalPhases,
      issuesFound: railwayMetrics.deploymentIssues.length
    }
  };
}

// Run Railway deployment verification
if (require.main === module) {
  runRailwayDeploymentVerification()
    .then(result => {
      console.log(`\n🏁 Railway verification completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.healthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
      
      // Export results for potential integration
      if (process.env.EXPORT_RESULTS) {
        const fs = require('fs');
        const resultsFile = `railway-verification-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
        console.log(`📄 Results exported to: ${resultsFile}`);
      }
      
      process.exit(result.healthy ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Railway verification failed:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runRailwayDeploymentVerification,
  checkRailwayServiceStatus,
  checkPostgreSQLServiceStatus,
  checkGitHubDeploymentStatus,
  generateRailwayRecommendations,
  makeRequest,
  railwayMetrics
};