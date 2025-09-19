#!/usr/bin/env node

/**
 * OAuth Verification CLI Tool v2.0.0
 * 
 * Comprehensive command-line interface for OAuth deployment verification
 * Provides unified access to all verification systems with advanced features
 */

const fs = require('fs').promises;
const path = require('path');

class OAuthVerificationCLI {
    constructor() {
        this.productionUrl = 'https://quantumleap-production.up.railway.app';
        this.verbose = false;
        this.outputFormat = 'console';
        this.outputFile = null;
        this.availableTests = {
            'database': 'Database schema and connectivity verification',
            'oauth': 'OAuth endpoint functionality verification',
            'health': 'Production endpoint health monitoring',
            'security': 'Security headers and encryption verification',
            'error-handling': 'Error handling and validation verification',
            'end-to-end': 'Complete OAuth flow verification',
            'frontend': 'Frontend integration verification',
            'railway': 'Railway deployment verification',
            'test-data': 'Test data management and scenarios'
        };
    }

    async initialize() {
        console.log('🚀 OAuth Verification CLI Tool v2.0.0');
        console.log('=====================================\n');
        
        if (this.verbose) {
            console.log(`🔗 Target URL: ${this.productionUrl}`);
            console.log(`📊 Output Format: ${this.outputFormat}`);
            if (this.outputFile) {
                console.log(`📄 Output File: ${this.outputFile}`);
            }
            console.log('');
        }
    }

