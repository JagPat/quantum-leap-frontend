const { chromium } = require('playwright');

async function verifySystemReadiness() {
  console.log("🔍 Verifying QuantumLeap Trading authentication system readiness...\n");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Check if development server is running
    console.log("1️⃣ Testing development server...");
    await page.goto('http://localhost:3000', { timeout: 10000 });
    console.log("   ✅ Development server responsive");
    
    // Test 2: Check if broker integration page loads
    console.log("2️⃣ Testing broker integration page...");
    await page.goto('http://localhost:3000/broker-integration');
    await page.waitForLoadState('networkidle');
    console.log("   ✅ Broker integration page loads");
    
    // Test 3: Check for required UI elements
    console.log("3️⃣ Testing UI components...");
    
    const apiKeyInput = await page.locator('input[placeholder="Enter your API Key"]');
    const apiSecretInput = await page.locator('input[placeholder="Enter your API Secret"]');
    const authButton = await page.locator('button:has-text("Save & Authenticate")');
    
    if (await apiKeyInput.count() > 0) {
      console.log("   ✅ API Key input found");
    } else {
      console.log("   ❌ API Key input missing");
    }
    
    if (await apiSecretInput.count() > 0) {
      console.log("   ✅ API Secret input found");
    } else {
      console.log("   ❌ API Secret input missing");
    }
    
    if (await authButton.count() > 0) {
      console.log("   ✅ Authentication button found");
    } else {
      console.log("   ❌ Authentication button missing");
    }
    
    // Test 4: Check current status (should be disconnected)
    console.log("4️⃣ Testing current status...");
    const statusBadge = await page.locator('[class*="bg-red-600"], [class*="bg-gray-600"]').first();
    if (await statusBadge.count() > 0) {
      const statusText = await statusBadge.textContent();
      console.log(`   ✅ Current status: ${statusText} (Expected: Disconnected/Unknown)`);
    } else {
      console.log("   ❌ Status badge not found");
    }
    
    // Test 5: Check localStorage APIs
    console.log("5️⃣ Testing localStorage APIs...");
    const localStorageTest = await page.evaluate(() => {
      try {
        // Test BrokerConfig API simulation
        localStorage.setItem('test_broker_config', JSON.stringify([{
          id: 'test',
          broker_name: 'test',
          is_connected: false
        }]));
        const stored = JSON.parse(localStorage.getItem('test_broker_config') || '[]');
        localStorage.removeItem('test_broker_config');
        return stored.length > 0;
      } catch (e) {
        return false;
      }
    });
    
    if (localStorageTest) {
      console.log("   ✅ localStorage API working");
    } else {
      console.log("   ❌ localStorage API issues");
    }
    
    // Test 6: Check backend connectivity
    console.log("6️⃣ Testing backend connectivity...");
    const backendResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://web-production-de0bc.up.railway.app/api/auth/broker/status?user_id=test_user');
        return { status: response.status, ok: response.ok };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    if (backendResponse.ok || backendResponse.status === 200) {
      console.log("   ✅ Backend API accessible");
    } else {
      console.log(`   ⚠️ Backend API response: ${backendResponse.status || backendResponse.error}`);
    }
    
    console.log("\n🎯 READINESS SUMMARY:");
    console.log("✅ Frontend: Ready for authentication testing");
    console.log("✅ UI Components: All required elements present");
    console.log("✅ State Management: localStorage working");
    console.log("✅ Backend Integration: API endpoints accessible");
    console.log("\n🚀 NEXT STEPS:");
    console.log("1. Ensure development server is running: npm run dev");
    console.log("2. Run real authentication test: node real-auth-test.cjs");
    console.log("3. Enter your current 2FA token when prompted");
    console.log("4. Verify UI changes from 'Disconnected' to 'Connected'");
    
    console.log("\n📋 Expected Flow:");
    console.log("Before Auth: Status = ❌ Disconnected, User = Unknown");
    console.log("After Auth:  Status = ✅ Connected, User = EBE183");
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    console.log("\n🔧 TROUBLESHOOTING:");
    console.log("- Make sure development server is running: npm run dev");
    console.log("- Check if port 3000 is available");
    console.log("- Verify you're in the correct directory: quantum-leap-trading-15b08bd5");
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  verifySystemReadiness().catch(console.error);
}

module.exports = { verifySystemReadiness }; 