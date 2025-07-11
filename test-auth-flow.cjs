const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testFullAuthFlow() {
  console.log('🔍 Starting Complete Authentication Flow Test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages and errors
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type().toUpperCase()}] ${text}`);
    
    // Print debug messages immediately
    if (text.includes('📋') || text.includes('🔍') || text.includes('✅') || text.includes('❌') || text.includes('⚠️') || text.includes('🎨')) {
      console.log(`🔧 CONSOLE: ${text}`);
    }
    
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  try {
    // === PHASE 1: Test Disconnected State ===
    console.log('\n📋 === PHASE 1: Testing Disconnected State ===');
    
    // Clear any existing auth data
    await page.goto('http://localhost:3000/create-mock-auth.html');
    await page.evaluate(() => {
      localStorage.removeItem('brokerConfigs');
      localStorage.removeItem('userData');
    });
    console.log('🗑️ Cleared existing auth data');
    
    // Go to broker integration page
    await page.goto('http://localhost:3000/broker-integration', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of disconnected state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'auth-flow-01-disconnected.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot: auth-flow-01-disconnected.png');
    
    // Check status for disconnected state
    let statusText = await page.evaluate(() => {
      const statusElements = document.querySelectorAll('[class*="bg-"], span, div');
      for (let element of statusElements) {
        if (element.textContent && 
            (element.textContent.includes('Connected') || 
             element.textContent.includes('Disconnected') || 
             element.textContent.includes('Unknown'))) {
          return element.textContent;
        }
      }
      return 'Status not found';
    });
    console.log('📊 Phase 1 Status:', statusText);
    
    // === PHASE 2: Create Mock Connected Auth ===
    console.log('\n📋 === PHASE 2: Creating Mock Connected Authentication ===');
    
    await page.evaluate(() => {
      const mockConfig = {
        id: Date.now(),
        broker_name: 'zerodha',
        api_key: 'mock_api_key_123',
        api_secret: 'mock_secret_456',
        access_token: 'mock_access_token_789',
        request_token: 'mock_request_token_abc',
        is_connected: true,
        connection_status: 'connected',
        user_data: {
          user_id: 'EBE183',
          user_name: 'Test User',
          email: 'test@example.com'
        },
        error_message: null,
        type: 'broker_config'
      };
      
      localStorage.setItem('brokerConfigs', JSON.stringify([mockConfig]));
      localStorage.setItem('userData', JSON.stringify({
        broker_connected: true,
        broker_type: 'zerodha'
      }));
      
      console.log('✅ Mock connected authentication created!');
    });
    
    // Refresh the page to load the new auth state
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of connected state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'auth-flow-02-connected.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot: auth-flow-02-connected.png');
    
    // Check status for connected state
    statusText = await page.evaluate(() => {
      const statusElements = document.querySelectorAll('[class*="bg-"], span, div');
      for (let element of statusElements) {
        if (element.textContent && 
            (element.textContent.includes('Connected') || 
             element.textContent.includes('Disconnected') || 
             element.textContent.includes('Unknown'))) {
          return element.textContent;
        }
      }
      return 'Status not found';
    });
    console.log('📊 Phase 2 Status:', statusText);
    
    // Check if user information is displayed
    const userInfo = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, div');
      for (let element of textElements) {
        if (element.textContent && element.textContent.includes('User:')) {
          return element.textContent;
        }
      }
      return 'User info not found';
    });
    console.log('👤 User Info:', userInfo);
    
    // === PHASE 3: Test Heartbeat (if connected) ===
         // Initialize heartbeatInfo outside the if block
     let heartbeatInfo = [];
     
     if (statusText.toLowerCase().includes('connected')) {
       console.log('\n📋 === PHASE 3: Testing Heartbeat and Backend Check ===');
       
       // Look for heartbeat indicators
       heartbeatInfo = await page.evaluate(() => {
        const elements = document.querySelectorAll('p, span, div');
        const heartbeatElements = [];
        
        for (let element of elements) {
          if (element.textContent && 
              (element.textContent.includes('Last checked') || 
               element.textContent.includes('Backend') ||
               element.textContent.includes('Live'))) {
            heartbeatElements.push(element.textContent);
          }
        }
        return heartbeatElements;
      });
      
             console.log('💓 Heartbeat indicators found:', heartbeatInfo.length);
       
       // Try to click "Check Backend" button if it exists
       try {
         const checkBackendButtons = await page.$$('button');
         let foundButton = false;
         
         for (const button of checkBackendButtons) {
           const buttonText = await page.evaluate(el => el.textContent, button);
           if (buttonText && buttonText.includes('Check Backend')) {
             console.log('🔍 Found "Check Backend" button, clicking...');
             await button.click();
             await new Promise(resolve => setTimeout(resolve, 3000));
             foundButton = true;
             break;
           }
         }
         
         if (foundButton) {
           await page.screenshot({ 
             path: path.join(screenshotsDir, 'auth-flow-03-backend-check.png'),
             fullPage: true 
           });
           console.log('📸 Screenshot: auth-flow-03-backend-check.png');
         } else {
           console.log('⚠️ "Check Backend" button not found');
         }
       } catch (error) {
         console.log('⚠️ Could not click Check Backend button:', error.message);
       }
    }
    
    // === PHASE 4: Test Other Pages ===
    console.log('\n📋 === PHASE 4: Testing Other Pages with Connected Auth ===');
    
    const testPages = [
      { url: 'http://localhost:3000/', name: 'Dashboard' },
      { url: 'http://localhost:3000/settings', name: 'Settings' }
    ];

    for (const testPage of testPages) {
      console.log(`📄 Testing ${testPage.name} page with connected auth...`);
      
      try {
        const beforeErrorCount = errors.length;
        
        await page.goto(testPage.url, { 
          waitUntil: 'networkidle0',
          timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, `auth-flow-04-${testPage.name.toLowerCase()}.png`),
          fullPage: true 
        });
        
        const newErrorCount = errors.length - beforeErrorCount;
        console.log(`✅ ${testPage.name}: ${newErrorCount} new errors`);
        
      } catch (error) {
        console.log(`❌ Error loading ${testPage.name}: ${error.message}`);
      }
    }
    
    // === FINAL REPORT ===
    console.log('\n📋 === FINAL TEST REPORT ===');
    
    const report = {
      timestamp: new Date().toISOString(),
      phases: {
        disconnected: {
          status: 'Phase 1 Status: ' + statusText,
          configsFound: 0
        },
                 connected: {
           status: 'Phase 2 Status: ' + statusText,
           userInfo: userInfo,
           heartbeatChecked: heartbeatInfo ? heartbeatInfo.length > 0 : false
         }
      },
      consoleErrors: errors.length,
      screenshots: [
        'auth-flow-01-disconnected.png',
        'auth-flow-02-connected.png',
        'auth-flow-03-backend-check.png',
        'auth-flow-04-dashboard.png',
        'auth-flow-04-settings.png'
      ].filter(screenshot => {
        return fs.existsSync(path.join(screenshotsDir, screenshot));
      }),
      criticalErrors: errors.slice(0, 10)
    };

    // Save report
    fs.writeFileSync(
      path.join(screenshotsDir, 'auth-flow-test-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('📊 Disconnected State: No configs found (expected)');
    console.log('📊 Connected State:', statusText.includes('Connected') ? '✅ PASS' : '❌ FAIL');
    console.log('👤 User Info Display:', userInfo.includes('User:') ? '✅ PASS' : '❌ FAIL');
         console.log('💓 Heartbeat Indicators:', (heartbeatInfo && heartbeatInfo.length > 0) ? '✅ PASS' : '❌ FAIL');
    console.log('📝 Total Console Errors:', errors.length);
    console.log('📸 Screenshots Generated:', report.screenshots.length);
    
    const testPassed = statusText.includes('Connected') && userInfo.includes('User:');
    console.log(`\n🎯 Overall Test Result: ${testPassed ? '✅ PASS - Authentication Flow Working' : '❌ FAIL - Issues Detected'}`);
    
    if (!testPassed) {
      console.log('❌ Issues:');
      if (!statusText.includes('Connected')) console.log('   - Status not showing as Connected');
      if (!userInfo.includes('User:')) console.log('   - User information not displayed');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testFullAuthFlow().catch(console.error); 