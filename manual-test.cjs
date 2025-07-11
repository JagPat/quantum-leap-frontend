const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const routes = [
  { path: '/', name: 'dashboard', description: 'My Dashboard (Home)' },
  { path: '/Trading', name: 'trading', description: 'Trading Engine' },
  { path: '/BrokerIntegration', name: 'broker-integration', description: 'Broker Integration' },
  { path: '/Portfolio', name: 'portfolio', description: 'Portfolio Analytics' },
  { path: '/TradeHistory', name: 'trade-history', description: 'Trade History' },
  { path: '/Settings', name: 'settings', description: 'Settings' },
];

async function quickTest() {
  console.log('🚀 QuantumLeap Trading - Quick Page Test\n');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: false,  // Show browser for debugging
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Test just the home page first
    console.log('🔍 Testing home page...');
    const response = await page.goto('http://localhost:3000/', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });
    
    console.log(`📡 Response status: ${response.status()}`);
    
    // Get page title and content
    const title = await page.title();
    const content = await page.evaluate(() => document.body.innerText);
    
    console.log(`📄 Page title: ${title}`);
    console.log(`📝 Page content preview: ${content.substring(0, 200)}...`);
    
    // Take screenshot
    await fs.mkdir('screenshots', { recursive: true });
    await page.screenshot({
      path: 'screenshots/homepage_test.png',
      fullPage: true
    });
    
    console.log('📸 Screenshot saved: screenshots/homepage_test.png');
    
    await browser.close();
    console.log('\n✅ Quick test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest(); 