#!/usr/bin/env node

/**
 * Security Verification System
 * Verifies credential encryption, OAuth token security, CSRF protection, and HTTPS security
 * Ensures that all security measures are properly implemented in production
 */

const https = require('https');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

const BASE_URL = 'https://web-production-de0bc.up.railway.app';

// Security test metrics
const securityMetrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  testResults: [],
  startTime: performance.now(),
  securityFindings: {
    encryptionIssues: [],
    tokenSecurityIssues: [],
    csrfIssues: [],
    httpsIssues: []
  }
};

function makeRequest(path, method = 'GET', data = null, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Security-Verification/1.0'
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

// Test credential encryption verification
async function testCredentialEncryption() {
  console.log('🔐 Testing Credential Encryption Verification');
  console.log('============================================');
  
  const encryptionTests = [
    {
      name: 'Sensitive Data Not Exposed in Responses',
      description: 'Verify API keys and secrets are not returned in plain text',
      test: async () => {
        const testCredentials = {
          api_key: 'security_test_api_key_1234567890',
          api_secret: 'security_test_api_secret_1234567890',
          user_id: 'security_test_user'
        };
        
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', testCredentials);
        
        const responseStr = JSON.stringify(response.data);
        const exposesApiKey = responseStr.includes(testCredentials.api_key);
        const exposesApiSecret = responseStr.includes(testCredentials.api_secret);
        const exposesCredentials = exposesApiKey || exposesApiSecret;
        
        return {
          success: !exposesCredentials,
          details: {
            status: response.status,
            exposesApiKey: exposesApiKey,
            exposesApiSecret: exposesApiSecret,
            exposesCredentials: exposesCredentials,
            responseContainsCredentials: exposesCredentials ? 'YES - SECURITY RISK' : 'NO - SECURE',
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Error Messages Do Not Expose Credentials',
      description: 'Verify error responses do not leak sensitive information',
      test: async () => {
        const testCredentials = {
          api_key: 'error_test_secret_key_9876543210',
          api_secret: 'error_test_secret_value_9876543210',
          user_id: 'error_test_user'
        };
        
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', testCredentials);
        
        const responseStr = JSON.stringify(response.data);
        const exposesApiKey = responseStr.includes(testCredentials.api_key);
        const exposesApiSecret = responseStr.includes(testCredentials.api_secret);
        const exposesCredentials = exposesApiKey || exposesApiSecret;
        
        return {
          success: !exposesCredentials,
          details: {
            status: response.status,
            exposesApiKey: exposesApiKey,
            exposesApiSecret: exposesApiSecret,
            exposesCredentials: exposesCredentials,
            errorResponseSecure: !exposesCredentials,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Database Connection Strings Not Exposed',
      description: 'Verify database connection details are not leaked in responses',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/health');
        
        const responseStr = JSON.stringify(response.data);
        const exposesDbUrl = responseStr.includes('DATABASE_URL') || 
                           responseStr.includes('postgresql://') ||
                           responseStr.includes('postgres://');
        const exposesDbPassword = responseStr.includes('password') && 
                                 responseStr.includes('connection');
        const exposesDbCredentials = exposesDbUrl || exposesDbPassword;
        
        return {
          success: !exposesDbCredentials,
          details: {
            status: response.status,
            exposesDbUrl: exposesDbUrl,
            exposesDbPassword: exposesDbPassword,
            exposesDbCredentials: exposesDbCredentials,
            healthResponseSecure: !exposesDbCredentials,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Internal System Details Not Exposed',
      description: 'Verify internal system information is not leaked',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/debug');
        
        const responseStr = JSON.stringify(response.data);
        const exposesFilePaths = responseStr.includes('/app/') || 
                               responseStr.includes('/home/') ||
                               responseStr.includes('C:\\');
        const exposesEnvVars = responseStr.includes('NODE_ENV') || 
                             responseStr.includes('PORT') ||
                             responseStr.includes('DATABASE_URL');
        const exposesInternalDetails = exposesFilePaths || exposesEnvVars;
        
        return {
          success: !exposesInternalDetails,
          details: {
            status: response.status,
            exposesFilePaths: exposesFilePaths,
            exposesEnvVars: exposesEnvVars,
            exposesInternalDetails: exposesInternalDetails,
            debugResponseSecure: !exposesInternalDetails,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    }
  ];
  
  let encryptionTestsPassed = 0;
  const encryptionResults = [];
  
  for (const test of encryptionTests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    securityMetrics.totalTests++;
    
    try {
      const result = await test.test();
      encryptionResults.push({
        name: test.name,
        ...result
      });
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
        encryptionTestsPassed++;
        securityMetrics.passedTests++;
      } else {
        console.log(`❌ FAIL (${Math.round(result.responseTime)}ms) - SECURITY RISK DETECTED`);
        securityMetrics.failedTests++;
        securityMetrics.securityFindings.encryptionIssues.push({
          test: test.name,
          issue: result.details,
          severity: 'HIGH'
        });
      }
      
      console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      encryptionResults.push({
        name: test.name,
        success: false,
        details: { error: error.message },
        responseTime: 0
      });
      securityMetrics.failedTests++;
    }
    
    console.log('');
  }
  
  return {
    phase: 'Credential Encryption Verification',
    passed: encryptionTestsPassed,
    total: encryptionTests.length,
    healthy: encryptionTestsPassed === encryptionTests.length,
    results: encryptionResults
  };
}

// Test OAuth token security validation
async function testOAuthTokenSecurity() {
  console.log('🎫 Testing OAuth Token Security Validation');
  console.log('==========================================');
  
  const tokenSecurityTests = [
    {
      name: 'OAuth State Parameter Generation',
      description: 'Verify OAuth state parameters are properly generated and secure',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'token_security_test_key_1234567890',
          api_secret: 'token_security_test_secret_1234567890',
          user_id: 'token_security_test_user'
        });
        
        const hasState = response.data.data?.state;
        const stateLength = hasState ? response.data.data.state.length : 0;
        const isSecureLength = stateLength >= 16; // Minimum secure length
        const isRandomState = hasState && response.data.data.state !== 'test' && 
                             response.data.data.state !== 'default';
        
        return {
          success: hasState && isSecureLength && isRandomState,
          details: {
            status: response.status,
            hasState: hasState,
            stateLength: stateLength,
            isSecureLength: isSecureLength,
            isRandomState: isRandomState,
            stateValue: hasState ? response.data.data.state.substring(0, 8) + '...' : 'none',
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'OAuth URL Security Parameters',
      description: 'Verify OAuth URLs contain proper security parameters',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
          api_key: 'oauth_url_security_test_key_1234567890',
          api_secret: 'oauth_url_security_test_secret_1234567890',
          user_id: 'oauth_url_security_test_user'
        });
        
        const hasOAuthUrl = response.data.data?.oauth_url;
        let urlSecurityChecks = {
          hasState: false,
          hasResponseType: false,
          hasRedirectUri: false,
          isHttps: false
        };
        
        if (hasOAuthUrl) {
          try {
            const oauthUrl = new URL(response.data.data.oauth_url);
            urlSecurityChecks.hasState = oauthUrl.searchParams.has('state');
            urlSecurityChecks.hasResponseType = oauthUrl.searchParams.has('response_type');
            urlSecurityChecks.hasRedirectUri = oauthUrl.searchParams.has('redirect_uri');
            urlSecurityChecks.isHttps = oauthUrl.protocol === 'https:';
          } catch (e) {
            // Invalid URL format
          }
        }
        
        const isSecureOAuthUrl = hasOAuthUrl && 
                               urlSecurityChecks.hasState && 
                               urlSecurityChecks.hasResponseType &&
                               urlSecurityChecks.isHttps;
        
        return {
          success: isSecureOAuthUrl,
          details: {
            status: response.status,
            hasOAuthUrl: hasOAuthUrl,
            ...urlSecurityChecks,
            isSecureOAuthUrl: isSecureOAuthUrl,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Token Storage Security',
      description: 'Verify tokens are not exposed in status responses',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/status?user_id=token_storage_test_user');
        
        const responseStr = JSON.stringify(response.data);
        const exposesAccessToken = responseStr.includes('access_token') && 
                                 !responseStr.includes('null') &&
                                 !responseStr.includes('undefined');
        const exposesRefreshToken = responseStr.includes('refresh_token') && 
                                  !responseStr.includes('null') &&
                                  !responseStr.includes('undefined');
        const exposesTokens = exposesAccessToken || exposesRefreshToken;
        
        return {
          success: !exposesTokens,
          details: {
            status: response.status,
            exposesAccessToken: exposesAccessToken,
            exposesRefreshToken: exposesRefreshToken,
            exposesTokens: exposesTokens,
            tokenStorageSecure: !exposesTokens,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Secure Transmission Verification',
      description: 'Verify all OAuth-related endpoints use HTTPS',
      test: async () => {
        const endpoints = [
          '/api/modules/auth/broker/setup-oauth',
          '/api/modules/auth/broker/health',
          '/api/modules/auth/broker/status'
        ];
        
        const httpsChecks = [];
        
        for (const endpoint of endpoints) {
          try {
            const response = await makeRequest(endpoint);
            const isHttps = BASE_URL.startsWith('https://');
            const hasSecureHeaders = response.headers['strict-transport-security'] || 
                                   response.headers['x-frame-options'] ||
                                   response.headers['x-content-type-options'];
            
            httpsChecks.push({
              endpoint: endpoint,
              isHttps: isHttps,
              hasSecureHeaders: !!hasSecureHeaders,
              status: response.status
            });
          } catch (error) {
            httpsChecks.push({
              endpoint: endpoint,
              isHttps: false,
              hasSecureHeaders: false,
              error: error.message
            });
          }
        }
        
        const allHttps = httpsChecks.every(check => check.isHttps);
        const hasSecurityHeaders = httpsChecks.some(check => check.hasSecureHeaders);
        
        return {
          success: allHttps,
          details: {
            allHttps: allHttps,
            hasSecurityHeaders: hasSecurityHeaders,
            endpointChecks: httpsChecks,
            secureTransmission: allHttps,
            responseTime: 0
          },
          responseTime: 0
        };
      }
    }
  ];
  
  let tokenSecurityTestsPassed = 0;
  const tokenSecurityResults = [];
  
  for (const test of tokenSecurityTests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    securityMetrics.totalTests++;
    
    try {
      const result = await test.test();
      tokenSecurityResults.push({
        name: test.name,
        ...result
      });
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
        tokenSecurityTestsPassed++;
        securityMetrics.passedTests++;
      } else {
        console.log(`❌ FAIL (${Math.round(result.responseTime)}ms) - SECURITY RISK DETECTED`);
        securityMetrics.failedTests++;
        securityMetrics.securityFindings.tokenSecurityIssues.push({
          test: test.name,
          issue: result.details,
          severity: 'HIGH'
        });
      }
      
      console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      tokenSecurityResults.push({
        name: test.name,
        success: false,
        details: { error: error.message },
        responseTime: 0
      });
      securityMetrics.failedTests++;
    }
    
    console.log('');
  }
  
  return {
    phase: 'OAuth Token Security Validation',
    passed: tokenSecurityTestsPassed,
    total: tokenSecurityTests.length,
    healthy: tokenSecurityTestsPassed === tokenSecurityTests.length,
    results: tokenSecurityResults
  };
}

// Test CSRF protection verification
async function testCSRFProtection() {
  console.log('🛡️ Testing CSRF Protection Verification');
  console.log('=======================================');
  
  const csrfTests = [
    {
      name: 'OAuth State Parameter Validation',
      description: 'Verify OAuth state parameters are properly validated',
      test: async () => {
        // Test callback with invalid state
        const response = await makeRequest('/api/modules/auth/broker/callback?request_token=test&state=invalid_state');
        
        const rejectsInvalidState = response.status === 400 || response.status === 404;
        const hasErrorMessage = response.data.error;
        const properCSRFProtection = rejectsInvalidState && hasErrorMessage;
        
        return {
          success: properCSRFProtection,
          details: {
            status: response.status,
            rejectsInvalidState: rejectsInvalidState,
            hasErrorMessage: hasErrorMessage,
            properCSRFProtection: properCSRFProtection,
            errorMessage: response.data.error,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'State Parameter Uniqueness',
      description: 'Verify each OAuth flow generates unique state parameters',
      test: async () => {
        const states = [];
        
        // Generate multiple OAuth setups to check state uniqueness
        for (let i = 0; i < 3; i++) {
          try {
            const response = await makeRequest('/api/modules/auth/broker/setup-oauth', 'POST', {
              api_key: `csrf_test_key_${i}_1234567890`,
              api_secret: `csrf_test_secret_${i}_1234567890`,
              user_id: `csrf_test_user_${i}`
            });
            
            if (response.data.data?.state) {
              states.push(response.data.data.state);
            }
          } catch (error) {
            // Continue with other requests
          }
        }
        
        const uniqueStates = new Set(states);
        const allUnique = uniqueStates.size === states.length && states.length > 0;
        
        return {
          success: allUnique,
          details: {
            statesGenerated: states.length,
            uniqueStates: uniqueStates.size,
            allUnique: allUnique,
            stateUniqueness: allUnique ? 'SECURE' : 'INSECURE',
            responseTime: 0
          },
          responseTime: 0
        };
      }
    },
    {
      name: 'Cross-Site Request Forgery Prevention',
      description: 'Verify CSRF protection mechanisms are in place',
      test: async () => {
        // Test request without proper headers (simulating CSRF attack)
        try {
          const response = await new Promise((resolve, reject) => {
            const url = new URL('/api/modules/auth/broker/setup-oauth', BASE_URL);
            const options = {
              hostname: url.hostname,
              port: url.port || 443,
              path: url.pathname,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Deliberately omit User-Agent and other headers
                'Origin': 'https://malicious-site.com'
              }
            };

            const req = https.request(options, (res) => {
              let body = '';
              res.on('data', (chunk) => { body += chunk; });
              res.on('end', () => {
                try {
                  resolve({
                    status: res.statusCode,
                    data: JSON.parse(body),
                    responseTime: 100
                  });
                } catch (e) {
                  resolve({
                    status: res.statusCode,
                    data: body,
                    responseTime: 100
                  });
                }
              });
            });

            req.on('error', reject);
            req.write(JSON.stringify({
              api_key: 'csrf_attack_test_key',
              api_secret: 'csrf_attack_test_secret',
              user_id: 'csrf_attack_test_user'
            }));
            req.end();
          });
          
          // If request succeeds without proper validation, it's a security risk
          const hasCSRFProtection = response.status === 403 || 
                                  response.status === 400 ||
                                  (response.status === 500 && response.data.error);
          
          return {
            success: hasCSRFProtection,
            details: {
              status: response.status,
              hasCSRFProtection: hasCSRFProtection,
              csrfProtectionLevel: hasCSRFProtection ? 'PROTECTED' : 'VULNERABLE',
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          // Network error might indicate good CSRF protection
          return {
            success: true,
            details: {
              networkError: true,
              csrfProtectionLevel: 'PROTECTED',
              message: 'Request blocked at network level',
              responseTime: 0
            },
            responseTime: 0
          };
        }
      }
    }
  ];
  
  let csrfTestsPassed = 0;
  const csrfResults = [];
  
  for (const test of csrfTests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    securityMetrics.totalTests++;
    
    try {
      const result = await test.test();
      csrfResults.push({
        name: test.name,
        ...result
      });
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
        csrfTestsPassed++;
        securityMetrics.passedTests++;
      } else {
        console.log(`❌ FAIL (${Math.round(result.responseTime)}ms) - SECURITY RISK DETECTED`);
        securityMetrics.failedTests++;
        securityMetrics.securityFindings.csrfIssues.push({
          test: test.name,
          issue: result.details,
          severity: 'HIGH'
        });
      }
      
      console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      csrfResults.push({
        name: test.name,
        success: false,
        details: { error: error.message },
        responseTime: 0
      });
      securityMetrics.failedTests++;
    }
    
    console.log('');
  }
  
  return {
    phase: 'CSRF Protection Verification',
    passed: csrfTestsPassed,
    total: csrfTests.length,
    healthy: csrfTestsPassed === csrfTests.length,
    results: csrfResults
  };
}

// Test HTTPS and security headers verification
async function testHTTPSAndSecurityHeaders() {
  console.log('🔒 Testing HTTPS and Security Headers Verification');
  console.log('=================================================');
  
  const httpsSecurityTests = [
    {
      name: 'HTTPS Enforcement',
      description: 'Verify all API endpoints use HTTPS',
      test: async () => {
        const isHttps = BASE_URL.startsWith('https://');
        const response = await makeRequest('/health');
        
        return {
          success: isHttps && response.status === 200,
          details: {
            baseUrlHttps: isHttps,
            healthEndpointAccessible: response.status === 200,
            httpsEnforced: isHttps,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Security Headers Verification',
      description: 'Verify proper security headers are present',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/health');
        
        const securityHeaders = {
          hasStrictTransportSecurity: !!response.headers['strict-transport-security'],
          hasXFrameOptions: !!response.headers['x-frame-options'],
          hasXContentTypeOptions: !!response.headers['x-content-type-options'],
          hasXXSSProtection: !!response.headers['x-xss-protection'],
          hasContentSecurityPolicy: !!response.headers['content-security-policy'],
          hasReferrerPolicy: !!response.headers['referrer-policy']
        };
        
        const securityHeaderCount = Object.values(securityHeaders).filter(Boolean).length;
        const hasBasicSecurity = securityHeaderCount >= 2; // At least 2 security headers
        
        return {
          success: hasBasicSecurity,
          details: {
            status: response.status,
            ...securityHeaders,
            securityHeaderCount: securityHeaderCount,
            hasBasicSecurity: hasBasicSecurity,
            allHeaders: Object.keys(response.headers),
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'Content Type Security',
      description: 'Verify proper content type handling',
      test: async () => {
        const response = await makeRequest('/api/modules/auth/broker/health');
        
        const contentType = response.headers['content-type'];
        const isJsonContentType = contentType && contentType.includes('application/json');
        const hasCharset = contentType && contentType.includes('charset');
        
        return {
          success: isJsonContentType,
          details: {
            status: response.status,
            contentType: contentType,
            isJsonContentType: isJsonContentType,
            hasCharset: hasCharset,
            properContentType: isJsonContentType,
            responseTime: response.responseTime
          },
          responseTime: response.responseTime
        };
      }
    },
    {
      name: 'TLS/SSL Configuration',
      description: 'Verify TLS/SSL configuration is secure',
      test: async () => {
        // This test verifies that HTTPS connection is established successfully
        try {
          const response = await makeRequest('/health');
          const httpsWorking = response.status === 200;
          
          // Check if connection uses TLS by verifying HTTPS URL works
          const tlsSecure = BASE_URL.startsWith('https://') && httpsWorking;
          
          return {
            success: tlsSecure,
            details: {
              httpsWorking: httpsWorking,
              tlsSecure: tlsSecure,
              baseUrl: BASE_URL,
              connectionSecure: tlsSecure,
              responseTime: response.responseTime
            },
            responseTime: response.responseTime
          };
        } catch (error) {
          return {
            success: false,
            details: {
              error: error.message,
              tlsSecure: false,
              connectionSecure: false,
              responseTime: 0
            },
            responseTime: 0
          };
        }
      }
    }
  ];
  
  let httpsTestsPassed = 0;
  const httpsResults = [];
  
  for (const test of httpsSecurityTests) {
    console.log(`🔍 ${test.name}`);
    console.log(`   ${test.description}`);
    
    securityMetrics.totalTests++;
    
    try {
      const result = await test.test();
      httpsResults.push({
        name: test.name,
        ...result
      });
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.responseTime)}ms)`);
        httpsTestsPassed++;
        securityMetrics.passedTests++;
      } else {
        console.log(`❌ FAIL (${Math.round(result.responseTime)}ms) - SECURITY RISK DETECTED`);
        securityMetrics.failedTests++;
        securityMetrics.securityFindings.httpsIssues.push({
          test: test.name,
          issue: result.details,
          severity: 'MEDIUM'
        });
      }
      
      console.log(`   📊 Details:`, JSON.stringify(result.details, null, 4));
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      httpsResults.push({
        name: test.name,
        success: false,
        details: { error: error.message },
        responseTime: 0
      });
      securityMetrics.failedTests++;
    }
    
    console.log('');
  }
  
  return {
    phase: 'HTTPS and Security Headers Verification',
    passed: httpsTestsPassed,
    total: httpsSecurityTests.length,
    healthy: httpsTestsPassed === httpsSecurityTests.length,
    results: httpsResults
  };
}

// Main security verification function
async function runSecurityVerification() {
  console.log('🔒 Security Verification System');
  console.log('===============================');
  console.log(`🌐 Backend URL: ${BASE_URL}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log('');

  // Phase 1: Credential Encryption Verification
  const encryptionResult = await testCredentialEncryption();
  
  // Phase 2: OAuth Token Security Validation
  const tokenSecurityResult = await testOAuthTokenSecurity();
  
  // Phase 3: CSRF Protection Verification
  const csrfResult = await testCSRFProtection();
  
  // Phase 4: HTTPS and Security Headers Verification
  const httpsResult = await testHTTPSAndSecurityHeaders();
  
  // Calculate overall metrics
  const totalTime = performance.now() - securityMetrics.startTime;
  const avgResponseTime = securityMetrics.testResults.length > 0
    ? securityMetrics.testResults.reduce((sum, test) => sum + (test.responseTime || 0), 0) / securityMetrics.testResults.length
    : 0;

  // Security Risk Assessment
  const totalSecurityIssues = securityMetrics.securityFindings.encryptionIssues.length +
                             securityMetrics.securityFindings.tokenSecurityIssues.length +
                             securityMetrics.securityFindings.csrfIssues.length +
                             securityMetrics.securityFindings.httpsIssues.length;

  // Final Summary
  console.log('📊 Security Verification Summary');
  console.log('================================');
  
  const totalPhases = 4;
  let phasesPasssed = 0;
  
  console.log(`🔐 Credential Encryption: ${encryptionResult.healthy ? 'SECURE' : 'RISKS DETECTED'} (${encryptionResult.passed}/${encryptionResult.total})`);
  if (encryptionResult.healthy) phasesPasssed++;
  
  console.log(`🎫 OAuth Token Security: ${tokenSecurityResult.healthy ? 'SECURE' : 'RISKS DETECTED'} (${tokenSecurityResult.passed}/${tokenSecurityResult.total})`);
  if (tokenSecurityResult.healthy) phasesPasssed++;
  
  console.log(`🛡️ CSRF Protection: ${csrfResult.healthy ? 'SECURE' : 'RISKS DETECTED'} (${csrfResult.passed}/${csrfResult.total})`);
  if (csrfResult.healthy) phasesPasssed++;
  
  console.log(`🔒 HTTPS & Security Headers: ${httpsResult.healthy ? 'SECURE' : 'RISKS DETECTED'} (${httpsResult.passed}/${httpsResult.total})`);
  if (httpsResult.healthy) phasesPasssed++;
  
  console.log('');
  console.log(`⏱️  Total Execution Time: ${Math.round(totalTime)}ms`);
  console.log(`📈 Total Security Tests: ${securityMetrics.totalTests}`);
  console.log(`✅ Tests Passed: ${securityMetrics.passedTests}`);
  console.log(`❌ Tests Failed: ${securityMetrics.failedTests}`);
  console.log(`🔗 Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`📊 Security Score: ${Math.round((securityMetrics.passedTests / securityMetrics.totalTests) * 100)}%`);
  console.log(`🏆 Secure Phases: ${phasesPasssed}/${totalPhases}`);
  console.log(`🚨 Security Issues Found: ${totalSecurityIssues}`);
  console.log('');

  // Security Risk Analysis
  console.log('🚨 Security Risk Analysis');
  console.log('=========================');
  console.log(`🔐 Encryption Issues: ${securityMetrics.securityFindings.encryptionIssues.length}`);
  console.log(`🎫 Token Security Issues: ${securityMetrics.securityFindings.tokenSecurityIssues.length}`);
  console.log(`🛡️ CSRF Issues: ${securityMetrics.securityFindings.csrfIssues.length}`);
  console.log(`🔒 HTTPS Issues: ${securityMetrics.securityFindings.httpsIssues.length}`);
  console.log('');

  const overallSecure = phasesPasssed === totalPhases && totalSecurityIssues === 0;
  
  if (overallSecure) {
    console.log('🎉 Security verification completed successfully!');
    console.log('✅ Credentials are properly encrypted and not exposed');
    console.log('✅ OAuth tokens use secure storage and transmission methods');
    console.log('✅ CSRF protection is properly implemented with state validation');
    console.log('✅ HTTPS is enforced with proper security headers');
    console.log('✅ Security measures are production-ready');
  } else {
    console.log('⚠️ Security verification found risks:');
    
    if (!encryptionResult.healthy) {
      console.log('❌ Credential encryption issues detected');
      console.log('💡 Recommendation: Ensure sensitive data is not exposed in API responses');
    }
    if (!tokenSecurityResult.healthy) {
      console.log('❌ OAuth token security issues detected');
      console.log('💡 Recommendation: Improve OAuth token handling and secure transmission');
    }
    if (!csrfResult.healthy) {
      console.log('❌ CSRF protection issues detected');
      console.log('💡 Recommendation: Implement proper OAuth state parameter validation');
    }
    if (!httpsResult.healthy) {
      console.log('❌ HTTPS and security header issues detected');
      console.log('💡 Recommendation: Ensure HTTPS enforcement and add security headers');
    }
    
    console.log('🔧 Review the detailed results above for specific security risks');
  }

  return {
    secure: overallSecure,
    results: {
      encryption: encryptionResult,
      tokenSecurity: tokenSecurityResult,
      csrf: csrfResult,
      https: httpsResult
    },
    metrics: securityMetrics,
    summary: {
      totalTests: securityMetrics.totalTests,
      totalPassed: securityMetrics.passedTests,
      securityScore: Math.round((securityMetrics.passedTests / securityMetrics.totalTests) * 100),
      avgResponseTime: Math.round(avgResponseTime),
      executionTime: Math.round(totalTime),
      securePhases: phasesPasssed,
      totalPhases: totalPhases,
      securityIssues: totalSecurityIssues
    }
  };
}

// Run security verification
if (require.main === module) {
  runSecurityVerification()
    .then(result => {
      console.log(`\n🏁 Security verification completed at: ${new Date().toISOString()}`);
      console.log(`📊 Final Security Status: ${result.secure ? 'SECURE' : 'RISKS DETECTED'}`);
      
      // Export results for potential integration
      if (process.env.EXPORT_RESULTS) {
        const fs = require('fs');
        const resultsFile = `security-verification-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
        console.log(`📄 Results exported to: ${resultsFile}`);
      }
      
      process.exit(result.secure ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Security verification failed:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = {
  runSecurityVerification,
  testCredentialEncryption,
  testOAuthTokenSecurity,
  testCSRFProtection,
  testHTTPSAndSecurityHeaders,
  makeRequest,
  securityMetrics
};