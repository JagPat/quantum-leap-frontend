#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

class GateVerifier {
  constructor() {
    this.results = [];
  }

  async runAllGates() {
    console.log('🚪 Running all CI/CD gates...');
    
    try {
      // Gate 1: Linting
      console.log('🔍 Gate 1: Linting...');
      execSync('npm run lint', { stdio: 'inherit' });
      this.results.push({ gate: 'linting', passed: true });
      
      // Gate 2: Build
      console.log('🔍 Gate 2: Build...');
      execSync('npm run build', { stdio: 'inherit' });
      this.results.push({ gate: 'build', passed: true });
      
      // Gate 3: Tests
      console.log('🔍 Gate 3: Tests...');
      execSync('npm test', { stdio: 'inherit' });
      this.results.push({ gate: 'tests', passed: true });
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Gate verification failed:', error);
      this.results.push({ gate: 'error', passed: false, error: error.message });
      this.generateReport();
      process.exit(1);
    }
  }

  generateReport() {
    const totalGates = this.results.length;
    const passedGates = this.results.filter(r => r.passed).length;
    const successRate = (passedGates / totalGates) * 100;
    
    console.log('\n📋 Gate Verification Results:');
    console.log(`Total Gates: ${totalGates}`);
    console.log(`Passed: ${passedGates}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.gate}`);
    });
  }
}

if (require.main === module) {
  const verifier = new GateVerifier();
  verifier.runAllGates().catch(console.error);
}

module.exports = GateVerifier;
