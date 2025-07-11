const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'screenshots';

// Test routes and their descriptions
const routes = [
  { path: '/', name: 'dashboard', description: 'Main Dashboard' },
  { path: '/portfolio', name: 'portfolio', description: 'Portfolio View' },
  { path: '/trading', name: 'trading', description: 'Trading Engine' },
  { path: '/trade-history', name: 'trade-history', description: 'Trade History' },
  { path: '/broker-integration', name: 'broker-integration', description: 'Broker Integration' },
  { path: '/settings', name: 'settings', description: 'Settings' },
  { path: '/api-spec', name: 'api-spec', description: 'API Specification' },
  { path: '/widgets', name: 'widgets', description: 'Widgets' }
];

async function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPage(browser, route) {
  const page = await browser.newPage();
  
  try {
    console.log(`🔍 Testing ${route.description} (${route.path})...`);
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to the page
    const response = await page.goto(`${BASE_URL}${route.path}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`📡 Response status: ${response.status()}`);
    
    // Wait for content to load
    await delay(3000);
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check for any error messages
    const errorElements = await page.$$('[class*="error"], .error, #error');
    if (errorElements.length > 0) {
      console.log(`⚠️  Found ${errorElements.length} error element(s)`);
    }
    
    // Get page content preview (first 200 chars of visible text)
    const contentPreview = await page.evaluate(() => {
      const body = document.body;
      const text = body.innerText || body.textContent || '';
      return text.replace(/\s+/g, ' ').trim().substring(0, 200);
    });
    console.log(`📝 Content preview: ${contentPreview}`);
    
    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${route.name}_page.png`);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    return {
      route: route.path,
      name: route.name,
      description: route.description,
      status: response.status(),
      title,
      contentPreview,
      errorCount: errorElements.length,
      screenshotPath,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ Error testing ${route.description}: ${error.message}`);
    return {
      route: route.path,
      name: route.name,
      description: route.description,
      error: error.message,
      success: false
    };
  } finally {
    await page.close();
  }
}

async function generateReport(results) {
  const reportPath = path.join(SCREENSHOT_DIR, 'test_report.md');
  let report = `# QuantumLeap Trading - Page Test Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  report += `## Summary\n`;
  report += `- **Total Pages Tested**: ${totalCount}\n`;
  report += `- **Successful**: ${successCount}\n`;
  report += `- **Failed**: ${totalCount - successCount}\n\n`;
  
  report += `## Page Details\n\n`;
  
  results.forEach(result => {
    report += `### ${result.description}\n`;
    report += `- **Route**: \`${result.route}\`\n`;
    report += `- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    
    if (result.success) {
      report += `- **HTTP Status**: ${result.status}\n`;
      report += `- **Page Title**: ${result.title}\n`;
      report += `- **Screenshot**: ${result.screenshotPath}\n`;
      report += `- **Error Elements**: ${result.errorCount}\n`;
      report += `- **Content Preview**: ${result.contentPreview.substring(0, 150)}...\n`;
    } else {
      report += `- **Error**: ${result.error}\n`;
    }
    report += `\n`;
  });
  
  fs.writeFileSync(reportPath, report);
  console.log(`📊 Report generated: ${reportPath}`);
}

async function main() {
  console.log('🚀 QuantumLeap Trading - Comprehensive Page Testing\n');
  
  // Ensure screenshot directory exists
  await ensureDirectoryExists(SCREENSHOT_DIR);
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const results = [];
  
  try {
    // Test each route
    for (const route of routes) {
      const result = await testPage(browser, route);
      results.push(result);
      console.log(''); // Add spacing between tests
    }
    
    // Generate comprehensive report
    await generateReport(results);
    
    console.log('✅ Comprehensive testing completed successfully!');
    console.log(`📁 All screenshots saved in: ${SCREENSHOT_DIR}/`);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error); 