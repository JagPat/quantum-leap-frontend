// Golden tests - fixed input → fixed snapshot JSON
const fs = require('fs');
const path = require('path');

class GoldenTestRunner {
  constructor() {
    this.testDir = path.join(__dirname, 'golden-snapshots');
    this.ensureTestDir();
  }

  ensureTestDir() {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
  }

  async runGoldenTest(testName, testFunction) {
    console.log(`🧪 Running golden test: ${testName}`);
    
    try {
      const result = await testFunction();
      const snapshotPath = path.join(this.testDir, `${testName}.json`);
      
      if (fs.existsSync(snapshotPath)) {
        const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        const matches = JSON.stringify(result) === JSON.stringify(expected);
        
        if (matches) {
          console.log(`✅ Golden test passed: ${testName}`);
          return true;
        } else {
          console.log(`❌ Golden test failed: ${testName}`);
          return false;
        }
      } else {
        fs.writeFileSync(snapshotPath, JSON.stringify(result, null, 2));
        console.log(`📸 Created new snapshot: ${testName}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Golden test error: ${testName}`, error);
      return false;
    }
  }
}

const goldenTests = {
  async sessionNormalization() {
    const input = {
      config_id: 'test-uuid-123',
      user_id: 'EBW183',
      broker_name: 'zerodha',
      session_status: 'connected'
    };
    
    return {
      configId: input.config_id,
      userId: input.user_id,
      brokerName: input.broker_name,
      sessionStatus: input.session_status,
      timestamp: '2025-10-02T04:49:44Z'
    };
  },

  async authHeadersGeneration() {
    const session = {
      userId: 'EBW183',
      configId: 'test-uuid-123',
      sessionStatus: 'connected'
    };
    
    return {
      'X-User-ID': session.userId,
      'X-Config-ID': session.configId,
      'Content-Type': 'application/json'
    };
  }
};

module.exports = { GoldenTestRunner, goldenTests };
