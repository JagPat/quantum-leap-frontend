#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

class LeakDetectionMonitor {
  constructor() {
    this.startTime = Date.now();
    this.measurements = [];
    this.isRunning = false;
    this.pid = process.pid;
  }

  start() {
    console.log('🔍 Starting rock solid leak detection...');
    console.log(`📊 Monitoring PID: ${this.pid}`);
    this.isRunning = true;
    
    this.measure();
    this.setupSignalHandlers();
  }

  stop() {
    console.log('🛑 Stopping leak detection...');
    this.isRunning = false;
    this.generateReport();
  }

  measure() {
    if (!this.isRunning) return;

    const memUsage = process.memoryUsage();
    const timestamp = Date.now() - this.startTime;
    
    // Get file descriptor count
    let fdCount = 0;
    try {
      const result = execSync(`lsof -p ${this.pid} 2>/dev/null | wc -l`, { encoding: 'utf8' });
      fdCount = parseInt(result.trim());
    } catch (e) {
      fdCount = 0;
    }
    
    this.measurements.push({
      timestamp,
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      fdCount,
      pid: this.pid
    });

    console.log(`📊 Memory: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB, FDs=${fdCount}`);

    setTimeout(() => this.measure(), 5000);
  }

  setupSignalHandlers() {
    process.on('SIGTERM', () => {
      this.stop();
      process.exit(0);
    });
  }

  generateReport() {
    const report = {
      duration: Date.now() - this.startTime,
      measurements: this.measurements,
      analysis: this.analyzeLeaks(),
      pid: this.pid,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync('leak-detection-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Leak detection report generated: leak-detection-report.json');
  }

  analyzeLeaks() {
    if (this.measurements.length < 2) return { status: 'insufficient_data' };

    const first = this.measurements[0];
    const last = this.measurements[this.measurements.length - 1];
    
    const rssGrowth = last.rss - first.rss;
    const heapGrowth = last.heapUsed - first.heapUsed;
    const fdGrowth = last.fdCount - first.fdCount;
    
    const status = rssGrowth > 50 * 1024 * 1024 || fdGrowth > 10 ? 'potential_leak' : 'stable';
    
    return {
      status,
      rssGrowthMB: Math.round(rssGrowth / 1024 / 1024),
      heapGrowthMB: Math.round(heapGrowth / 1024 / 1024),
      fdGrowth,
      measurements: this.measurements.length,
      finalRSS: Math.round(last.rss / 1024 / 1024),
      finalFDs: last.fdCount
    };
  }
}

if (require.main === module) {
  const monitor = new LeakDetectionMonitor();
  
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });

  monitor.start();
  
  setTimeout(() => {
    monitor.stop();
    process.exit(0);
  }, 15 * 60 * 1000);
}

module.exports = LeakDetectionMonitor;
