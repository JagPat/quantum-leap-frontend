#!/usr/bin/env node

/**
 * OAuth Verification CLI Tool
 * Command-line interface for running specific verification tests with options
 */

// Simple CLI implementation without external dependencies
const fs = require('fs');
const path = require('path');

// Import verification modules
const { verifyDatabaseSchema } = require('./verify-database-schema.cjs');
const { runEnhancedVerification } = require('./verify-oauth-endpoint.cjs');
const { runProductionHealthMonitoring } = require('./production-health-monitor.cjs');
const { runEndToEndOAuthVerification } = require('./end-to-end-oauth-verification.cjs');
const { runComprehensiveErrorHandlingVerification } = require('./error-handling-verification.cjs');
const { runSecurityVerification } = require('./security-verification.cjs');
const { runRailwayDeploymentVerification } = require('./railway-deployment-verification.cjs');
const { generateVerificationReport } = require('./verification-report-generator.cjs');
const { runVerificationOrchestration } = require('./verification-orchestrator.cjs');
const { runHealthDashboard } = require('./production-health-dashboard.cjs');

// CLI configuration
const CLI_VERSION = '1.0.0';
const DEFAULT_OUTPUT_DIR = './verification-results';

// Available verification modules
const VERIFICATION_MODULES = {
  'database': {
    name: 'Database Schema Verification',
    runner: verifyDatabaseSchema,
    description: 'Verify PostgreSQL database connectivity and schema'
  },
  'oauth': {
    name: 'OAuth Endpoint Verification',
    runner: runEnhancedVerification,
    description: 'Test OAuth endpoints and deployment status'
  },
  'health': {
    name: 'Production Health Monitoring',
    runner: runProductionHealthMonitoring,
    description: 'Monitor production endpoint health'
  },
  'e2e': {
    name: 'End-to-End OAuth Verification',
    runner: runEndToEndOAuthVerification,
    description: 'Test complete OAuth flow from frontend to callback'
  },
  'errors': {
    name: 'Error Handling Verification',
    runner: runComprehensiveErrorHandlingVerification,
    description: 'Test error scenarios and handling'
  },
  'security': {
    name: 'Security Verification',
    runner: runSecurityVerification,
    description: 'Verify security measures and HTTPS implementation'
  },
  'railway': {
    name: 'Railway Deployment Verification',
    runner: runRailwayDeploymentVerification,
    description: 'Verify Railway-specific deployment status'
  },
  'report': {
    name: 'Generate Verification Report',
    runner: generateVerificationReport,
    description: 'Generate comprehensive verification report'
  },
  'orchestrate': {
    name: 'Run All Verifications',
    runner: runVerificationOrchestration,
    description: 'Run complete verification workflow'
  },
  'dashboard': {
    name: 'Health Dashboard',
    runner: runHealthDashboard,
    description: 'Start real-time health monitoring dashboard'
  }
};

// Utility functions
function ensureOutputDir(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }
}

function saveResults(results, outputDir, format, testName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${testName}-${timestamp}.${format}`;
  const filepath = path.join(outputDir, filename);
  
  try {
    const content = format === 'json' 
      ? JSON.stringify(results, null, 2)
      : typeof results === 'string' ? results : JSON.stringify(results, null, 2);
    
    fs.writeFileSync(filepath, content);
    console.log(`💾 Results saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error(`❌ Failed to save results: ${error.message}`);
    return null;
  }
}

