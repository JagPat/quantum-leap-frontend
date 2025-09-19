#!/usr/bin/env node

/**
 * Verification Orchestration System
 * Master verification script that runs all verification components with workflow management
 * Provides pre-checks, execution coordination, post-analysis, and result persistence
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import all verification modules
const { verifyDatabaseSchema } = require('./verify-database-schema.cjs');
const { runEnhancedVerification } = require('./verify-oauth-endpoint.cjs');
const { runProductionHealthMonitoring } = require('./production-health-monitor.cjs');
const { runEndToEndOAuthVerification } = require('./end-to-end-oauth-verification.cjs');
const { runComprehensiveErrorHandlingVerification } = require('./error-handling-verification.cjs');
const { runSecurityVerification } = require('./security-verification.cjs');
const { generateVerificationReport } = require('./verification-report-generator.cjs');

// Orchestration configuration
const orchestrationConfig = {
  preChecks: {
    enabled: true,
    timeout: 30000,
    requiredEndpoints: [
      'https://web-production-de0bc.up.railway.app/health'
    ]
  },
  execution: {
    parallel: false, // Run sequentially for better resource management
    timeout: 300000, // 5 minutes per verification
    retryOnFailure: false,
    continueOnError: true
  },
  postAnalysis: {
    enabled: true,
    generateReport: true,
    persistResults: true,
    compareWithBaseline: false
  },
  scheduling: {
    enabled: false,
    interval: '0 */6 * * *', // Every 6 hours
    timezone: 'UTC'
  }
};

// Orchestration metrics
const orchestrationMetrics = {
  startTime: performance.now(),
  endTime: null,
  totalDuration: 0,
  verificationResults: {},
  preCheckResults: {},
  postAnalysisResults: {},
  overallStatus: 'UNKNOWN',
  executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
  timestamp: new Date().toISOString()
};

