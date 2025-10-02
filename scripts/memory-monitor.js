#!/usr/bin/env node

const fs = require('fs');

class MemoryMonitor {
  constructor() {
    this.startTime = Date.now();
    this.measurements = [];
    this.isRunning = false;
  }

  start() {
    console.log('🔍 Starting memory leak detection...');
    this.isRunning = true;
    this.measure();
  }

  stop() {
    console.log('🛑 Stopping memory leak detection...');
    this.isRunning = false;
    this.generateReport();
  }

  measure() {
    if (!this.isRunning) return;

    const memUsage = process.memoryUsage();
    const timestamp = Date.now() - this.startTime;
    
    this.measurements.push({
      timestamp,
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    });

    console.log(`📊 Memory at ${timestamp}ms: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);

    setTimeout(() => this.measure(), 5000);
  }

  generateReport() {
    const report = {
      duration: Date.now() - this.startTime,
      measurements: this.measurements,
      analysis: this.analyzeLeaks()
    };

    fs.writeFileSync('memory-leak-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Memory leak report generated: memory-leak-report.json');
  }

  analyzeLeaks() {
    if (this.measurements.length < 2) return { status: 'insufficient_data' };

    const first = this.measurements[0];
    const last = this.measurements[this.measurements.length - 1];
    
    const rssGrowth = last.rss - first.rss;
    const heapGrowth = last.heapUsed - first.heapUsed;
    
    return {
      status: rssGrowth > 50 * 1024 * 1024 ? 'potential_leak' : 'stable',
      rssGrowthMB: Math.round(rssGrowth / 1024 / 1024),
      heapGrowthMB: Math.round(heapGrowth / 1024 / 1024),
      measurements: this.measurements.length
    };
  }
}

module.exports = MemoryMonitor;
