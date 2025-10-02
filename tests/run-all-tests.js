#!/usr/bin/env node

const { GoldenTestRunner, goldenTests } = require('./golden-tests');

class TestRunner {
  constructor() {
    this.goldenRunner = new GoldenTestRunner();
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive test suite...');
    
    for (const [testName, testFunction] of Object.entries(goldenTests)) {
      const result = await this.goldenRunner.runGoldenTest(testName, testFunction);
      this.results.push({ test: testName, type: 'golden', passed: result });
    }
    
    this.generateReport();
  }

  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log('\n📋 Test Results Summary:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    const report = {
      summary: {
        totalTests,
        passedTests,
        successRate
      },
      results: this.results,
      timestamp: new Date().toISOString()
    };
    
    require('fs').writeFileSync('test-results.json', JSON.stringify(report, null, 2));
    console.log('📋 Test report generated: test-results.json');
  }
}

if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;
