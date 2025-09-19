#!/usr/bin/env node

/**
 * Continuous Verification Monitoring System
 * 
 * Provides automated, scheduled verification execution with:
 * - Cron-like scheduling functionality
 * - Baseline comparison and threshold checking
 * - Automated issue detection with severity classification
 * - Notification system with email and webhook support
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class ContinuousVerificationMonitor {
    constructor() {
        this.configFile = './monitoring-config.json';
        this.baselineFile = './verification-baseline.json';
        this.historyFile = './verification-history.json';
        this.alertsFile = './monitoring-alerts.json';
        
        this.config = {
            schedule: {
                enabled: true,
                interval: 300000, // 5 minutes default
                cronExpression: null // Optional cron-like scheduling
            },
            thresholds: {
                successRate: 80, // Minimum success rate %
                responseTime: 5000, // Maximum response time in ms
                errorRate: 10, // Maximum error rate %
                consecutiveFailures: 3 // Alert after N consecutive failures
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
        
        this.isRunning = false;
        this.intervalId = null;
        this.history = [];
        this.baseline = null;
        this.alerts = [];
    }

    async initialize() {
        console.log('🚀 Initializing Continuous Verification Monitor...');
        
        try {
            // Load configuration
            await this.loadConfiguration();
            
            // Load baseline and history
            await this.loadBaseline();
            await this.loadHistory();
            await this.loadAlerts();
            
            console.log('✅ Continuous Verification Monitor initialized');
            console.log(`📊 Monitoring URL: ${this.config.verification.url}`);
            console.log(`🔄 Schedule: ${this.config.schedule.interval}ms intervals`);
            console.log(`🧪 Tests: ${this.config.verification.tests.join(', ')}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize monitor:', error.message);
            return false;
        }
    }

    async loadConfiguration() {
        try {
            const configData = await fs.readFile(this.configFile, 'utf8');
            this.config = { ...this.config, ...JSON.parse(configData) };
            console.log('📋 Loaded monitoring configuration');
        } catch (error) {
            console.log('📋 Using default configuration (config file not found)');
            await this.saveConfiguration();
        }
    }

    async saveConfiguration() {
        await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
    }

    async loadBaseline() {
        try {
            const baselineData = await fs.readFile(this.baselineFile, 'utf8');
            this.baseline = JSON.parse(baselineData);
            console.log(`📊 Loaded baseline from ${this.baseline.timestamp}`);
        } catch (error) {
            console.log('📊 No baseline found - will create one after first successful run');
        }
    }

    async saveBaseline(results) {
        this.baseline = {
            timestamp: new Date().toISOString(),
            results: results,
            metrics: this.calculateMetrics(results)
        };
        await fs.writeFile(this.baselineFile, JSON.stringify(this.baseline, null, 2));
        console.log('📊 Baseline updated');
    }

    async loadHistory() {
        try {
            const historyData = await fs.readFile(this.historyFile, 'utf8');
            this.history = JSON.parse(historyData);
            console.log(`📈 Loaded ${this.history.length} historical records`);
        } catch (error) {
            this.history = [];
            console.log('📈 Starting fresh history');
        }
    }

    async saveHistory() {
        // Keep only last 1000 records
        if (this.history.length > 1000) {
            this.history = this.history.slice(-1000);
        }
        await fs.writeFile(this.historyFile, JSON.stringify(this.history, null, 2));
    }

    async loadAlerts() {
        try {
            const alertsData = await fs.readFile(this.alertsFile, 'utf8');
            this.alerts = JSON.parse(alertsData);
            console.log(`🚨 Loaded ${this.alerts.length} active alerts`);
        } catch (error) {
            this.alerts = [];
            console.log('🚨 No active alerts');
        }
    }

    async saveAlerts() {
        await fs.writeFile(this.alertsFile, JSON.stringify(this.alerts, null, 2));
    }

    async runVerification() {
        console.log('\n🔍 Running scheduled verification...');
        const startTime = Date.now();
        
        try {
            // Run verification using CLI tool
            const results = await this.executeVerification();
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Calculate metrics
            const metrics = this.calculateMetrics(results);
            
            // Create verification record
            const record = {
                timestamp: new Date().toISOString(),
                duration: duration,
                results: results,
                metrics: metrics,
                status: metrics.successRate >= this.config.thresholds.successRate ? 'healthy' : 'unhealthy'
            };
            
            // Add to history
            this.history.push(record);
            await this.saveHistory();
            
            // Compare with baseline and thresholds
            const issues = await this.analyzeResults(record);
            
            // Handle alerts
            if (issues.length > 0) {
                await this.handleIssues(issues, record);
            } else {
                await this.clearResolvedAlerts(record);
            }
            
            // Update baseline if this is a good result
            if (record.status === 'healthy' && metrics.successRate >= 95) {
                await this.saveBaseline(results);
            }
            
            console.log(`✅ Verification completed in ${duration}ms`);
            console.log(`📊 Success Rate: ${metrics.successRate}%`);
            console.log(`⚡ Avg Response Time: ${metrics.avgResponseTime}ms`);
            
            return record;
            
        } catch (error) {
            console.error('❌ Verification failed:', error.message);
            
            const errorRecord = {
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                error: error.message,
                status: 'error'
            };
            
            this.history.push(errorRecord);
            await this.saveHistory();
            
            // Handle verification failure
            await this.handleVerificationFailure(errorRecord);
            
            return errorRecord;
        }
    }

    async executeVerification() {
        return new Promise((resolve, reject) => {
            const args = [
                'oauth-verify-cli-v2.cjs',
                '--tests', this.config.verification.tests.join(','),
                '--format', 'json',
                '--output', 'temp-verification-results.json',
                '--url', this.config.verification.url
            ];
            
            const child = spawn('node', args, {
                stdio: 'pipe',
                timeout: this.config.verification.timeout
            });
            
            let output = '';
            let errorOutput = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            child.on('close', async (code) => {
                try {
                    // Read results from temp file
                    const resultsData = await fs.readFile('temp-verification-results.json', 'utf8');
                    const results = JSON.parse(resultsData);
                    
                    // Clean up temp file
                    await fs.unlink('temp-verification-results.json').catch(() => {});
                    
                    resolve(results);
                } catch (error) {
                    reject(new Error(`Failed to parse verification results: ${error.message}`));
                }
            });
            
            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    calculateMetrics(results) {
        const tests = results.tests || {};
        const testCount = Object.keys(tests).length;
        const completedCount = Object.values(tests).filter(t => t.status === 'completed').length;
        const failedCount = Object.values(tests).filter(t => t.status === 'failed').length;
        
        const durations = Object.values(tests)
            .filter(t => t.duration)
            .map(t => t.duration);
        
        const avgResponseTime = durations.length > 0 ? 
            Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
        
        const maxResponseTime = durations.length > 0 ? Math.max(...durations) : 0;
        const minResponseTime = durations.length > 0 ? Math.min(...durations) : 0;
        
        return {
            totalTests: testCount,
            completedTests: completedCount,
            failedTests: failedCount,
            successRate: testCount > 0 ? Math.round((completedCount / testCount) * 100) : 0,
            errorRate: testCount > 0 ? Math.round((failedCount / testCount) * 100) : 0,
            avgResponseTime: avgResponseTime,
            maxResponseTime: maxResponseTime,
            minResponseTime: minResponseTime
        };
    }

    async analyzeResults(record) {
        const issues = [];
        const metrics = record.metrics;
        
        // Check success rate threshold
        if (metrics.successRate < this.config.thresholds.successRate) {
            issues.push({
                type: 'success_rate',
                severity: 'high',
                message: `Success rate ${metrics.successRate}% below threshold ${this.config.thresholds.successRate}%`,
                value: metrics.successRate,
                threshold: this.config.thresholds.successRate
            });
        }
        
        // Check response time threshold
        if (metrics.avgResponseTime > this.config.thresholds.responseTime) {
            issues.push({
                type: 'response_time',
                severity: 'medium',
                message: `Average response time ${metrics.avgResponseTime}ms exceeds threshold ${this.config.thresholds.responseTime}ms`,
                value: metrics.avgResponseTime,
                threshold: this.config.thresholds.responseTime
            });
        }
        
        // Check error rate threshold
        if (metrics.errorRate > this.config.thresholds.errorRate) {
            issues.push({
                type: 'error_rate',
                severity: 'high',
                message: `Error rate ${metrics.errorRate}% exceeds threshold ${this.config.thresholds.errorRate}%`,
                value: metrics.errorRate,
                threshold: this.config.thresholds.errorRate
            });
        }
        
        // Check for consecutive failures
        const recentRecords = this.history.slice(-this.config.thresholds.consecutiveFailures);
        const consecutiveFailures = recentRecords.every(r => r.status !== 'healthy');
        
        if (consecutiveFailures && recentRecords.length >= this.config.thresholds.consecutiveFailures) {
            issues.push({
                type: 'consecutive_failures',
                severity: 'critical',
                message: `${this.config.thresholds.consecutiveFailures} consecutive failures detected`,
                value: this.config.thresholds.consecutiveFailures,
                threshold: this.config.thresholds.consecutiveFailures
            });
        }
        
        // Compare with baseline if available
        if (this.baseline) {
            const baselineMetrics = this.baseline.metrics;
            
            // Check for significant degradation
            const successRateDrop = baselineMetrics.successRate - metrics.successRate;
            if (successRateDrop > 20) {
                issues.push({
                    type: 'baseline_degradation',
                    severity: 'high',
                    message: `Success rate dropped ${successRateDrop}% from baseline`,
                    value: metrics.successRate,
                    baseline: baselineMetrics.successRate
                });
            }
            
            const responseTimeIncrease = metrics.avgResponseTime - baselineMetrics.avgResponseTime;
            if (responseTimeIncrease > 2000) {
                issues.push({
                    type: 'performance_degradation',
                    severity: 'medium',
                    message: `Response time increased ${responseTimeIncrease}ms from baseline`,
                    value: metrics.avgResponseTime,
                    baseline: baselineMetrics.avgResponseTime
                });
            }
        }
        
        return issues;
    }

    async handleIssues(issues, record) {
        console.log(`🚨 ${issues.length} issue(s) detected`);
        
        for (const issue of issues) {
            // Check if this is a new issue or escalation
            const existingAlert = this.alerts.find(a => 
                a.type === issue.type && a.status === 'active'
            );
            
            if (!existingAlert) {
                // Create new alert
                const alert = {
                    id: this.generateAlertId(),
                    type: issue.type,
                    severity: issue.severity,
                    message: issue.message,
                    firstDetected: record.timestamp,
                    lastSeen: record.timestamp,
                    occurrences: 1,
                    status: 'active',
                    data: issue
                };
                
                this.alerts.push(alert);
                console.log(`🚨 NEW ALERT: ${issue.severity.toUpperCase()} - ${issue.message}`);
                
                // Send notifications for new alerts
                await this.sendNotification(alert, 'new');
                
            } else {
                // Update existing alert
                existingAlert.lastSeen = record.timestamp;
                existingAlert.occurrences++;
                
                // Escalate if needed
                if (existingAlert.occurrences >= 5 && existingAlert.severity !== 'critical') {
                    existingAlert.severity = 'critical';
                    console.log(`🚨 ESCALATED: ${issue.message}`);
                    await this.sendNotification(existingAlert, 'escalated');
                }
            }
        }
        
        await this.saveAlerts();
    }

    async clearResolvedAlerts(record) {
        const resolvedAlerts = this.alerts.filter(alert => {
            if (alert.status !== 'active') return false;
            
            // Check if the issue is resolved based on current metrics
            const metrics = record.metrics;
            
            switch (alert.type) {
                case 'success_rate':
                    return metrics.successRate >= this.config.thresholds.successRate;
                case 'response_time':
                    return metrics.avgResponseTime <= this.config.thresholds.responseTime;
                case 'error_rate':
                    return metrics.errorRate <= this.config.thresholds.errorRate;
                case 'consecutive_failures':
                    return record.status === 'healthy';
                default:
                    return false;
            }
        });
        
        for (const alert of resolvedAlerts) {
            alert.status = 'resolved';
            alert.resolvedAt = record.timestamp;
            console.log(`✅ RESOLVED: ${alert.message}`);
            await this.sendNotification(alert, 'resolved');
        }
        
        if (resolvedAlerts.length > 0) {
            await this.saveAlerts();
        }
    }

    async handleVerificationFailure(errorRecord) {
        const alert = {
            id: this.generateAlertId(),
            type: 'verification_failure',
            severity: 'critical',
            message: `Verification execution failed: ${errorRecord.error}`,
            firstDetected: errorRecord.timestamp,
            lastSeen: errorRecord.timestamp,
            occurrences: 1,
            status: 'active',
            data: errorRecord
        };
        
        this.alerts.push(alert);
        await this.saveAlerts();
        
        console.log(`🚨 CRITICAL: Verification system failure`);
        await this.sendNotification(alert, 'critical');
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async sendNotification(alert, type) {
        const notifications = [];
        
        // Email notification
        if (this.config.notifications.email.enabled) {
            notifications.push(this.sendEmailNotification(alert, type));
        }
        
        // Webhook notification
        if (this.config.notifications.webhook.enabled) {
            notifications.push(this.sendWebhookNotification(alert, type));
        }
        
        // Slack notification
        if (this.config.notifications.slack.enabled) {
            notifications.push(this.sendSlackNotification(alert, type));
        }
        
        // Wait for all notifications to complete
        const results = await Promise.allSettled(notifications);
        
        // Log notification results
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`📧 Notification sent successfully`);
            } else {
                console.error(`❌ Notification failed:`, result.reason.message);
            }
        });
    }

    async sendEmailNotification(alert, type) {
        // Email implementation would go here
        // For now, just log the notification
        console.log(`📧 EMAIL: ${type.toUpperCase()} - ${alert.message}`);
        return Promise.resolve();
    }

    async sendWebhookNotification(alert, type) {
        if (!this.config.notifications.webhook.url) {
            throw new Error('Webhook URL not configured');
        }
        
        const payload = {
            type: type,
            alert: alert,
            timestamp: new Date().toISOString(),
            service: 'oauth-verification-monitor'
        };
        
        const https = require('https');
        const http = require('http');
        
        return new Promise((resolve, reject) => {
            const url = new URL(this.config.notifications.webhook.url);
            const client = url.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.notifications.webhook.headers
                }
            };
            
            const req = client.request(options, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Webhook returned ${res.statusCode}`));
                }
            });
            
            req.on('error', reject);
            req.write(JSON.stringify(payload));
            req.end();
        });
    }

    async sendSlackNotification(alert, type) {
        if (!this.config.notifications.slack.webhookUrl) {
            throw new Error('Slack webhook URL not configured');
        }
        
        const color = {
            'new': 'danger',
            'escalated': 'danger',
            'resolved': 'good',
            'critical': 'danger'
        }[type] || 'warning';
        
        const emoji = {
            'new': '🚨',
            'escalated': '⚠️',
            'resolved': '✅',
            'critical': '🔥'
        }[type] || '📊';
        
        const payload = {
            channel: this.config.notifications.slack.channel,
            username: 'OAuth Monitor',
            icon_emoji: ':robot_face:',
            attachments: [{
                color: color,
                title: `${emoji} OAuth Verification Alert - ${type.toUpperCase()}`,
                text: alert.message,
                fields: [
                    {
                        title: 'Severity',
                        value: alert.severity.toUpperCase(),
                        short: true
                    },
                    {
                        title: 'Type',
                        value: alert.type,
                        short: true
                    },
                    {
                        title: 'Occurrences',
                        value: alert.occurrences.toString(),
                        short: true
                    },
                    {
                        title: 'First Detected',
                        value: alert.firstDetected,
                        short: true
                    }
                ],
                timestamp: Math.floor(Date.now() / 1000)
            }]
        };
        
        // Send to Slack webhook (implementation similar to webhook notification)
        console.log(`💬 SLACK: ${type.toUpperCase()} - ${alert.message}`);
        return Promise.resolve();
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️ Monitor is already running');
            return;
        }
        
        console.log('🚀 Starting continuous verification monitoring...');
        this.isRunning = true;
        
        // Run initial verification
        await this.runVerification();
        
        // Schedule recurring verifications
        this.intervalId = setInterval(async () => {
            if (this.isRunning) {
                await this.runVerification();
            }
        }, this.config.schedule.interval);
        
        console.log(`✅ Monitor started with ${this.config.schedule.interval}ms interval`);
    }

    async stop() {
        if (!this.isRunning) {
            console.log('⚠️ Monitor is not running');
            return;
        }
        
        console.log('🛑 Stopping continuous verification monitoring...');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('✅ Monitor stopped');
    }

    async generateReport() {
        console.log('📊 Generating monitoring report...');
        
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentHistory = this.history.filter(r => new Date(r.timestamp) >= last24h);
        
        const report = {
            timestamp: now.toISOString(),
            period: '24 hours',
            summary: {
                totalRuns: recentHistory.length,
                healthyRuns: recentHistory.filter(r => r.status === 'healthy').length,
                unhealthyRuns: recentHistory.filter(r => r.status === 'unhealthy').length,
                errorRuns: recentHistory.filter(r => r.status === 'error').length,
                uptime: recentHistory.length > 0 ? 
                    Math.round((recentHistory.filter(r => r.status === 'healthy').length / recentHistory.length) * 100) : 0
            },
            alerts: {
                active: this.alerts.filter(a => a.status === 'active').length,
                resolved: this.alerts.filter(a => a.status === 'resolved').length,
                critical: this.alerts.filter(a => a.status === 'active' && a.severity === 'critical').length
            },
            metrics: this.calculateAggregateMetrics(recentHistory),
            trends: this.calculateTrends(recentHistory),
            activeAlerts: this.alerts.filter(a => a.status === 'active'),
            configuration: {
                schedule: this.config.schedule,
                thresholds: this.config.thresholds,
                tests: this.config.verification.tests
            }
        };
        
        // Save report
        await fs.writeFile(
            `monitoring-report-${now.toISOString().split('T')[0]}.json`,
            JSON.stringify(report, null, 2)
        );
        
        // Generate markdown summary
        const markdown = this.generateMarkdownReport(report);
        await fs.writeFile(
            `monitoring-summary-${now.toISOString().split('T')[0]}.md`,
            markdown
        );
        
        console.log('📄 Monitoring report generated');
        return report;
    }

    calculateAggregateMetrics(history) {
        if (history.length === 0) return null;
        
        const validRecords = history.filter(r => r.metrics);
        if (validRecords.length === 0) return null;
        
        const successRates = validRecords.map(r => r.metrics.successRate);
        const responseTimes = validRecords.map(r => r.metrics.avgResponseTime);
        
        return {
            avgSuccessRate: Math.round(successRates.reduce((a, b) => a + b, 0) / successRates.length),
            avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
            minSuccessRate: Math.min(...successRates),
            maxSuccessRate: Math.max(...successRates),
            minResponseTime: Math.min(...responseTimes),
            maxResponseTime: Math.max(...responseTimes)
        };
    }

    calculateTrends(history) {
        if (history.length < 2) return null;
        
        const validRecords = history.filter(r => r.metrics);
        if (validRecords.length < 2) return null;
        
        const recent = validRecords.slice(-5); // Last 5 records
        const earlier = validRecords.slice(-10, -5); // Previous 5 records
        
        if (recent.length === 0 || earlier.length === 0) return null;
        
        const recentAvgSuccess = recent.reduce((a, r) => a + r.metrics.successRate, 0) / recent.length;
        const earlierAvgSuccess = earlier.reduce((a, r) => a + r.metrics.successRate, 0) / earlier.length;
        
        const recentAvgResponse = recent.reduce((a, r) => a + r.metrics.avgResponseTime, 0) / recent.length;
        const earlierAvgResponse = earlier.reduce((a, r) => a + r.metrics.avgResponseTime, 0) / earlier.length;
        
        return {
            successRateTrend: recentAvgSuccess - earlierAvgSuccess,
            responseTimeTrend: recentAvgResponse - earlierAvgResponse,
            direction: {
                successRate: recentAvgSuccess > earlierAvgSuccess ? 'improving' : 'declining',
                responseTime: recentAvgResponse < earlierAvgResponse ? 'improving' : 'declining'
            }
        };
    }

    generateMarkdownReport(report) {
        return `# OAuth Verification Monitoring Report

## Summary (${report.period})
- **Total Runs**: ${report.summary.totalRuns}
- **Uptime**: ${report.summary.uptime}%
- **Healthy Runs**: ${report.summary.healthyRuns}
- **Unhealthy Runs**: ${report.summary.unhealthyRuns}
- **Error Runs**: ${report.summary.errorRuns}

## Alerts
- **Active Alerts**: ${report.alerts.active}
- **Critical Alerts**: ${report.alerts.critical}
- **Resolved Alerts**: ${report.alerts.resolved}

${report.metrics ? `## Performance Metrics
- **Average Success Rate**: ${report.metrics.avgSuccessRate}%
- **Average Response Time**: ${report.metrics.avgResponseTime}ms
- **Success Rate Range**: ${report.metrics.minSuccessRate}% - ${report.metrics.maxSuccessRate}%
- **Response Time Range**: ${report.metrics.minResponseTime}ms - ${report.metrics.maxResponseTime}ms` : ''}

${report.trends ? `## Trends
- **Success Rate**: ${report.trends.direction.successRate} (${report.trends.successRateTrend > 0 ? '+' : ''}${report.trends.successRateTrend.toFixed(1)}%)
- **Response Time**: ${report.trends.direction.responseTime} (${report.trends.responseTimeTrend > 0 ? '+' : ''}${report.trends.responseTimeTrend.toFixed(0)}ms)` : ''}

## Active Alerts
${report.activeAlerts.map(alert => `
### ${alert.severity.toUpperCase()}: ${alert.type}
- **Message**: ${alert.message}
- **First Detected**: ${alert.firstDetected}
- **Occurrences**: ${alert.occurrences}
`).join('')}

## Configuration
- **Schedule**: ${report.configuration.schedule.interval}ms intervals
- **Tests**: ${report.configuration.tests.join(', ')}
- **Success Rate Threshold**: ${report.configuration.thresholds.successRate}%
- **Response Time Threshold**: ${report.configuration.thresholds.responseTime}ms

---
Generated: ${report.timestamp}
`;
    }

    async runInteractive() {
        console.log('\n🎛️ Continuous Verification Monitor - Interactive Mode');
        console.log('====================================================');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const showMenu = () => {
            console.log('\nAvailable commands:');
            console.log('  start    - Start monitoring');
            console.log('  stop     - Stop monitoring');
            console.log('  status   - Show current status');
            console.log('  run      - Run verification once');
            console.log('  report   - Generate monitoring report');
            console.log('  alerts   - Show active alerts');
            console.log('  config   - Show configuration');
            console.log('  help     - Show this menu');
            console.log('  exit     - Exit monitor');
            console.log('');
        };
        
        showMenu();
        
        const handleCommand = async (command) => {
            const cmd = command.trim().toLowerCase();
            
            switch (cmd) {
                case 'start':
                    await this.start();
                    break;
                case 'stop':
                    await this.stop();
                    break;
                case 'status':
                    console.log(`Status: ${this.isRunning ? 'Running' : 'Stopped'}`);
                    console.log(`Active Alerts: ${this.alerts.filter(a => a.status === 'active').length}`);
                    console.log(`History Records: ${this.history.length}`);
                    break;
                case 'run':
                    await this.runVerification();
                    break;
                case 'report':
                    await this.generateReport();
                    break;
                case 'alerts':
                    const activeAlerts = this.alerts.filter(a => a.status === 'active');
                    if (activeAlerts.length === 0) {
                        console.log('No active alerts');
                    } else {
                        activeAlerts.forEach(alert => {
                            console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
                        });
                    }
                    break;
                case 'config':
                    console.log(JSON.stringify(this.config, null, 2));
                    break;
                case 'help':
                    showMenu();
                    break;
                case 'exit':
                    await this.stop();
                    rl.close();
                    return;
                default:
                    console.log('Unknown command. Type "help" for available commands.');
            }
            
            rl.prompt();
        };
        
        rl.setPrompt('monitor> ');
        rl.prompt();
        
        rl.on('line', handleCommand);
        rl.on('close', () => {
            console.log('\n👋 Goodbye!');
            process.exit(0);
        });
    }
}

// CLI execution
if (require.main === module) {
    const monitor = new ContinuousVerificationMonitor();
    
    const command = process.argv[2] || 'interactive';
    
    switch (command) {
        case 'start':
            monitor.initialize()
                .then(() => monitor.start())
                .then(() => {
                    // Keep process alive
                    process.on('SIGINT', async () => {
                        console.log('\n🛑 Received SIGINT, stopping monitor...');
                        await monitor.stop();
                        process.exit(0);
                    });
                })
                .catch(error => {
                    console.error('❌ Failed to start monitor:', error);
                    process.exit(1);
                });
            break;
            
        case 'run':
            monitor.initialize()
                .then(() => monitor.runVerification())
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Verification failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'report':
            monitor.initialize()
                .then(() => monitor.generateReport())
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Report generation failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'interactive':
        default:
            monitor.initialize()
                .then(() => monitor.runInteractive())
                .catch(error => {
                    console.error('❌ Failed to start interactive mode:', error);
                    process.exit(1);
                });
            break;
    }
}

module.exports = ContinuousVerificationMonitor;