#!/usr/bin/env node

/**
 * Test Data Integration Helper
 * 
 * Integrates test data management with OAuth verification systems
 * Provides utilities for using test data in verification scripts
 */

const TestDataManager = require('./test-data-management.cjs');
const fs = require('fs').promises;

class TestDataIntegration {
    constructor() {
        this.dataManager = new TestDataManager();
        this.initialized = false;
    }

    async initialize() {
        if (!this.initialized) {
            await this.dataManager.initialize();
            this.initialized = true;
        }
        return true;
    }

    async getTestDataForOAuthVerification() {
        await this.initialize();
        
        console.log('📋 Preparing test data for OAuth verification...');
        
        // Get valid OAuth scenarios
        const validScenarios = this.dataManager.testScenarios.filter(s => s.category === 'valid');
        
        // Get invalid OAuth scenarios  
        const invalidScenarios = this.dataManager.testScenarios.filter(s => s.category === 'invalid');
        
        // Get edge case scenarios
        const edgeScenarios = this.dataManager.testScenarios.filter(s => s.category === 'edge');
        
        // Get database scenarios
        const dbScenarios = this.dataManager.testScenarios.filter(s => s.category === 'database');

        return {
            valid: validScenarios,
            invalid: invalidScenarios,
            edge: edgeScenarios,
            database: dbScenarios,
            mockData: this.dataManager.mockData
        };
    }

    async getTestCredentialsSet(type = 'valid') {
        await this.initialize();
        
        const mockData = this.dataManager.mockData;
        
        switch (type) {
            case 'valid':
                return mockData.validCredentials || [];
            case 'invalid':
                return mockData.invalidCredentials || [];
            case 'mixed':
                return [
                    ...(mockData.validCredentials || []),
                    ...(mockData.invalidCredentials || [])
                ];
            default:
                return mockData.validCredentials || [];
        }
    }

    async createTestSession(name, scenarios = []) {
        await this.initialize();
        
        console.log(`🎯 Creating test session: ${name}`);
        
        const session = await this.dataManager.createTestSession({
            name: name,
            description: `Test session for ${scenarios.length} scenarios`,
            purpose: 'oauth_verification'
        });

        // Track which scenarios will be run
        session.scenarios_to_run = scenarios;
        
        return session;
    }

    async recordTestResult(sessionId, scenarioId, result) {
        await this.initialize();
        
        const session = this.dataManager.activeSessions.find(s => s.id === sessionId);
        if (!session) {
            throw new Error(`Test session not found: ${sessionId}`);
        }

        // Initialize results if not exists
        if (!session.scenarios_run) {
            session.scenarios_run = [];
        }

        // Record the result
        session.scenarios_run.push({
            scenarioId,
            result,
            timestamp: new Date().toISOString()
        });

        // Update session statistics
        session.results.total++;
        if (result.status === 'passed') {
            session.results.passed++;
        } else if (result.status === 'failed') {
            session.results.failed++;
        } else {
            session.results.errors++;
        }

        // Save updated sessions
        await this.dataManager.saveTestSessions();
        
        console.log(`📊 Recorded result for ${scenarioId}: ${result.status}`);
    }

    async generateVerificationTestSuite() {
        await this.initialize();
        
        console.log('🔧 Generating OAuth verification test suite...');
        
        const testData = await this.getTestDataForOAuthVerification();
        
        const testSuite = {
            name: 'OAuth Deployment Verification Test Suite',
            description: 'Comprehensive test suite for OAuth deployment verification',
            created_at: new Date().toISOString(),
            test_categories: {
                valid_oauth_tests: {
                    name: 'Valid OAuth Tests',
                    scenarios: testData.valid,
                    priority: 'high',
                    expected_success_rate: 100
                },
                invalid_oauth_tests: {
                    name: 'Invalid OAuth Tests',
                    scenarios: testData.invalid,
                    priority: 'high',
                    expected_success_rate: 100 // These should successfully detect errors
                },
                edge_case_tests: {
                    name: 'Edge Case Tests',
                    scenarios: testData.edge,
                    priority: 'medium',
                    expected_success_rate: 80
                },
                database_tests: {
                    name: 'Database Integration Tests',
                    scenarios: testData.database,
                    priority: 'high',
                    expected_success_rate: 90
                }
            },
            test_execution_order: [
                'valid_oauth_tests',
                'invalid_oauth_tests', 
                'database_tests',
                'edge_case_tests'
            ],
            mock_data: testData.mockData
        };

        // Save test suite
        await fs.writeFile(
            'oauth-verification-test-suite.json',
            JSON.stringify(testSuite, null, 2)
        );

        console.log('✅ Generated OAuth verification test suite');
        console.log(`   - Valid OAuth Tests: ${testData.valid.length} scenarios`);
        console.log(`   - Invalid OAuth Tests: ${testData.invalid.length} scenarios`);
        console.log(`   - Edge Case Tests: ${testData.edge.length} scenarios`);
        console.log(`   - Database Tests: ${testData.database.length} scenarios`);

        return testSuite;
    }