    async runDatabaseVerification(options = {}) {
        console.log('🗄️  Running Database Verification...');
        
        try {
            const result = await this.executeVerificationScript('./verify-database-schema.cjs');
            
            if (this.verbose) {
                console.log('📊 Database verification completed with detailed results');
            }
            
            return {
                name: 'Database Verification',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ Database verification failed:', error.message);
            return {
                name: 'Database Verification',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runOAuthVerification(options = {}) {
        console.log('🔐 Running OAuth Endpoint Verification...');
        
        try {
            const result = await this.executeVerificationScript('./verify-oauth-endpoint.cjs');
            
            if (this.verbose) {
                console.log('📊 OAuth endpoint verification completed');
            }
            
            return {
                name: 'OAuth Endpoint Verification',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ OAuth verification failed:', error.message);
            return {
                name: 'OAuth Endpoint Verification',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runHealthMonitoring(options = {}) {
        console.log('🏥 Running Health Monitoring...');
        
        try {
            const result = await this.executeVerificationScript('./production-health-monitor.cjs');
            
            if (this.verbose) {
                console.log('📊 Health monitoring completed');
            }
            
            return {
                name: 'Health Monitoring',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ Health monitoring failed:', error.message);
            return {
                name: 'Health Monitoring',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runSecurityVerification(options = {}) {
        console.log('🔒 Running Security Verification...');
        
        try {
            const result = await this.executeVerificationScript('./security-verification.cjs');
            
            if (this.verbose) {
                console.log('📊 Security verification completed');
            }
            
            return {
                name: 'Security Verification',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ Security verification failed:', error.message);
            return {
                name: 'Security Verification',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runErrorHandlingVerification(options = {}) {
        console.log('⚠️  Running Error Handling Verification...');
        
        try {
            const result = await this.executeVerificationScript('./error-handling-verification.cjs');
            
            if (this.verbose) {
                console.log('📊 Error handling verification completed');
            }
            
            return {
                name: 'Error Handling Verification',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ Error handling verification failed:', error.message);
            return {
                name: 'Error Handling Verification',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runEndToEndVerification(options = {}) {
        console.log('🔄 Running End-to-End Verification...');
        
        try {
            const result = await this.executeVerificationScript('./end-to-end-oauth-verification.cjs');
            
            if (this.verbose) {
                console.log('📊 End-to-end verification completed');
            }
            
            return {
                name: 'End-to-End Verification',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ End-to-end verification failed:', error.message);
            return {
                name: 'End-to-End Verification',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runFrontendVerification(options = {}) {
        console.log('🌐 Running Frontend Integration Verification...');
        
        try {
            const result = await this.executeVerificationScript('./frontend-integration-verification.cjs');
            
            if (this.verbose) {
                console.log('📊 Frontend verification completed');
            }
            
            return {
                name: 'Frontend Integration Verification',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ Frontend verification failed:', error.message);
            return {
                name: 'Frontend Integration Verification',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runRailwayVerification(options = {}) {
        console.log('🚂 Running Railway Deployment Verification...');
        
        try {
            const result = await this.executeVerificationScript('./railway-deployment-verification.cjs');
            
            if (this.verbose) {
                console.log('📊 Railway verification completed');
            }
            
            return {
                name: 'Railway Deployment Verification',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ Railway verification failed:', error.message);
            return {
                name: 'Railway Deployment Verification',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async runTestDataManagement(options = {}) {
        console.log('🎲 Running Test Data Management...');
        
        try {
            const result = await this.executeVerificationScript('./test-data-integration.cjs', ['run-suite']);
            
            if (this.verbose) {
                console.log('📊 Test data management completed');
            }
            
            return {
                name: 'Test Data Management',
                status: 'completed',
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            console.error('❌ Test data management failed:', error.message);
            return {
                name: 'Test Data Management',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async executeVerificationScript(scriptPath, args = []) {
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const child = spawn('node', [scriptPath, ...args], {
                stdio: this.verbose ? 'inherit' : 'pipe'
            });

            let output = '';
            let errorOutput = '';

            if (!this.verbose) {
                child.stdout?.on('data', (data) => {
                    output += data.toString();
                });

                child.stderr?.on('data', (data) => {
                    errorOutput += data.toString();
                });
            }

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        exitCode: code,
                        output: output,
                        success: true
                    });
                } else {
                    reject(new Error(`Script failed with exit code ${code}: ${errorOutput}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    async runSelectedTests(testNames, options = {}) {
        console.log(`🎯 Running Selected Tests: ${testNames.join(', ')}\n`);
        
        const results = {
            timestamp: new Date().toISOString(),
            selectedTests: testNames,
            tests: {},
            summary: {
                total: 0,
                completed: 0,
                failed: 0,
                skipped: 0
            }
        };

        const testMethods = {
            'database': 'runDatabaseVerification',
            'oauth': 'runOAuthVerification',
            'health': 'runHealthMonitoring',
            'security': 'runSecurityVerification',
            'error-handling': 'runErrorHandlingVerification',
            'end-to-end': 'runEndToEndVerification',
            'frontend': 'runFrontendVerification',
            'railway': 'runRailwayVerification',
            'test-data': 'runTestDataManagement'
        };

        for (const testName of testNames) {
            if (!testMethods[testName]) {
                console.log(`⚠️  Unknown test: ${testName} - skipping`);
                results.summary.skipped++;
                continue;
            }

            try {
                console.log(`\n▶️  Starting ${testName} verification...`);
                const startTime = Date.now();
                
                results.tests[testName] = await this[testMethods[testName]](options);
                results.tests[testName].duration = Date.now() - startTime;
                
                if (results.tests[testName].status === 'completed') {
                    results.summary.completed++;
                    console.log(`✅ ${testName} verification completed (${results.tests[testName].duration}ms)`);
                } else {
                    results.summary.failed++;
                    console.log(`❌ ${testName} verification failed`);
                }
            } catch (error) {
                results.tests[testName] = {
                    name: testName,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                results.summary.failed++;
                console.log(`❌ ${testName} verification failed: ${error.message}`);
            }
            
            results.summary.total++;
        }

        return results;
    }

    async runAllVerifications(options = {}) {
        console.log('🚀 Running Comprehensive OAuth Verification Suite...\n');
        
        const allTests = Object.keys(this.availableTests);
        return await this.runSelectedTests(allTests, options);
    }

    async exportResults(results, format, filename) {
        console.log(`\n📤 Exporting results to ${format.toUpperCase()} format...`);
        
        try {
            let content;
            let extension;
            
            switch (format.toLowerCase()) {
                case 'json':
                    content = JSON.stringify(results, null, 2);
                    extension = '.json';
                    break;
                case 'csv':
                    content = this.convertToCSV(results);
                    extension = '.csv';
                    break;
                case 'markdown':
                case 'md':
                    content = this.convertToMarkdown(results);
                    extension = '.md';
                    break;
                case 'html':
                    content = this.convertToHTML(results);
                    extension = '.html';
                    break;
                case 'xml':
                    content = this.convertToXML(results);
                    extension = '.xml';
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            
            // Ensure filename has correct extension
            if (!filename.endsWith(extension)) {
                filename += extension;
            }
            
            await fs.writeFile(filename, content);
            console.log(`✅ Results exported to: ${filename}`);
            
            return filename;
        } catch (error) {
            console.error(`❌ Export failed: ${error.message}`);
            throw error;
        }
    }

    convertToCSV(results) {
        let csv = 'Test Name,Status,Duration (ms),Timestamp,Error\n';
        
        for (const [testName, testResult] of Object.entries(results.tests)) {
            const status = testResult.status || 'unknown';
            const duration = testResult.duration || 0;
            const timestamp = testResult.timestamp || '';
            const error = testResult.error ? `"${testResult.error.replace(/"/g, '""')}"` : '';
            
            csv += `"${testName}","${status}",${duration},"${timestamp}",${error}\n`;
        }
        
        return csv;
    }

    convertToMarkdown(results) {
        let md = `# OAuth Verification Results\n\n`;
        md += `**Generated:** ${results.timestamp}\n\n`;
        
        if (results.selectedTests) {
            md += `**Selected Tests:** ${results.selectedTests.join(', ')}\n\n`;
        }
        
        md += `## Summary\n\n`;
        md += `| Metric | Count |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Tests | ${results.summary.total} |\n`;
        md += `| Completed | ${results.summary.completed} |\n`;
        md += `| Failed | ${results.summary.failed} |\n`;
        md += `| Skipped | ${results.summary.skipped || 0} |\n`;
        
        const successRate = results.summary.total > 0 ? 
            Math.round((results.summary.completed / results.summary.total) * 100) : 0;
        md += `| Success Rate | ${successRate}% |\n\n`;
        
        md += `## Test Results\n\n`;
        
        for (const [testName, testResult] of Object.entries(results.tests)) {
            const statusIcon = testResult.status === 'completed' ? '✅' : '❌';
            md += `### ${statusIcon} ${testResult.name || testName}\n\n`;
            md += `- **Status:** ${testResult.status}\n`;
            md += `- **Timestamp:** ${testResult.timestamp}\n`;
            
            if (testResult.duration) {
                md += `- **Duration:** ${testResult.duration}ms\n`;
            }
            
            if (testResult.error) {
                md += `- **Error:** ${testResult.error}\n`;
            }
            
            md += `\n`;
        }
        
        return md;
    }

    convertToHTML(results) {
        const successRate = results.summary.total > 0 ? 
            Math.round((results.summary.completed / results.summary.total) * 100) : 0;
            
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth Verification Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .test-result { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .completed { border-left: 5px solid #28a745; }
        .failed { border-left: 5px solid #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OAuth Verification Results</h1>
        <p class="timestamp">Generated: ${results.timestamp}</p>
        ${results.selectedTests ? `<p>Selected Tests: ${results.selectedTests.join(', ')}</p>` : ''}
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>${results.summary.total}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3>${results.summary.completed}</h3>
            <p>Completed</p>
        </div>
        <div class="metric">
            <h3>${results.summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3>${successRate}%</h3>
            <p>Success Rate</p>
        </div>
    </div>
    
    <h2>Test Results</h2>`;

        for (const [testName, testResult] of Object.entries(results.tests)) {
            const statusClass = testResult.status === 'completed' ? 'completed' : 'failed';
            const statusIcon = testResult.status === 'completed' ? '✅' : '❌';
            
            html += `
    <div class="test-result ${statusClass}">
        <h3>${statusIcon} ${testResult.name || testName}</h3>
        <p><strong>Status:</strong> ${testResult.status}</p>
        <p><strong>Timestamp:</strong> ${testResult.timestamp}</p>`;
        
            if (testResult.duration) {
                html += `<p><strong>Duration:</strong> ${testResult.duration}ms</p>`;
            }
            
            if (testResult.error) {
                html += `<p><strong>Error:</strong> ${testResult.error}</p>`;
            }
            
            html += `</div>`;
        }

        html += `
</body>
</html>`;

        return html;
    }

    convertToXML(results) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<verification-results timestamp="${results.timestamp}">
    <summary>
        <total>${results.summary.total}</total>
        <completed>${results.summary.completed}</completed>
        <failed>${results.summary.failed}</failed>
        <skipped>${results.summary.skipped || 0}</skipped>
    </summary>
    <tests>`;

        for (const [testName, testResult] of Object.entries(results.tests)) {
            xml += `
        <test name="${testName}">
            <status>${testResult.status}</status>
            <timestamp>${testResult.timestamp}</timestamp>`;
            
            if (testResult.duration) {
                xml += `<duration>${testResult.duration}</duration>`;
            }
            
            if (testResult.error) {
                xml += `<error><![CDATA[${testResult.error}]]></error>`;
            }
            
            xml += `</test>`;
        }

        xml += `
    </tests>
</verification-results>`;

        return xml;
    }

    displayHelp() {
        console.log(`
OAuth Verification CLI Tool v2.0.0
==================================

USAGE:
    node oauth-verify-cli-v2.cjs [command] [options]

COMMANDS:
    all                     Run all verification tests (default)
    database               Run database verification only
    oauth                  Run OAuth endpoint verification only
    health                 Run health monitoring only
    security               Run security verification only
    error-handling         Run error handling verification only
    end-to-end             Run end-to-end verification only
    frontend               Run frontend integration verification only
    railway                Run Railway deployment verification only
    test-data              Run test data management verification only
    list                   List all available tests
    help                   Show this help message

OPTIONS:
    -v, --verbose          Enable verbose output with detailed logs
    -u, --url <url>        Set production URL (default: ${this.productionUrl})
    -f, --format <format>  Output format: console, json, csv, markdown, html, xml
    -o, --output <file>    Export results to file
    -t, --tests <tests>    Run specific tests (comma-separated)
    -q, --quiet            Suppress non-essential output
    -h, --help             Show help message

EXAMPLES:
    # Run all tests with verbose output
    node oauth-verify-cli-v2.cjs all --verbose
    
    # Run specific tests
    node oauth-verify-cli-v2.cjs --tests database,oauth,security
    
    # Export results to JSON
    node oauth-verify-cli-v2.cjs all --format json --output results.json
    
    # Run with custom URL
    node oauth-verify-cli-v2.cjs --url https://my-app.railway.app
    
    # Generate HTML report
    node oauth-verify-cli-v2.cjs all --format html --output report.html

AVAILABLE TESTS:
${Object.entries(this.availableTests).map(([key, desc]) => `    ${key.padEnd(15)} ${desc}`).join('\n')}
`);
    }

    displayTestList() {
        console.log('\n📋 Available Verification Tests:\n');
        
        Object.entries(this.availableTests).forEach(([key, description]) => {
            console.log(`  🔹 ${key.padEnd(15)} - ${description}`);
        });
        
        console.log('\nUse --tests to run specific tests, or "all" to run everything.\n');
    }

    parseArguments() {
        const args = process.argv.slice(2);
        const options = {
            command: 'all',
            verbose: false,
            quiet: false,
            url: this.productionUrl,
            format: 'console',
            output: null,
            tests: null,
            help: false
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '-v':
                case '--verbose':
                    options.verbose = true;
                    break;
                case '-q':
                case '--quiet':
                    options.quiet = true;
                    break;
                case '-u':
                case '--url':
                    options.url = args[++i];
                    break;
                case '-f':
                case '--format':
                    options.format = args[++i];
                    break;
                case '-o':
                case '--output':
                    options.output = args[++i];
                    break;
                case '-t':
                case '--tests':
                    options.tests = args[++i].split(',').map(t => t.trim());
                    break;
                case '-h':
                case '--help':
                case 'help':
                    options.help = true;
                    break;
                case 'list':
                    options.command = 'list';
                    break;
                default:
                    if (!arg.startsWith('-') && this.availableTests[arg]) {
                        options.command = arg;
                    } else if (!arg.startsWith('-') && arg !== 'all') {
                        console.log(`⚠️  Unknown command: ${arg}`);
                    } else if (arg === 'all') {
                        options.command = 'all';
                    }
                    break;
            }
        }

        return options;
    }

    async run() {
        const options = this.parseArguments();
        
        // Apply options
        this.verbose = options.verbose && !options.quiet;
        this.productionUrl = options.url;
        this.outputFormat = options.format;
        this.outputFile = options.output;

        if (options.help) {
            this.displayHelp();
            return;
        }

        if (options.command === 'list') {
            this.displayTestList();
            return;
        }

        await this.initialize();

        let results;

        try {
            if (options.tests) {
                // Run specific tests
                results = await this.runSelectedTests(options.tests, options);
            } else if (options.command === 'all') {
                // Run all tests
                results = await this.runAllVerifications(options);
            } else {
                // Run single test
                results = await this.runSelectedTests([options.command], options);
            }

            // Display summary
            console.log('\n📊 Verification Summary:');
            console.log(`   Total: ${results.summary.total}`);
            console.log(`   ✅ Completed: ${results.summary.completed}`);
            console.log(`   ❌ Failed: ${results.summary.failed}`);
            if (results.summary.skipped > 0) {
                console.log(`   ⏭️  Skipped: ${results.summary.skipped}`);
            }
            
            const successRate = results.summary.total > 0 ? 
                Math.round((results.summary.completed / results.summary.total) * 100) : 0;
            console.log(`   📈 Success Rate: ${successRate}%`);

            // Export results if requested
            if (this.outputFile) {
                await this.exportResults(results, this.outputFormat, this.outputFile);
            }

            // Exit with appropriate code
            process.exit(results.summary.failed === 0 ? 0 : 1);

        } catch (error) {
            console.error('\n❌ Verification suite failed:', error.message);
            if (this.verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
}

// CLI execution
if (require.main === module) {
    const cli = new OAuthVerificationCLI();
    cli.run().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = OAuthVerificationCLI;