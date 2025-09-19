#!/usr/bin/env node

/**
 * Comprehensive Test Data Management System
 * 
 * Provides complete test data lifecycle management including:
 * - Test data sets for valid and invalid OAuth requests
 * - Test user management with cleanup and isolation
 * - Mock data generation for edge case testing
 * - Test environment setup and teardown automation
 */

const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

class TestDataManager {
    constructor() {
        this.testDataDir = './test-data';
        this.testUsersFile = path.join(this.testDataDir, 'test-users.json');
        this.testScenariosFile = path.join(this.testDataDir, 'test-scenarios.json');
        this.mockDataFile = path.join(this.testDataDir, 'mock-data.json');
        this.testSessionsFile = path.join(this.testDataDir, 'test-sessions.json');
        
        this.testUsers = [];
        this.testScenarios = [];
        this.mockData = {};
        this.activeSessions = [];
    }

    async initialize() {
        console.log('🚀 Initializing Test Data Management System...');
        
        try {
            // Create test data directory
            await this.ensureTestDataDirectory();
            
            // Load existing test data
            await this.loadExistingData();
            
            // Initialize default test scenarios
            await this.initializeDefaultScenarios();
            
            console.log('✅ Test Data Management System initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Test Data Management:', error.message);
            return false;
        }
    }

    async ensureTestDataDirectory() {
        try {
            await fs.access(this.testDataDir);
        } catch (error) {
            await fs.mkdir(this.testDataDir, { recursive: true });
            console.log(`📁 Created test data directory: ${this.testDataDir}`);
        }
    }

    async loadExistingData() {
        console.log('📂 Loading existing test data...');
        
        try {
            // Load test users
            try {
                const usersData = await fs.readFile(this.testUsersFile, 'utf8');
                this.testUsers = JSON.parse(usersData);
                console.log(`📋 Loaded ${this.testUsers.length} test users`);
            } catch (error) {
                this.testUsers = [];
                console.log('📋 No existing test users found, starting fresh');
            }

            // Load test scenarios
            try {
                const scenariosData = await fs.readFile(this.testScenariosFile, 'utf8');
                this.testScenarios = JSON.parse(scenariosData);
                console.log(`📋 Loaded ${this.testScenarios.length} test scenarios`);
            } catch (error) {
                this.testScenarios = [];
                console.log('📋 No existing test scenarios found, will create defaults');
            }

            // Load mock data
            try {
                const mockDataContent = await fs.readFile(this.mockDataFile, 'utf8');
                this.mockData = JSON.parse(mockDataContent);
                console.log('📋 Loaded existing mock data');
            } catch (error) {
                this.mockData = {};
                console.log('📋 No existing mock data found, will generate fresh');
            }

            // Load active sessions
            try {
                const sessionsData = await fs.readFile(this.testSessionsFile, 'utf8');
                this.activeSessions = JSON.parse(sessionsData);
                console.log(`📋 Loaded ${this.activeSessions.length} active test sessions`);
            } catch (error) {
                this.activeSessions = [];
                console.log('📋 No active test sessions found');
            }

        } catch (error) {
            console.error('⚠️ Error loading existing data:', error.message);
        }
    }

