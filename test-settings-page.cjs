const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function testSettingsPage() {
  console.log('🔧 Testing Settings Page Fix...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to Settings page
    console.log('📡 Navigating to Settings page...');
    const response = await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
    
    console.log(`📊 Response status: ${response.status()}`);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for specific error content
    const errorText = await page.evaluate(() => {
      const allDivs = document.querySelectorAll('div');
      for (let div of allDivs) {
        if (div.textContent && div.textContent.includes('Could not load settings data')) {
          return div.textContent;
        }
      }
      return null;
    });
    
    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Get page content preview
    const content = await page.evaluate(() => {
      const body = document.body;
      return body ? body.innerText.substring(0, 500) : 'No content found';
    });
    
    console.log(`📝 Page content preview: ${content.substring(0, 200)}...`);
    
    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log(`❌ Console Errors Found:`);
      consoleErrors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log(`✅ No console errors detected!`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots/settings_page_test.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: screenshots/settings_page_test.png');
    
    // Check if page loaded successfully (no error message)
    if (!errorText && !consoleErrors.some(err => err.includes('User.me is not a function'))) {
      console.log('\n🎉 Settings page test PASSED! User.me error is fixed.');
    } else {
      console.log('\n❌ Settings page test FAILED. Error still present.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testSettingsPage(); 