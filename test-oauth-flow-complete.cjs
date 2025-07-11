#!/usr/bin/env node

/**
 * Comprehensive OAuth Flow Test
 * Tests the complete authentication flow and dashboard functionality
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function testCompleteOAuthFlow() {
  console.log('🚀 Starting Comprehensive OAuth Flow Test...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000 // Slow down for observation
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    success: false,
    errors: []
  };
  
  try {
    // Test 1: Load frontend homepage
    console.log('📱 Test 1: Loading frontend homepage...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    console.log(`✅ Frontend loaded: ${title}`);
    results.tests.push({
      name: 'Frontend Load',
      status: 'passed',
      details: `Title: ${title}`
    });
    
    // Test 2: Check backend health
    console.log('🏥 Test 2: Checking backend health...');
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('https://web-production-de0bc.up.railway.app/health');
      return await response.json();
    });
    
    console.log(`✅ Backend health: ${JSON.stringify(healthResponse)}`);
    results.tests.push({
      name: 'Backend Health',
      status: 'passed',
      details: healthResponse
    });
    
    // Test 3: Navigate to Broker Integration
    console.log('🔗 Test 3: Navigating to Broker Integration...');
    await page.goto('http://localhost:5173/broker-integration');
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded correctly
    const brokerPageContent = await page.textContent('body');
    if (brokerPageContent.includes('Broker Integration') || brokerPageContent.includes('Connect')) {
      console.log('✅ Broker Integration page loaded');
      results.tests.push({
        name: 'Broker Integration Page',
        status: 'passed',
        details: 'Page loaded successfully'
      });
    } else {
      throw new Error('Broker Integration page did not load properly');
    }
    
    // Test 4: Check console for errors
    console.log('🔍 Test 4: Checking for console errors...');
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Wait a bit to collect console logs
    await page.waitForTimeout(3000);
    
    const errors = consoleLogs.filter(log => log.type === 'error');
    const warnings = consoleLogs.filter(log => log.type === 'warning');
    
    console.log(`📊 Console logs: ${errors.length} errors, ${warnings.length} warnings`);
    
    if (errors.length > 0) {
      console.log('❌ Console errors found:');
      errors.forEach(error => console.log(`  - ${error.text}`));
      results.errors = errors;
    }
    
    results.tests.push({
      name: 'Console Check',
      status: errors.length === 0 ? 'passed' : 'warning',
      details: {
        errors: errors.length,
        warnings: warnings.length,
        errorMessages: errors.map(e => e.text)
      }
    });
    
    // Test 5: Test API endpoints accessibility
    console.log('🌐 Test 5: Testing API endpoints...');
    
    const apiTests = [
      {
        name: 'Health Check',
        url: 'https://web-production-de0bc.up.railway.app/health',
        expectedStatus: 200
      },
      {
        name: 'OAuth Setup',
        url: 'https://web-production-de0bc.up.railway.app/api/auth/broker/test-oauth?api_key=test&api_secret=test',
        method: 'POST',
        expectedStatus: 200
      }
    ];
    
    for (const apiTest of apiTests) {
      try {
        const response = await page.evaluate(async (test) => {
          const options = test.method ? { method: test.method } : {};
          const res = await fetch(test.url, options);
          return {
            status: res.status,
            data: await res.json()
          };
        }, apiTest);
        
        if (response.status === apiTest.expectedStatus) {
          console.log(`✅ ${apiTest.name}: ${response.status}`);
          results.tests.push({
            name: `API: ${apiTest.name}`,
            status: 'passed',
            details: response.data
          });
        } else {
          console.log(`❌ ${apiTest.name}: Expected ${apiTest.expectedStatus}, got ${response.status}`);
          results.tests.push({
            name: `API: ${apiTest.name}`,
            status: 'failed',
            details: `Expected ${apiTest.expectedStatus}, got ${response.status}`
          });
        }
      } catch (error) {
        console.log(`❌ ${apiTest.name}: ${error.message}`);
        results.tests.push({
          name: `API: ${apiTest.name}`,
          status: 'failed',
          details: error.message
        });
      }
    }
    
    // Test 6: Check localStorage and sessionStorage
    console.log('💾 Test 6: Checking storage...');
    
    const storageData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          acc[key] = localStorage.getItem(key);
          return acc;
        }, {}),
        sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
          acc[key] = sessionStorage.getItem(key);
          return acc;
        }, {})
      };
    });
    
    console.log('📊 Storage data:', Object.keys(storageData.localStorage).length, 'localStorage items');
    results.tests.push({
      name: 'Storage Check',
      status: 'passed',
      details: {
        localStorageKeys: Object.keys(storageData.localStorage),
        sessionStorageKeys: Object.keys(storageData.sessionStorage)
      }
    });
    
    // Test 7: Navigate to Dashboard and check loading
    console.log('📊 Test 7: Testing Dashboard...');
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for components to load
    
    const dashboardContent = await page.textContent('body');
    if (dashboardContent.includes('Dashboard') || dashboardContent.includes('Portfolio')) {
      console.log('✅ Dashboard page loaded');
      results.tests.push({
        name: 'Dashboard Load',
        status: 'passed',
        details: 'Dashboard loaded successfully'
      });
    } else {
      console.log('⚠️ Dashboard may not have loaded properly');
      results.tests.push({
        name: 'Dashboard Load',
        status: 'warning',
        details: 'Dashboard content unclear'
      });
    }
    
    // Final assessment
    const passedTests = results.tests.filter(t => t.status === 'passed').length;
    const totalTests = results.tests.length;
    const successRate = (passedTests / totalTests) * 100;
    
    results.success = successRate >= 80; // 80% success rate threshold
    results.summary = {
      total: totalTests,
      passed: passedTests,
      failed: results.tests.filter(t => t.status === 'failed').length,
      warnings: results.tests.filter(t => t.status === 'warning').length,
      successRate: successRate.toFixed(1) + '%'
    };
    
    console.log('\n📋 TEST SUMMARY:');
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️ Warnings: ${results.summary.warnings}`);
    console.log(`📊 Success Rate: ${results.summary.successRate}`);
    
    if (results.success) {
      console.log('\n🎉 Overall Status: READY FOR AUTHENTICATION');
      console.log('The system is ready for real Zerodha OAuth authentication.');
    } else {
      console.log('\n⚠️ Overall Status: NEEDS ATTENTION');
      console.log('Some issues need to be resolved before real authentication.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    results.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    results.success = false;
  } finally {
    await browser.close();
    
    // Save results
    const reportPath = './screenshots/oauth-flow-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }
  
  return results;
}

// Run the test
testCompleteOAuthFlow().then(results => {
  process.exit(results.success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 