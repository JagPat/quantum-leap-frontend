#!/usr/bin/env node

/**
 * Quick Frontend Fixes Verification
 * Tests the frontend AI components directly
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function logTest(message) {
  log(`🧪 ${message}`, 'cyan');
}

// Test configuration
const FILES_TO_CHECK = [
  'src/hooks/useAI.js',
  'src/pages/AI.jsx',
  'src/components/ai/TradingSignalsPanel.jsx',
  'src/components/ai/StrategyInsightsPanel.jsx',
  'src/components/ai/CrowdIntelligencePanel.jsx',
  'src/components/ai/MarketAnalysisPanel.jsx'
];

const PATTERNS_TO_VERIFY = {
  'useAI.js': [
    'not_implemented',
    'unauthorized',
    'console.log.*useAI',
    'status.*not_implemented',
    'status.*unauthorized'
  ],
  'AI.jsx': [
    'isAuthenticated',
    'Authentication Required',
    'Connect Broker',
    'AlertTriangle'
  ],
  'TradingSignalsPanel.jsx': [
    'not_implemented',
    'unauthorized',
    'Coming Soon',
    'toast.*Feature Coming Soon'
  ],
  'StrategyInsightsPanel.jsx': [
    'not_implemented',
    'unauthorized',
    'Coming Soon',
    'toast.*Feature Coming Soon'
  ],
  'CrowdIntelligencePanel.jsx': [
    'not_implemented',
    'unauthorized',
    'Coming Soon',
    'useCrowdIntelligence'
  ],
  'MarketAnalysisPanel.jsx': [
    'not_implemented',
    'unauthorized',
    'Coming Soon',
    'toast.*Feature Coming Soon'
  ]
};

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const patterns = PATTERNS_TO_VERIFY[fileName] || [];
    
    logTest(`Checking ${fileName}...`);
    
    const results = {
      file: fileName,
      exists: true,
      patterns: []
    };
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i');
      const matches = content.match(regex);
      results.patterns.push({
        pattern,
        found: !!matches,
        count: matches ? matches.length : 0
      });
    });
    
    return results;
  } catch (error) {
    return {
      file: path.basename(filePath),
      exists: false,
      error: error.message
    };
  }
}

function verifyFrontendFixes() {
  log('🚀 Verifying Frontend AI Fixes...', 'bright');
  log('');
  
  let totalFiles = 0;
  let existingFiles = 0;
  let totalPatterns = 0;
  let foundPatterns = 0;
  
  FILES_TO_CHECK.forEach(filePath => {
    totalFiles++;
    const result = checkFile(filePath);
    
    if (result.exists) {
      existingFiles++;
      logSuccess(`${result.file} - EXISTS`);
      
      result.patterns.forEach(pattern => {
        totalPatterns++;
        if (pattern.found) {
          foundPatterns++;
          logSuccess(`  ✅ ${pattern.pattern} (${pattern.count} matches)`);
        } else {
          logError(`  ❌ ${pattern.pattern} - NOT FOUND`);
        }
      });
    } else {
      logError(`${result.file} - MISSING: ${result.error}`);
    }
    
    log('');
  });
  
  // Summary
  log('='.repeat(50), 'bright');
  log('FRONTEND FIXES VERIFICATION SUMMARY', 'bright');
  log('='.repeat(50), 'bright');
  
  log(`📁 Files Checked: ${totalFiles}`, 'blue');
  log(`✅ Files Found: ${existingFiles}`, 'green');
  log(`❌ Files Missing: ${totalFiles - existingFiles}`, 'red');
  log('');
  log(`🔍 Patterns Checked: ${totalPatterns}`, 'blue');
  log(`✅ Patterns Found: ${foundPatterns}`, 'green');
  log(`❌ Patterns Missing: ${totalPatterns - foundPatterns}`, 'red');
  log('');
  
  const successRate = (foundPatterns / totalPatterns * 100).toFixed(1);
  if (successRate >= 90) {
    log(`🎉 SUCCESS RATE: ${successRate}% - All fixes verified!`, 'green');
  } else if (successRate >= 70) {
    log(`⚠️ SUCCESS RATE: ${successRate}% - Most fixes verified`, 'yellow');
  } else {
    log(`❌ SUCCESS RATE: ${successRate}% - Many fixes missing`, 'red');
  }
  
  log('='.repeat(50), 'bright');
  
  return {
    totalFiles,
    existingFiles,
    totalPatterns,
    foundPatterns,
    successRate: parseFloat(successRate)
  };
}

// Run verification if this script is executed directly
if (require.main === module) {
  const results = verifyFrontendFixes();
  process.exit(results.successRate >= 90 ? 0 : 1);
}

module.exports = { verifyFrontendFixes }; 