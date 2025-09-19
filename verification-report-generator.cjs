#!/usr/bin/env node

/**
 * Automated Verification Report Generator
 * Aggregates results from all verification systems and generates comprehensive reports
 * Provides issue categorization, priority assignment, and actionable recommendations
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

// Report generation metrics
const reportMetrics = {
  startTime: performance.now(),
  verificationResults: {},
  totalTests: 0,
  totalPassed: 0,
  totalFailed: 0,
  overallScore: 0,
  criticalIssues: [],
  highPriorityIssues: [],
  mediumPriorityIssues: [],
  lowPriorityIssues: []
};

// Issue categorization and priority assignment
function categorizeIssue(testName, result, phase) {
  const issue = {
    id: `${phase.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    phase: phase,
    test: testName,
    status: result.success ? 'PASS' : 'FAIL',
    severity: 'MEDIUM',
    category: 'FUNCTIONAL',
    description: '',
    recommendation: '',
    impact: '',
    effort: 'MEDIUM',
    timestamp: new Date().toISOString()
  };

  // Categorize by phase and test type
  if (phase.includes('Database')) {
    issue.category = 'DATABASE';
    if (testName.includes('Connection') || testName.includes('PostgreSQL')) {
      issue.severity = 'CRITICAL';
      issue.description = 'Database connectivity issues detected';
      issue.recommendation = 'Check DATABASE_URL environment variable and PostgreSQL service status on Railway';
      issue.impact = 'Prevents OAuth functionality and data storage';
      issue.effort = 'HIGH';
    } else if (testName.includes('Schema')) {
      issue.severity = 'HIGH';
      issue.description = 'Database schema validation issues';
      issue.recommendation = 'Verify required tables and columns exist';
      issue.impact = 'May cause OAuth data storage failures';
      issue.effort = 'MEDIUM';
    }
  } else if (phase.includes('OAuth') || phase.includes('Endpoint')) {
    issue.category = 'OAUTH';
    if (testName.includes('URL Generation') || testName.includes('Setup')) {
      issue.severity = 'HIGH';
      issue.description = 'OAuth URL generation or setup issues';
      issue.recommendation = 'Fix database connection to enable OAuth URL generation';
      issue.impact = 'Users cannot initiate broker connections';
      issue.effort = 'HIGH';
    } else if (testName.includes('Validation') || testName.includes('Fix')) {
      issue.severity = 'MEDIUM';
      issue.description = 'OAuth validation or fix verification issues';
      issue.recommendation = 'Review OAuth endpoint validation logic';
      issue.impact = 'May cause user experience issues';
      issue.effort = 'MEDIUM';
    }
  } else if (phase.includes('Security')) {
    issue.category = 'SECURITY';
    if (testName.includes('Credential') || testName.includes('Token')) {
      issue.severity = 'HIGH';
      issue.description = 'Security credential or token handling issues';
      issue.recommendation = 'Implement proper credential encryption and token security';
      issue.impact = 'Potential security vulnerabilities';
      issue.effort = 'HIGH';
    } else if (testName.includes('CSRF') || testName.includes('State')) {
      issue.severity = 'HIGH';
      issue.description = 'CSRF protection or state validation issues';
      issue.recommendation = 'Implement proper OAuth state parameter validation';
      issue.impact = 'Vulnerability to CSRF attacks';
      issue.effort = 'MEDIUM';
    } else if (testName.includes('HTTPS') || testName.includes('Headers')) {
      issue.severity = 'MEDIUM';
      issue.description = 'HTTPS or security header issues';
      issue.recommendation = 'Add missing security headers';
      issue.impact = 'Reduced security posture';
      issue.effort = 'LOW';
    }
  } else if (phase.includes('Error') || phase.includes('Handling')) {
    issue.category = 'ERROR_HANDLING';
    if (testName.includes('Database') || testName.includes('Connection')) {
      issue.severity = 'MEDIUM';
      issue.description = 'Database error handling issues';
      issue.recommendation = 'Improve database error messages and handling';
      issue.impact = 'Poor user experience during errors';
      issue.effort = 'MEDIUM';
    } else if (testName.includes('Network') || testName.includes('Timeout')) {
      issue.severity = 'LOW';
      issue.description = 'Network error handling issues';
      issue.recommendation = 'Implement proper timeout and retry mechanisms';
      issue.impact = 'Reduced reliability under network issues';
      issue.effort = 'LOW';
    }
  } else if (phase.includes('Frontend') || phase.includes('End-to-End')) {
    issue.category = 'FRONTEND';
    if (testName.includes('Loading') || testName.includes('Accessibility')) {
      issue.severity = 'CRITICAL';
      issue.description = 'Frontend loading or accessibility issues';
      issue.recommendation = 'Check frontend deployment and URL configuration';
      issue.impact = 'Users cannot access the application';
      issue.effort = 'HIGH';
    } else if (testName.includes('Integration') || testName.includes('Flow')) {
      issue.severity = 'HIGH';
      issue.description = 'Frontend integration or flow issues';
      issue.recommendation = 'Fix backend connectivity to enable frontend integration';
      issue.impact = 'Broken user experience';
      issue.effort = 'HIGH';
    }
  } else if (phase.includes('Health') || phase.includes('Production')) {
    issue.category = 'MONITORING';
    issue.severity = 'LOW';
    issue.description = 'Health monitoring or production endpoint issues';
    issue.recommendation = 'Review endpoint health and monitoring configuration';
    issue.impact = 'Reduced observability';
    issue.effort = 'LOW';
  }

  return issue;
}

// Run all verification systems
async function runAllVerifications() {
  console.log('🔄 Running All Verification Systems');
  console.log('===================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  const verifications = [
    {
      name: 'Database Schema Verification',
      runner: verifyDatabaseSchema,
      enabled: true
    },
    {
      name: 'OAuth Endpoint Verification',
      runner: runEnhancedVerification,
      enabled: true
    },
    {
      name: 'Production Health Monitoring',
      runner: runProductionHealthMonitoring,
      enabled: true
    },
    {
      name: 'End-to-End OAuth Verification',
      runner: runEndToEndOAuthVerification,
      enabled: true
    },
    {
      name: 'Error Handling Verification',
      runner: runComprehensiveErrorHandlingVerification,
      enabled: true
    },
    {
      name: 'Security Verification',
      runner: runSecurityVerification,
      enabled: true
    }
  ];

  for (const verification of verifications) {
    if (!verification.enabled) {
      console.log(`⏭️  Skipping: ${verification.name}`);
      continue;
    }

    console.log(`🔍 Running: ${verification.name}`);
    console.log(''.padEnd(50, '-'));

    try {
      const result = await verification.runner();
      reportMetrics.verificationResults[verification.name] = result;
      
      // Extract metrics from result
      if (result.metrics) {
        reportMetrics.totalTests += result.metrics.totalTests || 0;
        reportMetrics.totalPassed += result.metrics.passedTests || result.metrics.successfulChecks || 0;
        reportMetrics.totalFailed += result.metrics.failedTests || result.metrics.failedChecks || 0;
      } else if (result.summary) {
        reportMetrics.totalTests += result.summary.totalTests || 0;
        reportMetrics.totalPassed += result.summary.totalPassed || 0;
        reportMetrics.totalFailed += result.summary.totalTests - result.summary.totalPassed || 0;
      }

      // Process results for issue categorization
      if (result.results) {
        Object.entries(result.results).forEach(([phase, phaseResult]) => {
          if (phaseResult.results) {
            phaseResult.results.forEach(testResult => {
              if (!testResult.success) {
                const issue = categorizeIssue(testResult.name, testResult, `${verification.name} - ${phase}`);
                
                switch (issue.severity) {
                  case 'CRITICAL':
                    reportMetrics.criticalIssues.push(issue);
                    break;
                  case 'HIGH':
                    reportMetrics.highPriorityIssues.push(issue);
                    break;
                  case 'MEDIUM':
                    reportMetrics.mediumPriorityIssues.push(issue);
                    break;
                  case 'LOW':
                    reportMetrics.lowPriorityIssues.push(issue);
                    break;
                }
              }
            });
          }
        });
      }

      console.log(`✅ Completed: ${verification.name}`);
      console.log('');
      
    } catch (error) {
      console.log(`❌ Failed: ${verification.name} - ${error.message}`);
      reportMetrics.verificationResults[verification.name] = {
        success: false,
        error: error.message
      };
      console.log('');
    }
  }

  // Calculate overall score
  reportMetrics.overallScore = reportMetrics.totalTests > 0 
    ? Math.round((reportMetrics.totalPassed / reportMetrics.totalTests) * 100)
    : 0;

  return reportMetrics;
}

// Generate markdown report
function generateMarkdownReport(metrics) {
  const timestamp = new Date().toISOString();
  const executionTime = Math.round(performance.now() - metrics.startTime);
  
  let report = `# OAuth Deployment Verification Report

**Generated:** ${timestamp}  
**Execution Time:** ${executionTime}ms  
**Overall Score:** ${metrics.overallScore}%  

## Executive Summary

This report provides a comprehensive analysis of the OAuth deployment verification across all system components. The verification covers database connectivity, endpoint functionality, security measures, error handling, and end-to-end integration testing.

### Overall Results

| Metric | Value |
|--------|-------|
| Total Tests | ${metrics.totalTests} |
| Tests Passed | ${metrics.totalPassed} |
| Tests Failed | ${metrics.totalFailed} |
| Success Rate | ${metrics.overallScore}% |
| Critical Issues | ${metrics.criticalIssues.length} |
| High Priority Issues | ${metrics.highPriorityIssues.length} |
| Medium Priority Issues | ${metrics.mediumPriorityIssues.length} |
| Low Priority Issues | ${metrics.lowPriorityIssues.length} |

### System Health Status

`;

  // Add verification results summary
  Object.entries(metrics.verificationResults).forEach(([name, result]) => {
    const status = result.success || result.healthy || result.secure ? '✅ PASS' : '❌ FAIL';
    const score = result.summary?.successRate || result.summary?.healthScore || result.summary?.securityScore || 'N/A';
    report += `- **${name}**: ${status} (${score}${typeof score === 'number' ? '%' : ''})\n`;
  });

  report += `\n## Critical Issues (${metrics.criticalIssues.length})

`;

  if (metrics.criticalIssues.length === 0) {
    report += `✅ No critical issues detected.\n\n`;
  } else {
    metrics.criticalIssues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.test}

**Category:** ${issue.category}  
**Phase:** ${issue.phase}  
**Impact:** ${issue.impact}  
**Effort:** ${issue.effort}  

**Description:** ${issue.description}

**Recommendation:** ${issue.recommendation}

---

`;
    });
  }

  report += `## High Priority Issues (${metrics.highPriorityIssues.length})

`;

  if (metrics.highPriorityIssues.length === 0) {
    report += `✅ No high priority issues detected.\n\n`;
  } else {
    metrics.highPriorityIssues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.test}

**Category:** ${issue.category}  
**Phase:** ${issue.phase}  
**Impact:** ${issue.impact}  
**Effort:** ${issue.effort}  

**Description:** ${issue.description}

**Recommendation:** ${issue.recommendation}

---

`;
    });
  }

  report += `## Medium Priority Issues (${metrics.mediumPriorityIssues.length})

`;

  if (metrics.mediumPriorityIssues.length === 0) {
    report += `✅ No medium priority issues detected.\n\n`;
  } else {
    metrics.mediumPriorityIssues.slice(0, 5).forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.test}

**Category:** ${issue.category}  
**Recommendation:** ${issue.recommendation}

`;
    });
    
    if (metrics.mediumPriorityIssues.length > 5) {
      report += `\n*... and ${metrics.mediumPriorityIssues.length - 5} more medium priority issues.*\n`;
    }
  }

  report += `\n## Detailed Verification Results

`;

  // Add detailed results for each verification
  Object.entries(metrics.verificationResults).forEach(([name, result]) => {
    report += `### ${name}

`;
    
    if (result.summary) {
      report += `**Summary:**
- Total Tests: ${result.summary.totalTests || 'N/A'}
- Passed: ${result.summary.totalPassed || result.summary.passedTests || 'N/A'}
- Success Rate: ${result.summary.successRate || result.summary.healthScore || result.summary.securityScore || 'N/A'}%
- Execution Time: ${result.summary.executionTime || 'N/A'}ms

`;
    }

    if (result.results) {
      report += `**Phase Results:**\n`;
      Object.entries(result.results).forEach(([phase, phaseResult]) => {
        const phaseStatus = phaseResult.healthy || phaseResult.success ? '✅' : '❌';
        const phaseScore = phaseResult.passed && phaseResult.total ? `(${phaseResult.passed}/${phaseResult.total})` : '';
        report += `- ${phaseStatus} ${phase} ${phaseScore}\n`;
      });
    }

    report += `\n`;
  });

  report += `## Recommendations

### Immediate Actions Required

`;

  // Generate prioritized recommendations
  const immediateActions = [...metrics.criticalIssues, ...metrics.highPriorityIssues]
    .slice(0, 5)
    .map((issue, index) => `${index + 1}. **${issue.category}**: ${issue.recommendation}`);

  if (immediateActions.length === 0) {
    report += `✅ No immediate actions required. System is functioning well.\n\n`;
  } else {
    immediateActions.forEach(action => {
      report += `${action}\n`;
    });
    report += `\n`;
  }

  report += `### Next Steps

1. **Address Critical Issues**: Focus on database connectivity and frontend deployment issues first
2. **Fix High Priority Issues**: Resolve OAuth functionality and security concerns
3. **Monitor System Health**: Set up continuous monitoring for the verification systems
4. **Regular Verification**: Run this verification suite regularly to catch issues early

### System Readiness Assessment

`;

  if (metrics.overallScore >= 90) {
    report += `🎉 **PRODUCTION READY**: System shows excellent health with ${metrics.overallScore}% success rate.`;
  } else if (metrics.overallScore >= 75) {
    report += `⚠️ **NEEDS ATTENTION**: System is mostly functional but requires attention to ${metrics.criticalIssues.length + metrics.highPriorityIssues.length} high-priority issues.`;
  } else if (metrics.overallScore >= 50) {
    report += `🚨 **SIGNIFICANT ISSUES**: System has major issues that need to be resolved before production deployment.`;
  } else {
    report += `💥 **NOT READY**: System has critical failures that prevent production deployment.`;
  }

  report += `\n\n---

*Report generated by OAuth Deployment Verification System*  
*Timestamp: ${timestamp}*
`;

  return report;
}

// Generate JSON report
function generateJSONReport(metrics) {
  return {
    metadata: {
      timestamp: new Date().toISOString(),
      executionTime: Math.round(performance.now() - metrics.startTime),
      version: '1.0.0',
      generator: 'OAuth Deployment Verification System'
    },
    summary: {
      overallScore: metrics.overallScore,
      totalTests: metrics.totalTests,
      totalPassed: metrics.totalPassed,
      totalFailed: metrics.totalFailed,
      successRate: metrics.overallScore,
      issueCount: {
        critical: metrics.criticalIssues.length,
        high: metrics.highPriorityIssues.length,
        medium: metrics.mediumPriorityIssues.length,
        low: metrics.lowPriorityIssues.length
      }
    },
    verificationResults: metrics.verificationResults,
    issues: {
      critical: metrics.criticalIssues,
      high: metrics.highPriorityIssues,
      medium: metrics.mediumPriorityIssues,
      low: metrics.lowPriorityIssues
    },
    recommendations: {
      immediate: [...metrics.criticalIssues, ...metrics.highPriorityIssues]
        .slice(0, 10)
        .map(issue => ({
          category: issue.category,
          recommendation: issue.recommendation,
          impact: issue.impact,
          effort: issue.effort
        })),
      systemReadiness: metrics.overallScore >= 75 ? 'READY' : 'NOT_READY'
    }
  };
}

// Main report generation function
async function generateVerificationReport(outputFormat = 'both') {
  console.log('📊 Automated Verification Report Generator');
  console.log('==========================================');
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Run all verifications
    const metrics = await runAllVerifications();
    
    console.log('📝 Generating Reports...');
    console.log('========================');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reports = {};
    
    // Generate markdown report
    if (outputFormat === 'markdown' || outputFormat === 'both') {
      const markdownReport = generateMarkdownReport(metrics);
      const markdownFile = `oauth-verification-report-${timestamp}.md`;
      fs.writeFileSync(markdownFile, markdownReport);
      reports.markdown = markdownFile;
      console.log(`✅ Markdown report generated: ${markdownFile}`);
    }
    
    // Generate JSON report
    if (outputFormat === 'json' || outputFormat === 'both') {
      const jsonReport = generateJSONReport(metrics);
      const jsonFile = `oauth-verification-report-${timestamp}.json`;
      fs.writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2));
      reports.json = jsonFile;
      console.log(`✅ JSON report generated: ${jsonFile}`);
    }
    
    console.log('');
    console.log('📊 Report Summary');
    console.log('=================');
    console.log(`🎯 Overall Score: ${metrics.overallScore}%`);
    console.log(`📈 Total Tests: ${metrics.totalTests}`);
    console.log(`✅ Tests Passed: ${metrics.totalPassed}`);
    console.log(`❌ Tests Failed: ${metrics.totalFailed}`);
    console.log(`🚨 Critical Issues: ${metrics.criticalIssues.length}`);
    console.log(`⚠️  High Priority Issues: ${metrics.highPriorityIssues.length}`);
    console.log(`📋 Medium Priority Issues: ${metrics.mediumPriorityIssues.length}`);
    console.log(`📝 Low Priority Issues: ${metrics.lowPriorityIssues.length}`);
    console.log('');
    
    // System readiness assessment
    if (metrics.overallScore >= 90) {
      console.log('🎉 SYSTEM STATUS: PRODUCTION READY');
    } else if (metrics.overallScore >= 75) {
      console.log('⚠️ SYSTEM STATUS: NEEDS ATTENTION');
    } else if (metrics.overallScore >= 50) {
      console.log('🚨 SYSTEM STATUS: SIGNIFICANT ISSUES');
    } else {
      console.log('💥 SYSTEM STATUS: NOT READY');
    }
    
    console.log('');
    console.log('🔧 Next Steps:');
    
    if (metrics.criticalIssues.length > 0) {
      console.log(`1. Address ${metrics.criticalIssues.length} critical issues immediately`);
    }
    if (metrics.highPriorityIssues.length > 0) {
      console.log(`2. Resolve ${metrics.highPriorityIssues.length} high priority issues`);
    }
    if (metrics.criticalIssues.length === 0 && metrics.highPriorityIssues.length === 0) {
      console.log('1. System is in good health - continue monitoring');
    }
    
    return {
      success: true,
      metrics: metrics,
      reports: reports,
      overallScore: metrics.overallScore,
      systemReady: metrics.overallScore >= 75
    };
    
  } catch (error) {
    console.error('💥 Report generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI interface
if (require.main === module) {
  const outputFormat = process.argv[2] || 'both'; // markdown, json, or both
  
  generateVerificationReport(outputFormat)
    .then(result => {
      console.log(`\n🏁 Report generation completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.success) {
        console.log(`🎯 System Readiness: ${result.systemReady ? 'READY' : 'NOT READY'}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Report generation failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  generateVerificationReport,
  runAllVerifications,
  generateMarkdownReport,
  generateJSONReport,
  categorizeIssue
};