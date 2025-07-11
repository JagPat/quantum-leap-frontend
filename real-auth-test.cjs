const { chromium } = require('playwright');
const fs = require('fs');

async function testRealZerodhaAuth() {
  const browser = await chromium.launch({ 
    headless: false, // Keep visible for OAuth interaction
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log("🚀 Starting real Zerodha authentication test...");
    
    // Navigate to broker integration page
    await page.goto('http://localhost:3000/broker-integration');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: `screenshots/01-broker-integration-page.png`,
      fullPage: true 
    });
    
    console.log("📸 Screenshot taken: Initial broker integration page");
    
    // Check initial status - should be disconnected
    const initialStatus = await page.locator('[class*="bg-red-600"]').textContent();
    console.log("🔍 Initial status:", initialStatus);
    
    // Click on API Key input and enter credentials
    console.log("🔐 Entering API credentials...");
    await page.fill('input[placeholder="Enter your API Key"]', 'f9s0gfyeu35adwul');
    await page.fill('input[placeholder="Enter your API Secret"]', 'qf6a5l90mtf3nm4us3xpnoo4tk9kdbi7');
    
    // Take screenshot after entering credentials
    await page.screenshot({ 
      path: `screenshots/02-credentials-entered.png`,
      fullPage: true 
    });
    
    console.log("📸 Screenshot taken: Credentials entered");
    
    // Click Save & Authenticate button
    console.log("🔄 Clicking Save & Authenticate...");
    await page.click('button:has-text("Save & Authenticate")');
    
    // Wait for popup to appear
    console.log("⏳ Waiting for Zerodha popup...");
    const popup = await page.waitForEvent('popup', { timeout: 10000 });
    await popup.waitForLoadState('networkidle');
    
    // Take screenshot of popup
    await popup.screenshot({ 
      path: `screenshots/03-zerodha-popup.png`,
      fullPage: true 
    });
    
    console.log("📸 Screenshot taken: Zerodha popup opened");
    console.log("🔗 Popup URL:", popup.url());
    
    // Fill login credentials in popup
    console.log("🔐 Entering login credentials in popup...");
    await popup.fill('input[placeholder="User ID"]', 'EBE183');
    await popup.fill('input[placeholder="Password"]', 'Viha@n73');
    
    // Click login button
    await popup.click('button[type="submit"]');
    await popup.waitForLoadState('networkidle');
    
    // Take screenshot after login
    await popup.screenshot({ 
      path: `screenshots/04-after-login.png`,
      fullPage: true 
    });
    
    console.log("📸 Screenshot taken: After login submission");
    
    // Wait for 2FA page and handle it
    console.log("🔐 Looking for 2FA input...");
    try {
      await popup.waitForSelector('input[placeholder*="OTP"], input[id*="totp"], input[name*="totp"]', { timeout: 5000 });
      
      // Enter 2FA token (you'll need to provide this when running the test)
      const twoFAToken = '718765'; // Example - replace with actual token
      await popup.fill('input[placeholder*="OTP"], input[id*="totp"], input[name*="totp"]', twoFAToken);
      
      // Click continue/submit button
      await popup.click('button[type="submit"], button:has-text("Continue")');
      await popup.waitForLoadState('networkidle');
      
      await popup.screenshot({ 
        path: `screenshots/05-after-2fa.png`,
        fullPage: true 
      });
      
      console.log("📸 Screenshot taken: After 2FA submission");
    } catch (e) {
      console.log("ℹ️ No 2FA required or already handled");
    }
    
    // Wait for callback to process
    console.log("⏳ Waiting for OAuth callback to complete...");
    
    // Listen for popup close (indicates callback processed)
    let callbackProcessed = false;
    popup.on('close', () => {
      callbackProcessed = true;
      console.log("✅ Popup closed - callback processed");
    });
    
    // Wait for either popup close or timeout
    let waitTime = 0;
    while (!callbackProcessed && waitTime < 30000) {
      await page.waitForTimeout(1000);
      waitTime += 1000;
      
      // Check if we can see callback page
      try {
        const popupUrl = popup.url();
        if (popupUrl.includes('callback') || popupUrl.includes('request_token')) {
          console.log("🔍 Callback URL detected:", popupUrl);
          
          await popup.screenshot({ 
            path: `screenshots/06-callback-page.png`,
            fullPage: true 
          });
          
          console.log("📸 Screenshot taken: Callback page");
          break;
        }
      } catch (e) {
        // Popup might be closed
        break;
      }
    }
    
    // Wait a bit for main page to update
    await page.waitForTimeout(3000);
    
    // Check final status on main page
    console.log("🔍 Checking final authentication status...");
    
    await page.screenshot({ 
      path: `screenshots/07-final-status.png`,
      fullPage: true 
    });
    
    console.log("📸 Screenshot taken: Final status page");
    
    // Check broker status
    const finalStatus = await page.locator('[class*="bg-green-600"], [class*="bg-yellow-600"], [class*="bg-red-600"]').first().textContent();
    console.log("🎯 Final broker status:", finalStatus);
    
    // Check user information
    try {
      const userInfo = await page.locator('text=/User: .+/').textContent();
      console.log("👤 User info:", userInfo);
    } catch (e) {
      console.log("ℹ️ Could not find user info");
    }
    
    // Check localStorage for saved config
    const localStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    
    console.log("💾 LocalStorage data:");
    for (const [key, value] of Object.entries(localStorageData)) {
      if (key.includes('broker') || key.includes('config')) {
        console.log(`  ${key}: ${value.substring(0, 100)}...`);
      }
    }
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      test_status: finalStatus?.includes('Connected') ? 'SUCCESS' : 'PARTIAL',
      final_status: finalStatus,
      localStorage_keys: Object.keys(localStorageData).filter(k => k.includes('broker') || k.includes('config')),
      screenshots_taken: [
        '01-broker-integration-page.png',
        '02-credentials-entered.png', 
        '03-zerodha-popup.png',
        '04-after-login.png',
        '05-after-2fa.png',
        '06-callback-page.png',
        '07-final-status.png'
      ]
    };
    
    fs.writeFileSync('screenshots/real-auth-test-report.json', JSON.stringify(report, null, 2));
    
    console.log("✅ Real authentication test completed!");
    console.log("📊 Check screenshots/ folder for visual evidence");
    console.log("📋 Report saved to: screenshots/real-auth-test-report.json");
    
    if (finalStatus?.includes('Connected')) {
      console.log("🎉 SUCCESS: Authentication completed and UI shows connected status!");
    } else {
      console.log("⚠️ PARTIAL: Authentication may have completed but UI still shows disconnected");
      console.log("🔍 This indicates a possible state synchronization issue");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    
    // Take error screenshot
    await page.screenshot({ 
      path: `screenshots/ERROR-${Date.now()}.png`,
      fullPage: true 
    });
    
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testRealZerodhaAuth().catch(console.error);
}

module.exports = { testRealZerodhaAuth }; 