    async initializeDefaultScenarios() {
        if (this.testScenarios.length === 0) {
            console.log('🔧 Creating default test scenarios...');
            
            this.testScenarios = [
                // Valid OAuth scenarios
                {
                    id: 'valid-oauth-basic',
                    name: 'Valid OAuth Basic Setup',
                    category: 'valid',
                    description: 'Basic valid OAuth setup with correct credentials',
                    data: {
                        api_key: 'test_valid_key_123',
                        api_secret: 'test_valid_secret_456',
                        user_id: 'TEST001'
                    },
                    expectedResult: 'success',
                    priority: 'high'
                },
                {
                    id: 'valid-oauth-no-userid',
                    name: 'Valid OAuth Without User ID',
                    category: 'valid',
                    description: 'Valid OAuth setup without optional user_id parameter',
                    data: {
                        api_key: 'test_valid_key_789',
                        api_secret: 'test_valid_secret_012'
                    },
                    expectedResult: 'success',
                    priority: 'high'
                },
                
                // Invalid OAuth scenarios
                {
                    id: 'invalid-oauth-missing-key',
                    name: 'Missing API Key',
                    category: 'invalid',
                    description: 'OAuth request missing required api_key',
                    data: {
                        api_secret: 'test_secret_only'
                    },
                    expectedResult: 'validation_error',
                    expectedError: 'api_key is required',
                    priority: 'high'
                },
                {
                    id: 'invalid-oauth-missing-secret',
                    name: 'Missing API Secret',
                    category: 'invalid',
                    description: 'OAuth request missing required api_secret',
                    data: {
                        api_key: 'test_key_only'
                    },
                    expectedResult: 'validation_error',
                    expectedError: 'api_secret is required',
                    priority: 'high'
                },
                {
                    id: 'invalid-oauth-empty-values',
                    name: 'Empty Credential Values',
                    category: 'invalid',
                    description: 'OAuth request with empty credential values',
                    data: {
                        api_key: '',
                        api_secret: ''
                    },
                    expectedResult: 'validation_error',
                    expectedError: 'credentials cannot be empty',
                    priority: 'medium'
                },
                {
                    id: 'invalid-oauth-malformed-json',
                    name: 'Malformed JSON Request',
                    category: 'invalid',
                    description: 'OAuth request with malformed JSON',
                    data: '{"api_key": "test", "api_secret":}', // Intentionally malformed
                    rawData: true,
                    expectedResult: 'parse_error',
                    priority: 'medium'
                },
                
                // Edge case scenarios
                {
                    id: 'edge-oauth-long-credentials',
                    name: 'Very Long Credentials',
                    category: 'edge',
                    description: 'OAuth request with extremely long credential values',
                    data: {
                        api_key: 'a'.repeat(1000),
                        api_secret: 'b'.repeat(1000),
                        user_id: 'c'.repeat(100)
                    },
                    expectedResult: 'validation_error',
                    expectedError: 'credentials too long',
                    priority: 'low'
                },
                {
                    id: 'edge-oauth-special-chars',
                    name: 'Special Characters in Credentials',
                    category: 'edge',
                    description: 'OAuth request with special characters',
                    data: {
                        api_key: 'test@#$%^&*()_+{}|:<>?[]\\;\'",./`~',
                        api_secret: '!@#$%^&*()_+{}|:<>?[]\\;\'",./`~test',
                        user_id: 'user@test.com'
                    },
                    expectedResult: 'success',
                    priority: 'medium'
                },
                {
                    id: 'edge-oauth-unicode',
                    name: 'Unicode Characters',
                    category: 'edge',
                    description: 'OAuth request with unicode characters',
                    data: {
                        api_key: 'test_🔑_key',
                        api_secret: 'secret_🔐_value',
                        user_id: 'user_测试_123'
                    },
                    expectedResult: 'success',
                    priority: 'low'
                },
                
                // Database connection scenarios
                {
                    id: 'db-connection-valid',
                    name: 'Valid Database Connection',
                    category: 'database',
                    description: 'Test with valid database connection',
                    data: {
                        api_key: 'db_test_key',
                        api_secret: 'db_test_secret',
                        user_id: 'DB_TEST_001'
                    },
                    expectedResult: 'success',
                    requiresDatabase: true,
                    priority: 'high'
                },
                {
                    id: 'db-connection-failure',
                    name: 'Database Connection Failure',
                    category: 'database',
                    description: 'Test behavior when database is unavailable',
                    data: {
                        api_key: 'db_fail_key',
                        api_secret: 'db_fail_secret'
                    },
                    expectedResult: 'database_error',
                    simulateDbFailure: true,
                    priority: 'high'
                }
            ];

            await this.saveTestScenarios();
            console.log(`✅ Created ${this.testScenarios.length} default test scenarios`);
        }
    }

    async createTestUser(userData = {}) {
        console.log('👤 Creating new test user...');
        
        const testUser = {
            id: userData.id || this.generateTestUserId(),
            username: userData.username || `testuser_${Date.now()}`,
            email: userData.email || `test${Date.now()}@example.com`,
            api_key: userData.api_key || this.generateApiKey(),
            api_secret: userData.api_secret || this.generateApiSecret(),
            created_at: new Date().toISOString(),
            status: 'active',
            test_session_id: userData.test_session_id || null,
            metadata: {
                purpose: userData.purpose || 'general_testing',
                created_by: 'test-data-manager',
                cleanup_after: userData.cleanup_after || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            }
        };

        this.testUsers.push(testUser);
        await this.saveTestUsers();
        
        console.log(`✅ Created test user: ${testUser.username} (${testUser.id})`);
        return testUser;
    }

