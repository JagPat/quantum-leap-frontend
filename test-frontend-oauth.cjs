#!/usr/bin/env node

const https = require('https');

// Test what the frontend is sending vs what backend expects
async function testOAuthSetup() {
  console.log('🧪 Testing OAuth Setup Data Format');
  console.log('=====================================');

  const baseUrl = 'https://web-production-de0bc.up.railway.app';
  
  // Test 1: Empty request (should show validation error)
  console.log('\n1️⃣ Testing empty request:');
  const emptyResult = await makeRequest(`${baseUrl}/api/modules/auth/broker/setup-oauth`, 'POST', {});
  console.log('Response:', JSON.stringify(emptyResult, null, 2));

  // Test 2: Missing user_id
  console.log('\n2️⃣ Testing missing user_id:');
  const missingUserResult = await makeRequest(`${baseUrl}/api/modules/auth/broker/setup-oauth`, 'POST', {
    api_key: 'test_key_123',
    api_secret: 'test_secret_123456'
  });
  console.log('Response:', JSON.stringify(missingUserResult, null, 2));

  // Test 3: Valid format (what frontend should send)
  console.log('\n3️⃣ Testing valid format:');
  const validResult = await makeRequest(`${baseUrl}/api/modules/auth/broker/setup-oauth`, 'POST', {
    api_key: 'test_key_123',
    api_secret: 'test_secret_123456',
    user_id: 'test_user_123',
    frontend_url: 'https://quantum-leap-frontend-production.up.railway.app'
  });
  console.log('Response:', JSON.stringify(validResult, null, 2));

  // Test 4: Check what validation schema expects
  console.log('\n4️⃣ Testing with short api_key (should fail validation):');
  const shortKeyResult = await makeRequest(`${baseUrl}/api/modules/auth/broker/setup-oauth`, 'POST', {
    api_key: 'short',
    api_secret: 'test_secret_123456',
    user_id: 'test_user_123'
  });
  console.log('Response:', JSON.stringify(shortKeyResult, null, 2));
}

async function makeRequest(url, method, data) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            error: 'Invalid JSON',
            rawData: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 'ERROR',
        error: error.message
      });
    });

    req.write(postData);
    req.end();
  });
}

testOAuthSetup().catch(console.error);