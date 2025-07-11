const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

// Test navigation routes that should be in the menu
const navigationRoutes = [
  { path: '/', name: 'dashboard', description: 'Dashboard' },
  { path: '/portfolio', name: 'portfolio', description: 'Portfolio' },
  { path: '/trading', name: 'trading', description: 'Trading Engine' },
  { path: '/trade-history', name: 'trade-history', description: 'Trade History' },
  { path: '/broker-integration', name: 'broker-integration', description: 'Broker Integration' },
  { path: '/widgets', name: 'widgets', description: 'Widgets' },
  { path: '/api-spec', name: 'api-spec', description: 'API Spec' },
  { path: '/settings', name: 'settings', description: 'Settings' }
];

async function testNavigation() {
  console.log('🧭 Testing Navigation Menu Links\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Go to the homepage first
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    console.log('✅ Homepage loaded successfully\n');
    
    // Test each navigation route
    for (const route of navigationRoutes) {
      console.log(`🔍 Testing ${route.description} (${route.path})...`);
      
      try {
        const response = await page.goto(`${BASE_URL}${route.path}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        if (response.status() === 200) {
          console.log(`✅ ${route.description}: HTTP ${response.status()}`);
        } else {
          console.log(`❌ ${route.description}: HTTP ${response.status()}`);
        }
      } catch (error) {
        console.log(`❌ ${route.description}: Error - ${error.message}`);
      }
    }
    
    console.log('\n🎯 Navigation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testNavigation().catch(console.error); 