function displayResults(results, verbose = false) {
  if (!results) {
    console.log('❌ No results to display');
    return;
  }

  console.log('\n📊 Verification Results Summary');
  console.log('==============================');
  
  if (results.success !== undefined) {
    console.log(`🎯 Overall Status: ${results.success ? 'SUCCESS' : 'FAILED'}`);
  }
  
  if (results.summary) {
    const summary = results.summary;
    console.log(`📈 Total Tests: ${summary.totalTests || 'N/A'}`);
    console.log(`✅ Passed: ${summary.totalPassed || summary.passedTests || 'N/A'}`);
    console.log(`❌ Failed: ${summary.totalTests - summary.totalPassed || 'N/A'}`);
    console.log(`📊 Success Rate: ${summary.successRate || summary.healthScore || summary.securityScore || 'N/A'}%`);
    console.log(`⏱️ Execution Time: ${summary.executionTime || 'N/A'}ms`);
  }
  
  if (verbose && results.results) {
    console.log('\n🔍 Detailed Results:');
    Object.entries(results.results).forEach(([phase, phaseResult]) => {
      const status = phaseResult.healthy || phaseResult.success ? '✅' : '❌';
      const score = phaseResult.passed && phaseResult.total ? `(${phaseResult.passed}/${phaseResult.total})` : '';
      console.log(`   ${status} ${phase} ${score}`);
    });
  }
  
  if (results.recommendations && results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.recommendation || rec}`);
    });
  }
}

// CLI command handlers
async function handleCommand(command, subCommand, options) {
  switch (command) {
    case 'list':
      console.log('📋 Available Verification Modules');
      console.log('=================================');
      Object.entries(VERIFICATION_MODULES).forEach(([key, module]) => {
        console.log(`🔍 ${key.padEnd(12)} - ${module.description}`);
      });
      break;
      
    case 'run':
      if (!subCommand) {
        console.error('❌ Module name required');
        console.log('💡 Use "list" command to see available modules');
        process.exit(1);
      }
      
      const module = VERIFICATION_MODULES[subCommand];
      if (!module) {
        console.error(`❌ Unknown verification module: ${subCommand}`);
        process.exit(1);
      }
      
      if (!options.quiet) {
        console.log(`🔍 Running: ${module.name}`);
        console.log(`📝 Description: ${module.description}`);
        console.log(`⏱️ Started at: ${new Date().toISOString()}`);
        console.log('');
      }
      
      try {
        ensureOutputDir(options.output);
        const results = await module.runner();
        
        if (!options.quiet) {
          displayResults(results, options.verbose);
          
          if (options.export && options.export !== 'none') {
            const formats = options.export === 'both' ? ['json', 'markdown'] : [options.export];
            formats.forEach(format => {
              saveResults(results, options.output, format, subCommand);
            });
          }
        }
        
        process.exit(results.success || results.healthy || results.secure ? 0 : 1);
        
      } catch (error) {
        console.error(`💥 Verification failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    case 'run-all':
      console.log('🔍 Running All Verifications');
      console.log('============================');
      
      try {
        const result = await runVerificationOrchestration();
        displayResults(result, options.verbose);
        process.exit(result.success ? 0 : 1);
      } catch (error) {
        console.error(`💥 All verifications failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    case 'health':
      try {
        const result = await runProductionHealthMonitoring();
        displayResults(result, options.verbose);
        process.exit(result.healthy ? 0 : 1);
      } catch (error) {
        console.error(`💥 Health check failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    case 'dashboard':
      console.log('🏥 Starting Health Dashboard...');
      await runHealthDashboard();
      break;
      
    case 'report':
      try {
        ensureOutputDir(options.output);
        const result = await generateVerificationReport(options.export || 'both');
        
        if (result.success) {
          console.log('✅ Report generated successfully');
          if (result.reports) {
            Object.entries(result.reports).forEach(([format, filename]) => {
              console.log(`📄 ${format.toUpperCase()}: ${filename}`);
            });
          }
        } else {
          console.error('❌ Report generation failed');
        }
        
        process.exit(result.success ? 0 : 1);
        
      } catch (error) {
        console.error(`💥 Report generation failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('💡 Use "help" command to see available options');
      process.exit(1);
  }
}

// Simple CLI implementation
function showHelp() {
  console.log('🔍 OAuth Deployment Verification CLI Tool v' + CLI_VERSION);
  console.log('==========================================');
  console.log('');
  console.log('Usage: node oauth-verify-cli.cjs <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  list                    List all available verification modules');
  console.log('  run <module>           Run a specific verification module');
  console.log('  run-all                Run all verifications');
  console.log('  health                 Quick health check');
  console.log('  dashboard              Start health monitoring dashboard');
  console.log('  report                 Generate comprehensive report');
  console.log('  help                   Show this help message');
  console.log('');
  console.log('Options:');
  console.log('  --verbose              Enable verbose output');
  console.log('  --export <format>      Export results (json, markdown, both)');
  console.log('  --output <dir>         Output directory for results');
  console.log('  --quiet                Suppress output except errors');
  console.log('');
  console.log('Available Modules:');
  Object.entries(VERIFICATION_MODULES).forEach(([key, module]) => {
    console.log(`  ${key.padEnd(12)} - ${module.description}`);
  });
  console.log('');
  console.log('Examples:');
  console.log('  node oauth-verify-cli.cjs list');
  console.log('  node oauth-verify-cli.cjs run database --verbose');
  console.log('  node oauth-verify-cli.cjs run oauth --export both');
  console.log('  node oauth-verify-cli.cjs health');
  console.log('  node oauth-verify-cli.cjs dashboard');
  console.log('  node oauth-verify-cli.cjs report');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subCommand = args[1];
  
  const options = {
    verbose: args.includes('--verbose'),
    quiet: args.includes('--quiet'),
    export: 'json',
    output: DEFAULT_OUTPUT_DIR
  };
  
  // Parse export option
  const exportIndex = args.indexOf('--export');
  if (exportIndex !== -1 && args[exportIndex + 1]) {
    options.export = args[exportIndex + 1];
  }
  
  // Parse output option
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.output = args[outputIndex + 1];
  }
  
  return { command, subCommand, options };
}

// Main CLI function
async function runCLI() {
  const { command, subCommand, options } = parseArgs();
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }
  
  switch (command) {
    case 'list':
      console.log('📋 Available Verification Modules');
      console.log('=================================');
      Object.entries(VERIFICATION_MODULES).forEach(([key, module]) => {
        console.log(`🔍 ${key.padEnd(12)} - ${module.description}`);
      });
      break;
      
    case 'run':
      if (!subCommand) {
        console.error('❌ Module name required');
        console.log('💡 Use "list" command to see available modules');
        process.exit(1);
      }
      
      const module = VERIFICATION_MODULES[subCommand];
      if (!module) {
        console.error(`❌ Unknown verification module: ${subCommand}`);
        process.exit(1);
      }
      
      if (!options.quiet) {
        console.log(`🔍 Running: ${module.name}`);
        console.log(`📝 Description: ${module.description}`);
        console.log(`⏱️ Started at: ${new Date().toISOString()}`);
        console.log('');
      }
      
      try {
        ensureOutputDir(options.output);
        const results = await module.runner();
        
        if (!options.quiet) {
          displayResults(results, options.verbose);
          
          if (options.export && options.export !== 'none') {
            const formats = options.export === 'both' ? ['json', 'markdown'] : [options.export];
            formats.forEach(format => {
              saveResults(results, options.output, format, subCommand);
            });
          }
        }
        
        process.exit(results.success || results.healthy || results.secure ? 0 : 1);
        
      } catch (error) {
        console.error(`💥 Verification failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    case 'run-all':
      console.log('🔍 Running All Verifications');
      console.log('============================');
      
      try {
        const result = await runVerificationOrchestration();
        displayResults(result, options.verbose);
        process.exit(result.success ? 0 : 1);
      } catch (error) {
        console.error(`💥 All verifications failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    case 'health':
      try {
        const result = await runProductionHealthMonitoring();
        displayResults(result, options.verbose);
        process.exit(result.healthy ? 0 : 1);
      } catch (error) {
        console.error(`💥 Health check failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    case 'dashboard':
      console.log('🏥 Starting Health Dashboard...');
      await runHealthDashboard();
      break;
      
    case 'report':
      try {
        ensureOutputDir(options.output);
        const result = await generateVerificationReport(options.export || 'both');
        
        if (result.success) {
          console.log('✅ Report generated successfully');
          if (result.reports) {
            Object.entries(result.reports).forEach(([format, filename]) => {
              console.log(`📄 ${format.toUpperCase()}: ${filename}`);
            });
          }
        } else {
          console.error('❌ Report generation failed');
        }
        
        process.exit(result.success ? 0 : 1);
        
      } catch (error) {
        console.error(`💥 Report generation failed: ${error.message}`);
        process.exit(1);
      }
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('💡 Use "help" command to see available options');
      process.exit(1);
  }
}

// Run CLI if this is the main module
if (require.main === module) {
  runCLI().catch(error => {
    console.error('💥 CLI failed:', error);
    process.exit(1);
  });
}

// Export for use in other scripts
module.exports = {
  VERIFICATION_MODULES,
  CLI_VERSION,
  runCLI,
  showHelp,
  parseArgs
};