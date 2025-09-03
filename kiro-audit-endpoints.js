#!/usr/bin/env node

/**
 * Kiro Endpoint Audit Tool
 * Checks Frontend ↔ Backend API Consistency
 * 
 * Usage:
 *   node kiro-audit-endpoints.js
 *   node kiro-audit-endpoints.js --with-execution
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  frontend: {
    srcDir: './frontend/src',
    serviceFiles: ['services', 'hooks', 'api'],
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  backend: {
    serverFiles: ['./backend-temp/server-modular-safe.js', './backend-temp/server-modular.js'],
    baseUrl: 'https://web-production-de0bc.up.railway.app'
  },
  withExecution: process.argv.includes('--with-execution')
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class EndpointAuditor {
  constructor() {
    this.frontendEndpoints = new Map();
    this.backendEndpoints = new Map();
    this.results = {
      matched: [],
      frontendOnly: [],
      backendOnly: [],
      executionResults: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async scanFrontendEndpoints() {
    this.log('\n🔍 Scanning Frontend Endpoints...', 'blue');
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          scanDir(fullPath);
        } else if (CONFIG.frontend.extensions.some(ext => file.name.endsWith(ext))) {
          this.extractEndpointsFromFile(fullPath);
        }
      }
    };

    // Scan frontend directories
    for (const serviceDir of CONFIG.frontend.serviceFiles) {
      const fullDir = path.join(CONFIG.frontend.srcDir, serviceDir);
      scanDir(fullDir);
    }

    // Also scan root src for any API calls
    scanDir(CONFIG.frontend.srcDir);

    this.log(`📊 Found ${this.frontendEndpoints.size} frontend endpoints`, 'cyan');
  }

  extractEndpointsFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Patterns to match API calls
      const patterns = [
        // fetch calls: fetch('/api/endpoint')
        /fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
        // axios calls: axios.get('/api/endpoint')
        /axios\.\w+\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
        // API base URL + endpoint: `${API_BASE}/endpoint`
        /\$\{[^}]*API[^}]*\}([^`'"}\s]+)/g,
        // Direct URL patterns: '/api/something'
        /[`'"](\/(api|broker|auth|portfolio|trading|ai)\/[^`'"]*)[`'"]/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          let endpoint = match[1];
          
          // Clean up the endpoint
          endpoint = endpoint.replace(/\$\{[^}]*\}/g, ':param'); // Replace template variables
          endpoint = endpoint.replace(/\/+/g, '/'); // Remove double slashes
          
          if (endpoint.startsWith('/')) {
            const method = this.extractHttpMethod(content, match.index);
            const key = `${method} ${endpoint}`;
            
            if (!this.frontendEndpoints.has(key)) {
              this.frontendEndpoints.set(key, {
                endpoint,
                method,
                file: path.relative('.', filePath),
                occurrences: 1
              });
            } else {
              this.frontendEndpoints.get(key).occurrences++;
            }
          }
        }
      }
    } catch (error) {
      this.log(`⚠️ Error reading ${filePath}: ${error.message}`, 'yellow');
    }
  }

  extractHttpMethod(content, position) {
    // Look backwards from the match position to find HTTP method
    const beforeMatch = content.substring(Math.max(0, position - 100), position);
    
    const methodPatterns = [
      /axios\.(get|post|put|delete|patch)/i,
      /fetch\([^,)]*,\s*{\s*method:\s*['"](GET|POST|PUT|DELETE|PATCH)['"]/i,
      /method:\s*['"](GET|POST|PUT|DELETE|PATCH)['"]/i
    ];

    for (const pattern of methodPatterns) {
      const match = beforeMatch.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    return 'GET'; // Default assumption
  }

  async scanBackendEndpoints() {
    this.log('\n🔍 Scanning Backend Endpoints...', 'blue');
    
    for (const serverFile of CONFIG.backend.serverFiles) {
      if (fs.existsSync(serverFile)) {
        this.extractBackendEndpoints(serverFile);
      }
    }

    this.log(`📊 Found ${this.backendEndpoints.size} backend endpoints`, 'cyan');
  }

  extractBackendEndpoints(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Patterns for Express.js routes
      const patterns = [
        // app.get('/path', handler)
        /app\.(get|post|put|delete|patch|use)\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
        // router.get('/path', handler)
        /router\.(get|post|put|delete|patch|use)\s*\(\s*[`'"]([^`'"]+)[`'"]/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          let endpoint = match[2];
          
          // Skip middleware-only routes
          if (method === 'USE' && !endpoint.startsWith('/api')) continue;
          
          // Clean up endpoint
          endpoint = endpoint.replace(/:\w+/g, ':param'); // Replace :id with :param
          
          const key = `${method} ${endpoint}`;
          
          if (!this.backendEndpoints.has(key)) {
            this.backendEndpoints.set(key, {
              endpoint,
              method,
              file: path.relative('.', filePath)
            });
          }
        }
      }
    } catch (error) {
      this.log(`⚠️ Error reading ${filePath}: ${error.message}`, 'yellow');
    }
  }

  compareEndpoints() {
    this.log('\n🔄 Comparing Frontend ↔ Backend Endpoints...', 'blue');
    
    // Find matches
    for (const [frontendKey, frontendData] of this.frontendEndpoints) {
      const backendData = this.backendEndpoints.get(frontendKey);
      
      if (backendData) {
        this.results.matched.push({
          endpoint: frontendData.endpoint,
          method: frontendData.method,
          frontend: frontendData,
          backend: backendData
        });
      } else {
        // Try to find with different method
        const endpoint = frontendData.endpoint;
        let found = false;
        
        for (const [backendKey, backendData] of this.backendEndpoints) {
          if (backendData.endpoint === endpoint) {
            this.results.matched.push({
              endpoint,
              method: `${frontendData.method} → ${backendData.method}`,
              frontend: frontendData,
              backend: backendData,
              methodMismatch: true
            });
            found = true;
            break;
          }
        }
        
        if (!found) {
          this.results.frontendOnly.push(frontendData);
        }
      }
    }

    // Find backend-only endpoints
    for (const [backendKey, backendData] of this.backendEndpoints) {
      const frontendData = this.frontendEndpoints.get(backendKey);
      
      if (!frontendData) {
        // Check if any frontend endpoint matches the path
        let found = false;
        for (const [frontendKey, frontendEndpoint] of this.frontendEndpoints) {
          if (frontendEndpoint.endpoint === backendData.endpoint) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          this.results.backendOnly.push(backendData);
        }
      }
    }
  }

  async testEndpointExecution() {
    if (!CONFIG.withExecution) return;
    
    this.log('\n🧪 Testing Endpoint Execution...', 'blue');
    
    for (const match of this.results.matched) {
      if (match.methodMismatch) continue;
      
      const testResult = await this.testEndpoint(match.method, match.endpoint);
      this.results.executionResults.push({
        ...match,
        execution: testResult
      });
    }
  }

  async testEndpoint(method, endpoint) {
    return new Promise((resolve) => {
      // Replace parameters with test values
      const testEndpoint = endpoint
        .replace(':param', 'test-user')
        .replace(':id', '123')
        .replace(':userId', 'test-user');
      
      const url = `${CONFIG.backend.baseUrl}${testEndpoint}`;
      
      const options = {
        method: method,
        timeout: 5000
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 400,
            response: data.substring(0, 200) // Truncate response
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          status: 'ERROR',
          success: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'TIMEOUT',
          success: false,
          error: 'Request timeout'
        });
      });

      req.end();
    });
  }

  generateReport() {
    this.log('\n📋 ENDPOINT AUDIT REPORT', 'bold');
    this.log('=' .repeat(50), 'cyan');

    // Summary
    this.log(`\n📊 SUMMARY:`, 'bold');
    this.log(`✅ Matched Endpoints: ${this.results.matched.length}`, 'green');
    this.log(`❌ Frontend Only: ${this.results.frontendOnly.length}`, 'red');
    this.log(`❌ Backend Only: ${this.results.backendOnly.length}`, 'red');

    // Matched endpoints
    if (this.results.matched.length > 0) {
      this.log(`\n✅ MATCHED ENDPOINTS:`, 'green');
      for (const match of this.results.matched) {
        const status = match.methodMismatch ? '⚠️' : '✅';
        const execution = match.execution ? 
          (match.execution.success ? '✅' : '❌') : '';
        
        this.log(`${status} ${match.method} ${match.endpoint} ${execution}`, 
          match.methodMismatch ? 'yellow' : 'green');
        
        if (match.execution && !match.execution.success) {
          this.log(`   Error: ${match.execution.error || match.execution.status}`, 'red');
        }
      }
    }

    // Frontend-only endpoints
    if (this.results.frontendOnly.length > 0) {
      this.log(`\n❌ FRONTEND ONLY (Missing Backend):`, 'red');
      for (const endpoint of this.results.frontendOnly) {
        this.log(`❌ ${endpoint.method} ${endpoint.endpoint}`, 'red');
        this.log(`   File: ${endpoint.file} (${endpoint.occurrences} occurrences)`, 'yellow');
      }
    }

    // Backend-only endpoints
    if (this.results.backendOnly.length > 0) {
      this.log(`\n❌ BACKEND ONLY (No Frontend Calls):`, 'red');
      for (const endpoint of this.results.backendOnly) {
        this.log(`❌ ${endpoint.method} ${endpoint.endpoint}`, 'red');
        this.log(`   File: ${endpoint.file}`, 'yellow');
      }
    }

    // Recommendations
    this.log(`\n💡 RECOMMENDATIONS:`, 'bold');
    
    if (this.results.frontendOnly.length > 0) {
      this.log(`🔧 Add missing backend endpoints for frontend calls`, 'yellow');
    }
    
    if (this.results.backendOnly.length > 0) {
      this.log(`🧹 Consider removing unused backend endpoints or add frontend usage`, 'yellow');
    }
    
    if (this.results.matched.some(m => m.methodMismatch)) {
      this.log(`⚠️ Fix HTTP method mismatches between frontend and backend`, 'yellow');
    }

    const coverage = this.results.matched.length / 
      (this.results.matched.length + this.results.frontendOnly.length) * 100;
    
    this.log(`\n📈 COVERAGE: ${coverage.toFixed(1)}%`, 
      coverage > 80 ? 'green' : coverage > 60 ? 'yellow' : 'red');
  }

  async run() {
    this.log('🚀 Starting Kiro Endpoint Audit...', 'bold');
    
    await this.scanFrontendEndpoints();
    await this.scanBackendEndpoints();
    this.compareEndpoints();
    
    if (CONFIG.withExecution) {
      await this.testEndpointExecution();
    }
    
    this.generateReport();
    
    this.log('\n✅ Audit Complete!', 'bold');
  }
}

// Run the audit
const auditor = new EndpointAuditor();
auditor.run().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});