    async createTestSession(sessionData = {}) {
        console.log('🎯 Creating new test session...');
        
        const testSession = {
            id: sessionData.id || this.generateSessionId(),
            name: sessionData.name || `Test Session ${Date.now()}`,
            description: sessionData.description || 'Automated test session',
            created_at: new Date().toISOString(),
            status: 'active',
            test_users: [],
            scenarios_run: [],
            results: {
                total: 0,
                passed: 0,
                failed: 0,
                errors: 0
            },
            metadata: {
                purpose: sessionData.purpose || 'verification_testing',
                environment: sessionData.environment || 'test',
                cleanup_scheduled: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
            }
        };

        this.activeSessions.push(testSession);
        await this.saveTestSessions();
        
        console.log(`✅ Created test session: ${testSession.name} (${testSession.id})`);
        return testSession;
    }

    async generateMockData() {
        console.log('🎲 Generating comprehensive mock data...');
        
        this.mockData = {
            // Valid API credentials
            validCredentials: [
                { api_key: 'valid_key_001', api_secret: 'valid_secret_001' },
                { api_key: 'valid_key_002', api_secret: 'valid_secret_002' },
                { api_key: 'valid_key_003', api_secret: 'valid_secret_003' }
            ],
            
            // Invalid API credentials
            invalidCredentials: [
                { api_key: 'invalid_key_001', api_secret: 'invalid_secret_001' },
                { api_key: 'expired_key_002', api_secret: 'expired_secret_002' },
                { api_key: 'revoked_key_003', api_secret: 'revoked_secret_003' }
            ],
            
            // User IDs for testing
            testUserIds: [
                'TEST_USER_001',
                'TEST_USER_002',
                'TEST_USER_003',
                'EDGE_CASE_USER_@#$',
                'UNICODE_USER_测试',
                'LONG_USER_' + 'X'.repeat(50)
            ],
            
            // OAuth states for CSRF testing
            oauthStates: [
                this.generateOAuthState(),
                this.generateOAuthState(),
                this.generateOAuthState(),
                'invalid_state_123',
                'expired_state_456',
                ''  // Empty state for testing
            ],
            
            // Mock OAuth responses
            oauthResponses: {
                success: {
                    status: 'success',
                    oauth_url: 'https://kite.zerodha.com/connect/login?api_key=test&state=mock_state',
                    state: 'mock_state_success',
                    expires_in: 3600
                },
                error: {
                    status: 'error',
                    error: 'Invalid credentials',
                    error_code: 'INVALID_CREDENTIALS'
                },
                validation_error: {
                    status: 'error',
                    error: 'Validation failed',
                    error_code: 'VALIDATION_ERROR',
                    details: {
                        api_key: 'API key is required',
                        api_secret: 'API secret is required'
                    }
                }
            },
            
            // Database test data
            databaseTestData: {
                oauth_tokens: [
                    {
                        id: 1,
                        user_id: 'TEST_USER_001',
                        api_key: 'test_key_001',
                        encrypted_secret: 'encrypted_secret_001',
                        state: 'test_state_001',
                        created_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 3600000).toISOString()
                    }
                ],
                users: [
                    {
                        id: 'TEST_USER_001',
                        username: 'testuser001',
                        email: 'test001@example.com',
                        created_at: new Date().toISOString()
                    }
                ]
            },
            
            // Network simulation data
            networkScenarios: {
                timeout: {
                    delay: 30000,
                    description: 'Simulate network timeout'
                },
                slow_connection: {
                    delay: 5000,
                    description: 'Simulate slow network connection'
                },
                intermittent_failure: {
                    failure_rate: 0.3,
                    description: 'Simulate intermittent network failures'
                }
            },
            
            // Error scenarios
            errorScenarios: [
                {
                    type: 'database_connection_error',
                    message: 'Unable to connect to database',
                    code: 'DB_CONNECTION_FAILED'
                },
                {
                    type: 'oauth_provider_error',
                    message: 'OAuth provider temporarily unavailable',
                    code: 'OAUTH_PROVIDER_ERROR'
                },
                {
                    type: 'rate_limit_error',
                    message: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED'
                }
            ],
            
            generated_at: new Date().toISOString()
        };

