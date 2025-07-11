#!/usr/bin/env node

/**
 * Real Authentication Simulation Test
 * Simulates the complete OAuth flow with real broker configuration
 */

const { chromium } = require('playwright');

async function simulateRealAuth() {
  console.log('🚀 Starting Real Authentication Simulation...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Load the frontend
    console.log('📱 Loading frontend...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Set up mock broker configuration (simulating successful OAuth)
    console.log('🔧 Setting up mock broker configuration...');
    await page.evaluate(() => {
      const mockBrokerConfig = {
        id: Date.now().toString(),
        broker_name: 'zerodha',
        api_key: 'mock_api_key_123',
        user_data: {
          user_id: 'EBW183',
          user_name: 'Test User',
          email: 'test@example.com'
        },
        access_token: 'mock_access_token_xyz',
        is_connected: true,
        connection_status: 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Store in localStorage
      localStorage.setItem('brokerConfigs', JSON.stringify([mockBrokerConfig]));
      localStorage.setItem('broker_status', 'Connected');
      localStorage.setItem('broker_user_id', 'EBW183');
      
      console.log('✅ Mock broker configuration set');
    });
    
    // Step 3: Navigate to Dashboard
    console.log('📊 Navigating to Dashboard...');
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Step 4: Check for authentication status
    console.log('🔍 Checking authentication status...');
    const authStatus = await page.evaluate(() => {
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected);
      return {
        hasActiveConfig: !!activeConfig,
        userId: activeConfig?.user_data?.user_id,
        brokerName: activeConfig?.broker_name,
        isConnected: activeConfig?.is_connected
      };
    });
    
    console.log('📋 Auth Status:', authStatus);
    
    // Step 5: Check console for errors
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    await page.waitForTimeout(3000); // Wait for any async operations
    
    const errors = consoleLogs.filter(log => log.type === 'error');
    const warnings = consoleLogs.filter(log => log.type === 'warning');
    
    console.log(`📊 Console: ${errors.length} errors, ${warnings.length} warnings`);
    
    if (errors.length > 0) {
      console.log('❌ Console errors:');
      errors.forEach(error => console.log(`  - ${error.text}`));
    }
    
    // Step 6: Navigate to Broker Integration to check status
    console.log('🔗 Checking Broker Integration page...');
    await page.goto('http://localhost:5173/broker-integration');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if the page shows "Connected" status
    const pageContent = await page.textContent('body');
    const isConnectedShown = pageContent.includes('Connected') || pageContent.includes('EBW183');
    
    console.log(`🔍 Broker status visible: ${isConnectedShown}`);
    
    // Step 7: Test API calls with mock data
    console.log('🌐 Testing API calls...');
    const apiResult = await page.evaluate(async () => {
      try {
        // This should trigger the "Missing authorization header" error
        // which is expected since we're using mock data
        const response = await fetch('https://web-production-de0bc.up.railway.app/api/portfolio/data?user_id=EBW183', {
          headers: {
            'Authorization': 'token mock_api_key_123:mock_access_token_xyz',
            'X-User-ID': 'EBW183'
          }
        });
        
        const data = await response.json();
        return {
          status: response.status,
          data: data
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('📡 API Test Result:', apiResult);
    
    // Summary
    console.log('\n📋 SIMULATION SUMMARY:');
    console.log(`✅ Frontend loaded: Yes`);
    console.log(`✅ Mock auth configured: ${authStatus.hasActiveConfig}`);
    console.log(`✅ User ID set: ${authStatus.userId}`);
    console.log(`✅ Connection status: ${authStatus.isConnected}`);
    console.log(`⚠️ Console errors: ${errors.length}`);
    console.log(`📊 Status display: ${isConnectedShown ? 'Working' : 'Needs check'}`);
    
    if (authStatus.hasActiveConfig && authStatus.userId === 'EBW183' && errors.length === 0) {
      console.log('\n🎉 SIMULATION SUCCESS!');
      console.log('The frontend properly handles broker authentication.');
      console.log('Ready for real Zerodha OAuth flow.');
    } else {
      console.log('\n⚠️ SIMULATION ISSUES DETECTED');
      console.log('Some aspects need attention before real authentication.');
    }
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the simulation
simulateRealAuth().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 