#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'QuantumLeap-AI-Test/1.0'
  }
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: TEST_CONFIG.timeout,
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
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

// Test AI endpoints
async function testAIEndpoints() {
  console.log('🔍 Testing AI Backend Endpoints...\n');
  
  const endpoints = [
    { path: '/api/ai/health', method: 'GET', name: 'AI Health Check' },
    { path: '/api/ai/status', method: 'GET', name: 'AI Status' },
    { path: '/api/ai/preferences', method: 'GET', name: 'AI Preferences' },
    { path: '/api/ai/signals', method: 'GET', name: 'AI Signals' },
    { path: '/api/ai/strategy', method: 'GET', name: 'AI Strategy' },
    { path: '/api/ai/clustering/strategies', method: 'GET', name: 'AI Strategy Clustering' },
    { path: '/api/ai/insights/crowd', method: 'GET', name: 'AI Crowd Insights' },
    { path: '/api/ai/insights/trending', method: 'GET', name: 'AI Trending Insights' },
    { path: '/api/ai/copilot/analyze', method: 'POST', name: 'AI Copilot Analysis', body: JSON.stringify({ portfolio_data: {} }) },
    { path: '/api/ai/message', method: 'POST', name: 'AI Message', body: JSON.stringify({ message: 'test' }) }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint.name}...`);
      
      const response = await makeRequest(`${BACKEND_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: TEST_CONFIG.headers,
        body: endpoint.body
      });

      const result = {
        endpoint: endpoint.path,
        name: endpoint.name,
        method: endpoint.method,
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        data: response.data,
        requiresAuth: response.status === 401,
        notImplemented: response.data?.status === 'not_implemented'
      };

      results.push(result);

      if (result.success) {
        console.log(`✅ ${endpoint.name}: ${response.status} - Success`);
        if (response.data?.status === 'not_implemented') {
          console.log(`   ⚠️  Feature not yet implemented: ${response.data.message}`);
        }
      } else if (result.requiresAuth) {
        console.log(`🔐 ${endpoint.name}: ${response.status} - Requires Authentication`);
      } else if (result.notImplemented) {
        console.log(`🚧 ${endpoint.name}: ${response.status} - Not Implemented`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.status} - Failed`);
        console.log(`   Error: ${JSON.stringify(response.data, null, 2)}`);
      }

    } catch (error) {
      console.log(`💥 ${endpoint.name}: Error - ${error.message}`);
      results.push({
        endpoint: endpoint.path,
        name: endpoint.name,
        method: endpoint.method,
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

// Test frontend loading
async function testFrontendLoading() {
  console.log('\n🌐 Testing Frontend Loading...\n');
  
  try {
    // Test if frontend is accessible
    const response = await makeRequest('http://localhost:5173', {
      method: 'GET',
      headers: {
        'User-Agent': 'QuantumLeap-AI-Test/1.0'
      }
    });

    if (response.status === 200) {
      console.log('✅ Frontend is accessible at http://localhost:5173');
      return true;
    } else {
      console.log(`❌ Frontend returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Frontend not accessible: ${error.message}`);
    console.log('   Make sure to run: npm run dev');
    return false;
  }
}

// Analyze results and provide recommendations
function analyzeResults(backendResults, frontendAccessible) {
  console.log('\n📊 Analysis & Recommendations\n');
  console.log('=' .repeat(50));

  const successfulEndpoints = backendResults.filter(r => r.success);
  const authRequiredEndpoints = backendResults.filter(r => r.requiresAuth);
  const notImplementedEndpoints = backendResults.filter(r => r.notImplemented);
  const failedEndpoints = backendResults.filter(r => !r.success && !r.requiresAuth && !r.notImplemented);

  console.log(`✅ Working Endpoints: ${successfulEndpoints.length}`);
  console.log(`🔐 Auth Required: ${authRequiredEndpoints.length}`);
  console.log(`🚧 Not Implemented: ${notImplementedEndpoints.length}`);
  console.log(`❌ Failed: ${failedEndpoints.length}`);
  console.log(`🌐 Frontend Accessible: ${frontendAccessible ? 'Yes' : 'No'}`);

  console.log('\n🔍 Key Findings:');

  if (successfulEndpoints.length > 0) {
    console.log('\n✅ Working AI Endpoints:');
    successfulEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.name} (${endpoint.method} ${endpoint.endpoint})`);
    });
  }

  if (notImplementedEndpoints.length > 0) {
    console.log('\n🚧 Not Yet Implemented:');
    notImplementedEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.name} (${endpoint.method} ${endpoint.endpoint})`);
    });
  }

  if (authRequiredEndpoints.length > 0) {
    console.log('\n🔐 Require Authentication:');
    authRequiredEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.name} (${endpoint.method} ${endpoint.endpoint})`);
    });
  }

  console.log('\n🎯 Frontend-Backend Integration Status:');
  
  if (frontendAccessible && successfulEndpoints.length > 0) {
    console.log('✅ Frontend can access backend');
    console.log('✅ Backend has working AI endpoints');
    console.log('⚠️  Some features may require authentication');
    console.log('⚠️  Some features are not yet implemented');
  } else if (!frontendAccessible) {
    console.log('❌ Frontend not accessible - start with: npm run dev');
  } else {
    console.log('❌ Backend has issues - check Railway deployment');
  }

  console.log('\n🔧 Recommended Actions:');
  
  if (!frontendAccessible) {
    console.log('1. Start frontend: cd quantum-leap-trading-15b08bd5 && npm run dev');
  }
  
  if (authRequiredEndpoints.length > 0) {
    console.log('2. Connect broker to access authenticated AI features');
  }
  
  if (notImplementedEndpoints.length > 0) {
    console.log('3. Implement missing AI features in backend');
  }

  console.log('4. Test AI page at: http://localhost:5173/ai');
  console.log('5. Check browser console for frontend errors');
}

// Main test execution
async function runTests() {
  console.log('🚀 QuantumLeap AI Frontend-Backend Integration Test\n');
  console.log('=' .repeat(60));

  try {
    const backendResults = await testAIEndpoints();
    const frontendAccessible = await testFrontendLoading();
    
    analyzeResults(backendResults, frontendAccessible);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testAIEndpoints, testFrontendLoading }; 