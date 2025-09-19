#!/usr/bin/env node

/**
 * Production Environment Health Dashboard
 * Real-time monitoring with performance metrics, alerts, and historical tracking
 */

const https = require('https');
const fs = require('fs');
const { performance } = require('perf_hooks');

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';
const DASHBOARD_INTERVAL = 30000; // 30 seconds
const HISTORY_FILE = 'health-dashboard-history.json';

// Dashboard state
const dashboard = {
  startTime: performance.now(),
  currentStatus: {},
  metrics: {
    totalChecks: 0,
    uptime: 0,
    avgResponseTime: 0,
    errorRate: 0,
    alerts: []
  },
  history: [],
  thresholds: {
    responseTime: 2000, // 2 seconds
    errorRate: 10, // 10%
    criticalServices: ['database', 'oauth', 'security']
  }
};

// Load historical data
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      dashboard.history = JSON.parse(data);
      console.log(`📊 Loaded ${dashboard.history.length} historical records`);
    }
  } catch (error) {
    console.log('📊 Starting with fresh history');
    dashboard.history = [];
  }
}

// Save historical data
function saveHistory() {
  try {
    // Keep only last 100 records
    if (dashboard.history.length > 100) {
      dashboard.history = dashboard.history.slice(-100);
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(dashboard.history, null, 2));
  } catch (error) {
    console.error('❌ Failed to save history:', error.message);
  }
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const url = new URL(path, BACKEND_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Health-Dashboard/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: jsonBody,
            responseTime: responseTime,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            responseTime: responseTime,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      reject({
        error: error.message,
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      reject({
        error: 'Request timeout',
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Collect health metrics
async function collectHealthMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    services: {},
    overall: {
      healthy: true,
      responseTime: 0,
      errors: 0
    }
  };

  const services = [
    { name: 'backend', endpoint: '/health', critical: true },
    { name: 'oauth', endpoint: '/api/modules/auth/broker/health', critical: true },
    { name: 'database', endpoint: '/api/modules/auth/broker/setup-oauth', method: 'POST', 
      data: { api_key: 'health_test', api_secret: 'health_test', user_id: 'health_test' }, critical: true },
    { name: 'security', endpoint: '/api/modules/auth/debug', critical: false }
  ];

  for (const service of services) {
    try {
      const response = await makeRequest(service.endpoint, service.method || 'GET', service.data);
      
      const isHealthy = service.name === 'database' 
        ? (response.status === 400 || response.status === 200) // Validation error or success is good
        : response.status === 200;
      
      metrics.services[service.name] = {
        healthy: isHealthy,
        status: response.status,
        responseTime: response.responseTime,
        timestamp: response.timestamp,
        critical: service.critical,
        error: isHealthy ? null : (response.data.error || response.data.message || 'Unknown error')
      };
      
      metrics.overall.responseTime += response.responseTime;
      if (!isHealthy) {
        metrics.overall.errors++;
        if (service.critical) {
          metrics.overall.healthy = false;
        }
      }
      
    } catch (error) {
      metrics.services[service.name] = {
        healthy: false,
        status: 0,
        responseTime: error.responseTime || 0,
        timestamp: error.timestamp,
        critical: service.critical,
        error: error.error
      };
      
      metrics.overall.errors++;
      if (service.critical) {
        metrics.overall.healthy = false;
      }
    }
  }

  metrics.overall.responseTime = metrics.overall.responseTime / services.length;
  metrics.overall.errorRate = (metrics.overall.errors / services.length) * 100;

  return metrics;
}

// Check for alerts
function checkAlerts(metrics) {
  const alerts = [];
  
  // Response time alerts
  if (metrics.overall.responseTime > dashboard.thresholds.responseTime) {
    alerts.push({
      type: 'WARNING',
      message: `High response time: ${Math.round(metrics.overall.responseTime)}ms`,
      threshold: dashboard.thresholds.responseTime,
      actual: Math.round(metrics.overall.responseTime),
      timestamp: metrics.timestamp
    });
  }
  
  // Error rate alerts
  if (metrics.overall.errorRate > dashboard.thresholds.errorRate) {
    alerts.push({
      type: 'CRITICAL',
      message: `High error rate: ${Math.round(metrics.overall.errorRate)}%`,
      threshold: dashboard.thresholds.errorRate,
      actual: Math.round(metrics.overall.errorRate),
      timestamp: metrics.timestamp
    });
  }
  
  // Service-specific alerts
  Object.entries(metrics.services).forEach(([serviceName, service]) => {
    if (!service.healthy && service.critical) {
      alerts.push({
        type: 'CRITICAL',
        message: `Critical service ${serviceName} is down: ${service.error}`,
        service: serviceName,
        timestamp: metrics.timestamp
      });
    }
  });
  
  return alerts;
}

// Display dashboard
function displayDashboard(metrics) {
  // Clear screen
  console.clear();
  
  console.log('🏥 Production Environment Health Dashboard');
  console.log('=========================================');
  console.log(`🌐 Monitoring: ${BACKEND_URL}`);
  console.log(`⏱️  Last Update: ${metrics.timestamp}`);
  console.log(`📊 Check #${dashboard.metrics.totalChecks}`);
  console.log('');
  
  // Overall status
  const statusIcon = metrics.overall.healthy ? '✅' : '🚨';
  const statusText = metrics.overall.healthy ? 'HEALTHY' : 'ISSUES DETECTED';
  console.log(`${statusIcon} Overall Status: ${statusText}`);
  console.log(`⚡ Avg Response Time: ${Math.round(metrics.overall.responseTime)}ms`);
  console.log(`📈 Error Rate: ${Math.round(metrics.overall.errorRate)}%`);
  console.log('');
  
  // Service status
  console.log('🔍 Service Status:');
  Object.entries(metrics.services).forEach(([name, service]) => {
    const icon = service.healthy ? '✅' : '❌';
    const critical = service.critical ? '🔴' : '🟡';
    console.log(`   ${icon} ${critical} ${name.padEnd(10)} | ${service.status} | ${Math.round(service.responseTime)}ms${service.error ? ` | ${service.error}` : ''}`);
  });
  console.log('');
  
  // Recent alerts
  const recentAlerts = dashboard.metrics.alerts.slice(-3);
  if (recentAlerts.length > 0) {
    console.log('🚨 Recent Alerts:');
    recentAlerts.forEach(alert => {
      const icon = alert.type === 'CRITICAL' ? '🔴' : '⚠️';
      console.log(`   ${icon} ${alert.message}`);
    });
    console.log('');
  }
  
  // Performance trends
  if (dashboard.history.length > 1) {
    const recent = dashboard.history.slice(-10);
    const avgResponseTime = recent.reduce((sum, h) => sum + h.overall.responseTime, 0) / recent.length;
    const avgErrorRate = recent.reduce((sum, h) => sum + h.overall.errorRate, 0) / recent.length;
    
    console.log('📊 Performance Trends (Last 10 checks):');
    console.log(`   ⚡ Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   📈 Avg Error Rate: ${Math.round(avgErrorRate)}%`);
    console.log('');
  }
  
  // Instructions
  console.log('💡 Dashboard Controls:');
  console.log('   Press Ctrl+C to stop monitoring');
  console.log('   Data is automatically saved to health-dashboard-history.json');
  console.log('');
}

// Update dashboard metrics
function updateDashboardMetrics(metrics, alerts) {
  dashboard.metrics.totalChecks++;
  dashboard.metrics.uptime = performance.now() - dashboard.startTime;
  
  // Update running averages
  const historyCount = dashboard.history.length;
  if (historyCount > 0) {
    dashboard.metrics.avgResponseTime = ((dashboard.metrics.avgResponseTime * historyCount) + metrics.overall.responseTime) / (historyCount + 1);
    dashboard.metrics.errorRate = ((dashboard.metrics.errorRate * historyCount) + metrics.overall.errorRate) / (historyCount + 1);
  } else {
    dashboard.metrics.avgResponseTime = metrics.overall.responseTime;
    dashboard.metrics.errorRate = metrics.overall.errorRate;
  }
  
  // Add new alerts
  dashboard.metrics.alerts.push(...alerts);
  
  // Keep only recent alerts (last 50)
  if (dashboard.metrics.alerts.length > 50) {
    dashboard.metrics.alerts = dashboard.metrics.alerts.slice(-50);
  }
  
  // Add to history
  dashboard.history.push(metrics);
  
  // Save history periodically
  if (dashboard.metrics.totalChecks % 10 === 0) {
    saveHistory();
  }
}

// Main dashboard function
async function runHealthDashboard() {
  console.log('🏥 Starting Production Environment Health Dashboard');
  console.log('=================================================');
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`⏱️  Check Interval: ${DASHBOARD_INTERVAL / 1000}s`);
  console.log(`🚀 Started at: ${new Date().toISOString()}`);
  console.log('');
  
  // Load historical data
  loadHistory();
  
  // Initial check
  console.log('🔍 Performing initial health check...');
  
  const runCheck = async () => {
    try {
      // Collect metrics
      const metrics = await collectHealthMetrics();
      
      // Check for alerts
      const alerts = checkAlerts(metrics);
      
      // Update dashboard
      updateDashboardMetrics(metrics, alerts);
      
      // Display dashboard
      displayDashboard(metrics);
      
    } catch (error) {
      console.error('❌ Dashboard check failed:', error.message);
    }
  };
  
  // Run initial check
  await runCheck();
  
  // Set up periodic monitoring
  const monitor = setInterval(runCheck, DASHBOARD_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping health dashboard...');
    clearInterval(monitor);
    saveHistory();
    
    console.log('📊 Final Dashboard Statistics:');
    console.log(`   Total Checks: ${dashboard.metrics.totalChecks}`);
    console.log(`   Uptime: ${Math.round(dashboard.metrics.uptime / 1000)}s`);
    console.log(`   Avg Response Time: ${Math.round(dashboard.metrics.avgResponseTime)}ms`);
    console.log(`   Avg Error Rate: ${Math.round(dashboard.metrics.errorRate)}%`);
    console.log(`   Total Alerts: ${dashboard.metrics.alerts.length}`);
    console.log(`   History Records: ${dashboard.history.length}`);
    console.log('');
    console.log('💾 Data saved to health-dashboard-history.json');
    console.log('🏁 Dashboard stopped');
    
    process.exit(0);
  });
  
  return dashboard;
}

// CLI interface
if (require.main === module) {
  runHealthDashboard().catch(error => {
    console.error('💥 Health dashboard failed:', error);
    process.exit(1);
  });
}

// Export for use in other scripts
module.exports = {
  runHealthDashboard,
  collectHealthMetrics,
  checkAlerts,
  dashboard
};