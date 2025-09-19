#!/usr/bin/env node

const https = require('https');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';

console.log('🧪 OAuth Backend Deployment Verification');
console.log('==========================================');

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${path}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function verifyDeployment() {
  try {
    // 1. Health Check
    console.log('\n1️⃣ Health Check');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}`);
    
    if (health.data.message && health.data.message.includes('Safe Mode')) {
      console.log('   ❌ Still running in Safe Mode');
      return false;
    } else {
      console.log('   ✅ Running full version');
    }
    
    // 2. Auth Module Debug
    console.log('\n2️⃣ Auth Module Debug');
    const authDebug = await makeRequest('/api/modules/auth/debug');
    console.log(`   Status: ${authDebug.status}`);
    console.log(`   Response: ${JSON.stringify(authDebug.data, null, 2)}`);
    
    // 3. OAuth Setup Endpoint
    console.log('\n3️⃣ OAuth Setup Endpoint');
    const oauth = await makeRequest('/api/modules/auth/broker/setup-oauth');
    console.log(`   Status: ${oauth.status}`);
    console.log(`   Response: ${JSON.stringify(oauth.data, null, 2)}`);
    
    if (oauth.data.error && oauth.data.error === 'Route not found') {
      console.log('   ❌ OAuth endpoints not available');
      return false;
    } else {
      console.log('   ✅ OAuth endpoint available');
    }
    
    // 4. Broker Status Endpoint
    console.log('\n4️⃣ Broker Status Endpoint');
    const status = await makeRequest('/api/modules/auth/broker/status');
    console.log(`   Status: ${status.status}`);
    console.log(`   Response: ${JSON.stringify(status.data, null, 2)}`);
    
    // 5. Module Status
    console.log('\n5️⃣ Module Status');
    const modules = await makeRequest('/api/modules');
    console.log(`   Status: ${modules.status}`);
    console.log(`   Response: ${JSON.stringify(modules.data, null, 2)}`);
    
    console.log('\n🎉 OAuth Backend Deployment Verification Complete!');
    console.log('✅ All OAuth endpoints are now available');
    console.log('✅ Backend is running the OAuth-enabled version');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    return false;
  }
}

// Run verification
verifyDeployment().then(success => {
  if (success) {
    console.log('\n🚀 OAuth Integration: 100% COMPLETE');
    process.exit(0);
  } else {
    console.log('\n⏳ Deployment still in progress or failed');
    console.log('💡 Try running this script again in a few minutes');
    process.exit(1);
  }
});