    async runScenarioTest(scenario, endpoint = 'https://quantumleap-production.up.railway.app') {
        console.log(`🧪 Running test scenario: ${scenario.name}`);
        
        const startTime = Date.now();
        
        try {
            // Prepare request data
            let requestData;
            if (scenario.rawData) {
                requestData = scenario.data; // Use raw data for malformed JSON tests
            } else {
                requestData = JSON.stringify(scenario.data);
            }

            // Make request to OAuth endpoint
            const response = await this.makeHttpRequest(`${endpoint}/api/auth/broker/setup-oauth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestData
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Analyze result
            const result = this.analyzeScenarioResult(scenario, response, duration);
            
            console.log(`${result.passed ? '✅' : '❌'} ${scenario.name}: ${result.status}`);
            
            return result;

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const result = {
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                status: 'error',
                passed: false,
                duration,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            console.log(`❌ ${scenario.name}: ERROR - ${error.message}`);
            return result;
        }
    }

    analyzeScenarioResult(scenario, response, duration) {
        const result = {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            duration,
            timestamp: new Date().toISOString(),
            response: {
                statusCode: response.statusCode,
                body: response.body
            }
        };

        // Determine if test passed based on expected result
        switch (scenario.expectedResult) {
            case 'success':
                result.passed = response.statusCode === 200;
                result.status = result.passed ? 'passed' : 'failed';
                break;
                
            case 'validation_error':
                result.passed = response.statusCode === 400;
                result.status = result.passed ? 'passed' : 'failed';
                break;
                
            case 'parse_error':
                result.passed = response.statusCode === 400;
                result.status = result.passed ? 'passed' : 'failed';
                break;
                
            case 'database_error':
                result.passed = response.statusCode === 500;
                result.status = result.passed ? 'passed' : 'failed';
                break;
                
            default:
                result.passed = response.statusCode < 500;
                result.status = result.passed ? 'passed' : 'failed';
        }

        // Add additional analysis
        if (scenario.expectedError && response.body) {
            try {
                const responseData = JSON.parse(response.body);
                result.errorMessageMatch = responseData.error && 
                    responseData.error.toLowerCase().includes(scenario.expectedError.toLowerCase());
            } catch (e) {
                result.errorMessageMatch = false;
            }
        }

        return result;
    }

    async makeHttpRequest(url, options = {}) {
        const https = require('https');
        const http = require('http');
        
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

    async runFullTestSuite(endpoint = 'https://quantumleap-production.up.railway.app') {
        console.log('🎯 Running Full OAuth Verification Test Suite...');
        
        await this.initialize();
        
        // Generate test suite
        const testSuite = await this.generateVerificationTestSuite();
        
        // Create test session
        const session = await this.createTestSession(
            'Full OAuth Verification Test Run',
            Object.values(testSuite.test_categories).flatMap(cat => cat.scenarios)
        );

        const results = {
            sessionId: session.id,
            startTime: new Date().toISOString(),
            testSuite: testSuite.name,
            categories: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                errors: 0
            }
        };

        // Run tests by category
        for (const categoryKey of testSuite.test_execution_order) {
            const category = testSuite.test_categories[categoryKey];
            console.log(`\n📂 Running ${category.name}...`);
            
            const categoryResults = {
                name: category.name,
                scenarios: [],
                summary: { total: 0, passed: 0, failed: 0, errors: 0 }
            };

            for (const scenario of category.scenarios) {
                const scenarioResult = await this.runScenarioTest(scenario, endpoint);
                categoryResults.scenarios.push(scenarioResult);
                
                // Update counters
                categoryResults.summary.total++;
                results.summary.total++;
                
                if (scenarioResult.status === 'passed') {
                    categoryResults.summary.passed++;
                    results.summary.passed++;
                } else if (scenarioResult.status === 'failed') {
                    categoryResults.summary.failed++;
                    results.summary.failed++;
                } else {
                    categoryResults.summary.errors++;
                    results.summary.errors++;
                }

                // Record result in session
                await this.recordTestResult(session.id, scenario.id, scenarioResult);
            }

            results.categories[categoryKey] = categoryResults;
            
            const successRate = Math.round((categoryResults.summary.passed / categoryResults.summary.total) * 100);
            console.log(`📊 ${category.name} completed: ${successRate}% success rate`);
        }

        results.endTime = new Date().toISOString();
        results.duration = new Date(results.endTime) - new Date(results.startTime);
        results.overallSuccessRate = Math.round((results.summary.passed / results.summary.total) * 100);

        // Save results
        await fs.writeFile(
            'oauth-test-suite-results.json',
            JSON.stringify(results, null, 2)
        );

        console.log('\n🎉 Full Test Suite Completed!');
        console.log(`📊 Overall Success Rate: ${results.overallSuccessRate}%`);
        console.log(`✅ Passed: ${results.summary.passed}`);
        console.log(`❌ Failed: ${results.summary.failed}`);
        console.log(`⚠️ Errors: ${results.summary.errors}`);
        console.log(`📄 Results saved to: oauth-test-suite-results.json`);

        return results;
    }
}

// CLI execution
if (require.main === module) {
    const integration = new TestDataIntegration();
    
    const command = process.argv[2] || 'run-suite';
    
    switch (command) {
        case 'run-suite':
            integration.runFullTestSuite()
                .then(results => {
                    process.exit(results.overallSuccessRate > 80 ? 0 : 1);
                })
                .catch(error => {
                    console.error('❌ Test suite failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'generate-suite':
            integration.generateVerificationTestSuite()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Suite generation failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node test-data-integration.cjs [run-suite|generate-suite]');
            console.log('  run-suite      - Run full OAuth verification test suite (default)');
            console.log('  generate-suite - Generate test suite configuration only');
            process.exit(1);
    }
}

module.exports = TestDataIntegration;