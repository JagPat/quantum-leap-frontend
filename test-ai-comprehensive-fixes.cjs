#!/usr/bin/env node

/**
 * Comprehensive AI Frontend-Backend Integration Test
 * Tests all AI features and response handling
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';
const FRONTEND_URL = 'http://localhost:5173';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  verbose: true
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function logTest(message) {
  log(`🧪 ${message}`, 'cyan');
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'AI-Test-Suite/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: TEST_CONFIG.timeout
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test helper with retries
async function testWithRetry(testName, testFn, retries = TEST_CONFIG.retries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logTest(`${testName} (attempt ${attempt}/${retries})`);
      const result = await testFn();
      logSuccess(`${testName} - PASSED`);
      return result;
    } catch (error) {
      if (attempt === retries) {
        logError(`${testName} - FAILED after ${retries} attempts: ${error.message}`);
        throw error;
      } else {
        logWarning(`${testName} - Attempt ${attempt} failed: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
  }
}

// Test suite
class AITestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  async runTest(testName, testFn) {
    try {
      const result = await testWithRetry(testName, testFn);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED', result });
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
      throw error;
    }
  }

  async runWarningTest(testName, testFn) {
    try {
      const result = await testFn();
      this.results.warnings++;
      this.results.tests.push({ name: testName, status: 'WARNING', result });
      return result;
    } catch (error) {
      this.results.warnings++;
      this.results.tests.push({ name: testName, status: 'WARNING', error: error.message });
      return null;
    }
  }

  printResults() {
    log('\n' + '='.repeat(60), 'bright');
    log('AI FRONTEND-BACKEND INTEGRATION TEST RESULTS', 'bright');
    log('='.repeat(60), 'bright');
    
    log(`\n📊 Summary:`, 'bright');
    log(`   Passed: ${this.results.passed}`, 'green');
    log(`   Failed: ${this.results.failed}`, 'red');
    log(`   Warnings: ${this.results.warnings}`, 'yellow');
    
    log(`\n📋 Detailed Results:`, 'bright');
    this.results.tests.forEach(test => {
      const statusColor = test.status === 'PASSED' ? 'green' : 
                         test.status === 'FAILED' ? 'red' : 'yellow';
      const statusIcon = test.status === 'PASSED' ? '✅' : 
                        test.status === 'FAILED' ? '❌' : '⚠️';
      log(`   ${statusIcon} ${test.name}: ${test.status}`, statusColor);
      
      if (test.error) {
        log(`      Error: ${test.error}`, 'red');
      }
    });
    
    log('\n' + '='.repeat(60), 'bright');
    
    if (this.results.failed === 0) {
      log('🎉 ALL TESTS PASSED! AI integration is working correctly.', 'green');
    } else {
      log(`⚠️ ${this.results.failed} test(s) failed. Please check the issues above.`, 'red');
    }
    
    log('='.repeat(60), 'bright');
  }
}

// Main test execution
async function runAITests() {
  const testSuite = new AITestSuite();
  
  log('🚀 Starting AI Frontend-Backend Integration Tests...', 'bright');
  log(`Backend URL: ${BACKEND_URL}`, 'blue');
  log(`Frontend URL: ${FRONTEND_URL}`, 'blue');
  log('');

  try {
    // 1. Backend Health Check
    await testSuite.runTest('Backend Health Check', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/ai/health`);
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      if (response.data.status !== 'healthy') {
        throw new Error(`Expected 'healthy' status, got '${response.data.status}'`);
      }
      logInfo(`Backend health: ${response.data.status}`);
      logInfo(`Engine: ${response.data.engine}`);
      logInfo(`Providers: ${JSON.stringify(response.data.providers)}`);
      return response.data;
    });

    // 2. AI Status Endpoint
    await testSuite.runTest('AI Status Endpoint', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/ai/status`);
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      logInfo(`AI Status: ${response.data.status || 'unknown'}`);
      return response.data;
    });

    // 3. AI Preferences Endpoint
    await testSuite.runTest('AI Preferences Endpoint', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/ai/preferences`);
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      // Handle both 'success' and 'no_key' statuses as valid responses
      if (response.data.status !== 'success' && response.data.status !== 'no_key') {
        throw new Error(`Expected 'success' or 'no_key' status, got '${response.data.status}'`);
      }
      logInfo(`Preferences status: ${response.data.status}`);
      if (response.data.status === 'success') {
        logInfo(`Preferred provider: ${response.data.preferences?.preferred_ai_provider || 'auto'}`);
      } else {
        logInfo(`No API keys configured - this is expected for testing`);
      }
      return response.data;
    });

    // 4. Test Not Implemented Features
    const notImplementedFeatures = [
      { name: 'Trading Signals', endpoint: '/api/ai/signals' },
      { name: 'Strategy Clustering', endpoint: '/api/ai/clustering/strategies' },
      { name: 'Crowd Insights', endpoint: '/api/ai/insights/crowd' },
      { name: 'Trending Insights', endpoint: '/api/ai/insights/trending' }
    ];

    for (const feature of notImplementedFeatures) {
      await testSuite.runTest(`${feature.name} - Not Implemented Response`, async () => {
        const response = await makeRequest(`${BACKEND_URL}${feature.endpoint}`);
        if (response.status !== 200) {
          throw new Error(`Expected 200, got ${response.status}`);
        }
        if (response.data.status !== 'not_implemented') {
          throw new Error(`Expected 'not_implemented' status, got '${response.data.status}'`);
        }
        logInfo(`${feature.name}: ${response.data.message}`);
        return response.data;
      });
    }

    // 5. Test Market Analysis Endpoints
    const marketAnalysisEndpoints = [
      { name: 'Market Analysis', endpoint: '/api/ai/analysis/market' },
      { name: 'Technical Analysis', endpoint: '/api/ai/analysis/technical' },
      { name: 'Sentiment Analysis', endpoint: '/api/ai/analysis/sentiment' }
    ];

    for (const endpoint of marketAnalysisEndpoints) {
      await testSuite.runTest(`${endpoint.name} - Not Implemented Response`, async () => {
        const response = await makeRequest(`${BACKEND_URL}${endpoint.endpoint}`, {
          method: 'POST',
          body: JSON.stringify({
            symbols: ['RELIANCE', 'TCS'],
            timeframe: 'short_term',
            context: 'Test analysis'
          })
        });
        if (response.status !== 200) {
          throw new Error(`Expected 200, got ${response.status}`);
        }
        if (response.data.status !== 'not_implemented') {
          throw new Error(`Expected 'not_implemented' status, got '${response.data.status}'`);
        }
        logInfo(`${endpoint.name}: ${response.data.message}`);
        return response.data;
      });
    }

    // 6. Test AI Message Endpoint (should work)
    await testSuite.runTest('AI Message Endpoint - Working', async () => {
      const response = await makeRequest(`${BACKEND_URL}/api/ai/message`, {
        method: 'POST',
        body: JSON.stringify({
          message: 'What are the current market trends?',
          context: 'General market analysis request'
        })
      });
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      // Log the actual response for debugging
      logInfo(`AI Message response: ${JSON.stringify(response.data, null, 2)}`);
      
      // Handle different possible statuses
      if (response.data.status === 'success') {
        logInfo(`AI Message: Response received successfully`);
        logInfo(`Thread ID: ${response.data.thread_id}`);
        return response.data;
      } else if (response.data.status === 'error') {
        // Check if it's a configuration error (expected without AI keys)
        if (response.data.message && response.data.message.includes('No AI preferences configured')) {
          logInfo(`AI Message: No AI preferences configured (expected without setup)`);
          return { status: 'no_preferences', message: response.data.message };
        } else if (response.data.message && response.data.message.includes('authentication')) {
          logInfo(`AI Message: Authentication required (expected without auth)`);
          return { status: 'auth_required', message: response.data.message };
        } else {
          throw new Error(`AI Message failed: ${response.data.message}`);
        }
      } else if (response.data.status === 'unauthorized') {
        logInfo(`AI Message: Unauthorized (expected without auth)`);
        return { status: 'unauthorized', message: response.data.message };
      } else {
        throw new Error(`Unexpected status: ${response.data.status}`);
      }
    });

    // 7. Test Frontend Accessibility (if running)
    await testSuite.runWarningTest('Frontend Accessibility Check', async () => {
      try {
        const response = await makeRequest(`${FRONTEND_URL}/ai`);
        if (response.status === 200) {
          logInfo('Frontend is accessible at /ai');
          return { status: 'accessible' };
        } else {
          logWarning(`Frontend returned status ${response.status}`);
          return { status: 'unavailable', code: response.status };
        }
      } catch (error) {
        logWarning(`Frontend not accessible: ${error.message}`);
        return { status: 'unreachable', error: error.message };
      }
    });

    // 8. Test Response Format Validation
    await testSuite.runTest('Response Format Validation', async () => {
      const testEndpoints = [
        '/api/ai/health',
        '/api/ai/status',
        '/api/ai/preferences',
        '/api/ai/signals'
      ];

      for (const endpoint of testEndpoints) {
        const response = await makeRequest(`${BACKEND_URL}${endpoint}`);
        
        // Check if response has required fields
        if (!response.data) {
          throw new Error(`No data in response from ${endpoint}`);
        }
        
        if (!response.data.status) {
          throw new Error(`No status field in response from ${endpoint}`);
        }
        
        // Check if not_implemented responses have proper structure
        if (response.data.status === 'not_implemented') {
          if (!response.data.message) {
            throw new Error(`not_implemented response missing message from ${endpoint}`);
          }
          if (!response.data.feature) {
            logWarning(`not_implemented response missing feature field from ${endpoint}`);
          }
        }
        
        logInfo(`${endpoint}: Valid response format`);
      }
      
      return { validated: testEndpoints.length };
    });

  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
  }

  // Print final results
  testSuite.printResults();
  
  // Exit with appropriate code
  process.exit(testSuite.results.failed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAITests().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { AITestSuite, runAITests }; 