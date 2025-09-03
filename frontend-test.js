#!/usr/bin/env node

/**
 * Frontend URL Discovery Script
 * Tries to find the correct Railway frontend URL
 */

const https = require('https');

const possibleUrls = [
  'https://quantum-leap-frontend-production.up.railway.app',
  'https://quantum-leap-frontend-production-925c.up.railway.app',
  'https://quantumleap-frontend-production.up.railway.app',
  'https://quantumleap-frontend-production-925c.up.railway.app',
  'https://frontend-production.up.railway.app',
  'https://frontend-production-925c.up.railway.app'
];

console.log('🔍 Searching for QuantumLeap Frontend URL...\n');

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      console.log(`✅ ${url} - Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log(`🎯 FOUND FRONTEND: ${url}`);
      }
      resolve({ url, status: res.statusCode, found: res.statusCode === 200 });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${url} - Error: ${err.message}`);
      resolve({ url, status: 'error', found: false });
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${url} - Timeout`);
      req.destroy();
      resolve({ url, status: 'timeout', found: false });
    });
    
    req.end();
  });
}

async function findFrontend() {
  const results = [];
  
  for (const url of possibleUrls) {
    const result = await testUrl(url);
    results.push(result);
    
    if (result.found) {
      console.log(`\n🚀 Frontend is accessible at: ${url}`);
      return url;
    }
  }
  
  console.log('\n❌ Frontend not found at any of the tested URLs');
  console.log('\n💡 Solutions:');
  console.log('1. Go to Railway Dashboard → QuantumTrade_Front → quantum-leap-frontend service');
  console.log('2. Click Settings → Networking → Generate Domain');
  console.log('3. Or check if the service is running properly');
  
  return null;
}

findFrontend().then((url) => {
  if (url) {
    console.log(`\n🎉 Success! Your frontend is at: ${url}`);
  } else {
    console.log('\n🔧 Please configure a public domain in Railway Dashboard');
  }
});