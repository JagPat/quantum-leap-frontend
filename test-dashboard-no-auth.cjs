#!/usr/bin/env node

/**
 * Test Dashboard with No Authentication
 * Verifies that the dashboard gracefully handles missing broker connection
 */

const { chromium } = require('playwright');

async function testDashboardNoAuth() {
  console.log('🚀 Testing Dashboard without Authentication...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Clear any existing localStorage
    console.log('🧹 Clearing localStorage...');
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Step 2: Navigate to Dashboard
    console.log('📊 Loading Dashboard without authentication...');
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for API calls to complete
    
    // Step 3: Check console for errors
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    await page.waitForTimeout(2000); // Wait for any additional logs
    
    const errors = consoleLogs.filter(log => log.type === 'error');
    const warnings = consoleLogs.filter(log => log.type === 'warning');
    
    console.log(`📊 Console: ${errors.length} errors, ${warnings.length} warnings`);
    
    // Step 4: Check if connection banner is visible
    const connectionBanner = await page.locator('[role="alert"]').first();
    const bannerVisible = await connectionBanner.isVisible().catch(() => false);
    
    if (bannerVisible) {
      const bannerText = await connectionBanner.textContent();
      console.log('✅ Connection banner visible:', bannerText);
    } else {
      console.log('⚠️ Connection banner not found');
    }
    
    // Step 5: Check if "Connect Broker" button is present
    const connectButton = await page.locator('text=Connect Broker').first();
    const buttonVisible = await connectButton.isVisible().catch(() => false);
    
    console.log(`🔘 Connect Broker button visible: ${buttonVisible}`);
    
    // Step 6: Check if dashboard still loads without crashing
    const dashboardContent = await page.textContent('body');
    const dashboardLoaded = dashboardContent.includes('Dashboard') && dashboardContent.includes('Essential Insights');
    
    console.log(`📊 Dashboard loaded: ${dashboardLoaded}`);
    
    // Step 7: Check for any portfolio-related errors in console
    const portfolioErrors = errors.filter(error => 
      error.text.includes('portfolioAPI') || 
      error.text.includes('No active broker connection')
    );
    
    console.log(`🔍 Portfolio-related errors: ${portfolioErrors.length}`);
    
    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log(`✅ Dashboard loads: ${dashboardLoaded}`);
    console.log(`✅ Connection banner visible: ${bannerVisible}`);
    console.log(`✅ Connect button visible: ${buttonVisible}`);
    console.log(`⚠️ Console errors: ${errors.length}`);
    console.log(`⚠️ Portfolio errors: ${portfolioErrors.length}`);
    
    if (dashboardLoaded && bannerVisible && buttonVisible && portfolioErrors.length === 0) {
      console.log('\n🎉 TEST SUCCESS!');
      console.log('Dashboard gracefully handles missing authentication.');
    } else {
      console.log('\n⚠️ TEST ISSUES:');
      if (!dashboardLoaded) console.log('- Dashboard failed to load');
      if (!bannerVisible) console.log('- Connection banner not visible');
      if (!buttonVisible) console.log('- Connect button not visible');
      if (portfolioErrors.length > 0) {
        console.log('- Portfolio errors still occurring:');
        portfolioErrors.forEach(error => console.log(`  - ${error.text}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testDashboardNoAuth().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 