// Pre-check functions
async function runPreChecks() {
  console.log('🔍 Running Pre-Checks');
  console.log('====================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const preCheckResults = {
    systemReachability: false,
    basicConnectivity: false,
    serviceAvailability: false,
    environmentReady: false,
    allPassed: false
  };

  try {
    // Check system reachability
    console.log('🌐 Checking System Reachability...');
    const https = require('https');
    
    const healthCheck = await new Promise((resolve, reject) => {
      const req = https.get('https://web-production-de0bc.up.railway.app/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data
            });
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(orchestrationConfig.preChecks.timeout, () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });

    preCheckResults.systemReachability = healthCheck.status === 200;
    preCheckResults.basicConnectivity = true;
    
    if (healthCheck.data.status === 'OK' && healthCheck.data.ready === true) {
      preCheckResults.serviceAvailability = true;
      preCheckResults.environmentReady = true;
    }

    console.log(`✅ System Reachability: ${preCheckResults.systemReachability ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Basic Connectivity: ${preCheckResults.basicConnectivity ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Service Availability: ${preCheckResults.serviceAvailability ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Environment Ready: ${preCheckResults.environmentReady ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.log(`❌ Pre-check failed: ${error.message}`);
    preCheckResults.systemReachability = false;
    preCheckResults.basicConnectivity = false;
  }

  preCheckResults.allPassed = preCheckResults.systemReachability && 
                             preCheckResults.basicConnectivity && 
                             preCheckResults.serviceAvailability && 
                             preCheckResults.environmentReady;

  console.log('');
  console.log(`📊 Pre-Check Summary: ${preCheckResults.allPassed ? 'ALL PASSED' : 'ISSUES DETECTED'}`);
  console.log('');

  orchestrationMetrics.preCheckResults = preCheckResults;
  return preCheckResults;
}

// Verification workflow execution
async function executeVerificationWorkflow() {
  console.log('🔄 Executing Verification Workflow');
  console.log('==================================');
  console.log(`🆔 Execution ID: ${orchestrationMetrics.executionId}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const verificationSuite = [
    {
      id: 'database_schema',
      name: 'Database Schema Verification',
      runner: verifyDatabaseSchema,
      priority: 'CRITICAL',
      dependencies: [],
      timeout: 60000,
      enabled: true
    },
    {
      id: 'oauth_endpoints',
      name: 'OAuth Endpoint Verification',
      runner: runEnhancedVerification,
      priority: 'HIGH',
      dependencies: [],
      timeout: 120000,
      enabled: true
    },
    {
      id: 'production_health',
      name: 'Production Health Monitoring',
      runner: runProductionHealthMonitoring,
      priority: 'HIGH',
      dependencies: [],
      timeout: 60000,
      enabled: true
    },
    {
      id: 'end_to_end',
      name: 'End-to-End OAuth Verification',
      runner: runEndToEndOAuthVerification,
      priority: 'MEDIUM',
      dependencies: ['oauth_endpoints'],
      timeout: 120000,
      enabled: true
    },
    {
      id: 'error_handling',
      name: 'Error Handling Verification',
      runner: runComprehensiveErrorHandlingVerification,
      priority: 'MEDIUM',
      dependencies: [],
      timeout: 180000,
      enabled: true
    },
    {
      id: 'security',
      name: 'Security Verification',
      runner: runSecurityVerification,
      priority: 'HIGH',
      dependencies: [],
      timeout: 120000,
      enabled: true
    }
  ];

  const executionResults = {};
  let criticalFailures = 0;
  let highPriorityFailures = 0;

  for (const verification of verificationSuite) {
    if (!verification.enabled) {
      console.log(`⏭️  Skipping: ${verification.name} (disabled)`);
      continue;
    }

    // Check dependencies
    const dependenciesMet = verification.dependencies.every(dep => 
      executionResults[dep] && executionResults[dep].success
    );

    if (!dependenciesMet) {
      console.log(`⏭️  Skipping: ${verification.name} (dependencies not met)`);
      executionResults[verification.id] = {
        success: false,
        skipped: true,
        reason: 'Dependencies not met',
        dependencies: verification.dependencies
      };
      continue;
    }

    console.log(`🔍 Executing: ${verification.name}`);
    console.log(`   Priority: ${verification.priority}`);
    console.log(`   Timeout: ${verification.timeout}ms`);
    console.log('   ' + ''.padEnd(50, '-'));

    const startTime = performance.now();
    
    try {
      // Execute with timeout
      const result = await Promise.race([
        verification.runner(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Verification timeout')), verification.timeout)
        )
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      executionResults[verification.id] = {
        success: result.success || result.healthy || result.secure || false,
        result: result,
        duration: Math.round(duration),
        priority: verification.priority,
        timestamp: new Date().toISOString()
      };

      const status = executionResults[verification.id].success ? 'SUCCESS' : 'FAILED';
      console.log(`   ✅ ${status} (${Math.round(duration)}ms)`);

      // Track failures by priority
      if (!executionResults[verification.id].success) {
        if (verification.priority === 'CRITICAL') {
          criticalFailures++;
        } else if (verification.priority === 'HIGH') {
          highPriorityFailures++;
        }
      }

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      executionResults[verification.id] = {
        success: false,
        error: error.message,
        duration: Math.round(duration),
        priority: verification.priority,
        timestamp: new Date().toISOString()
      };

      console.log(`   ❌ ERROR: ${error.message} (${Math.round(duration)}ms)`);

      // Track failures by priority
      if (verification.priority === 'CRITICAL') {
        criticalFailures++;
      } else if (verification.priority === 'HIGH') {
        highPriorityFailures++;
      }

      // Stop on critical failures if configured
      if (verification.priority === 'CRITICAL' && !orchestrationConfig.execution.continueOnError) {
        console.log('🚨 Critical verification failed - stopping execution');
        break;
      }
    }

    console.log('');
  }

  // Determine overall status
  let overallStatus = 'SUCCESS';
  if (criticalFailures > 0) {
    overallStatus = 'CRITICAL_FAILURE';
  } else if (highPriorityFailures > 0) {
    overallStatus = 'HIGH_PRIORITY_ISSUES';
  } else if (Object.values(executionResults).some(r => !r.success && !r.skipped)) {
    overallStatus = 'MINOR_ISSUES';
  }

  orchestrationMetrics.verificationResults = executionResults;
  orchestrationMetrics.overallStatus = overallStatus;

  console.log('📊 Workflow Execution Summary');
  console.log('=============================');
  console.log(`🆔 Execution ID: ${orchestrationMetrics.executionId}`);
  console.log(`📊 Overall Status: ${overallStatus}`);
  console.log(`🚨 Critical Failures: ${criticalFailures}`);
  console.log(`⚠️  High Priority Failures: ${highPriorityFailures}`);
  console.log('');

  Object.entries(executionResults).forEach(([id, result]) => {
    const status = result.success ? '✅' : result.skipped ? '⏭️' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${status} ${id}: ${result.success ? 'SUCCESS' : result.skipped ? 'SKIPPED' : 'FAILED'} ${duration}`);
  });

  console.log('');
  return executionResults;
}

// Post-analysis functions
async function runPostAnalysis(verificationResults) {
  console.log('📊 Running Post-Analysis');
  console.log('========================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const postAnalysisResults = {
    reportGenerated: false,
    resultsPersisted: false,
    baselineComparison: null,
    recommendations: [],
    nextSteps: []
  };

  try {
    // Generate comprehensive report
    if (orchestrationConfig.postAnalysis.generateReport) {
      console.log('📝 Generating Comprehensive Report...');
      
      const reportResult = await generateVerificationReport('both');
      postAnalysisResults.reportGenerated = reportResult.success;
      
      if (reportResult.success) {
        console.log(`✅ Report generated successfully`);
        console.log(`   📄 Files: ${Object.values(reportResult.reports).join(', ')}`);
      } else {
        console.log(`❌ Report generation failed: ${reportResult.error}`);
      }
    }

    // Persist results
    if (orchestrationConfig.postAnalysis.persistResults) {
      console.log('💾 Persisting Verification Results...');
      
      const persistenceData = {
        executionId: orchestrationMetrics.executionId,
        timestamp: orchestrationMetrics.timestamp,
        preCheckResults: orchestrationMetrics.preCheckResults,
        verificationResults: orchestrationMetrics.verificationResults,
        overallStatus: orchestrationMetrics.overallStatus,
        totalDuration: orchestrationMetrics.totalDuration,
        metadata: {
          version: '1.0.0',
          environment: 'production',
          orchestrator: 'verification-orchestrator'
        }
      };

      const persistenceFile = `verification-execution-${orchestrationMetrics.executionId}.json`;
      fs.writeFileSync(persistenceFile, JSON.stringify(persistenceData, null, 2));
      postAnalysisResults.resultsPersisted = true;
      
      console.log(`✅ Results persisted to: ${persistenceFile}`);
    }

    // Generate recommendations
    console.log('💡 Generating Recommendations...');
    
    const failedVerifications = Object.entries(orchestrationMetrics.verificationResults)
      .filter(([_, result]) => !result.success && !result.skipped);

    if (failedVerifications.length === 0) {
      postAnalysisResults.recommendations.push('System is healthy - continue regular monitoring');
      postAnalysisResults.nextSteps.push('Schedule next verification cycle');
    } else {
      const criticalIssues = failedVerifications.filter(([_, result]) => result.priority === 'CRITICAL');
      const highPriorityIssues = failedVerifications.filter(([_, result]) => result.priority === 'HIGH');

      if (criticalIssues.length > 0) {
        postAnalysisResults.recommendations.push('Address critical database and infrastructure issues immediately');
        postAnalysisResults.nextSteps.push('Fix database connectivity before proceeding with deployment');
      }

      if (highPriorityIssues.length > 0) {
        postAnalysisResults.recommendations.push('Resolve high-priority OAuth and security issues');
        postAnalysisResults.nextSteps.push('Review OAuth endpoint functionality and security measures');
      }

      postAnalysisResults.recommendations.push('Run verification again after fixes are applied');
      postAnalysisResults.nextSteps.push('Monitor system health continuously');
    }

    console.log('✅ Recommendations generated');

  } catch (error) {
    console.log(`❌ Post-analysis error: ${error.message}`);
  }

  orchestrationMetrics.postAnalysisResults = postAnalysisResults;

  console.log('');
  console.log('📋 Post-Analysis Summary');
  console.log('========================');
  console.log(`📝 Report Generated: ${postAnalysisResults.reportGenerated ? 'YES' : 'NO'}`);
  console.log(`💾 Results Persisted: ${postAnalysisResults.resultsPersisted ? 'YES' : 'NO'}`);
  console.log(`💡 Recommendations: ${postAnalysisResults.recommendations.length}`);
  console.log(`📋 Next Steps: ${postAnalysisResults.nextSteps.length}`);
  console.log('');

  return postAnalysisResults;
}

// Main orchestration function
async function runVerificationOrchestration(options = {}) {
  console.log('🎼 Verification Orchestration System');
  console.log('===================================');
  console.log(`🆔 Execution ID: ${orchestrationMetrics.executionId}`);
  console.log(`⏱️  Started at: ${orchestrationMetrics.timestamp}`);
  console.log('');

  try {
    // Phase 1: Pre-Checks
    const preCheckResults = await runPreChecks();
    
    if (!preCheckResults.allPassed && !options.skipPreChecks) {
      console.log('🚨 Pre-checks failed - aborting verification workflow');
      console.log('💡 Use --skip-pre-checks to bypass pre-check validation');
      
      return {
        success: false,
        phase: 'PRE_CHECKS',
        results: {
          preChecks: preCheckResults
        },
        executionId: orchestrationMetrics.executionId
      };
    }

    // Phase 2: Verification Workflow Execution
    const verificationResults = await executeVerificationWorkflow();

    // Phase 3: Post-Analysis
    const postAnalysisResults = await runPostAnalysis(verificationResults);

    // Calculate final metrics
    orchestrationMetrics.endTime = performance.now();
    orchestrationMetrics.totalDuration = Math.round(orchestrationMetrics.endTime - orchestrationMetrics.startTime);

    // Final Summary
    console.log('🏁 Orchestration Complete');
    console.log('=========================');
    console.log(`🆔 Execution ID: ${orchestrationMetrics.executionId}`);
    console.log(`⏱️  Total Duration: ${orchestrationMetrics.totalDuration}ms`);
    console.log(`📊 Overall Status: ${orchestrationMetrics.overallStatus}`);
    console.log(`🔍 Verifications Run: ${Object.keys(orchestrationMetrics.verificationResults).length}`);
    console.log(`✅ Successful: ${Object.values(orchestrationMetrics.verificationResults).filter(r => r.success).length}`);
    console.log(`❌ Failed: ${Object.values(orchestrationMetrics.verificationResults).filter(r => !r.success && !r.skipped).length}`);
    console.log(`⏭️  Skipped: ${Object.values(orchestrationMetrics.verificationResults).filter(r => r.skipped).length}`);
    console.log('');

    // Recommendations
    if (postAnalysisResults.recommendations.length > 0) {
      console.log('💡 Key Recommendations:');
      postAnalysisResults.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // Next Steps
    if (postAnalysisResults.nextSteps.length > 0) {
      console.log('📋 Next Steps:');
      postAnalysisResults.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
      console.log('');
    }

    // System Readiness Assessment
    const systemReady = orchestrationMetrics.overallStatus === 'SUCCESS' || 
                       orchestrationMetrics.overallStatus === 'MINOR_ISSUES';
    
    console.log(`🎯 System Readiness: ${systemReady ? 'READY FOR PRODUCTION' : 'NEEDS ATTENTION'}`);
    console.log('');

    return {
      success: true,
      systemReady: systemReady,
      overallStatus: orchestrationMetrics.overallStatus,
      results: {
        preChecks: preCheckResults,
        verifications: verificationResults,
        postAnalysis: postAnalysisResults
      },
      metrics: orchestrationMetrics,
      executionId: orchestrationMetrics.executionId
    };

  } catch (error) {
    console.error('💥 Orchestration failed:', error);
    
    return {
      success: false,
      error: error.message,
      executionId: orchestrationMetrics.executionId
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipPreChecks: args.includes('--skip-pre-checks'),
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run')
  };

  if (options.dryRun) {
    console.log('🧪 Dry Run Mode - No actual verifications will be executed');
    console.log('');
  }

  runVerificationOrchestration(options)
    .then(result => {
      console.log(`🏁 Orchestration completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.success && result.systemReady !== undefined) {
        console.log(`🎯 System Ready: ${result.systemReady ? 'YES' : 'NO'}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Orchestration failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runVerificationOrchestration,
  runPreChecks,
  executeVerificationWorkflow,
  runPostAnalysis,
  orchestrationConfig,
  orchestrationMetrics
};