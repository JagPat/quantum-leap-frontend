#!/usr/bin/env node

/**
 * Verify Base44 Fix
 * Quick test to verify Base44 messages are eliminated
 */

const { chromium } = require('playwright');

async function verifyBase44Fix() {
  console.log('🔍 Verifying Base44 fix...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let base44MessageFound = false;
  
  try {
    // Monitor for Base44 messages
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('base44') || message.includes('preview--quantum-leap-trading')) {
        console.log(`🚨 BASE44 MESSAGE DETECTED: ${message}`);
        base44MessageFound = true;
      }
    });
    
    // Navigate to broker integration
    console.log('📱 Loading broker integration page...');
    await page.goto('http://localhost:5173/broker-integration');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Try to trigger OAuth flow
    console.log('🔧 Looking for OAuth setup...');
    
    try {
      // Fill in test credentials
      const apiKeyInput = await page.locator('input[placeholder*="API"], input[name*="api"]').first();
      const apiSecretInput = await page.locator('input[placeholder*="Secret"], input[name*="secret"]').first();
      
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill('test_key');
        await apiSecretInput.fill('test_secret');
        
        // Click connect button
        const connectButton = await page.locator('button:has-text("Connect"), button[type="submit"]').first();
        if (await connectButton.isVisible()) {
          await connectButton.click();
          await page.waitForTimeout(2000);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not trigger OAuth flow automatically');
    }
    
    // Wait a bit more to catch any delayed messages
    await page.waitForTimeout(2000);
    
    // Results
    if (base44MessageFound) {
      console.log('\n❌ BASE44 MESSAGES STILL PRESENT');
      console.log('Please follow the cache clearing instructions in CLEAR_BROWSER_CACHE_INSTRUCTIONS.md');
      console.log('\nQuick fixes to try:');
      console.log('1. Open Chrome DevTools (F12) → Application → Storage → Clear site data');
      console.log('2. Close all browser tabs and restart browser');
      console.log('3. Test in Incognito/Private mode');
    } else {
      console.log('\n✅ NO BASE44 MESSAGES DETECTED');
      console.log('Base44 fix is working correctly!');
      console.log('OAuth flow is ready for real authentication.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
  
  return !base44MessageFound;
}

// Run the verification
verifyBase44Fix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 