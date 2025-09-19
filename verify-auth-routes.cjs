#!/usr/bin/env node

const https = require('https');

class AuthRouteVerifier {
  constructor() {
    this.baseUrl = 'https://web-production-de0bc.up.railway.app';
    this.results = [];
  }

  log(message, color = 'white') {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve) => {
      const url = new URL(path, this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AuthRouteVerifier/1.0'
        },
        timeout: 10000
      };

      if (data && method !== 'GET') {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve({
              status: res.statusCode,
              success: res.statusCode >= 200 && res.statusCode < 300,
              data: parsedData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              success: false,
              error: 'Invalid JSON response',
              rawData: responseData
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          status: 'ERROR',
          success: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'TIMEOUT',
          success: false,
          error: 'Request timeout'
        });
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async testEndpoint(path, expectedStatus = 200, method = 'GET', data = null) {
    this.log(`🔍 Testing: ${this.baseUrl}${path}`, 'cyan');
    
    const result = await this.makeRequest(path, method, data);
    
    this.log(`   Status: ${result.status}`, result.success ? 'green' : 'red');
    
    if (result.data) {
      this.log(`   Response: ${JSON.stringify(result.data, null, 2)}`, 'white');
    } else if (result.rawData) {
      this.log(`   Raw Response: ${result.rawData}`, 'yellow');
    }
    
    if (result.error) {
      this.log(`   Error: ${result.error}`, 'red');
    }
    
    const success = result.status === expectedStatus || (expectedStatus === 'any' && result.success);
    this.log(`   ${success ? '✅' : '❌'} ${success ? 'PASS' : 'FAIL'}`, success ? 'green' : 'red');
    
    this.results.push({
      path,
      method,
      expected: expectedStatus,
      actual: result.status,
      success,
      response: result.data || result.rawData
    });
    
    return result;
  }

  async runTests() {
    this.log('🧪 Auth Route Verification', 'magenta');
    this.log('==========================================', 'magenta');
    
    // Test basic health
    this.log('1️⃣ Basic Health Check', 'blue');
    await this.testEndpoint('/health');
    
    // Test auth module debug
    this.log('\n2️⃣ Auth Module Debug', 'blue');
    await this.testEndpoint('/api/modules/auth/debug');
    
    // Test auth test route
    this.log('\n3️⃣ Auth Test Route', 'blue');
    await this.testEndpoint('/api/modules/auth/test');
    
    // Test OAuth health
    this.log('\n4️⃣ OAuth Health Check', 'blue');
    await this.testEndpoint('/api/modules/auth/broker/health');
    
    // Test OAuth setup (should fail with validation error)
    this.log('\n5️⃣ OAuth Setup Endpoint', 'blue');
    await this.testEndpoint('/api/modules/auth/broker/setup-oauth', 400, 'POST', {});
    
    // Test OAuth status
    this.log('\n6️⃣ OAuth Status Endpoint', 'blue');
    await this.testEndpoint('/api/modules/auth/broker/status?user_id=test');
    
    // Summary
    this.log('\n📊 Test Summary', 'magenta');
    this.log('==========================================', 'magenta');
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    this.log(`✅ Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
    
    if (passed < total) {
      this.log('❌ Failed Tests:', 'red');
      this.results.filter(r => !r.success).forEach(result => {
        this.log(`   ${result.method} ${result.path} - Expected: ${result.expected}, Got: ${result.actual}`, 'red');
      });
    }
    
    if (passed === total) {
      this.log('🎉 All tests passed! OAuth routes are working correctly.', 'green');
    } else {
      this.log('⚠️ Some tests failed. Check the auth module route registration.', 'yellow');
    }
  }
}

// Run the verification
const verifier = new AuthRouteVerifier();
verifier.runTests().catch(console.error);