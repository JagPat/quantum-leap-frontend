#!/usr/bin/env node

/**
 * Monitoring Configuration Helper
 * 
 * Interactive tool for configuring continuous verification monitoring
 */

const fs = require('fs').promises;
const readline = require('readline');

class MonitoringConfigHelper {
    constructor() {
        this.configFile = './monitoring-config.json';
        this.config = null;
    }

    async initialize() {
        console.log('🔧 Monitoring Configuration Helper');
        console.log('==================================\n');
        
        try {
            const configData = await fs.readFile(this.configFile, 'utf8');
            this.config = JSON.parse(configData);
            console.log('📋 Loaded existing configuration');
        } catch (error) {
            console.log('📋 No existing configuration found, creating new one');
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            schedule: {
                enabled: true,
                interval: 300000, // 5 minutes
                cronExpression: null
            },
            thresholds: {
                successRate: 80,
                responseTime: 5000,
                errorRate: 10,
                consecutiveFailures: 3
            },
            notifications: {
                email: {
                    enabled: false,
                    smtp: {
                        host: 'smtp.gmail.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: '',
                            pass: ''
                        }
                    },
                    recipients: []
                },
                webhook: {
                    enabled: false,
                    url: '',
                    headers: {},
                    retries: 3
                },
                slack: {
                    enabled: false,
                    webhookUrl: '',
                    channel: '#alerts'
                }
            },
            verification: {
                url: 'https://quantumleap-production.up.railway.app',
                tests: ['health', 'oauth', 'security'],
                timeout: 60000,
                retries: 2
            }
        };
    }

    async runInteractive() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => {
            return new Promise((resolve) => {
                rl.question(prompt, resolve);
            });
        };

        try {
            console.log('🎛️ Interactive Configuration Setup\n');

            // Schedule Configuration
            console.log('📅 Schedule Configuration:');
            const intervalMinutes = await question(`Monitoring interval in minutes (current: ${this.config.schedule.interval / 60000}): `);
            if (intervalMinutes.trim()) {
                this.config.schedule.interval = parseInt(intervalMinutes) * 60000;
            }

            // Thresholds Configuration
            console.log('\n🎯 Threshold Configuration:');
            const successRate = await question(`Success rate threshold % (current: ${this.config.thresholds.successRate}): `);
            if (successRate.trim()) {
                this.config.thresholds.successRate = parseInt(successRate);
            }

            const responseTime = await question(`Response time threshold ms (current: ${this.config.thresholds.responseTime}): `);
            if (responseTime.trim()) {
                this.config.thresholds.responseTime = parseInt(responseTime);
            }

            const errorRate = await question(`Error rate threshold % (current: ${this.config.thresholds.errorRate}): `);
            if (errorRate.trim()) {
                this.config.thresholds.errorRate = parseInt(errorRate);
            }

            // Verification Configuration
            console.log('\n🧪 Verification Configuration:');
            const url = await question(`Production URL (current: ${this.config.verification.url}): `);
            if (url.trim()) {
                this.config.verification.url = url.trim();
            }

            const tests = await question(`Tests to run (current: ${this.config.verification.tests.join(', ')}): `);
            if (tests.trim()) {
                this.config.verification.tests = tests.split(',').map(t => t.trim());
            }

            // Notification Configuration
            console.log('\n📧 Notification Configuration:');
            
            // Webhook
            const enableWebhook = await question('Enable webhook notifications? (y/n): ');
            if (enableWebhook.toLowerCase() === 'y') {
                this.config.notifications.webhook.enabled = true;
                const webhookUrl = await question('Webhook URL: ');
                this.config.notifications.webhook.url = webhookUrl.trim();
                
                const webhookHeaders = await question('Custom headers (JSON format, optional): ');
                if (webhookHeaders.trim()) {
                    try {
                        this.config.notifications.webhook.headers = JSON.parse(webhookHeaders);
                    } catch (error) {
                        console.log('⚠️ Invalid JSON for headers, skipping');
                    }
                }
            }

            // Slack
            const enableSlack = await question('Enable Slack notifications? (y/n): ');
            if (enableSlack.toLowerCase() === 'y') {
                this.config.notifications.slack.enabled = true;
                const slackUrl = await question('Slack webhook URL: ');
                this.config.notifications.slack.webhookUrl = slackUrl.trim();
                
                const slackChannel = await question(`Slack channel (current: ${this.config.notifications.slack.channel}): `);
                if (slackChannel.trim()) {
                    this.config.notifications.slack.channel = slackChannel.trim();
                }
            }

            // Email (basic setup)
            const enableEmail = await question('Enable email notifications? (y/n): ');
            if (enableEmail.toLowerCase() === 'y') {
                console.log('📧 Email configuration requires SMTP setup');
                console.log('   Edit monitoring-config.json manually for detailed SMTP configuration');
                this.config.notifications.email.enabled = true;
                
                const recipients = await question('Email recipients (comma-separated): ');
                if (recipients.trim()) {
                    this.config.notifications.email.recipients = recipients.split(',').map(r => r.trim());
                }
            }

            // Save configuration
            await this.saveConfig();
            console.log('\n✅ Configuration saved successfully!');
            
            // Show summary
            this.showConfigSummary();

        } finally {
            rl.close();
        }
    }

    async saveConfig() {
        await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
    }

    showConfigSummary() {
        console.log('\n📊 Configuration Summary:');
        console.log('========================');
        console.log(`📅 Monitoring Interval: ${this.config.schedule.interval / 60000} minutes`);
        console.log(`🎯 Success Rate Threshold: ${this.config.thresholds.successRate}%`);
        console.log(`⚡ Response Time Threshold: ${this.config.thresholds.responseTime}ms`);
        console.log(`❌ Error Rate Threshold: ${this.config.thresholds.errorRate}%`);
        console.log(`🔗 Production URL: ${this.config.verification.url}`);
        console.log(`🧪 Tests: ${this.config.verification.tests.join(', ')}`);
        
        console.log('\n📧 Notifications:');
        console.log(`   Webhook: ${this.config.notifications.webhook.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Slack: ${this.config.notifications.slack.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Email: ${this.config.notifications.email.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        
        console.log('\n🚀 Next Steps:');
        console.log('   1. Run: node continuous-verification-monitor.cjs run');
        console.log('   2. Start monitoring: node continuous-verification-monitor.cjs start');
        console.log('   3. Interactive mode: node continuous-verification-monitor.cjs');
    }

    async showCurrentConfig() {
        console.log('\n📋 Current Configuration:');
        console.log('========================');
        console.log(JSON.stringify(this.config, null, 2));
    }

    async createPresets() {
        console.log('🎛️ Creating Configuration Presets...\n');
        
        const presets = {
            development: {
                ...this.getDefaultConfig(),
                schedule: { enabled: true, interval: 600000 }, // 10 minutes
                thresholds: {
                    successRate: 70,
                    responseTime: 10000,
                    errorRate: 20,
                    consecutiveFailures: 5
                },
                verification: {
                    url: 'http://localhost:3000',
                    tests: ['health', 'oauth'],
                    timeout: 30000,
                    retries: 1
                }
            },
            staging: {
                ...this.getDefaultConfig(),
                schedule: { enabled: true, interval: 300000 }, // 5 minutes
                thresholds: {
                    successRate: 80,
                    responseTime: 7000,
                    errorRate: 15,
                    consecutiveFailures: 3
                },
                verification: {
                    url: 'https://staging.example.com',
                    tests: ['health', 'oauth', 'security'],
                    timeout: 45000,
                    retries: 2
                }
            },
            production: {
                ...this.getDefaultConfig(),
                schedule: { enabled: true, interval: 180000 }, // 3 minutes
                thresholds: {
                    successRate: 95,
                    responseTime: 3000,
                    errorRate: 5,
                    consecutiveFailures: 2
                },
                verification: {
                    url: 'https://quantumleap-production.up.railway.app',
                    tests: ['health', 'oauth', 'security', 'end-to-end'],
                    timeout: 60000,
                    retries: 3
                },
                notifications: {
                    ...this.getDefaultConfig().notifications,
                    webhook: { enabled: true, url: 'https://hooks.slack.com/your-webhook' },
                    slack: { enabled: true, webhookUrl: 'https://hooks.slack.com/your-webhook', channel: '#production-alerts' }
                }
            }
        };

        // Save presets
        for (const [name, config] of Object.entries(presets)) {
            await fs.writeFile(`monitoring-config-${name}.json`, JSON.stringify(config, null, 2));
            console.log(`✅ Created ${name} preset: monitoring-config-${name}.json`);
        }

        console.log('\n📋 Preset Usage:');
        console.log('   cp monitoring-config-development.json monitoring-config.json');
        console.log('   cp monitoring-config-staging.json monitoring-config.json');
        console.log('   cp monitoring-config-production.json monitoring-config.json');
    }
}

// CLI execution
if (require.main === module) {
    const helper = new MonitoringConfigHelper();
    const command = process.argv[2] || 'interactive';
    
    helper.initialize().then(async () => {
        switch (command) {
            case 'interactive':
                await helper.runInteractive();
                break;
            case 'show':
                await helper.showCurrentConfig();
                break;
            case 'presets':
                await helper.createPresets();
                break;
            case 'summary':
                helper.showConfigSummary();
                break;
            default:
                console.log('Usage: node monitoring-config-helper.cjs [interactive|show|presets|summary]');
                console.log('  interactive - Interactive configuration setup (default)');
                console.log('  show       - Show current configuration');
                console.log('  presets    - Create configuration presets');
                console.log('  summary    - Show configuration summary');
        }
    }).catch(error => {
        console.error('❌ Configuration helper failed:', error);
        process.exit(1);
    });
}

module.exports = MonitoringConfigHelper;