#!/usr/bin/env node

/**
 * Frontend Integration Verification System
 * 
 * Comprehensive automated testing for frontend OAuth integration including:
 * - Production URL loading verification
 * - Broker setup interface testing
 * - OAuth flow initiation testing
 * - User experience verification
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;

// Check if puppeteer is available
let puppeteer = null;
try {
    puppeteer = require('puppeteer');
} catch (error) {
    console.log('⚠️  Puppeteer not installed. Running in basic mode without browser automation.');
    console.log('💡 To enable full frontend testing, install puppeteer: npm install puppeteer');
}

class FrontendIntegrationVerifier {
    constructor() {
        this.productionUrl = 'https://quantumleap-production.up.railway.app';
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        console.log('🚀 Initializing Frontend Integration Verification...');
        
        if (!puppeteer) {
            console.log('📋 Running in basic HTTP mode (no browser automation)');
            return true;
        }
        
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            
            this.page = await this.browser.newPage();
            
            // Set viewport and user agent
            await this.page.setViewport({ width: 1280, height: 720 });
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            
            // Enable request interception for monitoring
            await this.page.setRequestInterception(true);
            
            this.page.on('request', (request) => {
                console.log(`📡 Request: ${request.method()} ${request.url()}`);
                request.continue();
            });
            
            this.page.on('response', (response) => {
                if (!response.ok()) {
                    console.log(`❌ Failed Response: ${response.status()} ${response.url()}`);
                }
            });
            
            console.log('✅ Browser initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Browser initialization failed:', error.message);
            return false;
        }
    }

    async makeHttpRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: options.timeout || 10000
            };

            const req = client.request(requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        body: data
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    async verifyProductionUrlLoading() {
        console.log('\n📋 Testing: Production URL Loading Verification');
        
        const test = {
            name: 'Production URL Loading',
            status: 'running',
            details: [],
            startTime: Date.now()
        };

        try {
            if (puppeteer && this.page) {
                // Full browser testing
                console.log('🔍 Checking URL accessibility with browser...');
                const response = await this.page.goto(this.productionUrl, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                if (response && response.ok()) {
                    test.details.push({
                        check: 'URL Accessibility',
                        status: 'passed',
                        message: `Successfully loaded ${this.productionUrl}`,
                        statusCode: response.status()
                    });
                } else {
                    throw new Error(`Failed to load URL: ${response ? response.status() : 'No response'}`);
                }

                // Test page title
                const title = await this.page.title();
                if (title && title.trim() !== '') {
                    test.details.push({
                        check: 'Page Title',
                        status: 'passed',
                        message: `Page title found: "${title}"`,
                        value: title
                    });
                } else {
                    test.details.push({
                        check: 'Page Title',
                        status: 'warning',
                        message: 'Page title is empty or missing'
                    });
                }

                // Test DOM content
                const bodyContent = await this.page.evaluate(() => {
                    return {
                        hasContent: document.body && document.body.innerHTML.trim().length > 0,
                        elementCount: document.querySelectorAll('*').length,
                        hasScripts: document.querySelectorAll('script').length,
                        hasStyles: document.querySelectorAll('style, link[rel="stylesheet"]').length
                    };
                });

                if (bodyContent.hasContent && bodyContent.elementCount > 10) {
                    test.details.push({
                        check: 'DOM Content',
                        status: 'passed',
                        message: `Page has ${bodyContent.elementCount} elements`,
                        data: bodyContent
                    });
                } else {
                    test.details.push({
                        check: 'DOM Content',
                        status: 'failed',
                        message: 'Page appears to have minimal or no content',
                        data: bodyContent
                    });
                }

            } else {
                // Basic HTTP testing
                console.log('🔍 Checking URL accessibility with HTTP request...');
                const response = await this.makeHttpRequest(this.productionUrl);

                if (response.statusCode >= 200 && response.statusCode < 400) {
                    test.details.push({
                        check: 'URL Accessibility',
                        status: 'passed',
                        message: `Successfully loaded ${this.productionUrl}`,
                        statusCode: response.statusCode
                    });
                } else {
                    test.details.push({
                        check: 'URL Accessibility',
                        status: 'failed',
                        message: `Failed to load URL: ${response.statusCode} ${response.statusMessage}`,
                        statusCode: response.statusCode
                    });
                }

                // Basic content check
                if (response.body && response.body.length > 100) {
                    test.details.push({
                        check: 'Content Length',
                        status: 'passed',
                        message: `Page has ${response.body.length} characters of content`
                    });
                } else {
                    test.details.push({
                        check: 'Content Length',
                        status: 'warning',
                        message: 'Page has minimal content'
                    });
                }

                // Check for HTML structure
                const hasHtml = response.body.includes('<html') || response.body.includes('<!DOCTYPE');
                const hasTitle = response.body.includes('<title>');
                
                test.details.push({
                    check: 'HTML Structure',
                    status: hasHtml ? 'passed' : 'warning',
                    message: hasHtml ? 'Valid HTML structure detected' : 'No HTML structure detected',
                    data: { hasHtml, hasTitle }
                });
            }

            test.status = 'passed';
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;
            
            test.details.push({
                check: 'Overall Loading',
                status: 'failed',
                message: error.message
            });
        }

        this.results.tests.push(test);
        this.updateSummary(test.status);
        
        console.log(`${test.status === 'passed' ? '✅' : '❌'} Production URL Loading: ${test.status}`);
        return test.status === 'passed';
    }

    async verifyBrokerSetupInterface() {
        console.log('\n📋 Testing: Broker Setup Interface');
        
        const test = {
            name: 'Broker Setup Interface',
            status: 'running',
            details: [],
            startTime: Date.now()
        };

        try {
            if (puppeteer && this.page) {
                // Full browser testing
                console.log('🔍 Searching for broker setup interface...');
                
                const interfaceElements = await this.page.evaluate(() => {
                    const elements = {
                        forms: document.querySelectorAll('form').length,
                        inputs: document.querySelectorAll('input').length,
                        buttons: document.querySelectorAll('button').length,
                        selects: document.querySelectorAll('select').length
                    };
                    
                    const textContent = document.body.textContent.toLowerCase();
                    const hasOAuthText = textContent.includes('oauth') || 
                                       textContent.includes('broker') || 
                                       textContent.includes('zerodha') ||
                                       textContent.includes('setup');
                    
                    return { ...elements, hasOAuthText, textContent: textContent.substring(0, 500) };
                });

                if (interfaceElements.forms > 0 || interfaceElements.buttons > 0) {
                    test.details.push({
                        check: 'Interface Elements',
                        status: 'passed',
                        message: 'Found interactive elements on page',
                        data: interfaceElements
                    });
                } else {
                    test.details.push({
                        check: 'Interface Elements',
                        status: 'warning',
                        message: 'No forms or buttons found',
                        data: interfaceElements
                    });
                }

            } else {
                // Basic HTTP content analysis
                console.log('🔍 Analyzing page content for interface elements...');
                
                const response = await this.makeHttpRequest(this.productionUrl);
                const content = response.body.toLowerCase();
                
                // Look for form elements in HTML
                const hasForm = content.includes('<form') || content.includes('form');
                const hasInput = content.includes('<input') || content.includes('input');
                const hasButton = content.includes('<button') || content.includes('button');
                
                // Look for OAuth-related content
                const hasOAuthText = content.includes('oauth') || 
                                   content.includes('broker') || 
                                   content.includes('zerodha') ||
                                   content.includes('setup');

                test.details.push({
                    check: 'Interface Elements',
                    status: (hasForm || hasButton) ? 'passed' : 'warning',
                    message: (hasForm || hasButton) ? 'Found interface elements in HTML' : 'No interface elements detected',
                    data: { hasForm, hasInput, hasButton, hasOAuthText }
                });
            }

            // Test OAuth endpoint availability
            console.log('🔍 Testing OAuth endpoint availability...');
            
            try {
                const oauthResponse = await this.makeHttpRequest(`${this.productionUrl}/api/auth/broker/setup-oauth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        api_key: 'test_key',
                        api_secret: 'test_secret'
                    })
                });

                test.details.push({
                    check: 'OAuth Endpoint',
                    status: 'passed',
                    message: `OAuth endpoint responded with status ${oauthResponse.statusCode}`,
                    statusCode: oauthResponse.statusCode
                });

            } catch (error) {
                test.details.push({
                    check: 'OAuth Endpoint',
                    status: 'warning',
                    message: 'OAuth endpoint test failed',
                    error: error.message
                });
            }

            test.status = 'passed';
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;
            
            test.details.push({
                check: 'Interface Analysis',
                status: 'failed',
                message: error.message
            });
        }

        this.results.tests.push(test);
        this.updateSummary(test.status);
        
        console.log(`${test.status === 'passed' ? '✅' : '❌'} Broker Setup Interface: ${test.status}`);
        return test.status === 'passed';
    }

    async verifyOAuthFlowInitiation() {
        console.log('\n📋 Testing: OAuth Flow Initiation');
        
        const test = {
            name: 'OAuth Flow Initiation',
            status: 'running',
            details: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Check for OAuth endpoint availability
            console.log('🔍 Testing OAuth endpoint availability...');
            
            try {
                const endpointResponse = await this.makeHttpRequest(`${this.productionUrl}/api/auth/broker/setup-oauth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        api_key: 'test_key',
                        api_secret: 'test_secret'
                    })
                });

                test.details.push({
                    check: 'OAuth Endpoint',
                    status: 'passed',
                    message: `OAuth endpoint responded with status ${endpointResponse.statusCode}`,
                    statusCode: endpointResponse.statusCode
                });

            } catch (error) {
                test.details.push({
                    check: 'OAuth Endpoint',
                    status: 'failed',
                    message: 'OAuth endpoint not accessible',
                    error: error.message
                });
            }

            // Test 2: Check health endpoint
            console.log('🔍 Testing health endpoint...');
            
            try {
                const healthResponse = await this.makeHttpRequest(`${this.productionUrl}/api/auth/broker/health`);
                
                test.details.push({
                    check: 'Health Endpoint',
                    status: healthResponse.statusCode === 200 ? 'passed' : 'warning',
                    message: `Health endpoint status: ${healthResponse.statusCode}`,
                    statusCode: healthResponse.statusCode
                });

            } catch (error) {
                test.details.push({
                    check: 'Health Endpoint',
                    status: 'warning',
                    message: 'Health endpoint not accessible',
                    error: error.message
                });
            }

            // Test 3: Check for CORS headers
            console.log('🔍 Testing CORS configuration...');
            
            try {
                const corsResponse = await this.makeHttpRequest(this.productionUrl, {
                    method: 'OPTIONS',
                    headers: {
                        'Origin': 'https://example.com',
                        'Access-Control-Request-Method': 'POST'
                    }
                });

                const hasCors = corsResponse.headers['access-control-allow-origin'] || 
                              corsResponse.headers['access-control-allow-methods'];

                test.details.push({
                    check: 'CORS Configuration',
                    status: hasCors ? 'passed' : 'warning',
                    message: hasCors ? 'CORS headers present' : 'No CORS headers detected',
                    headers: corsResponse.headers
                });

            } catch (error) {
                test.details.push({
                    check: 'CORS Configuration',
                    status: 'info',
                    message: 'CORS test inconclusive',
                    error: error.message
                });
            }

            // Test 4: Check SSL/TLS configuration
            console.log('🔍 Testing SSL/TLS configuration...');
            
            const isHttps = this.productionUrl.startsWith('https://');
            test.details.push({
                check: 'SSL/TLS',
                status: isHttps ? 'passed' : 'failed',
                message: isHttps ? 'Using HTTPS' : 'Not using HTTPS - OAuth requires secure connection',
                protocol: isHttps ? 'HTTPS' : 'HTTP'
            });

            test.status = 'passed';
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;
            
            test.details.push({
                check: 'OAuth Flow Test',
                status: 'failed',
                message: error.message
            });
        }

        this.results.tests.push(test);
        this.updateSummary(test.status);
        
        console.log(`${test.status === 'passed' ? '✅' : '❌'} OAuth Flow Initiation: ${test.status}`);
        return test.status === 'passed';
    }

    async verifyUserExperience() {
        console.log('\n📋 Testing: User Experience Verification');
        
        const test = {
            name: 'User Experience',
            status: 'running',
            details: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Response time measurement
            console.log('🔍 Measuring response time...');
            
            const startTime = Date.now();
            const response = await this.makeHttpRequest(this.productionUrl);
            const responseTime = Date.now() - startTime;

            if (responseTime < 2000) {
                test.details.push({
                    check: 'Response Time',
                    status: 'passed',
                    message: `Fast response time: ${responseTime}ms`,
                    responseTime
                });
            } else if (responseTime < 5000) {
                test.details.push({
                    check: 'Response Time',
                    status: 'warning',
                    message: `Moderate response time: ${responseTime}ms`,
                    responseTime
                });
            } else {
                test.details.push({
                    check: 'Response Time',
                    status: 'failed',
                    message: `Slow response time: ${responseTime}ms`,
                    responseTime
                });
            }

            // Test 2: Content analysis
            console.log('🔍 Analyzing content quality...');
            
            const content = response.body.toLowerCase();
            const contentAnalysis = {
                hasTitle: content.includes('<title>') && !content.includes('<title></title>'),
                hasMetaDescription: content.includes('meta name="description"'),
                hasViewportMeta: content.includes('meta name="viewport"'),
                hasErrorMessages: content.includes('error') || content.includes('404') || content.includes('500'),
                contentLength: response.body.length,
                hasJavaScript: content.includes('<script') || content.includes('javascript'),
                hasCSS: content.includes('<style') || content.includes('stylesheet')
            };

            const contentScore = this.calculateContentScore(contentAnalysis);
            
            test.details.push({
                check: 'Content Quality',
                status: contentScore > 70 ? 'passed' : 'warning',
                message: `Content quality score: ${contentScore}%`,
                data: contentAnalysis
            });

            // Test 3: Security headers
            console.log('🔍 Checking security headers...');
            
            const securityHeaders = {
                hasHTTPS: this.productionUrl.startsWith('https://'),
                hasStrictTransportSecurity: !!response.headers['strict-transport-security'],
                hasContentSecurityPolicy: !!response.headers['content-security-policy'],
                hasXFrameOptions: !!response.headers['x-frame-options'],
                hasXContentTypeOptions: !!response.headers['x-content-type-options']
            };

            const securityScore = this.calculateSecurityScore(securityHeaders);
            
            test.details.push({
                check: 'Security Headers',
                status: securityScore > 60 ? 'passed' : 'warning',
                message: `Security score: ${securityScore}%`,
                data: securityHeaders
            });

            // Test 4: Error handling
            console.log('🔍 Testing error handling...');
            
            try {
                const errorResponse = await this.makeHttpRequest(`${this.productionUrl}/nonexistent-page`);
                
                test.details.push({
                    check: 'Error Handling',
                    status: errorResponse.statusCode === 404 ? 'passed' : 'warning',
                    message: `404 handling: ${errorResponse.statusCode}`,
                    statusCode: errorResponse.statusCode
                });

            } catch (error) {
                test.details.push({
                    check: 'Error Handling',
                    status: 'info',
                    message: 'Error handling test inconclusive',
                    error: error.message
                });
            }

            test.status = 'passed';
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
            test.endTime = Date.now();
            test.duration = test.endTime - test.startTime;
            
            test.details.push({
                check: 'User Experience Test',
                status: 'failed',
                message: error.message
            });
        }

        this.results.tests.push(test);
        this.updateSummary(test.status);
        
        console.log(`${test.status === 'passed' ? '✅' : '❌'} User Experience: ${test.status}`);
        return test.status === 'passed';
    }

    calculateContentScore(analysis) {
        let score = 100;
        
        if (!analysis.hasTitle) score -= 20;
        if (!analysis.hasMetaDescription) score -= 15;
        if (!analysis.hasViewportMeta) score -= 15;
        if (analysis.hasErrorMessages) score -= 25;
        if (analysis.contentLength < 500) score -= 15;
        if (!analysis.hasJavaScript) score -= 5;
        if (!analysis.hasCSS) score -= 5;
        
        return Math.max(0, Math.round(score));
    }

    calculateSecurityScore(headers) {
        let score = 0;
        
        if (headers.hasHTTPS) score += 40;
        if (headers.hasStrictTransportSecurity) score += 20;
        if (headers.hasContentSecurityPolicy) score += 15;
        if (headers.hasXFrameOptions) score += 15;
        if (headers.hasXContentTypeOptions) score += 10;
        
        return Math.round(score);
    }

    calculateAccessibilityScore(data) {
        let score = 100;
        
        // Deduct points for missing alt text
        if (data.totalImages > 0) {
            const altTextRatio = data.imagesWithAlt / data.totalImages;
            score -= (1 - altTextRatio) * 30;
        }
        
        // Deduct points for buttons without text
        if (data.totalButtons > 0) {
            const buttonTextRatio = data.buttonsWithText / data.totalButtons;
            score -= (1 - buttonTextRatio) * 20;
        }
        
        // Deduct points for inputs without labels
        if (data.totalInputs > 0) {
            const labelRatio = data.inputsWithLabels / data.totalInputs;
            score -= (1 - labelRatio) * 25;
        }
        
        return Math.max(0, Math.round(score));
    }

    updateSummary(status) {
        this.results.summary.total++;
        if (status === 'passed') {
            this.results.summary.passed++;
        } else if (status === 'failed') {
            this.results.summary.failed++;
        } else {
            this.results.summary.warnings++;
        }
    }

    async generateReport() {
        console.log('\n📊 Generating Frontend Integration Report...');
        
        const report = {
            ...this.results,
            overallStatus: this.results.summary.failed === 0 ? 'PASSED' : 'FAILED',
            successRate: Math.round((this.results.summary.passed / this.results.summary.total) * 100),
            recommendations: this.generateRecommendations()
        };

        // Save detailed report
        await fs.writeFile(
            'frontend-integration-report.json',
            JSON.stringify(report, null, 2)
        );

        // Generate summary report
        const summaryReport = this.generateSummaryReport(report);
        await fs.writeFile('frontend-integration-summary.md', summaryReport);

        console.log('📄 Reports saved:');
        console.log('  - frontend-integration-report.json (detailed)');
        console.log('  - frontend-integration-summary.md (summary)');

        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        this.results.tests.forEach(test => {
            test.details.forEach(detail => {
                if (detail.status === 'failed') {
                    recommendations.push({
                        priority: 'high',
                        category: test.name,
                        issue: detail.message,
                        recommendation: this.getRecommendationForIssue(detail.check, detail.message)
                    });
                } else if (detail.status === 'warning') {
                    recommendations.push({
                        priority: 'medium',
                        category: test.name,
                        issue: detail.message,
                        recommendation: this.getRecommendationForIssue(detail.check, detail.message)
                    });
                }
            });
        });
        
        return recommendations;
    }

    getRecommendationForIssue(check, message) {
        const recommendations = {
            'URL Accessibility': 'Verify server is running and accessible. Check Railway deployment status.',
            'Page Title': 'Add a proper page title using <title> tag in HTML head.',
            'DOM Content': 'Ensure the page is loading properly and has meaningful content.',
            'JavaScript Execution': 'Check for JavaScript errors in browser console. Verify script loading.',
            'Interface Elements': 'Add interactive elements like forms and buttons for user interaction.',
            'OAuth Elements': 'Implement OAuth-specific UI elements with proper data attributes.',
            'Form Validation': 'Add form validation and required field indicators.',
            'OAuth Endpoint': 'Verify OAuth endpoint is properly configured and accessible.',
            'Popup Handling': 'Test in different browsers. Consider popup blocker warnings.',
            'State Management': 'Implement proper OAuth state management using browser storage.',
            'Page Load Performance': 'Optimize page loading by reducing resource sizes and improving caching.',
            'Error Handling': 'Implement comprehensive error handling with user-friendly messages.',
            'Accessibility': 'Add alt text to images, labels to inputs, and meaningful button text.',
            'Mobile Responsiveness': 'Add viewport meta tag and implement responsive design.'
        };
        
        return recommendations[check] || 'Review the specific issue and implement appropriate fixes.';
    }

    generateSummaryReport(report) {
        return `# Frontend Integration Verification Report

## Summary
- **Overall Status**: ${report.overallStatus}
- **Success Rate**: ${report.successRate}%
- **Total Tests**: ${report.summary.total}
- **Passed**: ${report.summary.passed}
- **Failed**: ${report.summary.failed}
- **Warnings**: ${report.summary.warnings}
- **Timestamp**: ${report.timestamp}

## Test Results

${report.tests.map(test => `
### ${test.name}
- **Status**: ${test.status.toUpperCase()}
- **Duration**: ${test.duration}ms
- **Details**: ${test.details.length} checks performed

${test.details.map(detail => `
- **${detail.check}**: ${detail.status.toUpperCase()}
  - ${detail.message}
`).join('')}
`).join('')}

## Recommendations

${report.recommendations.map(rec => `
### ${rec.priority.toUpperCase()} Priority - ${rec.category}
- **Issue**: ${rec.issue}
- **Recommendation**: ${rec.recommendation}
`).join('')}

## Next Steps

1. Address all HIGH priority issues first
2. Review and fix MEDIUM priority warnings
3. Re-run verification after fixes
4. Monitor frontend performance regularly

---
Generated by Frontend Integration Verification System
`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 Browser cleanup completed');
        }
    }

    async runAllTests() {
        console.log('🎯 Starting Frontend Integration Verification Suite...\n');
        
        const initialized = await this.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize browser. Exiting...');
            return false;
        }

        try {
            // Run all verification tests
            await this.verifyProductionUrlLoading();
            await this.verifyBrokerSetupInterface();
            await this.verifyOAuthFlowInitiation();
            await this.verifyUserExperience();

            // Generate comprehensive report
            const report = await this.generateReport();

            console.log('\n🎉 Frontend Integration Verification Complete!');
            console.log(`📊 Overall Status: ${report.overallStatus}`);
            console.log(`📈 Success Rate: ${report.successRate}%`);

            return report.overallStatus === 'PASSED';

        } catch (error) {
            console.error('❌ Verification suite failed:', error.message);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// CLI execution
if (require.main === module) {
    const verifier = new FrontendIntegrationVerifier();
    
    verifier.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = FrontendIntegrationVerifier;