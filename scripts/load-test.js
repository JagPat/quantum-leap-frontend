#!/usr/bin/env node

const http = require('http');
const https = require('https');

class LoadTester {
  constructor(url, options = {}) {
    this.url = url;
    this.rps = options.rps || 100;
    this.duration = options.duration || 300000;
    this.results = [];
    this.isRunning = false;
  }

  async start() {
    console.log(`🚀 Starting load test: ${this.rps} RPS for ${this.duration/1000}s`);
    this.isRunning = true;
    this.startTime = Date.now();
    
    this.monitor();
    
    const interval = 1000 / this.rps;
    
    for (let i = 0; i < this.rps; i++) {
      setTimeout(() => {
        if (this.isRunning) {
          this.makeRequest();
        }
      }, i * interval);
    }
    
    setTimeout(() => {
      this.stop();
    }, this.duration);
  }

  makeRequest() {
    const startTime = Date.now();
    const url = new URL(this.url);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: 10000
    }, (res) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.push({
        timestamp: startTime,
        duration,
        statusCode: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 300
      });
      
      res.on('data', () => {});
    });
    
    req.on('error', (err) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.push({
        timestamp: startTime,
        duration,
        statusCode: 0,
        success: false,
        error: err.message
      });
    });
    
    req.end();
  }

  monitor() {
    if (!this.isRunning) return;
    
    const now = Date.now();
    const recentResults = this.results.filter(r => now - r.timestamp < 10000);
    const successRate = recentResults.length > 0 ? 
      (recentResults.filter(r => r.success).length / recentResults.length) * 100 : 0;
    const avgDuration = recentResults.length > 0 ?
      recentResults.reduce((sum, r) => sum + r.duration, 0) / recentResults.length : 0;
    
    console.log(`📊 Load Test: ${recentResults.length} req/s, ${successRate.toFixed(1)}% success, ${avgDuration.toFixed(0)}ms avg`);
    
    setTimeout(() => this.monitor(), 10000);
  }

  stop() {
    console.log('🛑 Stopping load test...');
    this.isRunning = false;
    this.generateReport();
  }

  generateReport() {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const successRate = (successfulRequests / totalRequests) * 100;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    
    const report = {
      summary: {
        totalRequests,
        successfulRequests,
        successRate,
        avgDuration,
        duration: Date.now() - this.startTime
      },
      results: this.results
    };

    require('fs').writeFileSync('load-test-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Load test report generated: load-test-report.json');
  }
}

module.exports = LoadTester;
