const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testZerodhaAuthStatus() {
  console.log('🔍 Starting Zerodha Authentication Status Verification...');
  
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
    console.log('📄 Navigating to Broker Integration page...');
    await page.goto('http://localhost:3000/broker-integration', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-broker-integration-page.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot: 01-broker-integration-page.png');

    // Wait for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for broker status
    console.log('🔍 Checking broker status...');
    let statusFound = false;
    let currentStatus = 'unknown';
    
    try {
      // Look for status badges
      const statusElements = await page.$$('[class*="bg-green-"], [class*="bg-red-"], [class*="bg-yellow-"]');
      for (const element of statusElements) {
        const text = await page.evaluate(el => el.textContent, element);
        if (text && (text.includes('Connected') || text.includes('Disconnected'))) {
          console.log(`📊 Found status badge: "${text}"`);
          currentStatus = text.toLowerCase().includes('connected') ? 'connected' : 'disconnected';
          statusFound = true;
          break;
        }
      }
      
      // If no badge found, check page text
      if (!statusFound) {
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.includes('Connected')) {
          currentStatus = 'connected';
          statusFound = true;
          console.log('📊 Found "Connected" in page text');
        } else if (pageText.includes('Disconnected')) {
          currentStatus = 'disconnected';
          statusFound = true;
          console.log('📊 Found "Disconnected" in page text');
        }
      }
    } catch (error) {
      console.log('⚠️ Error checking status:', error.message);
    }

    console.log(`📊 Current broker status: ${currentStatus}`);

    // Check user information
    console.log('👤 Checking user information...');
    try {
      const userInfo = await page.evaluate(() => {
        const brokerText = document.querySelector('[class*="text-right"] p, [class*="text-slate-400"]');
        return brokerText ? brokerText.textContent : null;
      });
      
      if (userInfo) {
        console.log(`👤 User info: ${userInfo}`);
      } else {
        console.log('👤 No user information found');
      }
    } catch (error) {
      console.log('⚠️ Error checking user info:', error.message);
    }

    // Take screenshot after status check
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-status-checked.png'),
      fullPage: true 
    });

    // Test function calls by navigating to other pages
    console.log('\n🧪 Testing critical pages for function errors...');
    
    const testPages = [
      { url: 'http://localhost:3000/', name: 'Dashboard' },
      { url: 'http://localhost:3000/trading', name: 'Trading' },
      { url: 'http://localhost:3000/portfolio', name: 'Portfolio' },
      { url: 'http://localhost:3000/settings', name: 'Settings' }
    ];

    const functionErrors = [];

    for (const testPage of testPages) {
      console.log(`📄 Testing ${testPage.name} page...`);
      
      try {
        // Clear previous errors for this page
        const beforeErrorCount = errors.length;
        
        await page.goto(testPage.url, { 
          waitUntil: 'networkidle0',
          timeout: 15000 
        });
        
                 // Wait for page to settle and functions to run
         await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join(screenshotsDir, `03-${testPage.name.toLowerCase()}.png`),
          fullPage: true 
        });
        
        // Count new errors for this page
        const newErrorCount = errors.length - beforeErrorCount;
        const pageErrors = errors.slice(beforeErrorCount);
        
        // Filter for function-specific errors
        const pageFunctionErrors = pageErrors.filter(err => 
          err.includes('is not a function') || 
          err.includes('Cannot read properties') ||
          err.includes('TypeError')
        );
        
        if (pageFunctionErrors.length > 0) {
          functionErrors.push({
            page: testPage.name,
            errors: pageFunctionErrors
          });
          console.log(`❌ ${testPage.name}: ${pageFunctionErrors.length} function errors`);
        } else {
          console.log(`✅ ${testPage.name}: No function errors`);
        }
        
      } catch (error) {
        console.log(`❌ Error loading ${testPage.name}: ${error.message}`);
        functionErrors.push({
          page: testPage.name,
          errors: [`Navigation error: ${error.message}`]
        });
      }
    }

    // Go back to broker integration for final screenshot
    await page.goto('http://localhost:3000/broker-integration', { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-final-broker-page.png'),
      fullPage: true 
    });

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      testResults: {
        brokerStatus: {
          detected: statusFound,
          status: currentStatus,
          message: statusFound ? `Status is ${currentStatus}` : 'Status could not be determined'
        },
        functionErrors: {
          totalPages: testPages.length,
          pagesWithErrors: functionErrors.length,
          details: functionErrors
        },
        consoleAnalysis: {
          totalMessages: consoleMessages.length,
          totalErrors: errors.length,
          functionRelatedErrors: errors.filter(err => 
            err.includes('is not a function') || 
            err.includes('Cannot read properties') ||
            err.includes('TypeError')
          ).length
        }
      },
      screenshots: [
        '01-broker-integration-page.png',
        '02-status-checked.png',
        ...testPages.map(p => `03-${p.name.toLowerCase()}.png`),
        '04-final-broker-page.png'
      ],
      allConsoleMessages: consoleMessages.slice(0, 50), // Limit to first 50
      criticalErrors: errors.slice(0, 20) // Limit to first 20
    };

    // Save report
    fs.writeFileSync(
      path.join(screenshotsDir, 'zerodha-status-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Print summary
    console.log('\n📋 === TEST SUMMARY ===');
    console.log(`📊 Broker Status: ${currentStatus} ${statusFound ? '✅' : '❌'}`);
    console.log(`🧪 Pages Tested: ${testPages.length}`);
    console.log(`❌ Pages with Function Errors: ${functionErrors.length}`);
    console.log(`📝 Total Console Errors: ${errors.length}`);
    console.log(`📸 Screenshots Captured: ${report.screenshots.length}`);
    
    if (functionErrors.length > 0) {
      console.log('\n❌ Function Errors by Page:');
      functionErrors.forEach(pageError => {
        console.log(`   ${pageError.page}: ${pageError.errors.length} errors`);
        pageError.errors.slice(0, 3).forEach(err => {
          console.log(`      - ${err.substring(0, 100)}...`);
        });
      });
    }
    
    if (errors.length > 0) {
      console.log('\n🔍 Top Console Errors:');
      errors.slice(0, 5).forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.substring(0, 120)}...`);
      });
    }

    console.log(`\n📁 Full report saved: screenshots/zerodha-status-report.json`);
    
    // Determine test result
    const testPassed = statusFound && functionErrors.length < 3 && errors.length < 10;
    console.log(`\n🎯 Overall Test Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);

    if (!testPassed) {
      console.log('❌ Issues found:');
      if (!statusFound) console.log('   - Broker status not detected');
      if (functionErrors.length >= 3) console.log('   - Too many function errors');
      if (errors.length >= 10) console.log('   - Too many console errors');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testZerodhaAuthStatus().catch(console.error); 