        await this.saveMockData();
        console.log('✅ Generated comprehensive mock data');
        return this.mockData;
    }

    generateTestUserId() {
        return `TEST_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    generateSessionId() {
        return `SESSION_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    }

    generateApiKey() {
        return `test_key_${crypto.randomBytes(8).toString('hex')}`;
    }

    generateApiSecret() {
        return `test_secret_${crypto.randomBytes(16).toString('hex')}`;
    }

    generateOAuthState() {
        return crypto.randomBytes(32).toString('hex');
    }

    async getTestDataForScenario(scenarioId) {
        const scenario = this.testScenarios.find(s => s.id === scenarioId);
        if (!scenario) {
            throw new Error(`Test scenario not found: ${scenarioId}`);
        }

        console.log(`📋 Retrieved test data for scenario: ${scenario.name}`);
        return scenario;
    }

    async getTestUsersBySession(sessionId) {
        return this.testUsers.filter(user => user.test_session_id === sessionId);
    }

    async cleanupTestData(options = {}) {
        console.log('🧹 Starting test data cleanup...');
        
        const now = new Date();
        let cleanedUsers = 0;
        let cleanedSessions = 0;

        // Cleanup expired test users
        if (options.cleanupUsers !== false) {
            const initialUserCount = this.testUsers.length;
            this.testUsers = this.testUsers.filter(user => {
                const cleanupTime = new Date(user.metadata.cleanup_after);
                return cleanupTime > now;
            });
            cleanedUsers = initialUserCount - this.testUsers.length;
            
            if (cleanedUsers > 0) {
                await this.saveTestUsers();
                console.log(`🗑️ Cleaned up ${cleanedUsers} expired test users`);
            }
        }

        // Cleanup expired test sessions
        if (options.cleanupSessions !== false) {
            const initialSessionCount = this.activeSessions.length;
            this.activeSessions = this.activeSessions.filter(session => {
                const cleanupTime = new Date(session.metadata.cleanup_scheduled);
                return cleanupTime > now || session.status === 'active';
            });
            cleanedSessions = initialSessionCount - this.activeSessions.length;
            
            if (cleanedSessions > 0) {
                await this.saveTestSessions();
                console.log(`🗑️ Cleaned up ${cleanedSessions} expired test sessions`);
            }
        }

        // Force cleanup if requested
        if (options.force) {
            this.testUsers = [];
            this.activeSessions = [];
            await this.saveTestUsers();
            await this.saveTestSessions();
            console.log('🗑️ Force cleanup completed - all test data removed');
        }

        console.log(`✅ Cleanup completed: ${cleanedUsers} users, ${cleanedSessions} sessions removed`);
        return { cleanedUsers, cleanedSessions };
    }

    async setupTestEnvironment(config = {}) {
        console.log('🔧 Setting up test environment...');
        
        const environment = {
            id: this.generateSessionId(),
            name: config.name || 'Test Environment',
            created_at: new Date().toISOString(),
            config: {
                createTestUsers: config.createTestUsers || 3,
                generateMockData: config.generateMockData !== false,
                setupScenarios: config.setupScenarios !== false,
                isolateData: config.isolateData !== false
            },
            resources: {
                testUsers: [],
                testSession: null,
                mockData: null
            }
        };

        try {
            // Create test session
            environment.resources.testSession = await this.createTestSession({
                name: `${environment.name} Session`,
                purpose: 'environment_setup',
                environment: 'test'
            });

            // Create test users
            for (let i = 0; i < environment.config.createTestUsers; i++) {
                const testUser = await this.createTestUser({
                    username: `env_user_${i + 1}`,
                    purpose: 'environment_testing',
                    test_session_id: environment.resources.testSession.id
                });
                environment.resources.testUsers.push(testUser);
            }

            // Generate mock data
            if (environment.config.generateMockData) {
                environment.resources.mockData = await this.generateMockData();
            }

            console.log(`✅ Test environment setup completed: ${environment.id}`);
            console.log(`   - Test Session: ${environment.resources.testSession.id}`);
            console.log(`   - Test Users: ${environment.resources.testUsers.length}`);
            console.log(`   - Mock Data: ${environment.config.generateMockData ? 'Generated' : 'Skipped'}`);

            return environment;

        } catch (error) {
            console.error('❌ Failed to setup test environment:', error.message);
            throw error;
        }
    }

    async teardownTestEnvironment(environmentId) {
        console.log(`🧹 Tearing down test environment: ${environmentId}`);
        
        try {
            // Find and cleanup related test users
            const environmentUsers = this.testUsers.filter(user => 
                user.test_session_id && user.test_session_id.includes(environmentId)
            );
            
            // Remove environment users
            this.testUsers = this.testUsers.filter(user => 
                !user.test_session_id || !user.test_session_id.includes(environmentId)
            );

            // Find and cleanup related sessions
            const environmentSessions = this.activeSessions.filter(session => 
                session.id.includes(environmentId)
            );
            
            // Remove environment sessions
            this.activeSessions = this.activeSessions.filter(session => 
                !session.id.includes(environmentId)
            );

            // Save updated data
            await this.saveTestUsers();
            await this.saveTestSessions();

            console.log(`✅ Environment teardown completed:`);
            console.log(`   - Removed ${environmentUsers.length} test users`);
            console.log(`   - Removed ${environmentSessions.length} test sessions`);

            return {
                removedUsers: environmentUsers.length,
                removedSessions: environmentSessions.length
            };

        } catch (error) {
            console.error('❌ Failed to teardown test environment:', error.message);
            throw error;
        }
    }

    async saveTestUsers() {
        await fs.writeFile(this.testUsersFile, JSON.stringify(this.testUsers, null, 2));
    }

    async saveTestScenarios() {
        await fs.writeFile(this.testScenariosFile, JSON.stringify(this.testScenarios, null, 2));
    }

    async saveMockData() {
        await fs.writeFile(this.mockDataFile, JSON.stringify(this.mockData, null, 2));
    }

    async saveTestSessions() {
        await fs.writeFile(this.testSessionsFile, JSON.stringify(this.activeSessions, null, 2));
    }

    async generateReport() {
        console.log('📊 Generating Test Data Management Report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                testUsers: this.testUsers.length,
                activeUsers: this.testUsers.filter(u => u.status === 'active').length,
                testScenarios: this.testScenarios.length,
                activeSessions: this.activeSessions.length,
                mockDataGenerated: Object.keys(this.mockData).length > 0
            },
            testUsers: this.testUsers.map(user => ({
                id: user.id,
                username: user.username,
                status: user.status,
                created_at: user.created_at,
                purpose: user.metadata.purpose
            })),
            testScenarios: this.testScenarios.map(scenario => ({
                id: scenario.id,
                name: scenario.name,
                category: scenario.category,
                priority: scenario.priority
            })),
            activeSessions: this.activeSessions.map(session => ({
                id: session.id,
                name: session.name,
                status: session.status,
                created_at: session.created_at,
                userCount: session.test_users.length
            })),
            recommendations: this.generateRecommendations()
        };

        // Save report
        await fs.writeFile(
            path.join(this.testDataDir, 'test-data-report.json'),
            JSON.stringify(report, null, 2)
        );

        // Generate summary
        const summary = this.generateSummaryReport(report);
        await fs.writeFile(
            path.join(this.testDataDir, 'test-data-summary.md'),
            summary
        );

        console.log('📄 Test Data Management reports saved:');
        console.log('  - test-data/test-data-report.json (detailed)');
        console.log('  - test-data/test-data-summary.md (summary)');

        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check for expired users
        const expiredUsers = this.testUsers.filter(user => {
            const cleanupTime = new Date(user.metadata.cleanup_after);
            return cleanupTime <= new Date();
        });
        
        if (expiredUsers.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'cleanup',
                issue: `${expiredUsers.length} expired test users found`,
                recommendation: 'Run cleanup to remove expired test users'
            });
        }

        // Check for long-running sessions
        const longRunningSessions = this.activeSessions.filter(session => {
            const created = new Date(session.created_at);
            const hoursSinceCreated = (new Date() - created) / (1000 * 60 * 60);
            return hoursSinceCreated > 24;
        });
        
        if (longRunningSessions.length > 0) {
            recommendations.push({
                priority: 'low',
                category: 'sessions',
                issue: `${longRunningSessions.length} long-running test sessions`,
                recommendation: 'Review and cleanup old test sessions'
            });
        }

        // Check mock data freshness
        if (this.mockData.generated_at) {
            const generated = new Date(this.mockData.generated_at);
            const daysSinceGenerated = (new Date() - generated) / (1000 * 60 * 60 * 24);
            
            if (daysSinceGenerated > 7) {
                recommendations.push({
                    priority: 'low',
                    category: 'mock_data',
                    issue: 'Mock data is over 7 days old',
                    recommendation: 'Regenerate mock data for fresh test scenarios'
                });
            }
        }

        return recommendations;
    }

    generateSummaryReport(report) {
        return `# Test Data Management Report

## Summary
- **Total Test Users**: ${report.summary.testUsers}
- **Active Test Users**: ${report.summary.activeUsers}
- **Test Scenarios**: ${report.summary.testScenarios}
- **Active Sessions**: ${report.summary.activeSessions}
- **Mock Data Generated**: ${report.summary.mockDataGenerated ? 'Yes' : 'No'}
- **Generated**: ${report.timestamp}

## Test Users
${report.testUsers.map(user => `
### ${user.username} (${user.id})
- **Status**: ${user.status}
- **Purpose**: ${user.purpose}
- **Created**: ${user.created_at}
`).join('')}

## Test Scenarios
${report.testScenarios.map(scenario => `
### ${scenario.name}
- **Category**: ${scenario.category}
- **Priority**: ${scenario.priority}
- **ID**: ${scenario.id}
`).join('')}

## Active Sessions
${report.activeSessions.map(session => `
### ${session.name}
- **Status**: ${session.status}
- **Users**: ${session.userCount}
- **Created**: ${session.created_at}
`).join('')}

## Recommendations
${report.recommendations.map(rec => `
### ${rec.priority.toUpperCase()} Priority - ${rec.category}
- **Issue**: ${rec.issue}
- **Recommendation**: ${rec.recommendation}
`).join('')}

---
Generated by Test Data Management System
`;
    }

    async runFullSetup() {
        console.log('🎯 Running Full Test Data Setup...');
        
        const initialized = await this.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize. Exiting...');
            return false;
        }

        try {
            // Setup test environment
            const environment = await this.setupTestEnvironment({
                name: 'OAuth Verification Test Environment',
                createTestUsers: 5,
                generateMockData: true,
                setupScenarios: true
            });

            // Generate comprehensive report
            const report = await this.generateReport();

            console.log('\n🎉 Full Test Data Setup Complete!');
            console.log(`📊 Environment ID: ${environment.id}`);
            console.log(`👥 Test Users Created: ${environment.resources.testUsers.length}`);
            console.log(`📋 Test Scenarios Available: ${this.testScenarios.length}`);
            console.log(`🎲 Mock Data Generated: Yes`);

            return {
                success: true,
                environment,
                report
            };

        } catch (error) {
            console.error('❌ Full setup failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// CLI execution
if (require.main === module) {
    const manager = new TestDataManager();
    
    const command = process.argv[2] || 'setup';
    
    switch (command) {
        case 'setup':
            manager.runFullSetup()
                .then(result => {
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('❌ Fatal error:', error);
                    process.exit(1);
                });
            break;
            
        case 'cleanup':
            manager.initialize()
                .then(() => manager.cleanupTestData({ force: process.argv.includes('--force') }))
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Cleanup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'report':
            manager.initialize()
                .then(() => manager.generateReport())
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Report generation failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node test-data-management.cjs [setup|cleanup|report]');
            console.log('  setup   - Initialize and setup test data (default)');
            console.log('  cleanup - Clean up expired test data (add --force for complete cleanup)');
            console.log('  report  - Generate test data management report');
            process.exit(1);
    }
}

module.exports = TestDataManager;